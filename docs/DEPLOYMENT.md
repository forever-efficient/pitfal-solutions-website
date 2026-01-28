# Deployment Guide - Pitfal Solutions Website

## Document Info
- **Version:** 1.3 (Two-Phase Domain Deployment)
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

### Terraform Modular Structure

The infrastructure uses a modular Terraform design for maintainability and reusability:

```
infrastructure/terraform/
├── main.tf                  # Provider config, backend, locals
├── variables.tf             # Input variables
├── outputs.tf               # Output values (bucket names, URLs, etc.)
├── terraform.tfvars         # Environment-specific values
│
├── modules/
│   ├── lambda/              # Reusable Lambda function module
│   │   ├── main.tf          # Lambda resource, IAM role
│   │   ├── variables.tf     # Function name, handler, env vars
│   │   └── outputs.tf       # Function ARN, invoke URL
│   ├── api-gateway/         # API Gateway REST API module
│   │   ├── main.tf          # REST API, resources, methods
│   │   ├── variables.tf     # API name, Lambda integrations
│   │   └── outputs.tf       # API URL, stage
│   └── dynamodb/            # DynamoDB table module
│       ├── main.tf          # Table, GSIs, TTL settings
│       ├── variables.tf     # Table name, keys, GSI config
│       └── outputs.tf       # Table ARN, stream ARN
│
├── s3.tf                    # S3 buckets (static site, media)
├── cloudfront.tf            # CloudFront distribution, OAC
├── dynamodb.tf              # Table definitions (uses module)
├── lambda.tf                # Function definitions (uses module)
├── api-gateway.tf           # REST API (uses module)
├── ses.tf                   # SES domain, email templates
├── iam.tf                   # Shared IAM roles, policies
├── route53.tf               # DNS records
├── acm.tf                   # SSL certificates
└── cloudwatch.tf            # Log groups, alarms, dashboards
```

**Key Design Decisions:**
- **Modules for repeatability:** Lambda module used 6 times with different configs
- **Consistent naming:** All resources prefixed with `pitfal-{env}-`
- **Outputs for integration:** CloudFront ID, bucket names exposed for CI/CD
- **Separate concerns:** Each `.tf` file handles one AWS service

### Step 2.0: Pre-Deployment Checklist

Before deploying infrastructure, verify all prerequisites:

```bash
# ✅ AWS credentials configured
aws sts get-caller-identity --profile pitfal
# Expected: Returns account ID and user ARN

# ✅ Correct region set
aws configure get region --profile pitfal
# Expected: us-west-2

# ✅ Terraform installed
terraform --version
# Expected: v1.6.x or higher

# ✅ Project dependencies installed
cd /path/to/website
pnpm install
# Expected: No errors

# ✅ Environment variables file exists
cat .env.local
# Expected: Contains AWS_PROFILE, NEXT_PUBLIC_MEDIA_URL, etc.

# ✅ Lambda code compiles
cd lambda && pnpm build
# Expected: dist/ directory created with compiled JS
```

**If any check fails, resolve before proceeding.**

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

## 3. Domain Deployment Strategy

The infrastructure supports two deployment modes controlled by the `use_custom_domain` variable:

| Mode | `use_custom_domain` | Domain | Certificate | Use Case |
|------|---------------------|--------|-------------|----------|
| **Phase 1** | `false` (default) | `*.cloudfront.net` | CloudFront default | Initial deployment, testing |
| **Phase 2** | `true` | `pitfal.solutions` | ACM certificate | Production with custom domain |

This two-phase approach allows you to deploy and fully test the website before configuring DNS.

---

### Phase 1: Deploy on CloudFront Default Domain

Use this phase to deploy the website without requiring DNS configuration or SSL certificate validation.

#### Phase 1 Checklist

