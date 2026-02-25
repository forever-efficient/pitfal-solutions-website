# CLAUDE.md - Pitfal Solutions Photography Website

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

**Business:** Pitfal Solutions - Photography & Videography (Denver, CO)
**Website:** https://www.pitfal.solutions/
**Tagline:** "Swing the Gap"

### Services
- Brand Photography/Videography
- Portrait Services
- Event/Commercial Content

### Goals
- Custom full-featured photographer/videographer website
- Customizable portfolio for photos AND videos
- Cost-optimized AWS serverless deployment (< $20/month)
- Infrastructure as Code with Terraform

---

## Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **Frontend** | Next.js 14+ | TypeScript, Static Export |
| **Styling** | Tailwind CSS | With custom design system |
| **Backend** | AWS Lambda | Node.js runtime |
| **API** | API Gateway | REST API, throttling for rate limiting |
| **Database** | DynamoDB | Serverless, pay-per-use, 3 GSIs |
| **Storage** | S3 + CloudFront | Images, videos, static assets |
| **Auth** | Custom (HttpOnly cookies) | 7-day sessions, client + admin |
| **Payments** | Stripe | Phase 2 - E-commerce transactions |
| **Email** | AWS SES | Transactional emails |
| **IaC** | Terraform | Modular infrastructure |
| **CI/CD** | GitHub Actions | Automated deployments |

---

## Project Structure

```
website/
├── CLAUDE.md                    # This file
├── .mcp.json                    # MCP server configuration
├── Makefile                     # **Primary** build/deploy entry point
├── docs/                        # Project documentation (v1.7)
│   ├── REQUIREMENTS.md          # Functional requirements
│   ├── ARCHITECTURE.md          # System design (v1.6)
│   ├── DEPLOYMENT.md            # Deployment guide (v1.3)
│   ├── PRD.md                   # Product requirements (v1.7)
│   └── SKILL-WORKFLOWS.md       # How skills work together
├── content/                     # Static content (managed via Git)
│   ├── testimonials.json        # Client testimonials
│   ├── faq.json                 # Frequently asked questions
│   ├── blog/                    # MDX blog posts
│   └── galleries/               # Local gallery staging
├── infrastructure/
│   └── terraform/               # Modular infrastructure
├── src/                         # Next.js App Source
│   ├── app/                     # App Router pages
│   │   ├── portfolio/           # Portfolio & Viewer routes
│   │   └── admin/               # Admin dashboard
│   ├── components/              # React components
│   └── lib/                     # Utilities & constants
├── public/                      # Public assets
├── lambda/                      # **Multi-function** serverless backend
│   ├── admin/                   # Admin CRUD operations
│   ├── client-auth/             # Gallery authentication
│   ├── client-gallery/          # Public gallery access
│   ├── contact/                 # Contact form submission
│   ├── image-processor/         # Image processing pipeline
│   ├── image-processor-orchestrator/
│   ├── image-processor-poller/
│   ├── thumbnail-generator/     # S3-triggered thumbnails
│   └── shared/                  # Common utilities & types
├── scripts/                     # Build and utility scripts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

---

## Required Features

### Portfolio & Gallery
- [x] Full-screen, responsive image/video display
- [x] Multiple gallery formats (grid, slideshow, stacked)
- [x] Category organization (Brands, Portraits, Events)
- [x] Video: YouTube embeds (public), S3 (client deliverables)
- [x] Optimized image loading (WebP, lazy load, blur placeholders)

### Client Proofing
- [x] Bulk Download implemented
- [/] Password-protected client galleries (In Progress)
- [ ] Image/video commenting and selection
- [ ] Approval workflows

### Booking System
- [ ] Calendar integration
- [ ] Automated email confirmations

### Contact
- [x] Contact form with spam protection
- [x] Social media links
- [x] Business hours display (Static)
- [x] Advanced Admin Inquiry viewing

### Admin Dashboard
- [x] Gallery management (Create/Edit/Delete)
- [x] Image upload pipeline (S3 → Lambda → Prossessed)
- [x] Inquiry viewing
- [/] Role-based access (Basic password protection)

---

## Development Environment

### Prerequisites
- Node.js 20+
- pnpm (preferred) or npm
- Docker Desktop
- AWS CLI v2
- Terraform CLI

### Local Development

> [!CAUTION]
> **Live Backend Connection**: The local development environment (`pnpm dev`) connects directly to the **PRODUCTION** AWS backend (DynamoDB, Lambda, S3).
> - Changes made in the local Admin Dashboard affect **REAL** data.
> - Backend logic (Lambda functions) runs on AWS, not locally.
> - If you change backend code (`lambda/`), you **MUST** deploy it (`terraform apply`) for changes to take effect.


```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Or use Docker
docker compose up
```

### How to Run

```bash
# Option 1: Direct (faster iteration)
pnpm dev

# Option 2: Docker (closer to production)
docker compose watch

