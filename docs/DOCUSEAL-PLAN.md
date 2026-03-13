# DocuSeal Document Signing — Implementation Plan & Decisions

**Date:** March 2026
**Status:** Implementation complete, pending deployment

---

## Overview

Self-hosted DocuSeal on AWS Lightsail for digital document signing (contracts, model releases, notary forms). Fronted by a dedicated CloudFront distribution at `sign.pitfal.solutions`, with admin management integrated into the dashboard via REST API proxy through Lambda.

---

## Architecture

```
Client signs at: https://sign.pitfal.solutions/d/{slug}
Admin manages at: https://pitfal.solutions/admin/documents (→ Lambda → Lightsail)

┌──────────────────┐   sign.pitfal.solutions   ┌──────────────────┐
│  CloudFront #2   │ ──── via DNS origin ─────→ │  Lightsail Nano  │
│  (always-on, $0) │   docuseal-origin.pitfal   │  DocuSeal Docker │
│  ACM SSL         │   .solutions → port 3000   │  SQLite local    │
│  Forwards X-Fwd  │                            │  PDFs → S3 bucket│
└──────────────────┘                            └──────────────────┘
                                                        ↑
┌──────────────────┐   /api/documents/*          │
│  CloudFront #1   │ → API Gateway → Lambda ─────┘
│  (main site)     │   (proxy + async toggle)
└──────────────────┘
```

---

## Solution Choice: DocuSeal

| Aspect | Details |
|--------|---------|
| **Architecture** | Single Docker container, embedded SQLite |
| **License** | AGPL v3 (isolated — REST API only, no embedded React components) |
| **API** | Full REST API (templates, submissions, submitters) |
| **Features** | PDF/DOCX/HTML templates, 12 field types, multi-signer, mobile-optimized |
| **Email** | SMTP via AWS SES (dedicated SMTP credentials) |
| **Doc storage** | Dedicated S3 bucket (`pitfal-prod-documents`) |

**Why not OpenSign**: 3 containers (app + MongoDB + Redis), 2GB+ RAM, far more complex.
**Why not SaaS**: $10-25+/mo, no admin integration, vendor lock-in.

---

## Key Design Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Separate CloudFront distro** (always-on) | Clean isolation from main site. $0 when idle. Toggle only manages Lightsail, not CloudFront (avoids 15-min deploy). |
| 2 | **FORCE_SSL=false + CloudFront Function** | CloudFront terminates SSL. DocuSeal behind CloudFront must NOT redirect HTTP→HTTPS (causes redirect loop). CloudFront Function adds `X-Forwarded-Proto: https` + `X-Forwarded-Host` headers so DocuSeal generates correct HTTPS links in signing emails. |
| 3 | **Dedicated S3 bucket** (`pitfal-prod-documents`) | DocuSeal's `S3_ATTACHMENTS_BUCKET` has no prefix support — dumps files at bucket root. Separate bucket prevents pollution of media bucket. |
| 4 | **REST API only** (no `@docuseal/react`) | AGPL license — embedding React components could require open-sourcing frontend. API boundary = clean legal separation. |
| 5 | **Route 53 DNS as CloudFront origin** | `docuseal-origin.pitfal.solutions` → Lightsail IP. Toggle updates DNS (~2 min) instead of CloudFront origin (15 min). |
| 6 | **Async toggle with SSM state** | Snapshot/restore takes 3-10 min. Lambda starts operation → returns immediately → admin UI polls status. State stored in SSM Parameter (`/pitfal/docuseal-operation`). Includes mutex to prevent concurrent toggle clicks. |
| 7 | **Docker version pinning** | Pin `docuseal/docuseal:1.8.2` to prevent breaking changes on container restart. |
| 8 | **Dedicated SES SMTP IAM user** | SES SMTP requires special credentials (not regular IAM keys). Terraform `aws_iam_access_key` has `ses_smtp_password_v4` attribute — auto-generates SMTP password from IAM key. |
| 9 | **Snapshot preserves full state** | User data doesn't re-run on snapshot restore. Docker + compose file + data all preserved. Container auto-starts via `restart: always`. |
| 10 | **CloudFront Function for offline page** | Instead of adding the S3 website bucket as a second origin (which requires bucket policy changes), the offline page is generated as a synthetic HTML response by a CloudFront Function. Custom error responses for 502/503 rewrite to `/docuseal-offline.html`, which hits an ordered cache behavior with this function. |
| 11 | **{proxy+} API Gateway route** | Single `{proxy+}` catch-all under `/api/documents/` instead of individual routes for each endpoint. Simpler Terraform, single Lambda handles routing. |