```
Phase 1: CloudFront Default Domain Deployment
=============================================

Prerequisites:
[ ] AWS credentials configured (aws sts get-caller-identity --profile pitfal)
[ ] Terraform state backend created (S3 bucket + DynamoDB table)
[ ] Project dependencies installed (pnpm install)
[ ] Lambda code builds successfully (cd lambda && pnpm build)

Step 1: Initialize Terraform
[ ] cd infrastructure/terraform
[ ] terraform init
[ ] Verify: "Terraform has been successfully initialized!"

Step 2: Plan Infrastructure (CloudFront Default Domain)
[ ] terraform plan -var="use_custom_domain=false"
[ ] Verify: NO aws_acm_certificate resources in plan
[ ] Verify: NO aws_route53_record resources in plan
[ ] Verify: CloudFront aliases = [] (empty)
[ ] Review plan, note total resources to create

Step 3: Apply Infrastructure
[ ] terraform apply -var="use_custom_domain=false"
[ ] Type 'yes' to confirm
[ ] Wait for completion (typically 5-15 minutes for CloudFront)
[ ] Save outputs: terraform output > ../terraform-outputs.txt

Step 4: Record CloudFront Domain
[ ] CLOUDFRONT_DOMAIN=$(terraform output -raw cloudfront_domain_name)
[ ] echo "CloudFront Domain: $CLOUDFRONT_DOMAIN"
[ ] Record this domain: _________________________________.cloudfront.net

Step 5: Build Frontend with CloudFront URLs
[ ] cd ../..  (back to project root)
[ ] Export environment variables:
    export NEXT_PUBLIC_SITE_URL=https://$CLOUDFRONT_DOMAIN
    export NEXT_PUBLIC_API_URL=https://$CLOUDFRONT_DOMAIN/api
[ ] pnpm build
[ ] Verify: out/ directory created with index.html

Step 6: Deploy to S3
[ ] BUCKET=$(cd infrastructure/terraform && terraform output -raw website_bucket_name)
[ ] aws s3 sync out/ s3://$BUCKET --delete --profile pitfal
[ ] Verify: aws s3 ls s3://$BUCKET --profile pitfal | head -5

Step 7: Invalidate CloudFront Cache
[ ] DIST_ID=$(cd infrastructure/terraform && terraform output -raw cloudfront_distribution_id)
[ ] aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*" --profile pitfal
[ ] Wait 2-5 minutes for invalidation to complete

Step 8: Verify Deployment
[ ] curl -I https://$CLOUDFRONT_DOMAIN
    Expected: HTTP/2 200
[ ] Open https://$CLOUDFRONT_DOMAIN in browser
    Expected: Website loads correctly
[ ] Test contact form submission
    Expected: Form submits without CORS errors
[ ] Check CloudWatch logs for any Lambda errors
    aws logs tail /aws/lambda/pitfal-prod-contact --since 10m --profile pitfal

Phase 1 Complete!
=================
Website URL: https://_________________________________.cloudfront.net
Distribution ID: _________________________________
S3 Bucket: _________________________________

Next: When ready to use custom domain, proceed to Phase 2.
```

#### Phase 1 Quick Commands

```bash
# All Phase 1 commands in sequence
cd infrastructure/terraform
terraform init
terraform plan -var="use_custom_domain=false"
terraform apply -var="use_custom_domain=false"

# Get outputs
CLOUDFRONT_DOMAIN=$(terraform output -raw cloudfront_domain_name)
BUCKET=$(terraform output -raw website_bucket_name)
DIST_ID=$(terraform output -raw cloudfront_distribution_id)

# Build and deploy frontend
cd ../..
NEXT_PUBLIC_SITE_URL=https://$CLOUDFRONT_DOMAIN \
NEXT_PUBLIC_API_URL=https://$CLOUDFRONT_DOMAIN/api \
pnpm build

aws s3 sync out/ s3://$BUCKET --delete --profile pitfal
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*" --profile pitfal

# Verify
echo "Website URL: https://$CLOUDFRONT_DOMAIN"
curl -I https://$CLOUDFRONT_DOMAIN
```

---

### Phase 2: Migrate to Custom Domain

Once Phase 1 is verified working, migrate to the custom domain. This requires:
- DNS access (Route 53 or external DNS provider)
- Time for SSL certificate validation (5-30 minutes with Route 53, longer with external DNS)

#### Phase 2 Checklist

