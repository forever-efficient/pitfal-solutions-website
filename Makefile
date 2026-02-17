# =============================================================================
# Pitfal Solutions - Frontend Deployment Makefile
# =============================================================================
# Usage:
#   make deploy        # Full 1-command frontend deployment (build + sync + invalidate)
#   make help          # List all targets
#   make setup         # Read Terraform outputs → save .make.env (run once after terraform apply)
#
# Prerequisites: AWS CLI, pnpm, profile "pitfal" configured
# =============================================================================

# --- Variables ---------------------------------------------------------------

AWS_PROFILE    ?= pitfal
AWS_REGION     ?= us-west-2
ENV            ?= prod
S3_BUCKET      ?= pitfal-prod-website
CLOUDFRONT_ID  ?= EDK9ZMCEN4GAT

# Production public URLs (baked into Next.js static export at build time)
NEXT_PUBLIC_SITE_URL  ?= https://dprk6phv6ds9x.cloudfront.net
NEXT_PUBLIC_MEDIA_URL ?= https://dprk6phv6ds9x.cloudfront.net/media
NEXT_PUBLIC_API_URL   ?= https://ei1btpxkmb.execute-api.us-west-2.amazonaws.com/prod

# Load .make.env if it exists (populated by `make setup`, git-ignored)
-include .make.env

# --- Phony targets -----------------------------------------------------------

.PHONY: help setup check build sync invalidate deploy \
        build-lambdas deploy-lambdas \
        test test-ui test-lambda test-coverage test-e2e lint type-check size \
        ci-install ci-lint ci-type-check ci-test-ui ci-test-lambda ci-coverage ci-build ci-e2e ci-bundle-size ci-pr ci-all \
        status clean

# --- Default target ----------------------------------------------------------

.DEFAULT_GOAL := help

# --- Help --------------------------------------------------------------------

