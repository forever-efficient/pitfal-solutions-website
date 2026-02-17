# IMAGE CONVERSION TODO (IMAGEN API STRATEGY)

## Goal
Support admin upload of RAW files (`.CR2`, `.CR3`, `.DNG`, `.NEF`, `.ARW`, etc.) and automatically deliver edited JPEG outputs into gallery images using an Imagen API-driven pipeline.

## Why This Plan Exists
This is the Imagen-specific implementation track.
The n8n/darktable track is documented separately in `IMAGE_CONVERSION_TODO.MD`.

## Scope
In scope:
- RAW upload support in admin uploader.
- Job orchestration via existing backend + Lambda workflow.
- External processing through Imagen API.
- Result ingestion (JPEG back to S3 finished path + gallery record update).
- Operational safety, retries, observability, and test coverage >90%.

Out of scope:
- Replacing n8n plan.
- Building custom RAW editing engine.
- AI prompt-based retouching UI in this phase.

## Proposed Architecture
1. Admin uploads RAW to S3 `staging/{galleryId}/...`.
2. API creates `PROCESSING_JOB` record in DynamoDB with status `queued`.
3. Orchestrator Lambda submits job to Imagen API and stores provider job id.
4. Poller Lambda checks status until `complete` or `failed`.
5. On success, processed JPEG is copied/stored in `finished/{galleryId}/...`.
6. Gallery image list is updated to include new JPEG key.
7. Job record transitions to `complete` or `failed` with reason.

## Public API / Interface Changes
1. `POST /api/admin/processing-jobs`
- Input: galleryId, sourceKey(s), optional preset/profile.
- Output: internal job id + initial status.

2. `GET /api/admin/processing-jobs/:id`
- Output: provider status mapping (`queued|processing|complete|failed`), timestamps, error.

3. `PUT /api/admin/settings` (if needed)
- Add/confirm fields:
  - `processingProvider: "imagen" | "n8n"`
  - `processingMode: "auto" | "manual"`
  - `imagenProfileId` (optional default profile)
  - `maxConcurrentJobs` (safety throttle)

## Data Model / State
DynamoDB job item fields:
- `pk/sk` job identity.
- `galleryId`, `sourceKey`, `outputKey`.
- `provider = "imagen"`.
- `providerJobId`.
- `status`.
- `attempts`.
- `errorCode`, `errorMessage`.
- `createdAt`, `updatedAt`, `completedAt`.

Status transitions:
- `queued -> processing -> complete`
- `queued -> processing -> failed`
- `processing -> failed` on timeout/retry exhaustion

## Security and Compliance
1. Keep Imagen API credentials in Secrets Manager/SSM, never in repo.
2. Use least-privilege IAM for Lambda access to S3/DynamoDB/secrets.
3. Validate MIME + extension server-side before queuing.
4. Enforce max file size and per-gallery upload limits.

## Failure Handling and Recovery
1. Retry Imagen submission on transient HTTP errors with backoff.
2. Retry polling on transient provider failures.
3. Mark terminal failure with actionable reason.
4. Add requeue endpoint/tooling for failed jobs.
5. Dead-letter handling for repeated failures.

## Observability
1. Structured logs with `jobId`, `galleryId`, `providerJobId`.
2. Metrics:
- queued count
- processing latency
- success/failure rate
- timeout count
3. Alarm on sustained failure spikes and long-running processing backlog.

## Testing Plan (Coverage Target >90%)
Unit:
1. RAW extension validation utility.
2. Provider request/response mapping.
3. Status transition guards.
4. Retry/backoff logic.
5. Error normalization logic.

Integration:
1. `POST /processing-jobs` creates valid DynamoDB record.
2. Orchestrator stores `providerJobId` on successful submit.
3. Poller completes and writes JPEG output key.
4. Poller failure path updates job with error.
5. Settings endpoint respects `processingProvider` and `processingMode`.

End-to-end:
1. Upload `.CR3` in admin, confirm JPEG appears in gallery.
2. Simulate Imagen timeout, verify failed status and no gallery mutation.
3. Manual mode: upload does not auto-start until explicit trigger.

CI/CD gates:
1. Coverage threshold: lines/branches/functions/statements >= 90%.
2. Build + tests required before deploy.
3. Optional nightly smoke against staging provider sandbox.

## Rollout Plan
1. Feature flag: `enable_raw_pipeline=true` in non-prod first.
2. Canary rollout to selected galleries/admin users.
3. Monitor metrics and logs for 48 hours.
4. Full rollout after stable success/error rates.

## Open Dependencies
1. Confirm Imagen API access and credentials availability.
2. Confirm provider limits (rate, payload size, supported RAW formats).
3. Confirm output profile mapping (color profile, JPEG quality, resizing defaults).

## Acceptance Criteria
1. RAW upload supported for target extensions.
2. Jobs process through Imagen with observable statuses.
3. Completed JPEG automatically appears in gallery and client portal.
4. Failure cases are visible, retryable, and do not corrupt gallery state.
5. Automated tests keep overall coverage above 90%.

## Definition of Done
1. API + Lambda + data model behavior aligned with this document.
2. Tests implemented and CI gates passing at >=90% coverage.
3. Runbook notes added for operations and failure recovery.
4. Effort tracking exists only in:
- `IMAGE_CONVERSION_TODO.MD`
- `IMAGE_CONVERSION_IMAGEN_TODO.MD`