```
Phase 2: Custom Domain Migration
================================

Prerequisites:
[ ] Phase 1 deployment verified working
[ ] Access to DNS management for pitfal.solutions
[ ] (Optional) Route 53 hosted zone created

Option A: Using Route 53 (Automatic DNS Validation)
---------------------------------------------------

Step 1: Get Route 53 Zone ID
[ ] aws route53 list-hosted-zones --query "HostedZones[?Name=='pitfal.solutions.'].Id" --output text
[ ] Record Zone ID: _________________________________

Step 2: Plan with Custom Domain
[ ] cd infrastructure/terraform
[ ] terraform plan \
      -var="use_custom_domain=true" \
      -var="route53_zone_id=YOUR_ZONE_ID"
[ ] Verify: aws_acm_certificate.main will be created
[ ] Verify: aws_route53_record.cert_validation will be created
[ ] Verify: CloudFront aliases include domain names

Step 3: Apply with Custom Domain
[ ] terraform apply \
      -var="use_custom_domain=true" \
      -var="route53_zone_id=YOUR_ZONE_ID"
[ ] Wait for ACM certificate validation (5-30 minutes)
[ ] Wait for CloudFront distribution update (5-15 minutes)

Step 4: Verify Certificate
[ ] aws acm list-certificates --region us-east-1 \
      --query "CertificateSummaryList[?DomainName=='pitfal.solutions'].Status"
    Expected: "ISSUED"


Option B: Using External DNS (Manual Validation)
------------------------------------------------

Step 1: Plan with Custom Domain (no Route 53)
[ ] cd infrastructure/terraform
[ ] terraform plan -var="use_custom_domain=true"
[ ] Note: Plan will create certificate but validation will wait

Step 2: Apply (Certificate Created but Pending)
[ ] terraform apply -var="use_custom_domain=true"
[ ] This will likely timeout waiting for certificate validation
[ ] That's OK - we need to add DNS records manually

Step 3: Get Validation Records
[ ] terraform output certificate_validation_records
[ ] Record the CNAME records:
    Name: _________________________________
    Value: _________________________________
    Name: _________________________________
    Value: _________________________________

Step 4: Add DNS Records to External Provider
[ ] Log into your DNS provider (GoDaddy, Namecheap, Cloudflare, etc.)
[ ] Add CNAME records from Step 3
[ ] Wait for propagation (check with: dig CNAME _your_validation_record)

Step 5: Complete Terraform Apply
[ ] terraform apply -var="use_custom_domain=true"
[ ] This time it should complete successfully

Step 6: Add CloudFront DNS Records
[ ] Get CloudFront domain: terraform output -raw cloudfront_domain_name
[ ] Add to external DNS:
    - pitfal.solutions -> CNAME -> $CLOUDFRONT_DOMAIN
    - www.pitfal.solutions -> CNAME -> $CLOUDFRONT_DOMAIN


Common Steps (Both Options)
---------------------------

Step 7: Rebuild Frontend with Production URLs
[ ] cd ../..  (back to project root)
[ ] unset NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_API_URL  # Clear temporary vars
[ ] pnpm build
[ ] Verify: Build uses default production URLs

Step 8: Redeploy to S3
[ ] BUCKET=$(cd infrastructure/terraform && terraform output -raw website_bucket_name)
[ ] aws s3 sync out/ s3://$BUCKET --delete --profile pitfal

Step 9: Invalidate CloudFront Cache
[ ] DIST_ID=$(cd infrastructure/terraform && terraform output -raw cloudfront_distribution_id)
[ ] aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*" --profile pitfal

Step 10: Verify Custom Domain
[ ] curl -I https://pitfal.solutions
    Expected: HTTP/2 200 or 301 redirect to www
[ ] curl -I https://www.pitfal.solutions
    Expected: HTTP/2 200
[ ] Open https://www.pitfal.solutions in browser
    Expected: Website loads correctly, SSL certificate valid
[ ] Test contact form submission
    Expected: Form submits without CORS errors
[ ] Verify SSL certificate:
    echo | openssl s_client -connect www.pitfal.solutions:443 2>/dev/null | \
    openssl x509 -noout -subject -dates

Phase 2 Complete!
=================
Production URL: https://www.pitfal.solutions
CloudFront Domain: _________________________________.cloudfront.net (still accessible)
SSL Certificate: Valid until _________________________________
```

#### Phase 2 Quick Commands (Route 53)

```bash
# With Route 53 (automatic validation)
cd infrastructure/terraform
ZONE_ID="YOUR_ROUTE53_ZONE_ID"

terraform apply \
  -var="use_custom_domain=true" \
  -var="route53_zone_id=$ZONE_ID"

# Rebuild and deploy with production URLs
cd ../..
pnpm build

BUCKET=$(cd infrastructure/terraform && terraform output -raw website_bucket_name)
DIST_ID=$(cd infrastructure/terraform && terraform output -raw cloudfront_distribution_id)

aws s3 sync out/ s3://$BUCKET --delete --profile pitfal
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*" --profile pitfal

# Verify
curl -I https://www.pitfal.solutions
```

---

### Rollback: Revert to CloudFront Default Domain

If Phase 2 migration fails, you can quickly revert to Phase 1:

