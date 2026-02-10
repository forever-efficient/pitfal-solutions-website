# Product Requirements Document (PRD)
## Pitfal Solutions Photography Website

| Field | Value |
|-------|-------|
| **Product Name** | Pitfal Solutions Website |
| **Version** | 1.5 (Warning Fixes Complete) |
| **Last Updated** | February 2026 |
| **Status** | MVP Build In Progress - All Critical & Warnings Resolved |
| **Owner** | Thomas Archuleta |
| **Domain** | https://www.pitfal.solutions |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Business Context](#2-business-context)
3. [Goals & Success Metrics](#3-goals--success-metrics)
4. [User Personas](#4-user-personas)
5. [MVP Scope Decisions](#5-mvp-scope-decisions)
6. [Functional Requirements](#6-functional-requirements)
7. [Technical Architecture](#7-technical-architecture)
8. [Technology Stack](#8-technology-stack)
9. [Infrastructure & Deployment](#9-infrastructure--deployment)
10. [Development Workflow](#10-development-workflow)
11. [Integrations](#11-integrations)
12. [Non-Functional Requirements](#12-non-functional-requirements)
13. [Milestones & Phases](#13-milestones--phases)
14. [Risks & Mitigations](#14-risks--mitigations)
15. [Code Review Findings & Remediation Checklist](#15-code-review-findings--remediation-checklist)
16. [Appendices](#16-appendices)

---

## 1. Executive Summary

### 1.1 Product Vision

Build a custom, full-featured photography and videography portfolio website for Pitfal Solutions that showcases creative work, enables client interactions, and generates bookings—all while maintaining operational costs under $20/month using AWS serverless architecture.

### 1.2 Tagline

**"Swing the Gap"**

### 1.3 Core Value Proposition

- **For clients:** A seamless experience to view portfolios, submit inquiries, proof photos, and download deliverables
- **For the business:** Cost-effective, low-maintenance infrastructure that scales with demand
- **For development:** Infrastructure as Code (Terraform) enabling reproducible, version-controlled deployments

### 1.4 MVP Focus

The MVP (Minimum Viable Product) focuses on core portfolio, client proofing, and booking inquiry functionality. E-commerce features (print sales, payment processing for products) are deferred to Phase 2.

---

## 2. Business Context

### 2.1 Company Overview

| Attribute | Details |
|-----------|---------|
| **Business Name** | Pitfal Solutions |
| **Location** | Denver, CO (serving Denver metro area) |
| **Services** | Photography & Videography |
| **Contact** | info@pitfal.solutions |
| **Hours** | 7am - 10pm daily |

### 2.2 Service Offerings

| Service | Description | Target Market |
|---------|-------------|---------------|
| **Brand Photography/Videography** | Commercial content for businesses | Small businesses, startups |
| **Portrait Services** | Headshots, lifestyle, family | Individuals, professionals |
| **Event Coverage** | Weddings, corporate events | Event planners, couples |

### 2.3 Market Position

Pitfal Solutions differentiates through:
- Dual photo + video capability
- Modern, tech-forward booking experience
- Competitive pricing for Denver metro market
- Quick turnaround on digital deliverables

---

## 3. Goals & Success Metrics

### 3.1 Business Goals

| Goal | Target | Timeline |
|------|--------|----------|
| Launch production website | 100% MVP feature complete | 8-10 weeks |
| Monthly infrastructure cost | < $20/month | Ongoing |
| Booking inquiry rate | > 5% of visitors | 6 months post-launch |
| Client gallery satisfaction | > 90% approval | Ongoing |

### 3.2 Technical Goals

| Goal | Target | Measurement |
|------|--------|-------------|
| Performance (Lighthouse) | > 90 all categories | Lighthouse CI |
| Uptime | 99.9% | CloudWatch |
| Time to First Byte | < 200ms (cached) | CloudFront metrics |
| Build time | < 5 minutes | GitHub Actions |

### 3.3 Key Performance Indicators (KPIs)

1. **Acquisition:** Monthly unique visitors, traffic sources
2. **Engagement:** Pages per session, time on site, gallery views
3. **Conversion:** Booking inquiries, completed sessions
4. **Satisfaction:** Client gallery completion rate, review scores

---

## 4. User Personas

### 4.1 Primary Personas

#### Persona 1: Prospective Client (Emily)
- **Demographics:** 28-45, professional, Denver metro
- **Goals:** Find a photographer for upcoming event/portraits
- **Pain Points:** Hard to compare photographers, unclear pricing
- **Needs:** View portfolio, see packages, easy inquiry submission
- **Journey:** Search → Portfolio → Services → Contact/Inquire

#### Persona 2: Active Client (Marcus)
- **Demographics:** 35, small business owner
- **Goals:** Review and approve brand photos from recent shoot
- **Pain Points:** Email-based proofing is tedious
- **Needs:** Password-protected gallery, easy selection, download
- **Journey:** Email link → Gallery → Select → Approve → Download

### 4.2 Secondary Personas

#### Administrator (Thomas - Owner)
- **Goals:** Manage galleries, inquiries efficiently
- **Needs:** Dashboard, content management, analytics
- **Pain Points:** Manual processes, fragmented tools

---

## 5. MVP Scope Decisions

### 5.1 Confirmed Decisions

| Decision Area | Choice | Rationale | Status |
|---------------|--------|-----------|--------|
| **Client Gallery Auth** | Simple password per gallery | No accounts needed; easy to share links | MVP |
| **Blog Platform** | MDX files in Git | Version controlled; no external CMS | MVP |
| **Print Sales** | Deferred | Focus on core booking/portfolio first | Phase 2 |
| **Analytics** | Google Analytics 4 | Industry standard, free | MVP |
| **Video Delivery** | YouTube (public) + S3 (private) | Cost-effective hybrid | MVP |
| **Spam Protection** | Honeypot + rate limiting | No CAPTCHA friction | MVP |
| **Staging Environment** | Skip initially | Deploy directly to production | MVP |
| **Watermarking** | None needed | Client trust model | Not Required |
| **Gallery Layouts** | All 4 (Grid, Masonry, Slideshow, Stacked) | Maximum flexibility | MVP |
| **Booking System** | Inquiry form only | No calendar integration | MVP |
| **Service Packages** | 3-4 main types | Portrait, Event, Brand, Custom | MVP |
| **Admin Dashboard** | Gallery management + view-only inquiries | Status updates deferred | MVP |
| **Testimonials** | Static JSON file | No admin UI for MVP | MVP |
| **FAQ** | Static JSON file | No admin UI for MVP | MVP |
| **Style Guide** | Static MDX page | Managed via Git | MVP |
| **Client Auth** | HttpOnly cookies | 7-day sessions | MVP |
| **Admin 2FA** | Deferred | Password-only auth for MVP | Phase 2 |
| **Portfolio Categories** | Admin-configurable | Not hardcoded | MVP |
| **Client Selection Limits** | None | Full access to all images | MVP |
| **Timeline** | 8-10 weeks | Speed to launch priority | MVP |

### 5.2 Feature Scope Summary

| Feature Category | MVP (Phase 1) | Phase 2 |
|------------------|---------------|---------|
| Portfolio Gallery | All 4 layouts, lightbox, **admin-configurable categories** | - |
| Client Proofing | HttpOnly cookie auth (7-day), **full access**, commenting, download | ~~Selection limits~~ |
| Booking | Inquiry form with email notifications | Calendar integration, deposits |
| E-Commerce | - | Print sales, Stripe checkout |
| Blog | MDX files in Git (no web CMS) | - |
| Testimonials | **Static JSON** (`/content/testimonials.json`) | Admin dashboard management |
| FAQ | **Static JSON** (`/content/faq.json`) | Admin dashboard management |
| Style Guide | **Static MDX** page | - |
| Admin | Gallery management + **view-only inquiry list** | Inquiry management, order tracking, 2FA |
| Contact | Form with honeypot + API Gateway throttling | - |

---

## 6. Functional Requirements

### 6.1 Portfolio & Gallery System

#### Public Gallery Features
| ID | Requirement | Priority | MVP Status |
|----|-------------|----------|------------|
| REQ-GAL-001 | Multiple layout formats (grid, masonry, slideshow, stacked) | P0 | MVP |
| REQ-GAL-002 | Full-screen lightbox with zoom, navigation, metadata | P0 | MVP |
| REQ-GAL-003 | Responsive image loading (WebP, srcset, lazy load, LQIP) | P0 | MVP |
| REQ-GAL-004 | Video support (YouTube/Vimeo embeds, S3 self-hosted) | P1 | MVP |
| REQ-GAL-010 | Category organization (admin-configurable, not hardcoded) | P0 | MVP |
| REQ-GAL-011 | Filtering and sorting (category, date, tags, search) | P1 | MVP |
| REQ-GAL-012 | Featured/hero images for homepage | P0 | MVP |

#### Gallery Administration
| ID | Requirement | Priority | MVP Status |
|----|-------------|----------|------------|
| REQ-GAL-020 | Upload (single + batch), edit metadata, reorder, delete | P0 | MVP |
| REQ-GAL-021 | Auto-generate image sizes, WebP, blur placeholders, EXIF | P0 | MVP |

### 6.2 Client Proofing System

| ID | Requirement | Priority | MVP Status |
|----|-------------|----------|------------|
| REQ-PROOF-001 | Password-protected galleries (no download limits - full access) | P0 | MVP |
| REQ-PROOF-002 | ~~Watermarked previews~~ Direct previews (client trust model) | - | Not Required |
| REQ-PROOF-010 | Client commenting on images (feedback, edit requests) | P0 | MVP |
| REQ-PROOF-011 | ~~Selection tracking~~ Full access model (no limits) | - | Not Required |
| REQ-PROOF-012 | Photographer notifications (comments only) | P1 | MVP |
| REQ-PROOF-020 | Individual + bulk (ZIP) download of ALL images | P0 | MVP |
| REQ-PROOF-021 | ~~Configurable watermarks~~ | - | Not Required |

### 6.3 Booking System (MVP Scope)

| ID | Requirement | Priority | MVP Status |
|----|-------------|----------|------------|
| REQ-BOOK-001 | Display session types with name, duration, price, deposit, inclusions | P0 | MVP |
| REQ-BOOK-MVP-001 | Inquiry form: session type, preferred date (text), contact info, message | P0 | MVP |
| REQ-BOOK-MVP-002 | Store inquiry in DynamoDB, email notifications (SES) | P0 | MVP |
| REQ-BOOK-MVP-003 | ~~Inquiry status tracking in admin dashboard~~ | - | Phase 2 |
| REQ-BOOK-010 | ~~Calendar availability view, blocked dates, timezone handling~~ | - | Phase 2 |
| REQ-BOOK-011 | ~~Admin calendar sync, recurring availability~~ | - | Phase 2 |
| REQ-BOOK-020 | ~~Full booking flow with date/time selection~~ | - | Phase 2 |
| REQ-BOOK-021 | ~~Deposit payment (Stripe), calendar integration~~ | - | Phase 2 |
| REQ-BOOK-022 | ~~Automated reminders (1 week, 24 hours)~~ | - | Phase 2 |

### 6.4 E-Commerce System

| ID | Requirement | Priority | MVP Status |
|----|-------------|----------|------------|
| REQ-ECOM-001 | Product types: prints, digital downloads, photo books, gift cards | P0 | Phase 2 |
| REQ-ECOM-002 | Print options: sizes, paper, framing, canvas/metal | P1 | Phase 2 |
| REQ-ECOM-010 | Pricing: per-item, package, digital collections, volume discounts | P1 | Phase 2 |
| REQ-ECOM-020 | Checkout: cart, shipping, discounts, Stripe, Apple/Google Pay | P0 | Phase 2 |
| REQ-ECOM-021 | Order confirmation, tracking, immediate digital delivery | P0 | Phase 2 |
| REQ-ECOM-030 | Print lab integration (auto-submit, tracking, drop-ship) | P2 | Phase 2 |

### 6.5 Image Auto-Editing Pipeline

| ID | Requirement | Priority | MVP Status |
|----|-------------|----------|------------|
| REQ-IMG-001 | Accept CR2/CR3 RAW uploads to S3 staging/ prefix | P0 | MVP |
| REQ-IMG-002 | Auto-convert RAW to TIFF via LibRaw | P0 | MVP |
| REQ-IMG-003 | Apply professional edits: WB, exposure, contrast, grain, sharpening | P0 | MVP |
| REQ-IMG-004 | Output edited JPEG (quality 93) to finished/ prefix | P0 | MVP |
| REQ-IMG-005 | Preserve original RAW in finished/originals/ | P0 | MVP |
| REQ-IMG-006 | Docker-based Lambda (ECR) for native binary dependencies | P0 | MVP |
| REQ-IMG-007 | DLQ for failed processing with CloudWatch alarms | P1 | MVP |
| REQ-IMG-008 | Staging cleanup lifecycle (7-day auto-expiration) | P1 | MVP |
| REQ-IMG-009 | Serve finished images via CloudFront | P0 | MVP |
| REQ-IMG-010 | Concurrency limit (5) to control costs | P1 | MVP |

### 6.6 Blog/Content System

| ID | Requirement | Priority | MVP Status |
|----|-------------|----------|------------|
| REQ-BLOG-001 | MDX blog with featured images, categories, tags, scheduling | P1 | MVP |
| REQ-BLOG-002 | Gallery embeds, before/after comparisons, video, CTAs | P2 | MVP |
| REQ-BLOG-010 | SEO: meta title/description, Open Graph, structured data | P1 | MVP |
| REQ-BLOG-011 | XML sitemap, RSS feed, social share images | P1 | MVP |

### 6.7 Contact & Communication

| ID | Requirement | Priority | MVP Status |
|----|-------------|----------|------------|
| REQ-CONTACT-001 | Contact form: name, email, phone, session type, message | P0 | MVP |
| REQ-CONTACT-002 | Spam protection (honeypot + rate limiting, NO CAPTCHA) | P0 | MVP |
| REQ-CONTACT-003 | Notification emails (photographer + confirmation to inquirer) | P0 | MVP |
| REQ-CONTACT-010 | Display: hours, service area, contact info, social links | P0 | MVP |

### 6.8 Admin Dashboard

| ID | Requirement | Priority | MVP Status |
|----|-------------|----------|------------|
| REQ-ADMIN-001 | Overview: recent inquiries (view-only), stats, quick actions | P1 | MVP |
| REQ-ADMIN-010 | Content management: galleries, client galleries (blog/testimonials/FAQ via Git) | P1 | MVP |
| REQ-ADMIN-011 | Inquiry viewing: list, details (view-only, no status updates in MVP) | P1 | MVP |
| REQ-ADMIN-012 | ~~Inquiry management: status updates, notes, respond~~ | - | Phase 2 |
| REQ-ADMIN-020 | ~~Order management: pending orders, fulfillment, refunds, reports~~ | - | Phase 2 |

---

## 7. Technical Architecture

### 7.1 High-Level Architecture

```
┌─────────────────────────────────────────────────┐
│              CloudFront (CDN + SSL + WAF)        │
└─────────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
    S3 Static Site      API Gateway
    (Next.js export)         │
         │                   ▼
         │          ┌─────────────────┐
         │          │ Lambda Functions │
         │          │ - contact        │
         │          │ - client-auth    │
         │          │ - client-gallery │
         │          │ - admin          │
         │          └─────────────────┘
         │                   │
         │          ┌────────┴────────┐
         │          ▼                 ▼
         │    DynamoDB           S3 Media
         │    (3 tables)         (images/video)
         │                           │
         │                    ┌──────┴──────┐
         │                    │  staging/    │──── S3 Event ────┐
         │                    │  finished/   │                  │
         │                    └─────────────┘                  ▼
         │                           ▲          ┌──────────────────────┐
         │                           │          │ Image Processor      │
         │                           └──────────│ (Docker Lambda/ECR)  │
         └─────── serves /media/finished/* ─────│ LibRaw + Sharp       │
                                                └──────────────────────┘
```

### 7.2 Image Auto-Editing Pipeline

```
Photographer uploads CR2/CR3 to s3://media/staging/
    │
    ▼
S3 Event Notification (ObjectCreated)
    │
    ▼
Image Processor Lambda (Docker, 2GB RAM, 5min timeout)
    ├── 1. Download RAW from staging/
    ├── 2. Convert RAW → TIFF via LibRaw (dcraw_emu)
    ├── 3. Apply professional edits via Sharp:
    │       - White balance correction
    │       - Exposure/contrast optimization
    │       - Subtle film-grain texture
    │       - Magazine-quality sharpening
    ├── 4. Output JPEG (quality 93) to finished/
    ├── 5. Copy original RAW to finished/originals/
    └── 6. Delete staging file
    │
    ▼
Finished images served via CloudFront at /media/finished/*
```

### 7.3 Design Principles

1. **Serverless-First:** Minimize operational overhead and costs
2. **Static Generation:** Pre-render pages for optimal performance
3. **Edge Caching:** Serve content from CloudFront edge locations
4. **Pay-Per-Use:** Scale costs with actual usage
5. **Infrastructure as Code:** All resources managed via Terraform

### 7.4 Data Model (MVP)

#### DynamoDB Tables (3 tables)

| Table | Purpose | Primary Key | GSI |
|-------|---------|-------------|-----|
| `pitfal-galleries` | Galleries, images, selections, client sessions | PK: varies, SK: varies | - |
| `pitfal-inquiries` | Contact/booking inquiries | PK: `INQUIRY#{id}`, SK: `METADATA` | `byStatus` |
| `pitfal-admin` | Admin users, settings, sessions | PK: varies, SK: varies | - |

#### S3 Bucket Structure

```
pitfal-prod-website/           # Static site (Next.js export)
├── _next/
├── index.html
└── ...

pitfal-prod-media/             # Images, videos, RAW pipeline
├── staging/                   # RAW uploads land here (auto-processed)
│   └── {filename}.CR2/.CR3
├── finished/                  # Auto-edited outputs + originals
│   ├── {filename}.jpg         # Edited JPEG
│   └── originals/             # Original RAW preserved
│       └── {filename}.CR2
├── portfolio/                 # Published portfolio images
│   └── {category}/{gallery}/{imageId}/{size}w.webp
├── clients/                   # Client proofing galleries
│   └── {galleryId}/{imageId}.{ext}
├── videos/                    # Video content
│   └── {galleryId}/{videoId}.mp4
└── downloads/                 # Temporary ZIP downloads
    └── {token}/{filename}.zip

pitfal-prod-logs/ (optional)   # CloudFront access logs
```

---

## 8. Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 14+ (App Router) | React framework, static export |
| **Language** | TypeScript | Type-safe development |
| **Styling** | Tailwind CSS | Utility-first CSS framework |
| **State** | React Context | Client state management |
| **Animation** | CSS keyframes + Tailwind | Page transitions, gallery effects |
| **Image Pipeline** | Docker Lambda (LibRaw + Sharp) | CR2/CR3 RAW → edited JPEG |
| **Backend** | AWS Lambda (Node.js) | Serverless compute |
| **API** | API Gateway (REST) | API management |
| **Database** | DynamoDB | Serverless NoSQL |
| **Storage** | S3 + CloudFront | Images, videos, static assets |
| **Email** | AWS SES | Transactional emails |
| **Analytics** | Google Analytics 4 | Traffic and engagement tracking |
| **DNS/SSL** | Route 53 + ACM | Domain management, SSL |
| **IaC** | Terraform | Infrastructure management |
| **CI/CD** | GitHub Actions | Automated deployments |

---

## 9. Infrastructure & Deployment

### 9.1 Cost Breakdown (Target: < $20/month)

| Service | Estimated Cost | Notes |
|---------|---------------|-------|
| S3 (storage + hosting) | ~$1-3/month | Static site + media + staging |
| CloudFront CDN | ~$1-2/month | Edge caching |
| Lambda + API Gateway | ~$0-2/month | Free tier covers most usage |
| Image Processor Lambda | ~$0.10/month | Docker Lambda, ~100 images/mo |
| ECR Repository | ~$0.10/month | Container image storage |
| DynamoDB | ~$0-1/month | On-demand, free tier |
| SES (email) | ~$0/month | 62K emails free |
| Route 53 | ~$0.50/month | Hosted zone |
| ACM (SSL) | Free | Certificate management |
| WAF (Bot Control) | ~$10/month | Managed rule group (evaluate need) |
| CloudWatch (alarms/logs) | ~$0.30/month | Image pipeline monitoring |
| **Total** | **~$13-20/month** | Within $20 target |

> **Note:** WAF Bot Control (~$10/mo) is the largest cost item. Consider disabling until the site has meaningful traffic to stay well under budget.

### 9.2 Environments (MVP)

| Environment | Purpose | URL |
|-------------|---------|-----|
| Development | Local dev | localhost:3000 |
| Production | Live site | www.pitfal.solutions |

> **Note:** Staging environment deferred to Phase 2. MVP deploys directly to production with manual verification.

### 9.3 CI/CD Pipeline

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Push    │───▶│  Build   │───▶│  Test    │───▶│  Deploy  │
│  (main)  │    │  (Next)  │    │  (Jest)  │    │(Terraform)│
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                     │
                                    ┌────────────────┼────────────────┐
                                    ▼                ▼                ▼
                              ┌──────────┐     ┌──────────┐     ┌──────────┐
                              │ S3 Sync  │     │ Lambda   │     │Invalidate│
                              │ (static) │     │ Deploy   │     │CloudFront│
                              └──────────┘     └──────────┘     └──────────┘
```

---

## 10. Development Workflow

### 10.1 Available Claude Code Skills

| Skill | Command | Purpose |
|-------|---------|---------|
| **Deploy** | `/deploy` | Full deployment: pre-checks → build → Terraform → S3 sync → CloudFront invalidation |
| **Build** | `/build` | Run lint, type-check, tests, and build with detailed error reporting |
| **Test** | `/test` | Run tests: unit, E2E, coverage (80% threshold) |
| **Preview** | `/preview` | Start local Next.js dev server on port 3000 |
| **Optimize Images** | `/optimize-images` | Batch convert to WebP, generate sizes, create blur placeholders |
| **Sync Content** | `/sync-content` | Upload gallery content to S3 bucket |
| **View Logs** | `/logs` | Fetch Lambda/API Gateway CloudWatch logs |
| **Seed Database** | `/db-seed` | Populate DynamoDB with sample data (dev only) |

### 10.2 MCP Server Integrations

| Server | Purpose | Key Capabilities |
|--------|---------|------------------|
| `terraform` | Infrastructure deployment | Plan/apply, state management, best practices |
| `aws-docs` | AWS documentation | Search docs, API reference |
| `aws-pricing` | AWS pricing | Cost estimates, pricing lookups |
| `github` | Repository operations | Issues, PRs, actions |
| `filesystem` | Local file operations | Read, write, search |

### 10.3 Local Development Commands

```bash
# Development
pnpm dev                    # Start dev server
pnpm build                  # Production build
pnpm lint                   # Run ESLint
pnpm type-check             # TypeScript check
pnpm test                   # Run tests

# Infrastructure
cd infrastructure/terraform
terraform plan              # Preview changes
terraform apply             # Deploy infrastructure

# Docker (optional)
docker compose up           # Run containerized dev environment
```

---

## 11. Integrations

### 11.1 AWS SES Integration (MVP)

| Email Type | Trigger | Template |
|------------|---------|----------|
| Contact Acknowledgment | Contact form submitted | contact-ack |
| Inquiry Notification | Booking inquiry submitted | inquiry-notify |
| Client Gallery Ready | Gallery published | gallery-ready |
| Selection Notification | Client makes selections | selection-notify |

### 11.2 Google Analytics 4 (MVP)

| Event | Trigger | Data |
|-------|---------|------|
| `page_view` | Page load | Page path, title |
| `gallery_view` | Gallery opened | Gallery name, category |
| `inquiry_submit` | Form submitted | Session type |
| `contact_submit` | Contact form sent | - |

### 11.3 Phase 2 Integrations (Deferred)

The following integrations are planned for Phase 2:

- **Stripe Integration:** Payment processing for deposits and print sales
- **Calendar Integration:** Google Calendar sync for availability
- **Print Lab Integration:** Automated order fulfillment

---

## 12. Non-Functional Requirements

### 12.1 Performance

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.5s |
| Largest Contentful Paint | < 2.5s |
| Cumulative Layout Shift | < 0.1 |
| Lighthouse Score | > 90 (all categories) |
| Time to Interactive | < 3.0s |

### 12.2 Security

| Requirement | Implementation |
|-------------|----------------|
| HTTPS everywhere | CloudFront + ACM |
| Secure password storage | bcrypt |
| CSRF protection | Token-based |
| XSS prevention | Input sanitization, CSP |
| Rate limiting | API Gateway + Lambda |
| Signed URLs | Time-limited media access |

### 12.3 Scalability

| Metric | Target |
|--------|--------|
| Portfolio images | 10,000+ |
| Concurrent users | 100+ |
| Media storage | 1TB+ |
| API requests | 1M+/month |

### 12.4 Reliability

| Metric | Target |
|--------|--------|
| Uptime | 99.9% |
| Backup frequency | Daily (automated) |
| Recovery Time Objective | < 4 hours |
| Recovery Point Objective | < 24 hours |

### 12.5 Accessibility

| Standard | Requirement |
|----------|-------------|
| WCAG 2.1 | AA compliance |
| Color contrast | 4.5:1 minimum |
| Focus indicators | Visible on all interactive elements |
| Screen reader | Compatible with NVDA, VoiceOver |
| Keyboard navigation | Full site navigable |

### 12.6 Compliance

| Requirement | Implementation |
|-------------|----------------|
| Privacy policy | Published page |
| Terms of service | Published page |
| Cookie consent | GDPR-compliant banner |

---

## 13. Milestones & Phases

### Current Build Status (as of February 2026)

| Area | Status | Notes |
|------|--------|-------|
| Project setup & tooling | Done | Next.js 14, TypeScript, Tailwind, Vitest, Playwright |
| Infrastructure (Terraform) | Done | S3, CloudFront, API GW, Lambda, DynamoDB, SES, image pipeline — deployed to AWS |
| Core pages (Home, About, Services, Contact, FAQ, Portfolio) | Done | Static export, responsive |
| Component library | Done | 20+ components with barrel exports |
| Contact form Lambda | Done | Honeypot, rate limiting, CSRF, SES integration |
| Image auto-editing pipeline | Done | CR2/CR3 → edited JPEG via Docker Lambda |
| Unit tests | Done | 500 tests passing |
| E2E tests | Done | 4 specs, 5 browser configs |
| Code reviews | Done | 5-domain review complete, checklist in Section 15 |
| Critical bug fixes from review | Done | 17/17 critical items fixed |
| Warning fixes from review | Done | 37/38 warning items fixed (1 deferred: W-FE-4 build-time year) |
| Terraform deployed to AWS | Done | `terraform apply` successful — all resources provisioned |
| Frontend gallery integration | **TODO** | Connect finished/ images to gallery UI |
| Client proofing system | **TODO** | Password-protected galleries |
| Admin dashboard | **TODO** | Gallery management, inquiry viewing |
| Blog (MDX) | **TODO** | Blog page and posts |

### MVP Roadmap (8-10 Weeks)

#### Week 1-2: Foundation & Infrastructure

| Deliverable | Description |
|-------------|-------------|
| Project setup | Next.js 14 + TypeScript + Tailwind |
| Base UI components | Button, Input, Modal, Card |
| Infrastructure deploy | S3, CloudFront, Route 53, ACM via Terraform |
| CI setup | GitHub Actions for build/deploy |
| Local DynamoDB | Docker-based local development |

**Milestone:** Empty site live at pitfal.solutions

#### Week 3-4: Core Pages & Navigation

| Deliverable | Description |
|-------------|-------------|
| Header/Footer/Nav | Responsive navigation components |
| Homepage | Hero, featured work, services overview |
| About page | Bio, story, social proof |
| Services page | 3-4 packages with pricing |
| Contact page | UI only (no backend yet) |
| Analytics | Google Analytics 4 integration |

**Milestone:** Complete public-facing pages

#### Week 5-6: Portfolio Gallery System

| Deliverable | Description |
|-------------|-------------|
| Gallery layouts | Grid, Masonry, Slideshow, Stacked |
| Lightbox | Full-screen viewing with zoom/navigation |
| Image loading | Lazy load + blur placeholders |
| Portfolio pages | Category organization |
| Video embeds | YouTube support for public videos |
| DynamoDB | Galleries table setup |

**Milestone:** Full portfolio system working

#### Week 7: Contact Form & Booking Inquiry

| Deliverable | Description |
|-------------|-------------|
| Contact form | Native validation with honeypot spam protection |
| Spam protection | Honeypot + rate limiting |
| Lambda handler | Contact form processing |
| SES setup | Domain verification, email templates |
| Booking inquiry | Session type selection, preferred date, message |
| Inquiries table | DynamoDB storage and admin view |

**Milestone:** Working contact system with email

#### Week 8: Client Proofing Galleries

| Deliverable | Description |
|-------------|-------------|
| Password auth | Simple gallery-level authentication |
| Client gallery view | Selection mode with favorites |
| Selection workflow | Mark favorites, submit selections |
| Download system | S3 signed URLs for downloads |
| Private videos | S3 signed URLs for client videos |

**Milestone:** Client proofing system complete

#### Week 9: Admin Dashboard

| Deliverable | Description |
|-------------|-------------|
| Admin auth | Session-based authentication |
| Dashboard layout | Sidebar navigation |
| Overview stats | Recent activity, inquiry counts |
| Gallery CRUD | Create, edit, delete galleries |
| Image upload | S3 upload with Lambda processing |
| Inquiry management | View and update inquiry status |

**Milestone:** Admin can manage all content

#### Week 10: Blog, Polish & Launch

| Deliverable | Description |
|-------------|-------------|
| MDX blog | next-mdx-remote setup |
| Blog pages | Index and post templates |
| SEO | Meta tags, sitemap, structured data |
| Performance | Lighthouse optimization |
| Accessibility | WCAG 2.1 AA audit |
| Production deploy | Final deployment and verification |
| Content upload | Portfolio images, initial blog posts |
| Documentation | Owner how-to guides |

**Milestone:** Production launch

### Phase 2 Features (Post-MVP)

| Feature | Estimated Effort | Priority |
|---------|------------------|----------|
| Print sales / E-commerce | 4-6 weeks | P1 |
| Calendar booking integration | 2-3 weeks | P1 |
| Stripe payment for deposits | 1-2 weeks | P2 |
| Client accounts (optional) | 2-3 weeks | P3 |
| Automated email reminders | 1 week | P2 |
| Print lab integration | 3-4 weeks | P3 |
| Staging environment | 1 week | P3 |
| Watermarking (optional) | 1 week | P3 |

---

## 14. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| AWS costs exceed budget | Low | Medium | Set $20 billing alert, optimize image sizes |
| Gallery performance with many images | Medium | High | Implement virtualization from Week 5 |
| Admin dashboard scope creep | Medium | Medium | Start minimal, add incrementally |
| Timeline slippage | Medium | Medium | Buffer in weeks 9-10; defer blog if needed |
| Owner learning curve | Medium | Low | Step-by-step docs; `/deploy` skill automation |
| Security vulnerabilities | Low | High | Regular audits, dependency updates |

---

## 15. Code Review Findings & Remediation Checklist

> Full code review completed February 2026 across 5 domains: Frontend, Backend/Lambda, Infrastructure, Design/UX, and Testing. Findings are organized by priority. Check the box when remediated.

### 15.1 CRITICAL -- Must Fix Before Launch

#### Frontend Critical
- [x] **C-FE-1**: ~~HeroSection uses CSS `background-image` instead of `next/image`~~ -- Fixed: replaced with `next/image` component with `fill`, `priority`, responsive `sizes`
- [x] **C-FE-2**: ~~ImageCard uses raw `<img>` with ESLint suppression~~ -- Fixed: replaced with `next/image`, added lazy loading and responsive sizes
- [x] **C-FE-3**: ~~`next.config.js` security headers ineffective with static export~~ -- Fixed: removed dead `headers()`, added comment pointing to CloudFront config
- [x] **C-FE-4**: ~~`next.config.js` `redirects()` is a no-op~~ -- Fixed: removed dead `redirects()` function
- [x] **C-FE-5**: ~~Duplicate animation definitions~~ -- Fixed: removed CSS keyframe duplicates, kept Tailwind config as source of truth

#### Backend Critical
- [x] **C-BE-1**: Lambda functions have ZERO unit tests -- security-critical code paths untested (validation, rate limiting, CSRF, sanitization)
- [x] **C-BE-2**: ~~`CORS_ALLOWED_ORIGINS` not set in Lambda environment~~ -- Fixed: dynamically set based on `use_custom_domain` flag in `lambda.tf`
- [x] **C-BE-3**: ~~Lambda deployment zips TypeScript source directly~~ -- Fixed: added `null_resource` build steps (esbuild/tsc), archives now point at `dist/` output
- [x] **C-BE-4**: ~~`replyTo` email field not sanitized~~ -- Fixed: added `sanitizeForEmail()` call on `replyTo` in `sendNotificationEmail()`
- [x] **C-BE-5**: ~~`sessionType` field not length-validated~~ -- Fixed: added max 50 char validation for sessionType, max 254 char for email

#### Infrastructure Critical
- [x] **C-IF-1**: ~~Single IAM role with overly broad permissions~~ -- Fixed: scoped DynamoDB to inquiries table only (PutItem + Query), removed S3 and galleries/admin access
- [x] **C-IF-2**: ~~SNS alarm topic not encrypted~~ -- Fixed: added `kms_master_key_id = "alias/aws/sns"` encryption
- [x] **C-IF-3**: ~~SQS Dead Letter Queues not encrypted~~ -- Fixed: added `sqs_managed_sse_enabled = true` to both DLQs
- [x] **C-IF-4**: ~~S3 media CORS allows wildcard `*.cloudfront.net`~~ -- Fixed: uses specific CloudFront distribution domain name

#### Design/UX Critical
- [x] **C-UX-1**: ~~Gallery ImageCard titles invisible on mobile~~ -- Fixed: always-visible bottom gradient overlay with title
- [x] **C-UX-2**: ~~Buttons use `primary-600` failing WCAG AA~~ -- Fixed: replaced with `primary-700` (5.0:1 contrast) across 7 files
- [x] **C-UX-3**: ~~Dead dark mode CSS variables~~ -- Fixed: removed unused `prefers-color-scheme: dark` block from globals.css

### 15.2 WARNINGS -- Should Fix

#### Frontend Warnings
- [x] **W-FE-1**: ~~ContactForm sends honeypot field to server without client-side check~~ -- Fixed: added client-side honeypot early return before `fetch()` call
- [x] **W-FE-2**: ~~Services page has inconsistent data sourcing~~ -- Fixed: replaced hardcoded prices with `PACKAGES` constants ($299/$599/$999)
- [x] **W-FE-3**: ~~FAQAccordion uses index as React key~~ -- Fixed: changed to `key={item.question}` (unique strings)
- [ ] **W-FE-4**: Footer `COPY.footer.copyright` year baked in at build time -- stale year if built in December, served in January
- [x] **W-FE-5**: ~~Dead `.btn`, `.card`, `.input` CSS classes~~ -- Fixed: removed dead CSS component classes from globals.css
- [x] **W-FE-6**: ~~Unused npm dependencies~~ -- Fixed: removed `framer-motion`, `react-hook-form`, `@hookform/resolvers`, `swr`, `zod`
- [x] **W-FE-7**: ~~Portfolio page uses inline SVG~~ -- Fixed: replaced with existing `ArrowRightIcon` component
- [x] **W-FE-8**: ~~Custom `.duration-*` CSS conflict~~ -- Fixed: removed conflicting duration utilities from globals.css

#### Backend Warnings
- [x] **W-BE-1**: ~~`Promise.all` for notification/confirmation emails masks individual failures~~ -- Fixed: changed to `Promise.allSettled()` with per-email failure logging
- [x] **W-BE-2**: ~~`queryAllItems` in `db.ts` has no pagination safety limit~~ -- Fixed: added `maxItems` parameter (default 10000)
- [x] **W-BE-3**: ~~`sendEmailWithAttachment` has no filename sanitization~~ -- Fixed: added `filename.replace(/[^a-zA-Z0-9._-]/g, '_')` before MIME headers
- [x] **W-BE-4**: ~~DynamoDB `email-index` GSI uses `projection_type = "ALL"`~~ -- Fixed: changed to `KEYS_ONLY` (only used for COUNT queries)
- [x] **W-BE-5**: ~~Contact Lambda has S3 permissions it never uses~~ -- Fixed: removed S3 policy from contact Lambda role (C-IF-1 fix)

#### Infrastructure Warnings
- [x] **W-IF-1**: ~~No lifecycle rules on website S3 bucket~~ -- Fixed: added `aws_s3_bucket_lifecycle_configuration` with 30-day noncurrent version expiration
- [x] **W-IF-2**: ~~Logs bucket missing encryption, public access block, and lifecycle rules~~ -- Fixed: added SSE encryption, public access block, and 365-day lifecycle expiration
- [x] **W-IF-3**: ~~CloudWatch alarms only monitor inquiries DynamoDB table~~ -- Fixed: refactored to `for_each` over all 3 tables (inquiries, galleries, admin)
- [x] **W-IF-4**: ~~API Gateway uses deprecated `forwarded_values` in CloudFront~~ -- Fixed: replaced with `aws_cloudfront_cache_policy` and `aws_cloudfront_origin_request_policy`
- [x] **W-IF-5**: ~~CloudFront custom error responses mask legitimate 404s~~ -- By design: SPA routing requires 403/404→200 for default behavior; media and API paths have their own ordered cache behaviors that take priority
- [x] **W-IF-6**: ~~No `prevent_destroy` lifecycle on critical resources~~ -- Fixed: added `lifecycle { prevent_destroy = true }` to all 3 DynamoDB tables and media S3 bucket
- [x] **W-IF-7**: ~~WAF Bot Control rule costs ~$10/mo~~ -- Fixed: changed `enable_waf` default to `false` so it's opt-in for production
- [x] **W-IF-8**: ~~`lambda_reserved_concurrency` default of 50 is aggressive~~ -- Fixed: changed default to `-1` (unreserved, uses shared account pool); account concurrency limit too low for reserved allocation
- [x] **W-IF-9**: ~~No DMARC record for email domain~~ -- Fixed: added `aws_route53_record` for `_dmarc.${var.domain_name}` with quarantine policy
- [x] **W-IF-10**: ~~`X-Requested-With` header not in CloudFront forwarded headers~~ -- Fixed: added to forwarded headers in API behavior

#### Design/UX Warnings
- [x] **W-UX-1**: ~~MobileMenu lacks focus trapping~~ -- Fixed: added focus trap with Tab/Shift+Tab cycling, `role="dialog"`, `aria-modal="true"`
- [x] **W-UX-2**: ~~MobileMenu lacks Escape key handler~~ -- Fixed: added `useEffect` keydown listener for Escape, auto-focus close button on open
- [x] **W-UX-3**: ~~Header CTA uses `accent-500` failing WCAG AA~~ -- Fixed: changed to `accent-700` (5.0:1 contrast)
- [x] **W-UX-4**: ~~Hero CTA uses `accent-500`/`accent-600` failing WCAG AA~~ -- Fixed: changed to `accent-700`/`accent-800`
- [x] **W-UX-5**: ~~No `prefers-reduced-motion` support~~ -- Fixed: added `@media (prefers-reduced-motion: reduce)` to globals.css disabling animations/transitions
- [x] **W-UX-6**: ~~FAQ accordion `max-h-96` may truncate long answers~~ -- Fixed: increased to `max-h-[1000px]` for adequate content space
- [x] **W-UX-7**: ~~Navigation includes "Blog" link but no `/blog` page exists~~ -- Fixed: removed Blog from Navigation and Footer until blog is built
- [x] **W-UX-8**: ~~Placeholder phone in constants~~ -- Fixed: removed phone number entirely from `BUSINESS.contact`, Footer, ContactCTA, and contact page
- [x] **W-UX-9**: ~~Services page `lg:flex-row-reverse` on a grid container is dead CSS~~ -- Fixed: removed the non-functional class
- [x] **W-UX-10**: ~~Pricing inconsistency between constants and services page~~ -- Fixed: services page now uses `PACKAGES` constants ($299/$599/$999)

#### Testing Warnings
- [x] **W-TS-1**: ~~E2E testimonials test has tautological assertion (`|| true`)~~ -- Fixed: removed `|| true`, now properly asserts quotes or testimonial section exist
- [x] **W-TS-2**: ~~E2E layout shift test only checks screenshot length~~ -- Fixed: replaced with `Buffer.compare(screenshot1, screenshot2) === 0` for pixel-level comparison
- [x] **W-TS-3**: ~~Several E2E tests use soft conditional assertions~~ -- Fixed: converted all `if (count > 0)` patterns to direct hard assertions
- [x] **W-TS-4**: ~~TestimonialsSection has 66.7% function coverage~~ -- Fixed: added tests for keyboard navigation (ArrowLeft/Right), aria-selected, star ratings
- [x] **W-TS-5**: ~~ContactForm has 83.3% branch coverage~~ -- Fixed: added tests for honeypot bot detection, short name validation, field error clearing, server field errors, default messages

### 15.3 SUGGESTIONS -- Nice to Have

#### Frontend Suggestions
- [ ] **S-FE-1**: Extract about page values data to centralized constants
- [x] **S-FE-2**: ~~Use `zod` for ContactForm validation~~ -- N/A: `zod` removed as unused dependency (W-FE-6); native validation is sufficient for MVP
- [x] **S-FE-3**: ~~Use `react-hook-form` for ContactForm~~ -- N/A: `react-hook-form` and `@hookform/resolvers` removed as unused dependencies (W-FE-6)
- [ ] **S-FE-4**: Remove `'use client'` from pure SVG icon components -- can be Server Components
- [ ] **S-FE-5**: Reuse `isValidPhone` from `utils.ts` in ContactForm (currently duplicated regex)
- [ ] **S-FE-6**: Move portfolio category hardcoded data to `content/` JSON files

#### Backend Suggestions
- [x] **S-BE-1**: ~~Add email length validation~~ -- Fixed: added max 254 char validation (part of C-BE-5 fix)
- [ ] **S-BE-2**: Use template system in `email.ts` instead of inline email bodies in handler
- [ ] **S-BE-3**: Add `Retry-After` header to 429 (Too Many Requests) responses
- [ ] **S-BE-4**: Consider `convertEmptyValues: true` in DynamoDB Document Client
- [ ] **S-BE-5**: Add Content-Security-Policy header to CloudFront response headers
- [ ] **S-BE-6**: Use `aws_iam_policy_document` data sources instead of `jsonencode`
- [ ] **S-BE-7**: Enable Lambda X-Ray tracing for distributed trace debugging
- [ ] **S-BE-8**: Make CloudWatch log retention environment-dependent (14d dev, 30-90d prod)

#### Design/UX Suggestions
- [ ] **S-UX-1**: Add lightbox/modal for full-screen gallery image viewing
- [ ] **S-UX-2**: Add Schema.org structured data (LocalBusiness, Photographer, FAQPage)
- [ ] **S-UX-3**: Add loading/skeleton states for gallery pages
- [ ] **S-UX-4**: Add scroll-to-top button for long pages
- [ ] **S-UX-5**: Add `aria-current="page"` to active navigation links
- [ ] **S-UX-6**: Add print stylesheet for pricing/contact pages
- [ ] **S-UX-7**: Create `/privacy` and `/terms` pages (Footer links to them)
- [ ] **S-UX-8**: Add breadcrumb navigation to all interior pages

#### Infrastructure Suggestions
- [ ] **S-IF-1**: Add `abort_incomplete_multipart_upload` to media bucket lifecycle
- [ ] **S-IF-2**: Add CloudFront Function for `www` redirect when using custom domain
- [ ] **S-IF-3**: Reduce API Gateway logging level from INFO to ERROR in production
- [ ] **S-IF-4**: Enable CloudFront access logging by default (minimal cost)
- [ ] **S-IF-5**: Add explicit `depends_on` for API Gateway OPTIONS method in deployment triggers

#### Testing Suggestions
- [x] **S-TS-1**: ~~Add Lambda unit tests~~ -- Fixed: 72 Lambda tests added (C-BE-1), covering contact handler, response utils, email, db
- [ ] **S-TS-2**: Add error page unit tests (`error.tsx`, `not-found.tsx`, `global-error.tsx`)
- [x] **S-TS-3**: ~~Fix tautological E2E testimonials assertion~~ -- Fixed: same as W-TS-1
- [x] **S-TS-4**: ~~Convert soft E2E assertions to hard assertions~~ -- Fixed: same as W-TS-3
- [ ] **S-TS-5**: Add integration test layer between unit and E2E
- [ ] **S-TS-6**: Suppress jsdom navigation warnings in test setup

### 15.4 Completed Items

**Image Pipeline:**
- [x] Image auto-editing pipeline Terraform infrastructure (`image-processor.tf`)
- [x] Image processor Docker Lambda function (`lambda/image-processor/`)
- [x] Deploy script for image processor (`scripts/deploy-image-processor.sh`)
- [x] S3 media bucket lifecycle rules for staging/ and finished/ prefixes
- [x] S3 event notifications for CR2/CR3 file uploads
- [x] ECR repository with lifecycle policy
- [x] Dedicated IAM role for image processor (least privilege)
- [x] CloudWatch alarms for image processor (errors, duration, DLQ)

**Code Review Remediation (17/17 critical fixed, 37/38 warnings fixed, 5 suggestions fixed):**
- [x] C-FE-1 through C-FE-5: All frontend critical issues fixed (next/image, dead config, animation dedup)
- [x] C-BE-2 through C-BE-5: Backend critical issues fixed (CORS, TS build, sanitization, validation)
- [x] C-IF-1 through C-IF-4: Infrastructure critical issues fixed (IAM scoping, SNS/SQS encryption, CORS)
- [x] C-UX-1 through C-UX-3: Design/UX critical issues fixed (mobile visibility, contrast, dead CSS)
- [x] W-FE-1 through W-FE-3, W-FE-5 through W-FE-8: All frontend warnings fixed (honeypot, pricing, FAQ keys, dead CSS, unused deps, inline SVG)
- [x] W-BE-1 through W-BE-5: All backend warnings fixed (Promise.allSettled, pagination limit, filename sanitization, GSI projection, IAM)
- [x] W-IF-1 through W-IF-10: All infrastructure warnings fixed (lifecycle rules, logs hardening, DynamoDB alarms, cache policies, prevent_destroy, WAF default, concurrency, DMARC)
- [x] W-UX-1 through W-UX-10: All design/UX warnings fixed (focus trap, Escape key, contrast, reduced-motion, FAQ height, blog/phone removal, dead CSS, pricing)
- [x] W-TS-1 through W-TS-5: All testing warnings fixed (tautological assertion, pixel diff, hard assertions, TestimonialsSection coverage, ContactForm coverage)
- [x] S-BE-1: Email length validation added (max 254 chars)
- [x] S-FE-2, S-FE-3: Marked N/A — zod, react-hook-form removed as unused dependencies
- [x] S-TS-1, S-TS-3, S-TS-4: Lambda tests added, tautological/soft assertions fixed
- [x] Lambda TypeScript build pipeline (`scripts/build-lambdas.sh`, null_resource in Terraform)

**Infrastructure & Testing:**
- [x] Two-phase domain deployment plan (CloudFront default → custom domain)
- [x] Comprehensive 5-domain code review
- [x] C-BE-1: Lambda unit tests added (72 tests: response, email, contact handler)
- [x] 500 unit tests passing
- [x] 4 E2E test spec files across 5 browser configs
- [x] WAF with layered protection (Common, BadInputs, SQLi, RateLimit, BotControl)
- [x] CloudFront security headers policy (HSTS, X-Frame, XSS, Referrer-Policy)

### 15.5 Review Summary Statistics

| Review Domain | Critical | Warnings | Suggestions | Positive Patterns |
|---------------|----------|----------|-------------|-------------------|
| Frontend | 5 (5 fixed) | 8 (7 fixed, 1 open) | 6 (2 N/A, 4 open) | 11 |
| Backend/Lambda | 5 (5 fixed) | 5 (5 fixed) | 8 (1 fixed, 7 open) | 14 |
| Infrastructure | 4 (4 fixed) | 10 (10 fixed) | 5 (5 open) | 13 |
| Design/UX | 3 (3 fixed) | 10 (10 fixed) | 8 (8 open) | 12 |
| Testing | 0 | 5 (5 fixed) | 6 (3 fixed, 3 open) | 6 |
| **Total** | **17 (all fixed)** | **38 (37 fixed)** | **33 (6 fixed/N/A)** | **56** |

> **Remaining open items:** W-FE-4 (build-time year), plus 27 suggestions (nice-to-have, not blocking launch).

---

## 16. Appendices

### 16.1 Related Documents

| Document | Location | Purpose |
|----------|----------|---------|
| Functional Requirements | `docs/REQUIREMENTS.md` | Detailed feature specifications |
| System Architecture | `docs/ARCHITECTURE.md` | Technical design |
| Deployment Guide | `docs/DEPLOYMENT.md` | Deployment procedures |
| Claude Instructions | `CLAUDE.md` | Development context for Claude Code |

### 16.2 External Resources

| Resource | URL | Purpose |
|----------|-----|---------|
| AWS Console | console.aws.amazon.com | Infrastructure |
| Terraform Docs | terraform.io/docs | IaC reference |
| Next.js Docs | nextjs.org/docs | Framework reference |
| Google Analytics | analytics.google.com | Traffic analytics |

### 16.3 Glossary

| Term | Definition |
|------|------------|
| **LQIP** | Low Quality Image Placeholder - blur preview during load |
| **SSG** | Static Site Generation - pre-rendered HTML at build time |
| **ISR** | Incremental Static Regeneration - on-demand page updates |
| **OAC** | Origin Access Control - CloudFront S3 security |
| **SES** | Simple Email Service - AWS email sending |
| **CDN** | Content Delivery Network - edge caching |
| **MVP** | Minimum Viable Product - essential features for launch |
| **ECR** | Elastic Container Registry - Docker image storage |
| **DLQ** | Dead Letter Queue - captures failed async invocations |
| **CR2/CR3** | Canon RAW image formats |
| **LibRaw** | Open-source RAW image processing library |
| **Sharp** | High-performance Node.js image processing library |

### 16.4 Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2026 | Claude Code | First draft |
| 1.1 | January 2026 | Claude Code | MVP scope refinement - 8-10 week timeline, deferred e-commerce, simplified booking |
| 1.2 | January 2026 | Claude Code | Added detailed milestone breakdown, development workflow skills |
| 1.3 | January 2026 | Claude Code | **Static content & security updates:** (1) Testimonials, FAQ, Style Guide now static content (JSON/MDX files); (2) Client auth uses HttpOnly cookies (7-day sessions); (3) Admin inquiry view is read-only for MVP; (4) Added API Gateway throttling for rate limiting |
| 1.4 | February 2026 | Claude Code | **Image pipeline + code review:** (1) Added image auto-editing pipeline (S3 staging → Lambda → finished); (2) Comprehensive 5-domain code review with 17 critical, 38 warning, 33 suggestion findings; (3) Added Section 15 remediation checklist; (4) Updated architecture diagram with pipeline; (5) Updated S3 bucket structure; (6) Updated cost breakdown with WAF/ECR/pipeline costs; (7) Added image pipeline functional requirements (REQ-IMG-001 through REQ-IMG-010) |
| 1.5 | February 2026 | Claude Code | **Warning fixes complete:** (1) Fixed 37/38 warnings across all 5 domains (1 deferred: W-FE-4 build-time year); (2) Removed unused deps (framer-motion, react-hook-form, @hookform/resolvers, swr, zod); (3) Removed placeholder phone number from site; (4) Removed dead Blog links; (5) Added MobileMenu focus trap + Escape key + reduced-motion support; (6) Hardened Terraform: S3 lifecycle rules, logs encryption, DMARC, prevent_destroy, cache policies; (7) Improved backend: Promise.allSettled, pagination limits, filename sanitization; (8) Strengthened tests: 500 unit tests, removed tautological/soft assertions; (9) Updated tech stack (removed SWR, React Hook Form, Zod rows) |

---

## Document Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | | | |
| Technical Lead | | | |
| Stakeholder | | | |

---

*This PRD was generated by Claude Code using project documentation, MCP server integrations, and defined skills.*
