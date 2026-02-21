# Feature Checklist

## Deferred: RAW/JPEG Image Processing Pipeline

TODO: Re-enable the RAW/JPEG upload and processing pipeline:
- [ ] Restore RAW extensions (.cr2, .cr3, .nef, .arw, .dng, .raf, .rw2, .orf, .raw) upload support to `staging/RAW/`
- [ ] Restore JPEG/PNG upload path to `staging/JPEG/` (for image-processor Lambda to pick up)
- [ ] Re-enable `isRaw` parameter in `adminImages.getUploadUrl()` and Lambda POST handler
- [ ] Re-wire image-processor Lambda S3 trigger (`enable_image_processor=true` in Terraform)
- [ ] Add ProcessingQueue back to gallery edit page once RAW flow is active
- [ ] Update DashboardUploader to offer RAW upload option when pipeline is enabled
- [ ] Re-enable skipped tests in `tests/lambda/admin/handler.test.ts` (RAW/CR3 routing tests)