```bash
cd infrastructure/terraform

# Revert to CloudFront default domain
terraform apply -var="use_custom_domain=false"

# Rebuild frontend with CloudFront URLs
CLOUDFRONT_DOMAIN=$(terraform output -raw cloudfront_domain_name)
cd ../..
NEXT_PUBLIC_SITE_URL=https://$CLOUDFRONT_DOMAIN \
NEXT_PUBLIC_API_URL=https://$CLOUDFRONT_DOMAIN/api \
pnpm build

# Redeploy
BUCKET=$(cd infrastructure/terraform && terraform output -raw website_bucket_name)
DIST_ID=$(cd infrastructure/terraform && terraform output -raw cloudfront_distribution_id)
aws s3 sync out/ s3://$BUCKET --delete --profile pitfal
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*" --profile pitfal
```

**Note:** The CloudFront default domain (`*.cloudfront.net`) remains accessible even after adding custom domain aliases. This provides a fallback if DNS issues occur.

---

## 4. Domain Configuration (Reference)

> **Migrating from Squarespace?** See the comprehensive [DNS Migration Guide](./DNS-MIGRATION.md) for step-by-step instructions on migrating from Squarespace to Route 53, including email preservation and rollback procedures.

### Step 4.1: Route 53 Setup

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

### Step 4.2: SSL Certificate (ACM)

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

## 5. Application Deployment

### Step 5.1: Build the Application

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

### Step 5.2: Deploy Static Site to S3

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

### Step 5.3: Deploy Lambda Functions (Terraform-Managed)

Lambda functions are deployed via Terraform, not manual zip uploads. This ensures:
- Consistent deployments across environments
- Version tracking in Terraform state
- Environment variables managed in code
- IAM permissions defined alongside function

**Lambda Layer for Shared Dependencies:**

```hcl
# infrastructure/terraform/lambda.tf

# Shared layer with common dependencies (aws-sdk, zod, etc.)
resource "aws_lambda_layer_version" "shared" {
  filename            = "${path.module}/../../lambda/layers/shared.zip"
  layer_name          = "pitfal-shared"
  compatible_runtimes = ["nodejs20.x"]
  source_code_hash    = filebase64sha256("${path.module}/../../lambda/layers/shared.zip")
}

# Example function using module
module "contact_lambda" {
  source = "./modules/lambda"

  function_name = "pitfal-contact"
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 10
  memory_size   = 256

  source_path = "${path.module}/../../lambda/contact"
  layers      = [aws_lambda_layer_version.shared.arn]

  environment_variables = {
    TABLE_NAME     = module.inquiries_table.table_name
    SES_FROM_EMAIL = var.ses_from_email
    ENVIRONMENT    = var.environment
  }

  tags = local.common_tags
}
```

**Deployment Process:**

```bash
cd infrastructure/terraform

# Build Lambda code first
cd ../../lambda && pnpm build && cd ../infrastructure/terraform

# Package shared layer (one-time or when dependencies change)
cd ../../lambda/layers
zip -r shared.zip nodejs/
cd ../../infrastructure/terraform

# Deploy via Terraform (handles all functions)
terraform plan   # Review changes
terraform apply  # Deploy

# Terraform automatically:
# - Packages function code
# - Creates/updates Lambda functions
# - Sets environment variables
# - Attaches IAM roles
# - Configures API Gateway triggers
```

**Environment Variables (per function):**

| Function | Variables |
|----------|-----------|
| `contact` | TABLE_NAME, SES_FROM_EMAIL, NOTIFY_EMAIL |
| `client-auth` | TABLE_NAME, JWT_SECRET, COOKIE_DOMAIN |
| `client-gallery` | TABLE_NAME, S3_BUCKET, CLOUDFRONT_URL |
| `admin` | TABLE_NAME, S3_BUCKET, JWT_SECRET |
| `process-image` | S3_BUCKET, TABLE_NAME |
| `send-email` | SES_FROM_EMAIL |

### Step 5.4: Invalidate CloudFront Cache

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

### Step 5.5: Post-Deployment Verification

After deployment, verify all components are working:

**1. Static Site Health Check:**
```bash
# Check site is accessible (expect 200)
curl -I https://www.pitfal.solutions
# Expected: HTTP/2 200, content-type: text/html

# Check CloudFront is serving (look for x-cache header)
curl -I https://www.pitfal.solutions | grep -i x-cache
# Expected: x-cache: Hit from cloudfront (after first request)

# Verify SSL certificate
echo | openssl s_client -connect www.pitfal.solutions:443 2>/dev/null | openssl x509 -noout -dates
# Expected: notAfter date in the future
```

