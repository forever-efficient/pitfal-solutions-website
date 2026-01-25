# CLAUDE.md - Pitfal Solutions Photography Website

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

**Business:** Pitfal Solutions - Photography & Videography (Aurora, CO)
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
├── docs/
│   ├── REQUIREMENTS.md          # Functional requirements (v1.5)
│   ├── ARCHITECTURE.md          # System design (v1.4)
│   ├── DEPLOYMENT.md            # Deployment guide (v1.2)
│   ├── PRD.md                   # Product requirements (v1.3)
│   └── SKILL-WORKFLOWS.md       # How skills work together
├── content/                     # Static content (managed via Git)
│   ├── testimonials.json        # Client testimonials
│   ├── faq.json                 # Frequently asked questions
│   ├── blog/                    # MDX blog posts
│   │   └── style-guide.mdx      # What to wear guide
│   └── galleries/               # Local gallery staging
├── .claude/
│   ├── settings.json            # Hooks and permissions
│   └── skills/                  # Custom Claude skills
│       ├── deploy/SKILL.md
│       ├── build/SKILL.md
│       ├── optimize-images/SKILL.md
│       ├── preview/SKILL.md
│       ├── sync-content/SKILL.md
│       ├── logs/SKILL.md
│       ├── db-seed/SKILL.md
│       ├── stripe-setup/SKILL.md  # Phase 2
│       └── gallery-manage/SKILL.md
├── infrastructure/
│   └── terraform/
│       ├── main.tf              # Provider, backend config
│       ├── variables.tf         # Input variables
│       ├── outputs.tf           # Output values
│       ├── modules/             # Reusable modules
│       │   ├── lambda/          # Lambda function module
│       │   ├── api-gateway/     # API Gateway module
│       │   └── dynamodb/        # DynamoDB table module
│       ├── s3.tf                # S3 buckets
│       ├── cloudfront.tf        # CloudFront distribution
│       ├── lambda.tf            # Function definitions
│       ├── api-gateway.tf       # REST API
│       ├── dynamodb.tf          # Table definitions + GSIs
│       ├── ses.tf               # Email configuration
│       └── iam.tf               # IAM roles/policies
├── src/
│   ├── app/                     # Next.js App Router
│   ├── components/              # React components
│   ├── lib/                     # Utilities and helpers
│   └── styles/                  # Global styles
├── public/                      # Static assets
├── lambda/                      # Lambda function code
├── scripts/                     # Build and deploy scripts
├── docker-compose.yml           # Local development
├── Dockerfile                   # Container for local dev
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

---

## Required Features

### Portfolio & Gallery
- Full-screen, responsive image/video display
- Multiple gallery formats (grid, slideshow, stacked)
- Category organization (Brands, Portraits, Events)
- Video: YouTube embeds (public), S3 (client deliverables)
- Hover effects and animations
- Optimized image loading (WebP, lazy load, blur placeholders)

### Client Proofing
- Password-protected client galleries
- Image/video commenting and selection
- Download options with optional watermarking
- Approval workflows

### Booking System
- Calendar integration
- Session type selection
- Availability management
- Automated email confirmations

### E-Commerce
- Print sales (Stripe + print lab integration)
- Digital download sales
- Package/pricing display
- Order management

### Blog/Content
- SEO-optimized blog (MDX)
- Client stories and behind-the-scenes

### Contact
- Contact form with spam protection
- Social media links
- Business hours display

---

## Development Environment

### Prerequisites
- Node.js 20+
- pnpm (preferred) or npm
- Docker Desktop
- AWS CLI v2
- Terraform CLI

### Local Development

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
| `github` | Repository operations | Issues, PRs, actions |
| `filesystem` | Local file operations | Read, write, search |

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
pnpm build                  # Production build
pnpm start                  # Start production server
pnpm lint                   # Run ESLint
pnpm type-check             # TypeScript check

# Testing
pnpm test                   # Run tests
pnpm test:e2e               # End-to-end tests

# Infrastructure
cd infrastructure/terraform
terraform plan              # Preview changes
terraform apply             # Deploy infrastructure

# Deployment
pnpm build                  # Build static site
aws s3 sync out/ s3://bucket-name  # Sync to S3

# Image Optimization
pnpm optimize:images        # Batch optimize
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
