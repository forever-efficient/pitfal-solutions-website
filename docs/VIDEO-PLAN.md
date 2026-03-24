# Video Upload & Preview System — Implementation Plan & Decisions

**Date:** March 2026
**Status:** Implementation in progress

---

## Overview

Video management system for Pitfal Solutions: upload videos to S3 via CLI, generate short muted MP4 preview clips via AWS MediaConvert, and display them in an auto-scrolling carousel on the homepage. Full video playback uses YouTube embeds. Client galleries support video downloads via presigned URLs.

---

## Architecture

```
Upload Flow:
  aws s3 cp video.mp4 s3://pitfal-prod-media/staging/videos/ --profile pitfal
       │
       ▼
  Admin Dashboard (/admin/videos)
  ├── Discovers videos in staging/videos/
  ├── Admin sets preview clip: start time + duration (3-15s)
  ├── Admin adds YouTube URL for full playback
  └── "Generate Preview" button
       │
       ▼
  Lambda (POST /api/admin/videos/preview)
  ├── Creates MediaConvert job (H.264, 720p, no audio, clip extraction)
  ├── Output: video-previews/{videoId}-preview.mp4
  └── Tracks job in DynamoDB (ADMIN table: pk=VIDEO_JOB#{videoId})
       │
       ▼
  Admin polls status → assigns video + preview to gallery
  ├── Copy: staging/videos/{file} → gallery/{galleryId}/videos/{file}
  ├── DynamoDB gallery.videos[] updated
  └── Staging copy deleted

Display Flow:
  Homepage FeaturedGallery
  ├── VideoCarousel replaces videography static card
  ├── Fetches: GET /api/galleries/video-previews (public, no auth)
  ├── Auto-scrolling <video muted autoPlay loop playsInline> elements
  └── Falls back to static videography card if 0 previews

  Gallery Viewer (/portfolio/videography/{gallery})
  ├── Images in masonry grid (unchanged)
  ├── Videos section below: preview clip + YouTube embed/link
  └── Client galleries: download button for original video
```

---

## Key Design Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **No browser video upload** | Large video files (500MB+) are unreliable via browser presigned URLs. CLI upload (`aws s3 cp`) is faster and more reliable. Admin dashboard discovers from `staging/videos/` prefix. |
| 2 | **MediaConvert for preview extraction** | AWS-managed, handles all common formats (MP4/MOV/AVI/MKV/WebM), on-demand pricing ($0.024/min), no infrastructure to maintain. Cheaper than running FFmpeg in Docker Lambda for this use case. |
| 3 | **Short muted MP4 loops** (not GIF/WebP) | Superior quality at smaller file size. `muted` + `playsInline` attributes enable autoplay in all browsers without user interaction. Instagram/TikTok-style previews. |
| 4 | **YouTube for full playback** | No need to build a custom video player or serve large files via CloudFront. YouTube handles adaptive bitrate, mobile optimization, and bandwidth. Admin adds YouTube URL per video. |
| 5 | **Glacier Instant Retrieval after 90 days** | Full videos in `gallery/*/videos/*` transition to Glacier IR (~80% cheaper: $0.004/GB vs $0.023/GB). Millisecond retrieval still works transparently. |
| 6 | **Separate `videos` array in gallery record** | Keeps video metadata separate from `images` array. Each entry has: `key`, `previewKey`, `youtubeUrl`, `title`, `previewStart`, `previewDuration`. No migration needed (DynamoDB schemaless). |
| 7 | **VideoCarousel replaces videography card** | Fits naturally into the existing FeaturedGallery 3-column bottom row. Falls back to static card when no previews exist, preserving current behavior. |
| 8 | **MediaConvert endpoint cached per cold start** | MediaConvert requires a `DescribeEndpoints` API call (region-specific endpoint). Cached in module-level variable — only ~500ms extra on first invocation per cold start. |

---

## S3 Prefix Structure

```
pitfal-prod-media/
├── staging/videos/          # CLI-uploaded videos awaiting admin review (30-day auto-cleanup)
├── gallery/{galleryId}/videos/  # Assigned videos (Glacier IR transition after 90 days)
├── video-previews/          # Generated preview clips (permanent, small files)
├── ... (existing prefixes unchanged)
```

---

## API Routes

### Admin Routes (require auth)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/videos/ready` | GET | List videos in `staging/videos/` |
| `/api/admin/videos/ready` | DELETE | Batch delete staged videos |
| `/api/admin/videos/preview` | POST | Trigger MediaConvert preview generation |
| `/api/admin/videos/preview-status` | GET | Poll MediaConvert job status (`jobId` query param) |
| `/api/admin/videos/assign` | POST | Move video + preview to gallery, set YouTube URL |

### Public Routes (no auth)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/galleries/video-previews` | GET | Preview clips for homepage carousel (non-password-protected galleries only) |

---

## DynamoDB Schema

### Gallery Record Extension (pitfal-prod-galleries)

