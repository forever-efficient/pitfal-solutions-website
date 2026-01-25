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
| `/test` | Run tests | Before committing, CI/CD validation |
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

## 6. First-Time Infrastructure Setup

Complete workflow for initial AWS infrastructure deployment:

```
┌─────────────────────────────────────────────────────────────────┐
│              First-Time Infrastructure Setup Workflow            │
└─────────────────────────────────────────────────────────────────┘

Step 1: Prerequisites Check
│
│   # Verify all tools installed
│   aws sts get-caller-identity --profile pitfal  # AWS credentials
│   terraform --version                           # Terraform 1.6+
│   pnpm --version                                # pnpm 8+
│
└── All prerequisites confirmed

Step 2: Create Terraform State Backend
│
│   # Create S3 bucket for state (one-time, manual)
│   aws s3api create-bucket --bucket pitfal-terraform-state \
│     --region us-west-2 --create-bucket-configuration LocationConstraint=us-west-2
│
│   # Create DynamoDB table for state locking
│   aws dynamodb create-table --table-name pitfal-terraform-locks \
│     --attribute-definitions AttributeName=LockID,AttributeType=S \
│     --key-schema AttributeName=LockID,KeyType=HASH \
│     --billing-mode PAY_PER_REQUEST
│
└── State backend ready

Step 3: Initialize Terraform
│
│   cd infrastructure/terraform
│   terraform init \
│     -backend-config="bucket=pitfal-terraform-state" \
│     -backend-config="key=website/terraform.tfstate" \
│     -backend-config="region=us-west-2"
│
└── Terraform initialized (shows "Successfully configured backend")

Step 4: Create Configuration
│
│   # Create terraform.tfvars
│   cp terraform.tfvars.example terraform.tfvars
│   # Edit with your domain, email, region settings
│
└── Configuration ready

Step 5: Plan and Review
│
│   terraform plan -out=tfplan
│   │
│   └── Review the plan carefully:
│       - Check resource counts (expect ~20-30 resources)
│       - Verify no unexpected destroys
│       - Confirm region and naming
│
└── Plan approved

Step 6: Apply Infrastructure
│
│   terraform apply tfplan
│   │
│   ├── Creates S3 buckets (static site, media)
│   ├── Creates CloudFront distribution
│   ├── Creates DynamoDB tables (3 tables with GSIs)
│   ├── Creates Lambda functions (6 functions)
│   ├── Creates API Gateway
│   ├── Sets up SES domain verification
│   └── Configures IAM roles and policies
│
└── Infrastructure deployed (save the outputs!)

Step 7: Post-Deploy Verification
│
│   terraform output           # Save these values
│   /logs                      # Check for any errors
│   curl -I https://$(terraform output -raw cloudfront_domain)
│
└── Infrastructure verified and ready for content
```

**Common Terraform Errors and Solutions:**

| Error | Cause | Solution |
|-------|-------|----------|
| "Error acquiring state lock" | Previous operation interrupted | `terraform force-unlock LOCK_ID` |
| "Bucket already exists" | S3 bucket name taken | Change `project_name` in tfvars |
| "Certificate validation timeout" | DNS not propagated | Wait longer, verify NS records |
| "Lambda deployment package too large" | Dependencies too big | Use Lambda layers for shared deps |

---

## 7. Error Recovery Workflows

### 7.1 Recovering from Failed `/optimize-images`

If image optimization fails partway through:

```
┌─────────────────────────────────────────────────────────────────┐
│              Optimize-Images Recovery Workflow                   │
└─────────────────────────────────────────────────────────────────┘

Step 1: Identify Failed Images
│
│   # Check the error output - lists which images failed
│   # Common causes: corrupt files, unsupported formats, permission issues
│
└── List of failed images

Step 2: Fix Individual Issues
│
│   # For corrupt images: re-export from source
│   # For unsupported formats: convert to JPEG/PNG first
│   # For permission issues: chmod 644 on image files
│
└── Issues resolved

Step 3: Re-run Optimization
│
│   /optimize-images content/galleries/{gallery-id}/originals
│   │
│   └── Script detects already-processed images (by timestamp)
│       and only processes new/changed ones
│
└── Optimization complete

Step 4: Verify Output
│
│   # Check processed/ directory has all expected sizes
│   ls -la content/galleries/{gallery-id}/processed/
│
└── All images optimized
```

### 7.2 Recovering from Failed `/sync-content`

If S3 sync fails partway through:

