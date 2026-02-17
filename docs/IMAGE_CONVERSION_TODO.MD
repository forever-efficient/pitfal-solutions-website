# RAW Image Upload + N8N + darktable-cli Pipeline

## Overview

Replace the ImagenAI-based orchestration (which requires a paid API key) with **N8N** (running on the existing Linux server) as the orchestration layer, and **darktable-cli** (free, open-source) as the RAW processing engine.

From the admin's perspective the flow is unchanged: upload RAW → get edited JPEG in gallery automatically.

---

## Architecture

```
Admin uploads RAW (drag-drop in ImageUploader)
        ↓
S3 staging/{galleryId}/{uuid}-filename.cr2
        ↓
Frontend confirms upload → POST /api/admin/processing-jobs
        ↓
Admin Lambda:
  1. Creates PROCESSING_JOB record (status: 'uploading')
  2. Generates S3 presigned download URL (RAW file, 1hr TTL)
  3. Generates S3 presigned upload URL (JPEG destination in finished/, 1hr TTL)
  4. POSTs to N8N_WEBHOOK_URL with { jobId, galleryId, files, completionCallbackUrl, completionSecret }
  5. Updates job status to 'processing'
        ↓
N8N workflow (Linux server):
  1. Download RAW via presigned URL → /tmp/{jobId}.raw
  2. Run: darktable-cli /tmp/{jobId}.raw /tmp/{jobId}.jpg --style /presets/pitfal.dtstyle
  3. Upload JPEG via presigned PUT URL
  4. POST /api/admin/processing-jobs?complete=true { jobId, outputKey, completionSecret }
  5. Cleanup /tmp/{jobId}.*
        ↓
Admin Lambda completion handler:
  - Validates completionSecret
  - Marks job 'complete', sets resultKeys, completedAt
  - Appends outputKey to gallery.images in DynamoDB (galleries table)
  - Deletes RAW file from S3 staging/
        ↓
ProcessingQueue auto-refresh shows 'complete'
Gallery admin and client viewer show finished JPEG
```

---

## What Already Exists (Do NOT Change)

- `src/components/admin/ImageUploader.tsx` — RAW file accept + staging/ routing
- `src/components/admin/ProcessingQueue.tsx` — job status UI
- `src/components/admin/ProcessingSettings.tsx` — auto/manual mode toggle
- `src/lib/api.ts` — `adminProcessing` object
- Admin Lambda: presigned URL staging routing, `handleProcessingJobs` GET, `handleSettings` GET/PUT
- `src/app/admin/galleries/edit/page.tsx` — ProcessingQueue already included

---

## Data Model Changes

**DynamoDB Admin Table — Processing Job:**
- Remove `imagenProjectId` field (not needed)
- Keep all other fields: `pk`, `sk`, `jobId`, `galleryId`, `rawKeys[]`, `status`, `mode`, `createdAt`, `updatedAt`, `completedAt?`, `resultKeys?[]`, `error?`

**DynamoDB Admin Table — Settings:**
- Remove `imagenProfileId`
- Add `darktablePreset` (optional string, for future multi-preset support; initially unused)

---

## New Environment Variables

| Variable | Used In | Purpose |
|---|---|---|
| `N8N_WEBHOOK_URL` | Admin Lambda | N8N webhook endpoint to POST job payloads |
| `COMPLETION_SECRET` | Admin Lambda | Shared secret N8N sends back to authenticate the callback |

**Remove:** `ORCHESTRATOR_FUNCTION_NAME`, `IMAGENAI_PROFILE_ID`

---

## Files to Modify

### 1. `lambda/admin/index.ts`

**Change A — Imports/constants (top of file):**
- Remove: `LambdaClient`, `InvokeCommand` from `@aws-sdk/client-lambda`
- Remove: `const lambdaClient = new LambdaClient({})`
- Remove: `const ORCHESTRATOR_FUNCTION_NAME = process.env.ORCHESTRATOR_FUNCTION_NAME`
- Add: `const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL`
- Add: `const COMPLETION_SECRET = process.env.COMPLETION_SECRET`
- Keep: `generatePresignedDownloadUrl` is already in `../shared/s3` — just add it to the import

**Change B — `handleProcessingJobs` POST (~lines 853–903):**

Replace the `lambdaClient.send(InvokeCommand)` block with:
1. For each rawKey, generate a presigned download URL (1hr TTL)
2. Compute `outputKey = finished/${galleryId}/${uuid}.jpg` for each RAW
3. Generate a presigned PUT URL for each outputKey
4. Build `completionCallbackUrl` from the request origin/SITE_URL
5. `fetch(N8N_WEBHOOK_URL, { method: 'POST', body: JSON.stringify({ jobId, galleryId, files: [{ downloadUrl, uploadUrl, outputKey }], completionCallbackUrl, completionSecret: COMPLETION_SECRET }) })`
6. Update job status from `'queued'` → `'processing'`

**Change C — Add completion handler in `handleProcessingJobs`:**