---

## Monthly Cost

| State | Monthly Cost |
|-------|-------------|
| DocuSeal **enabled** | ~$8.60/mo ($3.60 existing + $5 Lightsail + $0 CloudFront + $0 S3 bucket) |
| DocuSeal **disabled** (snapshot + CloudFront idle) | ~$4.60/mo ($3.60 + ~$1 snapshot + $0 CF + $0 S3) |
| DocuSeal **fully removed** | ~$3.60/mo |

---

## Files Created/Modified

### New Files

| File | Purpose |
|------|---------|
| `infrastructure/terraform/docuseal.tf` | All DocuSeal infrastructure (S3, IAM, CloudFront, Lightsail, Route53, SSM) |
| `lambda/documents/index.ts` | Lambda handler: DocuSeal API proxy + async toggle + status polling |
| `lambda/documents/package.json` | Lambda dependencies (Lightsail, Route53, SSM SDK clients) |
| `src/app/admin/documents/page.tsx` | Admin documents page |
| `src/components/admin/DocuSealToggle.tsx` | Enable/disable toggle with status indicator and polling |
| `src/components/admin/DocumentList.tsx` | Tabbed view: Templates, Send, Submissions |

### Modified Files

| File | Change |
|------|--------|
| `infrastructure/terraform/variables.tf` | Added `sign.pitfal.solutions` to ACM SANs + `enable_docuseal` + `docuseal_version` vars |
| `infrastructure/terraform/outputs.tf` | Added DocuSeal URL, status, IP, bucket outputs |
| `infrastructure/terraform/lambda.tf` | Added documents Lambda build + function |
| `infrastructure/terraform/iam.tf` | Added documents Lambda IAM role (Lightsail, Route53, SSM, DynamoDB perms) |
| `infrastructure/terraform/api-gateway.tf` | Added `/api/documents` + `{proxy+}` routes + deployment triggers |
| `src/lib/api.ts` | Added `adminDocuments` API client with types |
| `src/components/admin/AdminSidebar.tsx` | Added "Documents" nav item |

---

## Infrastructure Resources (docuseal.tf)

### Always-on (no count condition)
1. S3 bucket `pitfal-prod-documents` + encryption + public access block
2. IAM user + policy + access key for DocuSeal S3 access
3. IAM user + policy + access key for SES SMTP
4. `random_password` for DocuSeal SECRET_KEY_BASE
5. SSM parameter `/pitfal/docuseal-operation` (state tracking, lifecycle ignores value changes)
6. CloudFront Function — adds X-Forwarded-Proto/Host headers (viewer-request)
7. CloudFront Function — returns offline HTML as synthetic response
8. CloudFront origin request policy (forwards all cookies, headers, query strings)
9. CloudFront distribution for `sign.pitfal.solutions` with custom error responses
10. Route 53 A + AAAA records for `sign.pitfal.solutions` → CloudFront

### Conditional (gated by `enable_docuseal`)
11. Lightsail instance (nano_3_2, Ubuntu 22.04, Docker + DocuSeal compose in user_data)
12. Lightsail public ports (3000 + 22)
13. Route 53 A record for `docuseal-origin.pitfal.solutions` → Lightsail IP

---

## API Routes (Lambda)