# Option 3: VS Code Dev Container
# Command Palette → "Dev Containers: Reopen in Container"
```

---

## Infrastructure (AWS Serverless)

### Cost Breakdown (< $20/month target)

| Service | Estimated Cost |
|---------|---------------|
| S3 (storage + hosting) | ~$1-3/month |
| CloudFront CDN | ~$1-2/month |
| Lambda + API Gateway | ~$0-2/month (free tier) |
| DynamoDB | ~$0-1/month (free tier) |
| SES (email) | ~$0/month (62K free) |
| Route 53 | ~$0.50/month |
| ACM (SSL) | Free |
| **Total** | **~$3-10/month** |

### Terraform Commands

```bash
# Initialize Terraform
cd infrastructure/terraform
terraform init

# Plan changes
terraform plan

# Apply changes
terraform apply

# Destroy (careful!)
terraform destroy
```

---

## MCP Server Configuration

MCP servers are configured in `.mcp.json` (project root):

| Server | Purpose | Key Capabilities |
|--------|---------|------------------|
| `terraform` | Infrastructure deployment | Terraform plan/apply, state management, best practices |
| `aws-docs` | AWS documentation | Search docs, API reference |
| `aws-pricing` | AWS pricing | Cost estimates, pricing lookups |
| `stripe` | Payment management | Customers, products, invoices |

Run `/mcp` to check server status and authenticate.

---

## Custom Claude Skills

| Skill | Purpose | Usage | Phase |
|-------|---------|-------|-------|
| `/deploy` | Deploy to AWS | Pre-checks, build, Terraform, S3 sync, CloudFront invalidation | MVP |
| `/build` | Build and test | Lint, type-check, test, build with detailed error reporting | MVP |
| `/test` | Run tests | Unit tests, E2E tests, coverage reporting | MVP |
| `/optimize-images` | Batch image optimization | WebP conversion, multiple sizes, CSS blur thumbnails | MVP |
| `/preview` | Local development | Start Next.js dev server on port 3000 | MVP |
| `/sync-content` | Sync to S3 | Upload gallery content to S3 bucket | MVP |
| `/logs` | View CloudWatch logs | Fetch Lambda/API Gateway logs with error filtering | MVP |
| `/db-seed` | Seed database | Populate DynamoDB with sample data (dev only) | MVP |
| `/stripe-setup` | Configure Stripe | Create products, prices, webhooks | **Phase 2** |
| `/gallery-manage` | Gallery organization | Create, validate, organize photo galleries | MVP |

Skills are defined in `.claude/skills/*/SKILL.md`. See `docs/SKILL-WORKFLOWS.md` for workflow integration.

**Static Content Note:** Testimonials, FAQ, and Style Guide are managed via Git (JSON/MDX files in `/content/`), not through admin dashboard. Edit files, commit, and deploy.

---

## Common Commands

```bash
# Development
pnpm dev                    # Start dev server
make status                 # Show current deployment config
make setup                  # Sync Terraform outputs (one-time)

# Deployment
make deploy                 # **Recommended** Full deployment
make build-lambdas          # Build backend functions
make deploy-lambdas         # Build + Apply Terraform for Lambdas

# Quality/Testing
pnpm lint                   # Run ESLint
pnpm type-check             # TypeScript check
pnpm test                   # Run unit tests
pnpm test:e2e               # Playwright E2E tests
make test-all               # All tests (Unit + Lambda + E2E)

# Image Optimization
pnpm optimize:images        # Batch optimize originals
make backfill-thumbnails    # Generate thumbnails for existing S3 images
```

---

## Environment Variables

Create `.env.local` for local development:

```bash
# AWS
AWS_REGION=us-west-2
AWS_PROFILE=pitfal

# Stripe
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Auth
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000

# Email
SES_FROM_EMAIL=info@pitfal.solutions

# Database
DYNAMODB_TABLE_PREFIX=pitfal-
```

---

## Code Standards

### TypeScript
- Strict mode enabled
- No `any` types without justification
- Prefer interfaces over types for object shapes
- Use const assertions where appropriate

### React/Next.js
- Use App Router (not Pages Router)
- Prefer Server Components by default
- Use `use client` only when necessary
- Implement proper error boundaries

### Styling
- Tailwind CSS for all styling
- No inline styles
- Use CSS variables for theme values
- Mobile-first responsive design

### Performance
- Target 90+ Lighthouse scores
- Use `next/image` for all images
- Implement lazy loading
- Minimize JavaScript bundle size

### Accessibility
- WCAG 2.1 AA compliance
- Semantic HTML
- Proper ARIA labels
- Keyboard navigation support

---

## Git Workflow

```bash
# Feature branch
git checkout -b feature/gallery-component

# Commit with conventional commits
git commit -m "feat: add gallery grid component"
git commit -m "fix: resolve image loading issue"
git commit -m "docs: update README"

# Push and create PR
git push -u origin feature/gallery-component
gh pr create
```

---

## .gitignore Essentials

```
# Environment
.env
.env.local
.env.*.local

# Dependencies
node_modules/

# Build
.next/
out/
dist/

# IDE
.idea/
.vscode/
*.swp

# OS
.DS_Store

# Terraform
*.tfstate
*.tfstate.backup
.terraform/

# Testing
coverage/

# Logs
*.log

# Claude Code local files
.claude/settings.local.json
.claude/session.log
```