**2. API Health Check:**
```bash
# Check API Gateway responds
curl -s https://www.pitfal.solutions/api/health | jq
# Expected: {"status": "ok", "timestamp": "..."}

# Test contact endpoint (should validate but not submit)
curl -s -X POST https://www.pitfal.solutions/api/contact \
  -H "Content-Type: application/json" \
  -d '{"test": true}' | jq
# Expected: {"success": false, "error": {"code": "VALIDATION_ERROR", ...}}
```

**3. Lambda Function Health:**
```bash
# Check each function is deployed and configured
for func in contact client-auth client-gallery admin process-image send-email; do
  echo "Checking pitfal-$func..."
  aws lambda get-function --function-name pitfal-$func \
    --query "Configuration.{State:State,Runtime:Runtime,Timeout:Timeout}" \
    --profile pitfal
done
# Expected: All functions show State: Active, Runtime: nodejs20.x
```

**4. DynamoDB Tables:**
```bash
# Verify tables exist and have correct GSIs
for table in pitfal-galleries pitfal-inquiries pitfal-admin; do
  echo "Checking $table..."
  aws dynamodb describe-table --table-name $table \
    --query "Table.{Status:TableStatus,GSIs:GlobalSecondaryIndexes[*].IndexName}" \
    --profile pitfal
done
# Expected: Status: ACTIVE, GSIs listed
```

**5. S3 Buckets:**
```bash
# Check static site bucket
aws s3 ls s3://pitfal-static-site --profile pitfal | head -5
# Expected: List of files including index.html

# Check media bucket
aws s3 ls s3://pitfal-media --profile pitfal
# Expected: Bucket exists (may be empty initially)
```

**6. CloudWatch Alarms (if configured):**
```bash
aws cloudwatch describe-alarms \
  --alarm-name-prefix pitfal \
  --query "MetricAlarms[*].{Name:AlarmName,State:StateValue}" \
  --profile pitfal
# Expected: All alarms in OK state
```

**Verification Checklist:**
- [ ] Homepage loads (https://www.pitfal.solutions)
- [ ] API responds (https://www.pitfal.solutions/api/health)
- [ ] SSL certificate valid
- [ ] CloudFront caching working
- [ ] All 6 Lambda functions active
- [ ] All 3 DynamoDB tables accessible
- [ ] CloudWatch logs streaming
- [ ] No errors in recent logs

---

## 6. CI/CD Pipeline (GitHub Actions)

### Step 6.1: Add GitHub Secrets

Go to your repository → Settings → Secrets and variables → Actions

Add these secrets:

| Secret | Value |
|--------|-------|
| `AWS_ACCESS_KEY_ID` | Your IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | Your IAM user secret key |
| `CLOUDFRONT_DISTRIBUTION_ID` | From Terraform output |

### Step 6.2: Workflow File

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

## 7. Email Configuration (SES)

### Step 7.1: Verify Domain

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

### Step 7.2: Request Production Access

By default, SES is in sandbox mode. To send to any email:

1. Go to [SES Console](https://console.aws.amazon.com/ses)
2. Click "Request production access"
3. Fill out the form explaining your use case
4. Wait for approval (usually 24-48 hours)

---

## 8. Troubleshooting

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

## 9. Rollback Procedures

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

## 10. Quick Reference

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

## 11. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2026 | Claude Code | First draft |
| 1.1 | January 2026 | Claude Code | Added beginner-friendly sections, prerequisites checklist, step-by-step verification, simplified deployment strategy for MVP |
| 1.2 | January 2026 | Claude Code | **Infrastructure updates:** (1) Documented modular Terraform structure with modules for Lambda, API Gateway, DynamoDB; (2) Changed Lambda deployment from manual zip to Terraform-managed with shared layer; (3) Added comprehensive pre-deployment checklist (Step 2.0); (4) Expanded post-deployment verification with health checks for all components; (5) Added Lambda environment variables reference table |
| 1.3 | January 2026 | Claude Code | **Two-phase domain deployment:** (1) Added Section 3 "Domain Deployment Strategy" with full checklists for Phase 1 (CloudFront default domain) and Phase 2 (custom domain migration); (2) Added `use_custom_domain` variable documentation; (3) Added step-by-step checklists with fill-in-the-blank fields for recording deployment info; (4) Added quick command references for both phases; (5) Added rollback procedure from custom domain to CloudFront default; (6) Renumbered all subsequent sections |