help: ## List all available targets
	@echo ""
	@echo "Pitfal Solutions - Deployment Makefile"
	@echo "======================================="
	@echo ""
	@echo "Frontend deployment:"
	@echo "  make deploy          Full 1-command deploy (check → build → sync → invalidate)"
	@echo "  make build           Build Next.js with production env vars"
	@echo "  make sync            Two-pass S3 sync (assets + HTML with correct cache headers)"
	@echo "  make invalidate      CloudFront cache invalidation"
	@echo ""
	@echo "Setup & info:"
	@echo "  make setup           Read Terraform outputs → save .make.env (run after terraform apply)"
	@echo "  make check           Verify AWS CLI, pnpm, and pitfal credentials"
	@echo "  make status          Show current deployment config (bucket, CF ID, URLs)"
	@echo ""
	@echo "Lambda & infrastructure:"
	@echo "  make build-lambdas   Build Lambda functions (runs scripts/build-lambdas.sh)"
	@echo "  make deploy-lambdas  Build Lambdas then print terraform commands to run"
	@echo ""
	@echo "Quality:"
	@echo "  make test            Run unit tests (pnpm test)"
	@echo "  make test-ui         Run UI tests (pnpm test:ui)"
	@echo "  make test-lambda     Run Lambda tests (pnpm test:lambda)"
	@echo "  make test-coverage   Run coverage gate (pnpm test:coverage)"
	@echo "  make test-e2e        Run E2E tests (pnpm test:e2e)"
	@echo "  make lint            Run ESLint (pnpm lint)"
	@echo "  make type-check      TypeScript check (pnpm type-check)"
	@echo "  make size            Bundle size check (pnpm size)"
	@echo ""
	@echo "CI parity (mirrors .github/workflows/ci.yml):"
	@echo "  make ci-pr           Lint + type-check + UI tests + Lambda tests + coverage + build"
	@echo "  make ci-all          ci-pr + e2e + bundle-size"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean           Remove out/, .next/, lambda/*/dist/"
	@echo ""
	@echo "Active config:"
	@echo "  S3_BUCKET     = $(S3_BUCKET)"
	@echo "  CLOUDFRONT_ID = $(CLOUDFRONT_ID)"
	@echo "  AWS_PROFILE   = $(AWS_PROFILE)"
	@echo ""

# --- Setup -------------------------------------------------------------------

setup: ## Read Terraform outputs → write .make.env (run once after terraform apply)
	@echo "Reading Terraform outputs..."
	@cd infrastructure/terraform && \
		echo "S3_BUCKET=$$(terraform output -raw website_bucket_name)" > ../../.make.env && \
		echo "CLOUDFRONT_ID=$$(terraform output -raw cloudfront_distribution_id)" >> ../../.make.env && \
		echo "NEXT_PUBLIC_SITE_URL=https://$$(terraform output -raw cloudfront_domain_name)" >> ../../.make.env && \
		echo "NEXT_PUBLIC_MEDIA_URL=https://$$(terraform output -raw cloudfront_domain_name)/media" >> ../../.make.env && \
		echo "NEXT_PUBLIC_API_URL=$$(terraform output -raw api_gateway_url)" >> ../../.make.env
	@echo ""
	@echo "Saved to .make.env:"
	@cat .make.env
	@echo ""
	@echo "Run 'make deploy' to build and deploy with these values."

# --- Pre-flight check --------------------------------------------------------

check: ## Verify AWS CLI, pnpm, and pitfal credentials are working
	@echo "Checking prerequisites..."
	@command -v aws >/dev/null 2>&1 || (echo "ERROR: aws CLI not found. Install with: brew install awscli" && exit 1)
	@echo "  AWS CLI: OK"
	@command -v pnpm >/dev/null 2>&1 || (echo "ERROR: pnpm not found. Install with: npm install -g pnpm" && exit 1)
	@echo "  pnpm: OK"
	@aws sts get-caller-identity --profile $(AWS_PROFILE) --region $(AWS_REGION) --output text >/dev/null 2>&1 || \
		(echo "ERROR: AWS profile '$(AWS_PROFILE)' not configured or credentials expired." && \
		 echo "       Run: aws configure --profile $(AWS_PROFILE)" && exit 1)
	@echo "  AWS profile '$(AWS_PROFILE)': OK"
	@echo ""
	@echo "All checks passed."

# --- Build -------------------------------------------------------------------

build: ## Build Next.js with production env vars baked in
	@echo "Building Next.js for production..."
	@echo "  NEXT_PUBLIC_SITE_URL  = $(NEXT_PUBLIC_SITE_URL)"
	@echo "  NEXT_PUBLIC_MEDIA_URL = $(NEXT_PUBLIC_MEDIA_URL)"
	@echo "  NEXT_PUBLIC_API_URL   = $(NEXT_PUBLIC_API_URL)"
	@echo ""
	NEXT_PUBLIC_SITE_URL=$(NEXT_PUBLIC_SITE_URL) \
	NEXT_PUBLIC_MEDIA_URL=$(NEXT_PUBLIC_MEDIA_URL) \
	NEXT_PUBLIC_API_URL=$(NEXT_PUBLIC_API_URL) \
	pnpm build

# --- S3 sync -----------------------------------------------------------------

sync: ## Two-pass S3 sync: assets (1-year cache) then HTML (no-cache)
	@echo "Syncing to s3://$(S3_BUCKET)..."
	@echo ""
	@echo "Pass 1: Assets (JS/CSS/images) — 1-year immutable cache"
	aws s3 sync out/ s3://$(S3_BUCKET) --delete \
		--cache-control "public, max-age=31536000, immutable" \
		--exclude "*.html" \
		--profile $(AWS_PROFILE) --region $(AWS_REGION)
	@echo ""
	@echo "Pass 2: HTML files — no-cache (always fresh)"
	aws s3 sync out/ s3://$(S3_BUCKET) \
		--cache-control "public, max-age=0, must-revalidate" \
		--include "*.html" --exclude "*" \
		--profile $(AWS_PROFILE) --region $(AWS_REGION)
	@echo ""
	@echo "Sync complete."

# --- CloudFront invalidation -------------------------------------------------

invalidate: ## Create CloudFront invalidation for all paths
	@echo "Creating CloudFront invalidation (distribution: $(CLOUDFRONT_ID))..."
	aws cloudfront create-invalidation \
		--distribution-id $(CLOUDFRONT_ID) \
		--paths "/*" \
		--profile $(AWS_PROFILE)
	@echo ""
	@echo "Invalidation submitted. Cache will clear in 2-5 minutes."

# --- Full deploy (main target) -----------------------------------------------

deploy: check build sync invalidate ## Full 1-command deploy: check → build → sync → invalidate
	@echo ""
	@echo "Deployed successfully!"
	@echo "  URL: $(NEXT_PUBLIC_SITE_URL)"
	@echo "  Cache invalidation in progress (2-5 min)"

# --- Lambda ------------------------------------------------------------------

build-lambdas: ## Build Lambda functions (runs scripts/build-lambdas.sh)
	@echo "Building Lambda functions..."
	./scripts/build-lambdas.sh all
	@echo "Lambda build complete."

deploy-lambdas: build-lambdas ## Build Lambdas then print terraform commands to run
	@echo ""
	@echo "Lambda functions built. To deploy, run these commands:"
	@echo ""
	@echo "  cd infrastructure/terraform"
	@echo "  terraform plan   # Review changes"
	@echo "  terraform apply  # Deploy Lambda updates"
	@echo "  cd ../.."
	@echo ""
	@echo "NOTE: Terraform must be run manually per project policy."

# --- Quality -----------------------------------------------------------------

test: ## Run unit tests
	pnpm test

test-ui: ## Run UI tests (jsdom)
	pnpm test:ui

test-lambda: ## Run Lambda tests (node)
	pnpm test:lambda

test-coverage: ## Run coverage checks (v8 + thresholds)
	pnpm test:coverage

test-e2e: ## Run E2E tests (Playwright)
	pnpm test:e2e

lint: ## Run ESLint
	pnpm lint

type-check: ## Run TypeScript type checker
	pnpm type-check

size: ## Run bundle size check
	pnpm size

# --- CI parity targets -------------------------------------------------------

ci-install: ## Install dependencies exactly like GitHub Actions
	CI=true pnpm install --frozen-lockfile --prefer-offline

ci-lint: ci-install ## Mirror CI lint job
	pnpm lint

ci-type-check: ci-install ## Mirror CI type-check job
	pnpm type-check

ci-test-ui: ci-install ## Mirror CI UI test job
	pnpm test:ui

ci-test-lambda: ci-install ## Mirror CI Lambda test job
	pnpm test:lambda

ci-coverage: ci-install ## Mirror CI coverage job
	pnpm test:coverage

ci-build: ci-install ## Mirror CI build job
	pnpm build

ci-e2e: ci-install ## Mirror CI e2e job
	pnpm exec playwright install --with-deps chromium
	pnpm exec playwright test --project=chromium

ci-bundle-size: ci-install ## Mirror CI bundle-size job (non-blocking like continue-on-error)
	pnpm build
	-pnpm size

ci-pr: ci-lint ci-type-check ci-test-ui ci-test-lambda ci-coverage ci-build ## Mirror PR-required CI gates

ci-all: ci-pr ci-e2e ci-bundle-size ## Mirror full workflow including post-build jobs

# --- Status ------------------------------------------------------------------

status: ## Show current deployment configuration
	@echo ""
	@echo "Pitfal Solutions - Deployment Status"
	@echo "====================================="
	@echo "  S3 Bucket:        $(S3_BUCKET)"
	@echo "  CloudFront ID:    $(CLOUDFRONT_ID)"
	@echo "  AWS Profile:      $(AWS_PROFILE)"
	@echo "  AWS Region:       $(AWS_REGION)"
	@echo "  Site URL:         $(NEXT_PUBLIC_SITE_URL)"
	@echo "  Media URL:        $(NEXT_PUBLIC_MEDIA_URL)"
	@echo "  API URL:          $(NEXT_PUBLIC_API_URL)"
	@echo ""
	@if [ -f .make.env ]; then \
		echo "  Config source: .make.env (overrides defaults)"; \
	else \
		echo "  Config source: Makefile defaults (run 'make setup' to sync from Terraform)"; \
	fi
	@echo ""

# --- Clean -------------------------------------------------------------------

clean: ## Remove build artifacts: out/, .next/, lambda/*/dist/
	@echo "Cleaning build artifacts..."
	rm -rf out/ .next/
	rm -rf lambda/contact/dist lambda/admin/dist lambda/shared/dist
	@echo "Clean complete."