Detect `event.queryStringParameters?.complete === 'true'` at the top of the function (before GET/POST routing):

```ts
if (event.queryStringParameters?.complete === 'true') {
  // Only accept POST
  if (method !== 'POST') return methodNotAllowed(undefined, requestOrigin);

  let body: { jobId?: string; outputKey?: string; completionSecret?: string; error?: string };
  try { body = JSON.parse(event.body || '{}'); } catch { return badRequest('Invalid JSON', requestOrigin); }

  // Validate secret
  if (!body.completionSecret || body.completionSecret !== COMPLETION_SECRET) {
    return unauthorized('Invalid completion secret', requestOrigin);
  }

  if (!body.jobId) return badRequest('jobId is required', requestOrigin);

  // Fetch the job record
  const job = await getItem<ProcessingJobRecord>({
    TableName: ADMIN_TABLE!,
    Key: { pk: `PROCESSING_JOB#${body.jobId}`, sk: `PROCESSING_JOB#${body.jobId}` },
  });
  if (!job) return notFound('Job not found', requestOrigin);

  if (body.error) {
    // Mark job failed
    await updateItem({ TableName: ADMIN_TABLE!, Key: { pk: job.pk, sk: job.sk },
      UpdateExpression: 'SET #status = :status, #error = :error, updatedAt = :updatedAt',
      ExpressionAttributeNames: { '#status': 'status', '#error': 'error' },
      ExpressionAttributeValues: { ':status': 'failed', ':error': body.error, ':updatedAt': new Date().toISOString() },
    });
    return success({ received: true }, 200, requestOrigin);
  }

  if (!body.outputKey) return badRequest('outputKey is required', requestOrigin);

  const now = new Date().toISOString();

  // Mark job complete
  await updateItem({ TableName: ADMIN_TABLE!, Key: { pk: job.pk, sk: job.sk },
    UpdateExpression: 'SET #status = :status, resultKeys = :resultKeys, completedAt = :completedAt, updatedAt = :updatedAt',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':status': 'complete', ':resultKeys': [body.outputKey], ':completedAt': now, ':updatedAt': now },
  });

  // Append outputKey to gallery.images
  await updateItem({ TableName: GALLERIES_TABLE!, Key: { id: job.galleryId },
    UpdateExpression: 'SET images = list_append(if_not_exists(images, :empty), :newImage), updatedAt = :updatedAt',
    ExpressionAttributeValues: { ':newImage': [{ key: body.outputKey }], ':empty': [], ':updatedAt': now },
  });

  // Delete raw files from staging
  await deleteS3Objects(MEDIA_BUCKET!, job.rawKeys);

  log('INFO', 'Processing job completed', ctx, { jobId: body.jobId, outputKey: body.outputKey });
  return success({ received: true }, 200, requestOrigin);
}
```

**Change D — Update `ProcessingJobRecord` interface:**
- Remove `imagenProjectId?: string`

**Change E — Update `SettingsRecord` interface:**
- Remove `imagenProfileId: string`
- Add `darktablePreset?: string`

**Change F — Update `handleSettings`:**
- Replace all `imagenProfileId` references with `darktablePreset`

---

### 2. `lambda/admin/package.json`

Remove `"@aws-sdk/client-lambda": "^3.0.0"` from dependencies.

---

### 3. `src/lib/api.ts`

**`ProcessingJob` interface:**
- Remove `imagenProjectId?: string`

**`ProcessingSettings` interface:**
- Remove `imagenProfileId: string`
- Add `darktablePreset?: string`

No changes needed to `adminProcessing` methods.

---

### 4. `src/components/admin/ProcessingSettings.tsx`

- Remove the ImagenAI dashboard link (`<a href="https://app.imagen-ai.com" ...>ImagenAI dashboard →</a>`)
- Remove the `settings.imagenProfileId` display block
- Update component state initialization: `{ processingMode: 'auto' }` (no imagenProfileId)
- Keep the auto/manual toggle entirely unchanged

---

### 5. `infrastructure/terraform/variables.tf`

**Add:**
```hcl
variable "n8n_webhook_url" {
  description = "N8N webhook URL for RAW image processing jobs"
  type        = string
  sensitive   = true
  default     = ""
}