```typescript
// Added to existing GalleryRecord interface
videos?: Array<{
  key: string;           // gallery/{galleryId}/videos/{filename}
  alt?: string;
  previewKey?: string;   // video-previews/{videoId}-preview.mp4
  previewStart?: number; // seconds
  previewDuration?: number; // seconds
  title?: string;
  youtubeUrl?: string;   // YouTube link for full playback
}>;
```

### MediaConvert Job Tracking (pitfal-prod-admin)

```
pk: VIDEO_JOB#{videoId}
sk: JOB
Attributes:
  videoId, videoKey, previewKey, startTime, duration
  mediaConvertJobId, status (processing|complete|error)
  createdAt, updatedAt
```

---

## Monthly Cost

| State | Added Cost | Notes |
|-------|-----------|-------|
| MediaConvert | ~$0.01-0.10 | $0.024/min transcoded. 10-sec clips = $0.004 each |
| S3 Standard (staging + previews) | ~$0.05 | Small preview files + 30-day staging |
| S3 Glacier IR (gallery videos) | ~$0.004/GB after 90 days | 80% cheaper than Standard |
| CloudFront (preview delivery) | ~$0.01-0.50 | Small MP4 previews, low bandwidth |
| **Total added** | **~$1-3/month** | Well within <$20 budget |

---

## Files Created/Modified

### New Files

| File | Purpose |
|------|---------|
| `infrastructure/terraform/mediaconvert.tf` | MediaConvert queue + IAM execution role |
| `src/components/admin/VideoManager.tsx` | Admin video discovery, preview generation, gallery assignment |
| `src/app/admin/videos/page.tsx` | Admin videos page |
| `src/components/sections/VideoCarousel.tsx` | Homepage auto-scrolling video preview carousel |
| `tests/lambda/admin/video-handler.test.ts` | Backend Lambda handler tests |
| `tests/components/sections/VideoCarousel.test.tsx` | Carousel component tests |

### Modified Files

| File | Change |
|------|--------|
| `infrastructure/terraform/iam.tf` | MediaConvert permissions for admin Lambda |
| `infrastructure/terraform/s3.tf` | Lifecycle rules: staging/videos/ cleanup + Glacier IR transition |
| `infrastructure/terraform/api-gateway.tf` | 5 new API route groups |
| `infrastructure/terraform/lambda.tf` | MediaConvert env vars for admin Lambda |
| `lambda/admin/index.ts` | 5 new handler functions + GalleryRecord `videos` field |
| `lambda/admin/package.json` | `@aws-sdk/client-mediaconvert` dependency |
| `src/lib/api.ts` | `adminVideos` namespace + `publicGalleries.getVideoPreviews` |
| `src/components/admin/AdminSidebar.tsx` | "Videos" nav item |
| `src/components/sections/FeaturedGallery.tsx` | VideoCarousel integration (replaces videography card) |
| `src/components/gallery/GalleryViewer.tsx` | Video section with YouTube embeds |
| `docs/ARCHITECTURE.md` | v1.8: video system documentation |
| `CLAUDE.md` | Video system summary |

---

## Edge Cases & Gotchas

| Scenario | Handling |
|----------|----------|
| MediaConvert job fails | Admin UI shows error with retry button, allows different start/duration |
| Unsupported video format | Extension validated server-side. MediaConvert handles MP4/MOV/AVI/MKV/WebM |
| 0 video previews on homepage | VideoCarousel falls back to static videography card |
| Browser autoplay blocked | `muted` + `playsInline` attributes universally enable autoplay |
| Staging videos expire | 30-day S3 lifecycle on `staging/videos/` only — assigned + previews are permanent |
| MediaConvert endpoint discovery | Cached per cold start via DescribeEndpoints (~500ms first call) |
| Glacier IR retrieval | Millisecond retrieval, transparent to users. Cost: $0.01/1000 requests |
| DynamoDB 400KB item limit | ~200 bytes per video entry → 2000+ videos per gallery to hit limit |
| CloudFront range requests | Handled automatically for video seeking, no config needed |
| Client gallery video downloads | Existing presigned URL pattern from bulk-download works for video keys |

---

## Verification Checklist

- [ ] `terraform validate` passes
- [ ] `pnpm type-check` passes
- [ ] All existing tests pass
- [ ] `terraform plan` shows expected resources (MediaConvert, IAM, API Gateway, S3 lifecycle)
- [ ] Upload test video via CLI to `staging/videos/`
- [ ] Admin Videos page discovers the staged video
- [ ] Preview generation triggers MediaConvert job
- [ ] Preview clip appears after job completes
- [ ] Video assigned to a public gallery
- [ ] Homepage carousel displays the preview clip
- [ ] Gallery viewer shows video section with YouTube embed
- [ ] Client gallery video download works via presigned URL
- [ ] Staged videos auto-cleanup after 30 days (verify lifecycle rule)
