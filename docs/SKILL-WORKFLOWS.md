# Skill Integration Workflows

This document describes how Claude Code skills work together for common workflows in the Pitfal Solutions project.

---

## 1. Adding New Gallery Content

Complete workflow for adding photos to a new gallery:

```
┌─────────────────────────────────────────────────────────────────┐
│                  New Gallery Content Workflow                    │
└─────────────────────────────────────────────────────────────────┘

Step 1: Create Gallery Structure
│
│   /gallery-manage create portrait-003 portraits
│   └── Creates folder structure with metadata.json
│
└── Copy original images to content/galleries/portrait-003/originals/

Step 2: Validate Images
│
│   /gallery-manage validate content/galleries/portrait-003
│   └── Checks formats, file sizes, naming conventions
│
└── Fix any issues (convert RAW files, resize oversized images)

Step 3: Optimize Images
│
│   /optimize-images content/galleries/portrait-003/originals
│   └── Generates WebP variants, thumbnails, blur placeholders
│
└── Verify output in processed/, thumbnails/, blur/ folders

Step 4: Sync to S3
│
│   /sync-content portrait-003
│   └── Uploads gallery to s3://pitfal-media/galleries/portrait-003/
│
└── Verify files in S3

Step 5: Create Database Record
│
│   Use admin dashboard or API to create gallery entry
│   └── Links S3 content to DynamoDB metadata
│
└── Gallery now visible on website
```

---

## 2. Local Development Setup

Set up a new developer's local environment:

```
┌─────────────────────────────────────────────────────────────────┐
│                Local Development Setup Workflow                  │
└─────────────────────────────────────────────────────────────────┘

Step 1: Clone and Install
│
│   git clone <repo>
│   cd website
│   pnpm install
│
└── Dependencies installed

Step 2: Configure Environment
│
│   cp .env.example .env.local
│   # Edit .env.local with AWS credentials
│
└── Environment configured

Step 3: Seed Database (Optional)
│
│   /db-seed
│   └── Populates DynamoDB with sample galleries, inquiries, settings
│
└── Sample data available

Step 4: Start Development Server
│
│   /preview
│   └── Starts Next.js on localhost:3000
│
└── Site running locally with production S3 images
```

---

## 3. Production Deployment

Full deployment workflow:

```
┌─────────────────────────────────────────────────────────────────┐
│                  Production Deployment Workflow                  │
└─────────────────────────────────────────────────────────────────┘

Step 1: Build and Test
│
│   /build
│   └── Runs lint, type-check, tests, and production build
│
└── If any step fails, fix issues before continuing

Step 2: Commit Changes
│
│   git add .
│   git commit -m "feat: add new gallery feature"
│   git push
│
└── Changes pushed to repository

Step 3: Deploy
│
│   /deploy
│   │
│   ├── Pre-checks (tests, type-check, git status)
│   ├── Terraform plan/apply (infrastructure)
│   ├── S3 sync (static assets)
│   └── CloudFront invalidation (cache clear)
│
└── Site live at https://pitfal.solutions

Step 4: Verify
│
│   Open https://pitfal.solutions
│   /logs (if issues arise)
│
└── Deployment complete
```

---

## 4. Debugging Production Issues

Workflow for investigating production problems:

```
┌─────────────────────────────────────────────────────────────────┐
│                  Production Debugging Workflow                   │
└─────────────────────────────────────────────────────────────────┘

Step 1: Check Logs
│
│   /logs
│   └── Fetches recent CloudWatch logs for all Lambda functions
│
└── Identify error patterns

Step 2: Investigate Specific Function
│
│   /logs contact --errors
│   └── Filters for ERROR level logs in contact function
│
└── Find root cause

Step 3: Local Reproduction
│
│   /preview
│   └── Start local dev server
│   └── Attempt to reproduce issue locally
│
└── Debug with local tools

Step 4: Fix and Deploy
│
│   Make code changes
│   /build (verify fix)
│   /deploy
│
└── Issue resolved
```

---

## 5. Content Update Workflow

Update existing gallery content:

```
┌─────────────────────────────────────────────────────────────────┐
│                   Content Update Workflow                        │
└─────────────────────────────────────────────────────────────────┘

Step 1: Modify Local Content
│
│   Add/remove/edit images in content/galleries/{gallery-id}/originals/
│
└── Local changes made

Step 2: Re-optimize Changed Images
│
│   /optimize-images content/galleries/{gallery-id}
│   └── Regenerates variants for new/changed images
│
└── Optimized versions ready

Step 3: Sync to S3
│
│   /sync-content {gallery-id}
│   └── Uploads only changed files
│
└── S3 updated (uses aws s3 sync for efficiency)

Step 4: Update Database (if needed)
│
│   Use admin dashboard to update gallery metadata
│   └── New images appear in gallery
│
└── Website reflects changes
```

---

## Skill Quick Reference

| Skill | Purpose | When to Use |
|-------|---------|-------------|
| `/gallery-manage` | Gallery organization | Creating/validating local galleries |
| `/optimize-images` | Image processing | After adding new images |
| `/sync-content` | S3 upload | After optimizing images |
| `/db-seed` | Database population | Local dev setup |
| `/preview` | Local dev server | Development and testing |
| `/build` | Build and test | Before deployment |
| `/deploy` | Production deploy | Pushing to live site |
| `/logs` | View CloudWatch logs | Debugging production |
| `/stripe-setup` | Payment config | Setting up Stripe (Phase 2) |

---

## Skill Dependencies

```
/gallery-manage ───┐
                   ├──► /optimize-images ──► /sync-content ──► /deploy
Copy images ───────┘

/db-seed ──────────────────────────────────────────────────► Local dev ready

/build ────────────────────────────────────────────────────► /deploy

Issues ──► /logs ──► Debug ──► Fix ──► /build ──► /deploy
```

---

## Tips

1. **Always validate before optimizing** - Catch format issues early
2. **Use sync, not copy** - `sync-content` only uploads changed files
3. **Check logs after deploy** - Catch issues before users report them
4. **Local dev uses prod S3** - No need to sync images for development
5. **Seed data is for dev only** - Never run `/db-seed` against production
