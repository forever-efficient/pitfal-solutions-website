# Product Requirements Document (PRD)
## Pitfal Solutions Photography Website

| Field | Value |
|-------|-------|
| **Product Name** | Pitfal Solutions Website |
| **Version** | 1.3 (MVP Scope Refined Based on User Decisions) |
| **Last Updated** | January 2026 |
| **Status** | MVP Scope Finalized - Updated |
| **Owner** | Thomas Archuleta |
| **Domain** | https://www.pitfal.solutions |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Business Context](#2-business-context)
3. [Goals & Success Metrics](#3-goals--success-metrics)
4. [User Personas](#4-user-personas)
5. [MVP Scope Decisions](#5-mvp-scope-decisions)
6. [Functional Requirements](#6-functional-requirements)
7. [Technical Architecture](#7-technical-architecture)
8. [Technology Stack](#8-technology-stack)
9. [Infrastructure & Deployment](#9-infrastructure--deployment)
10. [Development Workflow](#10-development-workflow)
11. [Integrations](#11-integrations)
12. [Non-Functional Requirements](#12-non-functional-requirements)
13. [Milestones & Phases](#13-milestones--phases)
14. [Risks & Mitigations](#14-risks--mitigations)
15. [Appendices](#15-appendices)

---

## 1. Executive Summary

### 1.1 Product Vision

Build a custom, full-featured photography and videography portfolio website for Pitfal Solutions that showcases creative work, enables client interactions, and generates bookings—all while maintaining operational costs under $20/month using AWS serverless architecture.

### 1.2 Tagline

**"Swing the Gap"**

### 1.3 Core Value Proposition

- **For clients:** A seamless experience to view portfolios, submit inquiries, proof photos, and download deliverables
- **For the business:** Cost-effective, low-maintenance infrastructure that scales with demand
- **For development:** Infrastructure as Code (Terraform) enabling reproducible, version-controlled deployments

### 1.4 MVP Focus

The MVP (Minimum Viable Product) focuses on core portfolio, client proofing, and booking inquiry functionality. E-commerce features (print sales, payment processing for products) are deferred to Phase 2.

---

## 2. Business Context

### 2.1 Company Overview

| Attribute | Details |
|-----------|---------|
| **Business Name** | Pitfal Solutions |
| **Location** | Denver, CO (serving Denver metro area) |
| **Services** | Photography & Videography |
| **Contact** | (970) 703-6336 / info@pitfal.solutions |
| **Hours** | 7am - 10pm daily |

### 2.2 Service Offerings

| Service | Description | Target Market |
|---------|-------------|---------------|
| **Brand Photography/Videography** | Commercial content for businesses | Small businesses, startups |
| **Portrait Services** | Headshots, lifestyle, family | Individuals, professionals |
| **Event Coverage** | Weddings, corporate events | Event planners, couples |

### 2.3 Market Position

Pitfal Solutions differentiates through:
- Dual photo + video capability
- Modern, tech-forward booking experience
- Competitive pricing for Denver metro market
- Quick turnaround on digital deliverables

---

## 3. Goals & Success Metrics

### 3.1 Business Goals

| Goal | Target | Timeline |
|------|--------|----------|
| Launch production website | 100% MVP feature complete | 8-10 weeks |
| Monthly infrastructure cost | < $20/month | Ongoing |
| Booking inquiry rate | > 5% of visitors | 6 months post-launch |
| Client gallery satisfaction | > 90% approval | Ongoing |

### 3.2 Technical Goals

| Goal | Target | Measurement |
|------|--------|-------------|
| Performance (Lighthouse) | > 90 all categories | Lighthouse CI |
| Uptime | 99.9% | CloudWatch |
| Time to First Byte | < 200ms (cached) | CloudFront metrics |
| Build time | < 5 minutes | GitHub Actions |

### 3.3 Key Performance Indicators (KPIs)

1. **Acquisition:** Monthly unique visitors, traffic sources
2. **Engagement:** Pages per session, time on site, gallery views
3. **Conversion:** Booking inquiries, completed sessions
4. **Satisfaction:** Client gallery completion rate, review scores

---

## 4. User Personas

### 4.1 Primary Personas

#### Persona 1: Prospective Client (Emily)
- **Demographics:** 28-45, professional, Denver metro
- **Goals:** Find a photographer for upcoming event/portraits
- **Pain Points:** Hard to compare photographers, unclear pricing
- **Needs:** View portfolio, see packages, easy inquiry submission
- **Journey:** Search → Portfolio → Services → Contact/Inquire

#### Persona 2: Active Client (Marcus)
- **Demographics:** 35, small business owner
- **Goals:** Review and approve brand photos from recent shoot
- **Pain Points:** Email-based proofing is tedious
- **Needs:** Password-protected gallery, easy selection, download
- **Journey:** Email link → Gallery → Select → Approve → Download

### 4.2 Secondary Personas

#### Administrator (Thomas - Owner)
- **Goals:** Manage galleries, inquiries efficiently
- **Needs:** Dashboard, content management, analytics
- **Pain Points:** Manual processes, fragmented tools

---

## 5. MVP Scope Decisions

### 5.1 Confirmed Decisions

| Decision Area | Choice | Rationale | Status |
|---------------|--------|-----------|--------|
| **Client Gallery Auth** | Simple password per gallery | No accounts needed; easy to share links | MVP |
| **Blog Platform** | MDX files in Git | Version controlled; no external CMS | MVP |
| **Print Sales** | Deferred | Focus on core booking/portfolio first | Phase 2 |
| **Analytics** | Google Analytics 4 | Industry standard, free | MVP |
| **Video Delivery** | YouTube (public) + S3 (private) | Cost-effective hybrid | MVP |
| **Spam Protection** | Honeypot + rate limiting | No CAPTCHA friction | MVP |
| **Staging Environment** | Skip initially | Deploy directly to production | MVP |
| **Watermarking** | None needed | Client trust model | Not Required |
| **Gallery Layouts** | All 4 (Grid, Masonry, Slideshow, Stacked) | Maximum flexibility | MVP |
| **Booking System** | Inquiry form only | No calendar integration | MVP |
| **Service Packages** | 3-4 main types | Portrait, Event, Brand, Custom | MVP |
| **Admin Dashboard** | Gallery management + view-only inquiries | Status updates deferred | MVP |
| **Testimonials** | Static JSON file | No admin UI for MVP | MVP |
| **FAQ** | Static JSON file | No admin UI for MVP | MVP |
| **Style Guide** | Static MDX page | Managed via Git | MVP |
| **Client Auth** | HttpOnly cookies | 7-day sessions | MVP |
| **Admin 2FA** | Deferred | Password-only auth for MVP | Phase 2 |
| **Portfolio Categories** | Admin-configurable | Not hardcoded | MVP |
| **Client Selection Limits** | None | Full access to all images | MVP |
| **Timeline** | 8-10 weeks | Speed to launch priority | MVP |

### 5.2 Feature Scope Summary

| Feature Category | MVP (Phase 1) | Phase 2 |
|------------------|---------------|---------|
| Portfolio Gallery | All 4 layouts, lightbox, **admin-configurable categories** | - |
| Client Proofing | HttpOnly cookie auth (7-day), **full access**, commenting, download | ~~Selection limits~~ |
| Booking | Inquiry form with email notifications | Calendar integration, deposits |
| E-Commerce | - | Print sales, Stripe checkout |
| Blog | MDX files in Git (no web CMS) | - |
| Testimonials | **Static JSON** (`/content/testimonials.json`) | Admin dashboard management |
| FAQ | **Static JSON** (`/content/faq.json`) | Admin dashboard management |
| Style Guide | **Static MDX** page | - |
| Admin | Gallery management + **view-only inquiry list** | Inquiry management, order tracking, 2FA |
| Contact | Form with honeypot + API Gateway throttling | - |

---

## 6. Functional Requirements

### 6.1 Portfolio & Gallery System

#### Public Gallery Features
| ID | Requirement | Priority | MVP Status |
|----|-------------|----------|------------|
| REQ-GAL-001 | Multiple layout formats (grid, masonry, slideshow, stacked) | P0 | MVP |
| REQ-GAL-002 | Full-screen lightbox with zoom, navigation, metadata | P0 | MVP |
| REQ-GAL-003 | Responsive image loading (WebP, srcset, lazy load, LQIP) | P0 | MVP |
| REQ-GAL-004 | Video support (YouTube/Vimeo embeds, S3 self-hosted) | P1 | MVP |
| REQ-GAL-010 | Category organization (admin-configurable, not hardcoded) | P0 | MVP |
| REQ-GAL-011 | Filtering and sorting (category, date, tags, search) | P1 | MVP |
| REQ-GAL-012 | Featured/hero images for homepage | P0 | MVP |

#### Gallery Administration
| ID | Requirement | Priority | MVP Status |
|----|-------------|----------|------------|
| REQ-GAL-020 | Upload (single + batch), edit metadata, reorder, delete | P0 | MVP |
| REQ-GAL-021 | Auto-generate image sizes, WebP, blur placeholders, EXIF | P0 | MVP |

### 6.2 Client Proofing System

| ID | Requirement | Priority | MVP Status |
|----|-------------|----------|------------|
| REQ-PROOF-001 | Password-protected galleries (no download limits - full access) | P0 | MVP |
| REQ-PROOF-002 | ~~Watermarked previews~~ Direct previews (client trust model) | - | Not Required |
| REQ-PROOF-010 | Client commenting on images (feedback, edit requests) | P0 | MVP |
| REQ-PROOF-011 | ~~Selection tracking~~ Full access model (no limits) | - | Not Required |
| REQ-PROOF-012 | Photographer notifications (comments only) | P1 | MVP |
| REQ-PROOF-020 | Individual + bulk (ZIP) download of ALL images | P0 | MVP |
| REQ-PROOF-021 | ~~Configurable watermarks~~ | - | Not Required |

### 6.3 Booking System (MVP Scope)

| ID | Requirement | Priority | MVP Status |
|----|-------------|----------|------------|
| REQ-BOOK-001 | Display session types with name, duration, price, deposit, inclusions | P0 | MVP |
| REQ-BOOK-MVP-001 | Inquiry form: session type, preferred date (text), contact info, message | P0 | MVP |
| REQ-BOOK-MVP-002 | Store inquiry in DynamoDB, email notifications (SES) | P0 | MVP |
| REQ-BOOK-MVP-003 | ~~Inquiry status tracking in admin dashboard~~ | - | Phase 2 |
| REQ-BOOK-010 | ~~Calendar availability view, blocked dates, timezone handling~~ | - | Phase 2 |
| REQ-BOOK-011 | ~~Admin calendar sync, recurring availability~~ | - | Phase 2 |
| REQ-BOOK-020 | ~~Full booking flow with date/time selection~~ | - | Phase 2 |
| REQ-BOOK-021 | ~~Deposit payment (Stripe), calendar integration~~ | - | Phase 2 |
| REQ-BOOK-022 | ~~Automated reminders (1 week, 24 hours)~~ | - | Phase 2 |

### 6.4 E-Commerce System

| ID | Requirement | Priority | MVP Status |
|----|-------------|----------|------------|
| REQ-ECOM-001 | Product types: prints, digital downloads, photo books, gift cards | P0 | Phase 2 |
| REQ-ECOM-002 | Print options: sizes, paper, framing, canvas/metal | P1 | Phase 2 |
| REQ-ECOM-010 | Pricing: per-item, package, digital collections, volume discounts | P1 | Phase 2 |
| REQ-ECOM-020 | Checkout: cart, shipping, discounts, Stripe, Apple/Google Pay | P0 | Phase 2 |
| REQ-ECOM-021 | Order confirmation, tracking, immediate digital delivery | P0 | Phase 2 |
| REQ-ECOM-030 | Print lab integration (auto-submit, tracking, drop-ship) | P2 | Phase 2 |

### 6.5 Blog/Content System

| ID | Requirement | Priority | MVP Status |
|----|-------------|----------|------------|
| REQ-BLOG-001 | MDX blog with featured images, categories, tags, scheduling | P1 | MVP |
| REQ-BLOG-002 | Gallery embeds, before/after comparisons, video, CTAs | P2 | MVP |
| REQ-BLOG-010 | SEO: meta title/description, Open Graph, structured data | P1 | MVP |
| REQ-BLOG-011 | XML sitemap, RSS feed, social share images | P1 | MVP |

### 6.6 Contact & Communication

| ID | Requirement | Priority | MVP Status |
|----|-------------|----------|------------|
| REQ-CONTACT-001 | Contact form: name, email, phone, session type, message | P0 | MVP |
| REQ-CONTACT-002 | Spam protection (honeypot + rate limiting, NO CAPTCHA) | P0 | MVP |
| REQ-CONTACT-003 | Notification emails (photographer + confirmation to inquirer) | P0 | MVP |
| REQ-CONTACT-010 | Display: hours, service area, contact info, social links | P0 | MVP |

### 6.7 Admin Dashboard

| ID | Requirement | Priority | MVP Status |
|----|-------------|----------|------------|
| REQ-ADMIN-001 | Overview: recent inquiries (view-only), stats, quick actions | P1 | MVP |
| REQ-ADMIN-010 | Content management: galleries, client galleries (blog/testimonials/FAQ via Git) | P1 | MVP |
| REQ-ADMIN-011 | Inquiry viewing: list, details (view-only, no status updates in MVP) | P1 | MVP |
| REQ-ADMIN-012 | ~~Inquiry management: status updates, notes, respond~~ | - | Phase 2 |
| REQ-ADMIN-020 | ~~Order management: pending orders, fulfillment, refunds, reports~~ | - | Phase 2 |

---

## 7. Technical Architecture

### 7.1 High-Level Architecture

```
┌─────────────────────────────────────────────────┐
│              CloudFront (CDN + SSL)             │
└─────────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
    S3 Static Site      API Gateway
    (Next.js export)         │
                             ▼
                    ┌─────────────────┐
                    │ Lambda Functions│
                    │ - contact       │
                    │ - client-auth   │
                    │ - client-gallery│
                    │ - process-image │
                    │ - admin         │
                    └─────────────────┘
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
              DynamoDB           S3 Media
              (3 tables)         (images/video)
```

### 7.2 Design Principles

1. **Serverless-First:** Minimize operational overhead and costs
2. **Static Generation:** Pre-render pages for optimal performance
3. **Edge Caching:** Serve content from CloudFront edge locations
4. **Pay-Per-Use:** Scale costs with actual usage
5. **Infrastructure as Code:** All resources managed via Terraform

### 7.3 Data Model (MVP)

#### DynamoDB Tables (3 tables)

| Table | Purpose | Primary Key | GSI |
|-------|---------|-------------|-----|
| `pitfal-galleries` | Galleries, images, selections, client sessions | PK: varies, SK: varies | - |
| `pitfal-inquiries` | Contact/booking inquiries | PK: `INQUIRY#{id}`, SK: `METADATA` | `byStatus` |
| `pitfal-admin` | Admin users, settings, sessions | PK: varies, SK: varies | - |

#### S3 Bucket Structure

```
pitfal-media/
├── originals/{galleryId}/{imageId}.{ext}
├── processed/{galleryId}/{imageId}/{size}w.webp
├── thumbnails/{galleryId}/{imageId}/{size}.webp
├── videos/{galleryId}/{videoId}.mp4
└── downloads/{token}/{filename}.zip (temporary)
```

---

## 8. Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 14+ (App Router) | React framework, static export |
| **Language** | TypeScript | Type-safe development |
| **Styling** | Tailwind CSS | Utility-first CSS framework |
| **State** | React Context + SWR | Client state and data fetching |
| **Forms** | React Hook Form + Zod | Form handling and validation |
| **Animation** | Framer Motion | Page transitions, gallery effects |
| **Backend** | AWS Lambda (Node.js) | Serverless compute |
| **API** | API Gateway (REST) | API management |
| **Database** | DynamoDB | Serverless NoSQL |
| **Storage** | S3 + CloudFront | Images, videos, static assets |
| **Email** | AWS SES | Transactional emails |
| **Analytics** | Google Analytics 4 | Traffic and engagement tracking |
| **DNS/SSL** | Route 53 + ACM | Domain management, SSL |
| **IaC** | Terraform | Infrastructure management |
| **CI/CD** | GitHub Actions | Automated deployments |

---

## 9. Infrastructure & Deployment

### 9.1 Cost Breakdown (Target: < $20/month)

| Service | Estimated Cost | Notes |
|---------|---------------|-------|
| S3 (storage + hosting) | ~$1-3/month | Static site + media |
| CloudFront CDN | ~$1-2/month | Edge caching |
| Lambda + API Gateway | ~$0-2/month | Free tier covers most usage |
| DynamoDB | ~$0-1/month | On-demand, free tier |
| SES (email) | ~$0/month | 62K emails free |
| Route 53 | ~$0.50/month | Hosted zone |
| ACM (SSL) | Free | Certificate management |
| **Total** | **~$3-10/month** | Well under $20 target |

### 9.2 Environments (MVP)

| Environment | Purpose | URL |
|-------------|---------|-----|
| Development | Local dev | localhost:3000 |
| Production | Live site | www.pitfal.solutions |

> **Note:** Staging environment deferred to Phase 2. MVP deploys directly to production with manual verification.

### 9.3 CI/CD Pipeline

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Push    │───▶│  Build   │───▶│  Test    │───▶│  Deploy  │
│  (main)  │    │  (Next)  │    │  (Jest)  │    │(Terraform)│
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                     │
                                    ┌────────────────┼────────────────┐
                                    ▼                ▼                ▼
                              ┌──────────┐     ┌──────────┐     ┌──────────┐
                              │ S3 Sync  │     │ Lambda   │     │Invalidate│
                              │ (static) │     │ Deploy   │     │CloudFront│
                              └──────────┘     └──────────┘     └──────────┘
```

---

## 10. Development Workflow

### 10.1 Available Claude Code Skills

| Skill | Command | Purpose |
|-------|---------|---------|
| **Deploy** | `/deploy` | Full deployment: pre-checks → build → Terraform → S3 sync → CloudFront invalidation |
| **Build** | `/build` | Run lint, type-check, tests, and build with detailed error reporting |
| **Test** | `/test` | Run tests: unit, E2E, coverage (80% threshold) |
| **Preview** | `/preview` | Start local Next.js dev server on port 3000 |
| **Optimize Images** | `/optimize-images` | Batch convert to WebP, generate sizes, create blur placeholders |
| **Sync Content** | `/sync-content` | Upload gallery content to S3 bucket |
| **View Logs** | `/logs` | Fetch Lambda/API Gateway CloudWatch logs |
| **Seed Database** | `/db-seed` | Populate DynamoDB with sample data (dev only) |

### 10.2 MCP Server Integrations

| Server | Purpose | Key Capabilities |
|--------|---------|------------------|
| `terraform` | Infrastructure deployment | Plan/apply, state management, best practices |
| `aws-docs` | AWS documentation | Search docs, API reference |
| `aws-pricing` | AWS pricing | Cost estimates, pricing lookups |
| `github` | Repository operations | Issues, PRs, actions |
| `filesystem` | Local file operations | Read, write, search |

### 10.3 Local Development Commands

```bash
# Development
pnpm dev                    # Start dev server
pnpm build                  # Production build
pnpm lint                   # Run ESLint
pnpm type-check             # TypeScript check
pnpm test                   # Run tests

# Infrastructure
cd infrastructure/terraform
terraform plan              # Preview changes
terraform apply             # Deploy infrastructure

# Docker (optional)
docker compose up           # Run containerized dev environment
```

---

## 11. Integrations

### 11.1 AWS SES Integration (MVP)

| Email Type | Trigger | Template |
|------------|---------|----------|
| Contact Acknowledgment | Contact form submitted | contact-ack |
| Inquiry Notification | Booking inquiry submitted | inquiry-notify |
| Client Gallery Ready | Gallery published | gallery-ready |
| Selection Notification | Client makes selections | selection-notify |

### 11.2 Google Analytics 4 (MVP)

| Event | Trigger | Data |
|-------|---------|------|
| `page_view` | Page load | Page path, title |
| `gallery_view` | Gallery opened | Gallery name, category |
| `inquiry_submit` | Form submitted | Session type |
| `contact_submit` | Contact form sent | - |

### 11.3 Phase 2 Integrations (Deferred)

The following integrations are planned for Phase 2:

- **Stripe Integration:** Payment processing for deposits and print sales
- **Calendar Integration:** Google Calendar sync for availability
- **Print Lab Integration:** Automated order fulfillment

---

## 12. Non-Functional Requirements

### 12.1 Performance

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.5s |
| Largest Contentful Paint | < 2.5s |
| Cumulative Layout Shift | < 0.1 |
| Lighthouse Score | > 90 (all categories) |
| Time to Interactive | < 3.0s |

### 12.2 Security

| Requirement | Implementation |
|-------------|----------------|
| HTTPS everywhere | CloudFront + ACM |
| Secure password storage | bcrypt |
| CSRF protection | Token-based |
| XSS prevention | Input sanitization, CSP |
| Rate limiting | API Gateway + Lambda |
| Signed URLs | Time-limited media access |

### 12.3 Scalability

| Metric | Target |
|--------|--------|
| Portfolio images | 10,000+ |
| Concurrent users | 100+ |
| Media storage | 1TB+ |
| API requests | 1M+/month |

### 12.4 Reliability

| Metric | Target |
|--------|--------|
| Uptime | 99.9% |
| Backup frequency | Daily (automated) |
| Recovery Time Objective | < 4 hours |
| Recovery Point Objective | < 24 hours |

### 12.5 Accessibility

| Standard | Requirement |
|----------|-------------|
| WCAG 2.1 | AA compliance |
| Color contrast | 4.5:1 minimum |
| Focus indicators | Visible on all interactive elements |
| Screen reader | Compatible with NVDA, VoiceOver |
| Keyboard navigation | Full site navigable |

### 12.6 Compliance

| Requirement | Implementation |
|-------------|----------------|
| Privacy policy | Published page |
| Terms of service | Published page |
| Cookie consent | GDPR-compliant banner |

---

## 13. Milestones & Phases

### MVP Roadmap (8-10 Weeks)

#### Week 1-2: Foundation & Infrastructure

| Deliverable | Description |
|-------------|-------------|
| Project setup | Next.js 14 + TypeScript + Tailwind |
| Base UI components | Button, Input, Modal, Card |
| Infrastructure deploy | S3, CloudFront, Route 53, ACM via Terraform |
| CI setup | GitHub Actions for build/deploy |
| Local DynamoDB | Docker-based local development |

**Milestone:** Empty site live at pitfal.solutions

#### Week 3-4: Core Pages & Navigation

| Deliverable | Description |
|-------------|-------------|
| Header/Footer/Nav | Responsive navigation components |
| Homepage | Hero, featured work, services overview |
| About page | Bio, story, social proof |
| Services page | 3-4 packages with pricing |
| Contact page | UI only (no backend yet) |
| Analytics | Google Analytics 4 integration |

**Milestone:** Complete public-facing pages

#### Week 5-6: Portfolio Gallery System

| Deliverable | Description |
|-------------|-------------|
| Gallery layouts | Grid, Masonry, Slideshow, Stacked |
| Lightbox | Full-screen viewing with zoom/navigation |
| Image loading | Lazy load + blur placeholders |
| Portfolio pages | Category organization |
| Video embeds | YouTube support for public videos |
| DynamoDB | Galleries table setup |

**Milestone:** Full portfolio system working

#### Week 7: Contact Form & Booking Inquiry

| Deliverable | Description |
|-------------|-------------|
| Contact form | React Hook Form + Zod validation |
| Spam protection | Honeypot + rate limiting |
| Lambda handler | Contact form processing |
| SES setup | Domain verification, email templates |
| Booking inquiry | Session type selection, preferred date, message |
| Inquiries table | DynamoDB storage and admin view |

**Milestone:** Working contact system with email

#### Week 8: Client Proofing Galleries

| Deliverable | Description |
|-------------|-------------|
| Password auth | Simple gallery-level authentication |
| Client gallery view | Selection mode with favorites |
| Selection workflow | Mark favorites, submit selections |
| Download system | S3 signed URLs for downloads |
| Private videos | S3 signed URLs for client videos |

**Milestone:** Client proofing system complete

#### Week 9: Admin Dashboard

| Deliverable | Description |
|-------------|-------------|
| Admin auth | Session-based authentication |
| Dashboard layout | Sidebar navigation |
| Overview stats | Recent activity, inquiry counts |
| Gallery CRUD | Create, edit, delete galleries |
| Image upload | S3 upload with Lambda processing |
| Inquiry management | View and update inquiry status |

**Milestone:** Admin can manage all content

#### Week 10: Blog, Polish & Launch

| Deliverable | Description |
|-------------|-------------|
| MDX blog | next-mdx-remote setup |
| Blog pages | Index and post templates |
| SEO | Meta tags, sitemap, structured data |
| Performance | Lighthouse optimization |
| Accessibility | WCAG 2.1 AA audit |
| Production deploy | Final deployment and verification |
| Content upload | Portfolio images, initial blog posts |
| Documentation | Owner how-to guides |

**Milestone:** Production launch

### Phase 2 Features (Post-MVP)

| Feature | Estimated Effort | Priority |
|---------|------------------|----------|
| Print sales / E-commerce | 4-6 weeks | P1 |
| Calendar booking integration | 2-3 weeks | P1 |
| Stripe payment for deposits | 1-2 weeks | P2 |
| Client accounts (optional) | 2-3 weeks | P3 |
| Automated email reminders | 1 week | P2 |
| Print lab integration | 3-4 weeks | P3 |
| Staging environment | 1 week | P3 |
| Watermarking (optional) | 1 week | P3 |

---

## 14. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| AWS costs exceed budget | Low | Medium | Set $20 billing alert, optimize image sizes |
| Gallery performance with many images | Medium | High | Implement virtualization from Week 5 |
| Admin dashboard scope creep | Medium | Medium | Start minimal, add incrementally |
| Timeline slippage | Medium | Medium | Buffer in weeks 9-10; defer blog if needed |
| Owner learning curve | Medium | Low | Step-by-step docs; `/deploy` skill automation |
| Security vulnerabilities | Low | High | Regular audits, dependency updates |

---

## 15. Appendices

### 15.1 Related Documents

| Document | Location | Purpose |
|----------|----------|---------|
| Functional Requirements | `docs/REQUIREMENTS.md` | Detailed feature specifications |
| System Architecture | `docs/ARCHITECTURE.md` | Technical design |
| Deployment Guide | `docs/DEPLOYMENT.md` | Deployment procedures |
| Claude Instructions | `CLAUDE.md` | Development context for Claude Code |

### 15.2 External Resources

| Resource | URL | Purpose |
|----------|-----|---------|
| AWS Console | console.aws.amazon.com | Infrastructure |
| Terraform Docs | terraform.io/docs | IaC reference |
| Next.js Docs | nextjs.org/docs | Framework reference |
| Google Analytics | analytics.google.com | Traffic analytics |

### 15.3 Glossary

| Term | Definition |
|------|------------|
| **LQIP** | Low Quality Image Placeholder - blur preview during load |
| **SSG** | Static Site Generation - pre-rendered HTML at build time |
| **ISR** | Incremental Static Regeneration - on-demand page updates |
| **OAC** | Origin Access Control - CloudFront S3 security |
| **SES** | Simple Email Service - AWS email sending |
| **CDN** | Content Delivery Network - edge caching |
| **MVP** | Minimum Viable Product - essential features for launch |

### 15.4 Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2026 | Claude Code | First draft |
| 1.1 | January 2026 | Claude Code | MVP scope refinement - 8-10 week timeline, deferred e-commerce, simplified booking |
| 1.2 | January 2026 | Claude Code | Added detailed milestone breakdown, development workflow skills |
| 1.3 | January 2026 | Claude Code | **Static content & security updates:** (1) Testimonials, FAQ, Style Guide now static content (JSON/MDX files); (2) Client auth uses HttpOnly cookies (7-day sessions); (3) Admin inquiry view is read-only for MVP; (4) Added API Gateway throttling for rate limiting |

---

## Document Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | | | |
| Technical Lead | | | |
| Stakeholder | | | |

---

*This PRD was generated by Claude Code using project documentation, MCP server integrations, and defined skills.*