All routes require admin auth (Bearer token or cookie).

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/documents/status` | GET | Instance status + operation progress |
| `/api/documents/toggle` | POST | Start enable/disable (async) |
| `/api/documents/templates` | GET | List templates (proxied to DocuSeal) |
| `/api/documents/templates` | POST | Upload template (proxied) |
| `/api/documents/send` | POST | Send document for signing |
| `/api/documents/submissions` | GET | List all submissions |
| `/api/documents/submissions/{id}` | GET | Submission details |

---

## Toggle Flow (Async State Machine)

State stored in SSM Parameter `/pitfal/docuseal-operation`:
```json
{ "state": "running|starting|stopping|off|error", "operationId": "...", "timestamp": "..." }
```

### Enable Flow
1. Mutex check: reject if state is `starting` or `stopping`
2. Check if instance already exists → if running, set state `running`, return
3. Look for `docuseal-latest` snapshot
4. `CreateInstancesFromSnapshot` (or error if no snapshot — first time uses Terraform)
5. Store Lightsail operation ID in SSM, return `{ status: "starting" }`
6. Admin UI polls `GET /status` every 5s
7. Status endpoint checks `GetOperation` → when complete: open port 3000, update Route 53 DNS, set state `running`

### Disable Flow
1. Check for pending submissions via DocuSeal API
2. If pending > 0 → return error with count
3. `CreateInstanceSnapshot` (name: `docuseal-latest`)
4. Return `{ status: "stopping" }`
5. Admin UI polls status every 5s
6. Status endpoint checks operation → when complete: delete instance, clean up DNS, delete old snapshots, set state `off`

---

## Admin UI

```
┌──────────────────────────────────────────────────┐
│  Documents                   [DocuSeal: ● Running]│
├──────────────────────────────────────────────────┤
│  [Templates]  [Send]  [Submissions]              │
├──────────────────────────────────────────────────┤
│  Tab content area                                │
│  - Templates: list + "Manage in DocuSeal" link   │
│  - Send: template picker, name/email fields      │
│  - Submissions: status badges, download links    │
└──────────────────────────────────────────────────┘
```

Toggle states: running (green), starting/stopping (yellow pulse), off (gray), error (red)

---

## Initial Setup (One-Time, Manual)

1. Set `enable_docuseal = true` in Terraform vars
2. `make deploy` — creates Lightsail + CloudFront + S3 + SES user
3. Wait for instance (~3-5 min)
4. SSH: `ssh ubuntu@$(terraform output -raw docuseal_instance_ip)`
5. Access DocuSeal at `http://<ip>:3000` — create admin account
6. Settings → API → copy API key
7. Store: `aws ssm put-parameter --name /pitfal/docuseal-api-key --value "<key>" --type SecureString --profile pitfal`
8. Upload PDF/DOCX templates via DocuSeal web UI
9. Test end-to-end signing flow

---

## Security

| Concern | Mitigation |
|---------|------------|
| DocuSeal API key | SSM Parameter Store (SecureString), Lambda reads at runtime |
| Admin API auth | Existing HttpOnly cookie / Bearer token auth on all `/api/documents/*` |
| SSL/TLS | CloudFront terminates SSL (ACM cert). FORCE_SSL=false on DocuSeal. |
| DocuSeal admin panel | DocuSeal has its own email/password auth |
| Direct IP bypass | Low risk — IP not publicly listed, DocuSeal has its own auth |
| SES SMTP credentials | Dedicated IAM user with minimal permissions |
| AGPL compliance | REST API boundary only — no DocuSeal code in codebase |
| S3 bucket | Separate bucket with restricted IAM policy |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Lightsail Nano (512MB) too small | Monitor memory. Upgrade to Micro ($10/mo) if needed. |
| Snapshot restore gives new IP | Route 53 TTL=60s. Brief 502 during propagation. |
| DocuSeal breaking update | Pin Docker image version. Test before changing tag. |
| ACM cert re-creation | `create_before_destroy` lifecycle ensures overlap. |
| Toggle race condition | SSM mutex: reject if state is `starting`/`stopping`. |
| Snapshot + delete not atomic | Snapshot first, poll until complete, THEN delete. |

---

## Verification Checklist

- [ ] `terraform validate` passes
- [ ] `pnpm type-check` passes
- [ ] All existing tests pass (932+)
- [ ] `terraform plan` shows expected resources
- [ ] DocuSeal accessible at `https://sign.pitfal.solutions` (or offline page when disabled)
- [ ] API proxy works: `GET /api/documents/status`
- [ ] Template listing works
- [ ] End-to-end signing: send → SES email → sign → signed PDF in S3
- [ ] Toggle off: snapshot → delete → DNS cleanup → offline page
- [ ] Toggle on: restore → DNS → port open → signing works
- [ ] Toggle mutex: rapid clicks handled gracefully
- [ ] Pending doc block: can't disable with unsigned documents