variable "completion_secret" {
  description = "Shared secret for N8N completion callback authentication"
  type        = string
  sensitive   = true
  default     = ""
}
```

**Remove or comment out:**
```hcl
variable "imagenai_api_key" { ... }
variable "imagenai_profile_id" { ... }
```

Keep: `processing_mode`, `enable_raw_pipeline`, and all image processor variables.

---

### 6. `infrastructure/terraform/lambda.tf`

In the `aws_lambda_function.admin` environment variables block:

**Add:**
```hcl
N8N_WEBHOOK_URL  = var.n8n_webhook_url
COMPLETION_SECRET = var.completion_secret
```

**Remove:**
```hcl
ORCHESTRATOR_FUNCTION_NAME = var.enable_raw_pipeline ? "${local.name_prefix}-image-processor-orchestrator" : ""
IMAGENAI_PROFILE_ID        = var.imagenai_profile_id
```

---

### 7. `infrastructure/terraform/iam.tf`

Remove the entire `aws_iam_role_policy.admin_lambda_invoke` resource (admin Lambda no longer invokes orchestrator Lambda):

```hcl
# DELETE THIS ENTIRE BLOCK:
resource "aws_iam_role_policy" "admin_lambda_invoke" {
  name = "${local.name_prefix}-admin-lambda-invoke"
  role = aws_iam_role.admin_lambda.id
  ...
}
```

---

## Files to Delete

These were built for the ImagenAI orchestration and are fully superseded by the N8N approach. All were gated behind `enable_raw_pipeline = false` and never ran in production.

| File/Directory | Action |
|---|---|
| `lambda/image-processor-orchestrator/` | Delete entire directory |
| `lambda/image-processor-poller/` | Delete entire directory |
| `infrastructure/terraform/image-processor-orchestrator.tf` | Delete file |
| `infrastructure/terraform/image-processor-poller.tf` | Delete file |
| `tests/lambda/image-processor-orchestrator/` | Delete entire directory |
| `tests/lambda/image-processor-poller/` | Delete entire directory |
| `tests/lambda/image-processor/` | Delete entire directory |

---

## API Gateway

No changes needed. The completion callback uses `POST /api/admin/processing-jobs?complete=true`, which is already covered by the existing `processing-jobs` ANY method.

---

## N8N Setup (Manual — Not Code)

### Prerequisites on N8N Linux server

```bash
sudo apt-get update && sudo apt-get install -y darktable
darktable-cli --version   # verify install
```

### Creating your darktable preset (.dtstyle)

1. Install darktable desktop on any machine
2. Open one RAW file, edit to your desired style (exposure, color, sharpening, etc.)
3. In the darkroom: Styles panel → click `+` → name it "pitfal" → Export
4. Copy to N8N server: `/home/n8n/presets/pitfal.dtstyle`

### N8N workflow nodes (in order)

1. **Webhook** — POST endpoint; respond 200 immediately (async)
2. **HTTP Request** — GET `{{ $json.files[0].downloadUrl }}` → binary, save as `/tmp/{{ $json.jobId }}.raw`
3. **Execute Command** — `darktable-cli /tmp/{{ $json.jobId }}.raw /tmp/{{ $json.jobId }}.jpg --style /home/n8n/presets/pitfal.dtstyle`
4. **HTTP Request** — PUT `{{ $json.files[0].uploadUrl }}` — JPEG binary, `Content-Type: image/jpeg`
5. **HTTP Request** — POST `{{ $json.completionCallbackUrl }}?complete=true` — body: `{ jobId, outputKey: $json.files[0].outputKey, completionSecret: $json.completionSecret }`
6. **Execute Command** — `rm /tmp/{{ $json.jobId }}.*` (cleanup)

### N8N error handling

- Add error branch after step 3 (darktable failure) → POST callback with `{ jobId, error: "darktable processing failed", completionSecret }`
- Set N8N execution timeout to 10 minutes (large RAW files: 30–60 sec each)

---

## Auto vs Manual Mode

**Auto mode** (default): After each RAW uploads to staging, `ImageUploader` immediately calls `POST /api/admin/processing-jobs` → Lambda fires N8N webhook → processing starts.

**Manual mode**: After RAW upload, file appears in `ProcessingQueue` with status `queued`. User clicks "Process Now" → `POST /api/admin/processing-jobs` → Lambda fires N8N webhook.

> **Note:** Review how `stagedRawKeys` flows from `ImageUploader` → `ProcessingQueue` in `src/app/admin/galleries/edit/page.tsx`. In manual mode, `ImageUploader` should NOT call `triggerJob` on upload — it adds to `stagedRawKeys` state only. The "Process Now" button triggers it.

---

## Terraform Apply (After Code Changes)

```bash
cd infrastructure/terraform
terraform plan \
  -var="n8n_webhook_url=https://your-n8n.example.com/webhook/process-photo" \
  -var="completion_secret=your-secret-here"
terraform apply \
  -var="n8n_webhook_url=https://your-n8n.example.com/webhook/process-photo" \
  -var="completion_secret=your-secret-here"
```

---

## Verification Checklist

- [ ] `pnpm exec vitest run` — no regressions after removing Lambda client
- [ ] Drag `.CR2` into ImageUploader → S3 `staging/{galleryId}/` has the file
- [ ] DynamoDB admin table has `PROCESSING_JOB#...` record with status `processing`
- [ ] N8N execution log shows darktable ran and JPEG uploaded to `finished/{galleryId}/`
- [ ] DynamoDB job → `complete`; gallery record images array has new key
- [ ] Admin gallery edit page shows new JPEG; client portal shows image
- [ ] Set N8N webhook URL to invalid → job stays `processing` (expected timeout behavior)
- [ ] PUT `/api/admin/settings` with `processingMode: 'manual'` → RAW upload does NOT trigger N8N until "Process Now" clicked
