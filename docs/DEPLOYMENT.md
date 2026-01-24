# Deployment Guide - Pitfal Solutions Website

## Document Info
- **Version:** 1.1 (MVP Scope Refined)
- **Last Updated:** January 2026
- **Status:** MVP Deployment Guide

---

## Before You Start

### Prerequisites Checklist

Before deploying, verify you have all required tools installed:

```bash
# Check Node.js version (need 20+)
node --version
# Expected: v20.x.x or higher

# Check pnpm
pnpm --version
# Expected: 8.x.x or higher (install with: npm install -g pnpm)

# Check AWS CLI
aws --version
# Expected: aws-cli/2.x.x

# Check Terraform
terraform --version
# Expected: Terraform v1.6.x or higher

# Check Docker (optional, for local dev)
docker --version
# Expected: Docker version 24.x.x or higher
```

### Quick Install Commands (macOS)

```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install all tools
brew install node pnpm awscli terraform

# Install Docker Desktop separately from: https://docker.com/desktop
```

### AWS Account Setup

1. **Create AWS Account** (if not exists)
   - Go to [aws.amazon.com](https://aws.amazon.com)
   - Follow signup process
   - **Important:** Set up billing alerts immediately

2. **Set up $20 Budget Alert**
   ```bash
   # After configuring AWS CLI (see step 3)
   aws budgets create-budget \
     --account-id $(aws sts get-caller-identity --query Account --output text) \
     --budget '{
       "BudgetName": "pitfal-monthly",
       "BudgetLimit": {"Amount": "20", "Unit": "USD"},
       "TimeUnit": "MONTHLY",
       "BudgetType": "COST"
     }' \
     --notifications-with-subscribers '[{
       "Notification": {
         "NotificationType": "ACTUAL",
         "ComparisonOperator": "GREATER_THAN",
         "Threshold": 80,
         "ThresholdType": "PERCENTAGE"
       },
       "Subscribers": [{
         "SubscriptionType": "EMAIL",
         "Address": "YOUR_EMAIL@example.com"
       }]
     }]'
   ```

3. **Create IAM User for Terraform**

   **Option A: Via AWS Console (Recommended for beginners)**
   1. Go to [IAM Console](https://console.aws.amazon.com/iam)
   2. Click "Users" → "Create user"
   3. Name: `terraform-pitfal`
   4. Check "Provide user access to AWS Management Console" (optional)
   5. Click "Attach policies directly"
   6. Search and select `AdministratorAccess`
   7. Create user
   8. Go to user → "Security credentials" → "Create access key"
   9. Select "Command Line Interface (CLI)"
   10. Download or copy the Access Key ID and Secret Access Key

   **Option B: Via AWS CLI**
   ```bash
   # Create user
   aws iam create-user --user-name terraform-pitfal

   # Attach policy
   aws iam attach-user-policy \
     --user-name terraform-pitfal \
     --policy-arn arn:aws:iam::aws:policy/AdministratorAccess

   # Create access keys (SAVE THESE!)
   aws iam create-access-key --user-name terraform-pitfal
   ```

4. **Configure AWS CLI Profile**
   ```bash
   aws configure --profile pitfal
   # Prompts:
   # AWS Access Key ID: [paste from step 3]
   # AWS Secret Access Key: [paste from step 3]
   # Default region: us-west-2
   # Default output format: json
   ```

5. **Verify Configuration**
   ```bash
   # This should return your account info
   aws sts get-caller-identity --profile pitfal
   ```

---

## 1. Deployment Strategy (MVP)

### Phased Approach

| Phase | Description | When |
|-------|-------------|------|
| **Phase A** | Manual first deploy | Week 1-2 |
| **Phase B** | Semi-automated (GitHub Actions) | Week 2+ |
| **Phase C** | Full CI/CD | Post-MVP |

### Environment Strategy (MVP)

| Environment | Purpose | URL |
|-------------|---------|-----|
| Development | Local dev | localhost:3000 |
| Production | Live site | www.pitfal.solutions |

> **Note:** Staging environment deferred to Phase 2. MVP deploys directly to production with manual verification.

---

## 2. Initial Infrastructure Setup

### Step 2.1: Create Terraform State Backend

Terraform needs a place to store its state. We'll use S3 with versioning.

```bash
# Set your AWS profile
export AWS_PROFILE=pitfal

# Create state bucket
aws s3api create-bucket \
  --bucket pitfal-terraform-state \
  --region us-west-2 \
  --create-bucket-configuration LocationConstraint=us-west-2

# Verify: Should show the bucket
aws s3 ls | grep pitfal-terraform-state
```

**Enable versioning (protects against accidental state loss):**
```bash
aws s3api put-bucket-versioning \
  --bucket pitfal-terraform-state \
  --versioning-configuration Status=Enabled

# Verify:
aws s3api get-bucket-versioning --bucket pitfal-terraform-state
# Expected: {"Status": "Enabled"}
```

**Enable encryption:**
```bash
aws s3api put-bucket-encryption \
  --bucket pitfal-terraform-state \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

**Create DynamoDB table for state locking:**
```bash
aws dynamodb create-table \
  --table-name pitfal-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-west-2

# Verify: Wait for "ACTIVE" status
aws dynamodb describe-table --table-name pitfal-terraform-locks \
  --query "Table.TableStatus"
# Expected: "ACTIVE"
```

### Step 2.2: Initialize Terraform

```bash
cd infrastructure/terraform

# Initialize with backend configuration
terraform init \
  -backend-config="bucket=pitfal-terraform-state" \
  -backend-config="key=website/terraform.tfstate" \
  -backend-config="region=us-west-2" \
  -backend-config="dynamodb_table=pitfal-terraform-locks"

# Verify: Should see "Terraform has been successfully initialized!"
```

### Step 2.3: Create Configuration File

Create `terraform.tfvars` with your settings:

```hcl
# infrastructure/terraform/terraform.tfvars

# General
project_name = "pitfal"
environment  = "production"
aws_region   = "us-west-2"

# Domain (update after Route 53 setup)
domain_name     = "pitfal.solutions"
# route53_zone_id = "Z1234567890ABC"  # Add after creating hosted zone

# Email
ses_from_email = "info@pitfal.solutions"
```

### Step 2.4: Deploy Infrastructure

```bash
# Preview what will be created
terraform plan

# Review the plan carefully, then apply
terraform apply

# Type 'yes' when prompted

# Save the outputs - you'll need these later
terraform output
```

**Verify Each Step:**
```bash
# Check S3 buckets were created
aws s3 ls | grep pitfal

# Check CloudFront distribution
aws cloudfront list-distributions --query "DistributionList.Items[*].{Id:Id,Domain:DomainName,Status:Status}"

# Check DynamoDB tables
aws dynamodb list-tables | grep pitfal
```

---

## 3. Domain Configuration

> **Migrating from Squarespace?** See the comprehensive [DNS Migration Guide](./DNS-MIGRATION.md) for step-by-step instructions on migrating from Squarespace to Route 53, including email preservation and rollback procedures.

### Step 3.1: Route 53 Setup

**If domain is NOT in Route 53:**
```bash
# Create hosted zone
aws route53 create-hosted-zone \
  --name pitfal.solutions \
  --caller-reference $(date +%s)

# Note the Zone ID from output (e.g., Z1234567890ABC)
# Note the NS records - you'll need these for your registrar
```

**Update your domain registrar:**
1. Log into your domain registrar (GoDaddy, Namecheap, etc.)
2. Find DNS/Nameserver settings
3. Replace nameservers with the NS records from Route 53

**Wait for propagation (can take up to 48 hours, usually faster):**
```bash
# Check if DNS is propagated
dig NS pitfal.solutions
# Should show Route 53 nameservers
```

### Step 3.2: SSL Certificate (ACM)

Terraform creates the certificate, but you need to validate it:

1. Go to [AWS Certificate Manager](https://console.aws.amazon.com/acm)
2. Select region: **us-east-1** (required for CloudFront)
3. Find the pending certificate for `pitfal.solutions`
4. Click "Create records in Route 53"
5. Wait for validation (usually 5-30 minutes)

**Verify certificate status:**
```bash
aws acm list-certificates --region us-east-1 \
  --query "CertificateSummaryList[?DomainName=='pitfal.solutions'].Status"
# Expected: "ISSUED"
```

---

## 4. Application Deployment

### Step 4.1: Build the Application

```bash
# From project root
cd /path/to/website

# Install dependencies
pnpm install

# Build for production (creates 'out/' directory)
pnpm build

# Verify build
ls -la out/
# Should see index.html and other files
```

### Step 4.2: Deploy Static Site to S3

```bash
# Get bucket name from Terraform output
BUCKET=$(cd infrastructure/terraform && terraform output -raw static_site_bucket)

# Deploy non-HTML files with long cache
aws s3 sync out/ s3://$BUCKET \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "*.html" \
  --profile pitfal

# Deploy HTML files with no-cache
aws s3 sync out/ s3://$BUCKET \
  --cache-control "public, max-age=0, must-revalidate" \
  --include "*.html" \
  --exclude "*" \
  --profile pitfal

# Verify
aws s3 ls s3://$BUCKET --profile pitfal
```

### Step 4.3: Deploy Lambda Functions

```bash
cd lambda

# Install dependencies
pnpm install

# Build TypeScript
pnpm build

# Package each function
for func in contact client-auth client-gallery admin process-image send-email; do
  echo "Packaging $func..."
  cd dist/$func
  zip -r ../../$func.zip .
  cd ../..
done

# Deploy each function
for func in contact client-auth client-gallery admin process-image send-email; do
  echo "Deploying $func..."
  aws lambda update-function-code \
    --function-name pitfal-$func \
    --zip-file fileb://$func.zip \
    --profile pitfal
done
```

### Step 4.4: Invalidate CloudFront Cache

```bash
# Get distribution ID
DIST_ID=$(cd ../infrastructure/terraform && terraform output -raw cloudfront_distribution_id)

# Create invalidation
aws cloudfront create-invalidation \
  --distribution-id $DIST_ID \
  --paths "/*" \
  --profile pitfal

# Check invalidation status
aws cloudfront list-invalidations --distribution-id $DIST_ID --profile pitfal
```

### Step 4.5: Verify Deployment

```bash
# Check site is accessible
curl -I https://www.pitfal.solutions

# Check API endpoint
curl https://www.pitfal.solutions/api/health
```

---

## 5. CI/CD Pipeline (GitHub Actions)

### Step 5.1: Add GitHub Secrets

Go to your repository → Settings → Secrets and variables → Actions

Add these secrets:

| Secret | Value |
|--------|-------|
| `AWS_ACCESS_KEY_ID` | Your IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | Your IAM user secret key |
| `CLOUDFRONT_DISTRIBUTION_ID` | From Terraform output |

### Step 5.2: Workflow File

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  AWS_REGION: us-west-2
  NODE_VERSION: '20'

jobs:
  # Always run tests
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install

      - name: Lint
        run: pnpm lint

      - name: Type check
        run: pnpm type-check

      - name: Test
        run: pnpm test

  # Build on all branches
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install

      - name: Build
        run: pnpm build

      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: build
          path: out/

  # Deploy only on main branch
  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Download build artifact
        uses: actions/download-artifact@v4
        with:
          name: build
          path: out/

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Deploy to S3
        run: |
          # Deploy assets with long cache
          aws s3 sync out/ s3://pitfal-static-site \
            --delete \
            --cache-control "public, max-age=31536000, immutable" \
            --exclude "*.html"

          # Deploy HTML with no cache
          aws s3 sync out/ s3://pitfal-static-site \
            --cache-control "public, max-age=0, must-revalidate" \
            --include "*.html" \
            --exclude "*"

      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"
```

---

## 6. Email Configuration (SES)

### Step 6.1: Verify Domain

```bash
# Request domain verification
aws ses verify-domain-identity \
  --domain pitfal.solutions \
  --region us-west-2

# Get verification token
aws ses get-identity-verification-attributes \
  --identities pitfal.solutions \
  --region us-west-2
```

Add the TXT record to Route 53:
- Name: `_amazonses.pitfal.solutions`
- Type: TXT
- Value: (from verification token)

### Step 6.2: Request Production Access

By default, SES is in sandbox mode. To send to any email:

1. Go to [SES Console](https://console.aws.amazon.com/ses)
2. Click "Request production access"
3. Fill out the form explaining your use case
4. Wait for approval (usually 24-48 hours)

---

## 7. Troubleshooting

### Common Issues and Solutions

| Issue | Symptom | Solution |
|-------|---------|----------|
| **403 on S3** | Access Denied | Check CloudFront OAC settings; verify bucket policy |
| **502 on API** | Bad Gateway | Check Lambda logs: `aws logs tail /aws/lambda/pitfal-contact --follow` |
| **SSL error** | Certificate invalid | Ensure ACM cert is validated and in us-east-1 |
| **Slow images** | Long load times | Check CloudFront cache headers; verify image processing Lambda |
| **CORS errors** | Blocked by CORS | Add CORS headers to API Gateway |
| **Terraform state lock** | Lock error | Check DynamoDB table; force unlock if needed |

### Useful Debug Commands

```bash
# Check CloudFront distribution status
aws cloudfront get-distribution \
  --id $DIST_ID \
  --query "Distribution.Status"

# View Lambda logs (live tail)
aws logs tail /aws/lambda/pitfal-contact --follow --profile pitfal

# Check API Gateway
aws apigateway get-rest-apis --profile pitfal

# Test Lambda directly
aws lambda invoke \
  --function-name pitfal-contact \
  --payload '{"body": "{\"test\": true}"}' \
  response.json \
  --profile pitfal
cat response.json

# Check S3 bucket policy
aws s3api get-bucket-policy --bucket pitfal-static-site --profile pitfal

# Check DynamoDB table
aws dynamodb scan --table-name pitfal-inquiries --profile pitfal
```

### Terraform Issues

```bash
# Unlock state (use with caution)
terraform force-unlock LOCK_ID

# Refresh state
terraform refresh

# Import existing resource
terraform import aws_s3_bucket.static pitfal-static-site

# Destroy and recreate specific resource
terraform destroy -target=aws_lambda_function.contact
terraform apply
```

---

## 8. Rollback Procedures

### Static Site Rollback

S3 versioning allows easy rollback:

```bash
# List versions of index.html
aws s3api list-object-versions \
  --bucket pitfal-static-site \
  --prefix index.html \
  --profile pitfal

# Restore previous version
aws s3api copy-object \
  --bucket pitfal-static-site \
  --key index.html \
  --copy-source "pitfal-static-site/index.html?versionId=VERSION_ID" \
  --profile pitfal

# Invalidate cache
aws cloudfront create-invalidation \
  --distribution-id $DIST_ID \
  --paths "/*" \
  --profile pitfal
```

### Lambda Rollback

```bash
# List Lambda versions
aws lambda list-versions-by-function \
  --function-name pitfal-contact \
  --profile pitfal

# Update to previous version (if using aliases)
aws lambda update-alias \
  --function-name pitfal-contact \
  --name live \
  --function-version 5 \
  --profile pitfal
```

### Full Infrastructure Rollback

```bash
# Terraform maintains state history
cd infrastructure/terraform

# Show previous state versions
aws s3api list-object-versions \
  --bucket pitfal-terraform-state \
  --prefix website/terraform.tfstate \
  --profile pitfal
```

---

## 9. Quick Reference

### Key URLs

| Resource | URL |
|----------|-----|
| Website | https://www.pitfal.solutions |
| AWS Console | https://console.aws.amazon.com |
| CloudFront | https://console.aws.amazon.com/cloudfront |
| S3 | https://console.aws.amazon.com/s3 |
| Lambda | https://console.aws.amazon.com/lambda |
| CloudWatch Logs | https://console.aws.amazon.com/cloudwatch |
| SES | https://console.aws.amazon.com/ses |

### Key Commands

```bash
# Deploy everything (shortcut)
pnpm deploy  # Uses /deploy skill

# Build and test
pnpm build

# View logs
pnpm logs  # Uses /logs skill

# Terraform
cd infrastructure/terraform
terraform plan    # Preview
terraform apply   # Deploy
terraform destroy # Remove (careful!)
```

---

## 10. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2026 | Claude Code | First draft |
| 1.1 | January 2026 | Claude Code | Added beginner-friendly sections, prerequisites checklist, step-by-step verification, simplified deployment strategy for MVP |