```
┌─────────────────────────────────────────────────────────────────┐
│               Sync-Content Recovery Workflow                     │
└─────────────────────────────────────────────────────────────────┘

Step 1: Check Partial Upload State
│
│   # List what made it to S3
│   aws s3 ls s3://pitfal-media/galleries/{gallery-id}/ --recursive
│
└── Identify which files uploaded successfully

Step 2: Check for Errors
│
│   # Common causes:
│   # - Network interruption: simply re-run
│   # - Permission denied: check IAM policy
│   # - Bucket not found: verify bucket name
│
└── Root cause identified

Step 3: Re-run Sync
│
│   /sync-content {gallery-id}
│   │
│   └── aws s3 sync only uploads missing/changed files
│       Already-uploaded files are skipped (efficient)
│
└── Sync complete

Step 4: Verify Completion
│
│   /sync-content {gallery-id} --dry-run
│   └── Should show "0 files to upload"
│
└── All content synced
```

### 7.3 Recovering from Failed `/deploy`

If deployment fails:

```
┌─────────────────────────────────────────────────────────────────┐
│                  Deploy Recovery Workflow                        │
└─────────────────────────────────────────────────────────────────┘

Step 1: Identify Failure Point
│
│   # Check where in the pipeline it failed:
│   # - Pre-checks (tests/lint): Fix code issues
│   # - Terraform: Check terraform error output
│   # - S3 sync: Check AWS credentials/permissions
│   # - CloudFront: Check distribution status
│
└── Failure point identified

Step 2a: If Terraform Failed
│
│   cd infrastructure/terraform
│   terraform plan                # See what's different
│   │
│   # If state is corrupted:
│   terraform state list          # Check current state
│   terraform refresh             # Sync state with reality
│   │
│   # If resource stuck:
│   terraform taint aws_resource.name  # Mark for recreation
│   terraform apply
│
└── Terraform recovered

Step 2b: If S3 Sync Failed
│
│   # Re-run just the S3 sync portion
│   BUCKET=$(terraform output -raw static_site_bucket)
│   aws s3 sync out/ s3://$BUCKET --delete
│
└── S3 sync recovered

Step 2c: If CloudFront Failed
│
│   # Check distribution status
│   DIST_ID=$(terraform output -raw cloudfront_distribution_id)
│   aws cloudfront get-distribution --id $DIST_ID --query "Distribution.Status"
│   │
│   # If "InProgress", wait for completion
│   # If "Deployed" but wrong content, create new invalidation:
│   aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"
│
└── CloudFront recovered

Step 3: Verify Recovery
│
│   curl -I https://www.pitfal.solutions
│   /logs --errors
│
└── Deployment recovered
```

---

## 8. Static Content Workflow

For testimonials, FAQ, and style guide (managed via JSON/MDX files, not admin dashboard):

```
┌─────────────────────────────────────────────────────────────────┐
│                  Static Content Update Workflow                  │
└─────────────────────────────────────────────────────────────────┘

Step 1: Edit Content Files
│
│   # Testimonials
│   vim content/testimonials.json
│   │
│   # FAQ
│   vim content/faq.json
│   │
│   # Style Guide
│   vim content/blog/style-guide.mdx
│
└── Content edited locally

Step 2: Validate JSON (for testimonials/FAQ)
│
│   # Check JSON syntax
│   cat content/testimonials.json | jq .
│   cat content/faq.json | jq .
│   │
│   └── If error, fix syntax issues
│
└── JSON valid

Step 3: Preview Locally
│
│   /preview
│   └── Open localhost:3000/testimonials (or /faq, /style-guide)
│       Verify content displays correctly
│
└── Content looks good

Step 4: Commit and Deploy
│
│   git add content/
│   git commit -m "content: update testimonials with new client quotes"
│   /deploy
│
└── Static content live
```

**Content File Schemas:**

```json
// content/testimonials.json
{
  "testimonials": [
    {
      "id": "t001",
      "clientName": "Jane Smith",
      "quote": "Amazing photos! Captured our wedding perfectly.",
      "rating": 5,
      "eventType": "Event",
      "date": "2025-11-15",
      "featured": true
    }
  ]
}

// content/faq.json
{
  "categories": [
    {
      "name": "Booking",
      "order": 1,
      "questions": [
        {
          "id": "b001",
          "question": "How do I book a session?",
          "answer": "Fill out the inquiry form on our **Contact** page..."
        }
      ]
    }
  ]
}
```

---

## Tips

1. **Always validate before optimizing** - Catch format issues early
2. **Use sync, not copy** - `sync-content` only uploads changed files
3. **Check logs after deploy** - Catch issues before users report them
4. **Local dev uses prod S3** - No need to sync images for development
5. **Seed data is for dev only** - Never run `/db-seed` against production
6. **Infrastructure first** - Always deploy Terraform before content
7. **Static content via Git** - Testimonials/FAQ/Style Guide are code, not database
8. **Save Terraform outputs** - You'll need bucket names and distribution IDs
