# Functional Requirements - Pitfal Solutions Website

## Document Info
- **Version:** 1.4 (MVP Scope Refined)
- **Last Updated:** January 2026
- **Status:** MVP Scope Finalized - Updated based on user decisions

---

## Status Legend

| Status | Description |
|--------|-------------|
| **MVP** | Included in initial 8-10 week launch |
| **Phase 2** | Deferred to post-MVP development |
| **Not Required** | Removed from scope |

---

## 1. Portfolio & Gallery System

### 1.1 Gallery Display

**REQ-GAL-001:** System shall display images in multiple layout formats: `[MVP]`
- Grid layout (configurable columns: 2, 3, 4)
- Masonry layout (Pinterest-style)
- Slideshow/carousel view
- Stacked/editorial layout

**REQ-GAL-002:** System shall support full-screen lightbox viewing with: `[MVP]`
- Zoom capability (pinch and scroll)
- Navigation arrows (keyboard support: left/right)
- Image metadata display (title, date, camera settings)
- Close button (ESC key support)

**REQ-GAL-003:** System shall implement responsive image loading: `[MVP]`
- Serve WebP format with JPEG fallback
- Multiple srcset sizes (320w, 640w, 1280w, 1920w, 2560w)
- Lazy loading for off-screen images
- Blur placeholder during load (LQIP)

**REQ-GAL-004:** System shall support video content: `[MVP]`
- YouTube/Vimeo embed support for public videos
- Self-hosted video (S3) for client deliverables
- Thumbnail preview before playback
- Autoplay on hover (muted, optional)

### 1.2 Gallery Organization

**REQ-GAL-010:** System shall organize galleries by category: `[MVP]`
- **Admin-configurable categories** (not hardcoded)
- Admin can create, rename, reorder, and delete categories
- No default categories - admin defines all categories via dashboard
- Example categories: Brands, Portraits, Events, Weddings, Commercial (admin choice)

**REQ-GAL-011:** System shall support filtering and sorting: `[MVP]`
- Filter by category, date, tags
- Sort by date (newest/oldest), featured
- Search by title/tags

**REQ-GAL-012:** System shall support featured/hero images: `[MVP]`
- Mark images as "featured" for homepage display
- Assign custom ordering within galleries
- Set gallery cover image

### 1.3 Gallery Administration

**REQ-GAL-020:** Admin shall be able to: `[MVP]`
- Upload images (single and batch)
- Edit image metadata (title, description, tags, alt text)
- Reorder images within galleries
- Delete images
- Create/edit/delete galleries

**REQ-GAL-021:** System shall automatically generate: `[MVP]`
- Multiple image sizes on upload
- WebP versions
- Blur placeholder hashes (using plaiceholder library)
- EXIF data extraction

**REQ-GAL-022:** System shall support the following image formats: `[MVP]`
- JPEG (.jpg, .jpeg) - Primary format
- PNG (.png) - For graphics with transparency
- WebP (.webp) - Modern format
- HEIC/HEIF (.heic, .heif) - iPhone photos (auto-converted to WebP)
- TIFF (.tiff, .tif) - High-quality source (auto-converted)
- Maximum file size: 50MB per image
- RAW formats NOT supported (must export to JPEG/TIFF first)

**REQ-GAL-023:** When deleting a gallery, system shall cascade delete: `[MVP]`
- All images in the gallery (from S3 and DynamoDB)
- All client selections associated with the gallery
- All client sessions for the gallery
- All processed variants and thumbnails

**REQ-GAL-024:** When deleting an image, system shall cascade delete: `[MVP]`
- All processed variants (WebP sizes) from S3
- All thumbnails from S3
- Blur placeholder from S3
- All comments on that image

**REQ-GAL-025:** Image processing error handling: `[MVP]`
- When processing fails (corrupt file, unsupported format, timeout):
  - Skip the failed image
  - Log error details to CloudWatch
  - Update DynamoDB status to "failed" with error message
  - Show error indicator in admin dashboard
  - Continue processing remaining images in batch
- Admin can retry failed images or delete them

---

## 2. Client Proofing System

### 2.1 Client Gallery Access

**REQ-PROOF-001:** System shall provide password-protected galleries: `[MVP]`
- Unique gallery link per client/event
- Password authentication (no user account required)
- Expiration date (optional)
- **Full access to all images** (no download limits - simplified pricing model)

**REQ-PROOF-002:** ~~Client galleries shall display watermarked previews~~ `[Not Required]`
- **Decision:** Client trust model - no watermarking needed
- Direct previews without watermarks
- High-resolution downloads available after selection

### 2.2 Client Feedback

**REQ-PROOF-010:** Clients shall be able to: `[MVP]`
- View all images in their gallery
- Add comments on individual images (for feedback, edit requests)
- Download any/all images (high-res or web-sized, no selection required)
- ~~Mark images as favorites/selected~~ `[Not Required - simplified model]`
- ~~Approve final selections~~ `[Not Required - full access model]`

**REQ-PROOF-011:** System shall track: `[MVP]`
- Comment history with timestamps
- Download activity (for analytics, not limits)
- ~~Selection count vs. package allowance~~ `[Not Required]`
- ~~Approval status~~ `[Not Required]`

**REQ-PROOF-012:** System shall notify photographer when: `[MVP]`
- Client adds comments (email notification)
- ~~Client makes new selections~~ `[Not Required]`
- ~~Client completes approval~~ `[Not Required]`

### 2.3 Download & Delivery

**REQ-PROOF-020:** System shall support: `[MVP]`
- Individual image download (any image in gallery)
- Bulk download (ZIP) of all images in gallery
- Different download resolutions (web-optimized, high-resolution)
- ~~Download tracking/limits~~ `[Not Required - unlimited access model]`

**REQ-PROOF-021:** ~~System shall apply configurable watermarks~~ `[Not Required]`
- **Decision:** Not needed per client trust model

---

## 3. Booking System

### 3.1 Session Types

**REQ-BOOK-001:** System shall display available session types: `[MVP]`
- Portrait sessions (30min, 1hr, 2hr)
- Event coverage (half-day, full-day)
- Commercial/brand sessions
- Custom packages

**REQ-BOOK-002:** Each session type shall have: `[MVP]`
- Name and description
- Duration
- Starting price
- Deposit amount
- What's included

### 3.2 Booking Inquiry (MVP Scope)

**REQ-BOOK-MVP-001:** Inquiry form shall collect: `[MVP]`
- Session type selection (Portrait, Event, Brand, Other)
- Preferred date (text field, not calendar picker)
- Contact information (name, email, phone)
- Message / special requests

**REQ-BOOK-MVP-002:** Inquiry handling: `[MVP]`
- Store inquiry in DynamoDB with unique ID
- Send email notification to photographer (SES)
- Send confirmation email to client
- Appear in admin dashboard with status tracking

**REQ-BOOK-MVP-003:** Inquiry status workflow: `[MVP]`
- Status options: New, Contacted, Booked, Declined, Closed
- Timestamp for status changes
- Notes field for photographer

### 3.3 Calendar & Scheduling (Deferred)

**REQ-BOOK-010:** ~~System shall show available time slots~~ `[Phase 2]`
- Calendar view of availability
- Blocked dates (holidays, booked, personal)
- Time zone handling

**REQ-BOOK-011:** ~~Admin shall manage availability~~ `[Phase 2]`
- Set recurring availability (e.g., Tue-Sat, 9am-6pm)
- Block specific dates/times
- Set buffer time between sessions
- Sync with external calendar (Google, iCal)

### 3.4 Full Booking Flow (Deferred)

**REQ-BOOK-020:** ~~Booking flow shall collect~~ `[Phase 2]`
- Session type selection
- Preferred date/time from calendar
- Client contact info (name, email, phone)
- Session details (location, purpose, number of people)
- Special requests

**REQ-BOOK-021:** ~~System shall process bookings~~ `[Phase 2]`
- Show booking summary before confirmation
- Collect deposit payment (Stripe)
- Send confirmation email with details
- Add to photographer's calendar

**REQ-BOOK-022:** ~~System shall send automated reminders~~ `[Phase 2]`
- 1 week before session
- 24 hours before session
- Customizable reminder content

---

## 4. E-Commerce System `[Phase 2 - All Requirements]`

### 4.1 Product Types

**REQ-ECOM-001:** System shall support product types: `[Phase 2]`
- Print orders (various sizes)
- Digital downloads (high-res images)
- Photo books/albums
- Gift cards

**REQ-ECOM-002:** Print products shall include: `[Phase 2]`
- Standard sizes (4x6, 5x7, 8x10, 11x14, 16x20, 24x36)
- Paper options (glossy, matte, metallic)
- Framing options (optional)
- Canvas/metal prints (optional)

### 4.2 Pricing & Packages

**REQ-ECOM-010:** System shall support pricing models: `[Phase 2]`
- Per-item pricing
- Package pricing (X prints for $Y)
- Digital collection pricing
- Tiered pricing (volume discounts)

**REQ-ECOM-011:** Admin shall configure: `[Phase 2]`
- Base prices per product/size
- Markup percentages
- Package contents and pricing
- Sales/discounts

### 4.3 Checkout & Payment

**REQ-ECOM-020:** Checkout shall: `[Phase 2]`
- Display cart contents and totals
- Calculate shipping (if applicable)
- Apply discount codes
- Process payment via Stripe
- Support card and Apple Pay/Google Pay

**REQ-ECOM-021:** Order confirmation shall: `[Phase 2]`
- Send receipt email
- Provide order tracking
- Deliver digital downloads immediately

### 4.4 Fulfillment Integration

**REQ-ECOM-030:** System shall integrate with print lab: `[Phase 2]`
- Submit print orders automatically
- Track fulfillment status
- Ship directly to customer

---

## 5. Blog/Content System

### 5.1 Blog Posts

**REQ-BLOG-001:** Blog shall support: `[MVP]`
- MDX content (Markdown + React components)
- Featured images
- Categories and tags
- Author attribution
- Publication date/scheduling

**REQ-BLOG-002:** Blog posts shall include: `[MVP]`
- Gallery embeds from portfolio
- Before/after image comparisons
- Video embeds
- Call-to-action components

### 5.2 Blog Administration

**REQ-BLOG-003:** Blog content management: `[MVP]`
- Blog posts are **Git-based MDX files** (no web CMS interface)
- Admin writes MDX files locally, commits to Git, deploys via CI/CD
- No blog editing in admin dashboard - managed via code repository
- Simpler architecture, no content API required for blog

### 5.3 SEO Optimization

**REQ-BLOG-010:** Each blog post shall have: `[MVP]`
- Custom meta title
- Meta description
- Open Graph tags
- Structured data (Article schema)
- Canonical URL

**REQ-BLOG-011:** System shall generate: `[MVP]`
- XML sitemap
- RSS feed
- Social share images

---

## 6. Contact & Communication

### 6.1 Contact Form

**REQ-CONTACT-001:** Contact form shall collect: `[MVP]`
- Name (required)
- Email (required, validated)
- Phone (optional)
- Session type interest
- Message

**REQ-CONTACT-002:** Form shall include spam protection: `[MVP]`
- Honeypot field (hidden field that bots fill)
- Rate limiting (max 3 submissions per IP per hour)
- **No CAPTCHA** - to avoid user friction
- Success/error messaging

**REQ-CONTACT-003:** System shall: `[MVP]`
- Send notification email to photographer
- Send confirmation email to inquirer
- Log inquiry in admin dashboard

### 6.2 Business Information

**REQ-CONTACT-010:** Site shall display: `[MVP]`
- Business hours (7am-10pm daily)
- Service area (Aurora, CO and surrounding)
- Contact email (info@pitfal.solutions)
- Phone number ((970) 703-6336)
- Social media links

---

## 7. User Interface Requirements

### 7.1 Navigation

**REQ-UI-001:** Primary navigation shall include: `[MVP]`
- Home
- Portfolio (with category dropdowns)
- Services/Packages
- About
- Blog
- Contact
- Client Login (for proofing)

**REQ-UI-002:** Navigation shall be: `[MVP]`
- Sticky/fixed on scroll
- Mobile hamburger menu
- Accessible (keyboard navigable)

### 7.2 Responsive Design

**REQ-UI-010:** Site shall be responsive: `[MVP]`
- Mobile (320px - 767px)
- Tablet (768px - 1023px)
- Desktop (1024px+)
- Large desktop (1440px+)

**REQ-UI-011:** Touch interactions: `[MVP]`
- Swipe gestures for galleries
- Tap to zoom on mobile
- Pull to refresh (optional)

### 7.3 Performance

**REQ-UI-020:** Performance targets: `[MVP]`
- First Contentful Paint < 1.5s
- Largest Contentful Paint < 2.5s
- Cumulative Layout Shift < 0.1
- Lighthouse score > 90

### 7.4 Accessibility

**REQ-UI-030:** Accessibility requirements: `[MVP]`
- WCAG 2.1 AA compliance
- Color contrast ratios (4.5:1 minimum)
- Focus indicators visible
- Screen reader compatible
- Alt text for all images

---

## 7.5 Testimonials Section

**REQ-UI-040:** Site shall display client testimonials: `[MVP]`
- Testimonial cards with client name, photo (optional), and quote
- Star rating display (1-5 stars)
- Session type and date
- Rotating/carousel display on homepage
- Full testimonials page with all reviews
- Admin can add/edit/delete testimonials

**REQ-UI-041:** Testimonial data structure: `[MVP]`
- Client name (required)
- Client photo (optional, S3 stored)
- Quote/testimonial text (required, max 500 characters)
- Star rating (required, 1-5)
- Session type (Portrait, Event, Brand, etc.)
- Session date (for ordering)
- Featured flag (for homepage display)

---

## 7.6 FAQ Section

**REQ-UI-050:** Site shall include FAQ page: `[MVP]`
- Accordion-style Q&A format
- Organized by category (Booking, Sessions, Delivery, Pricing)
- Search/filter functionality
- Admin can add/edit/delete/reorder FAQs

**REQ-UI-051:** FAQ categories: `[MVP]`
- **Booking:** How to book, deposits, cancellation policy
- **Sessions:** What to wear, what to expect, locations
- **Delivery:** Timeline, format, downloads
- **Pricing:** Package details, additional purchases
- **General:** Contact, service area, availability

---

## 7.7 Package Comparison Table

**REQ-UI-060:** Services page shall include package comparison: `[MVP]`
- Side-by-side comparison of all packages
- Clear pricing display with starting prices
- Feature checklist (included vs. not included)
- Highlighted "most popular" package
- Mobile-responsive (stacked on mobile)
- CTA buttons for each package (links to contact form)

**REQ-UI-061:** Package comparison features to display: `[MVP]`
- Session duration
- Number of final edited images
- Digital download included (yes/no)
- Print credits included
- Location options (studio, outdoor, both)
- Outfit changes
- Online gallery duration
- Additional services (hair/makeup, rush delivery)

---

## 7.8 Style Guide Page

**REQ-UI-070:** Site shall include client style guide: `[MVP]`
- "What to Wear" recommendations by session type
- Color palette suggestions
- Outfit examples with photos
- Things to avoid
- Preparation tips (hair, makeup, rest)
- Location-specific advice

**REQ-UI-071:** Style guide sections: `[MVP]`
- **Portraits:** Individual and family styling tips
- **Brand/Corporate:** Professional attire guidelines
- **Events:** Dress code awareness, formal vs. casual
- **General Tips:** Solid colors, textures, layers
- **Pinterest Board Links:** Curated inspiration (optional)

---

## 8. Admin Dashboard

### 8.1 Overview

**REQ-ADMIN-001:** Dashboard shall display: `[MVP]`
- Recent inquiries/booking requests
- Gallery statistics (views, downloads)
- Quick actions (create gallery, view inquiries)
- Google Analytics embed (optional)

### 8.2 Content Management

**REQ-ADMIN-010:** Admin shall manage via dashboard: `[MVP]`
- Galleries and images (create, edit, delete, reorder)
- Portfolio categories (create, rename, reorder, delete)
- Client galleries (create, set passwords, manage access)
- ~~Blog posts~~ `[Managed via Git-based MDX files, not dashboard]`
- ~~Services/packages~~ `[Phase 2 - manual for MVP]`
- ~~Site settings~~ `[Phase 2]`

### 8.3 Inquiry Management

**REQ-ADMIN-011:** ~~Admin shall view/manage inquiries in dashboard~~ `[Phase 2]`
- MVP: Inquiries handled via email notifications only
- No inquiry tracking dashboard in MVP
- Phase 2 will add: List view, status tracking, notes, history

### 8.4 Admin Authentication

**REQ-ADMIN-012:** Admin password reset flow: `[MVP]`
1. Admin clicks "Forgot Password" on login page
2. System sends password reset email (valid for 1 hour)
3. Email contains secure token link to reset page
4. Admin sets new password (minimum 12 characters)
5. All existing sessions invalidated on password change
6. Confirmation email sent after successful reset

**REQ-ADMIN-013:** Admin session management: `[MVP]`
- Sessions expire after 7 days of inactivity
- Logout invalidates session immediately
- Session stored in httpOnly cookie (not localStorage)
- CSRF protection on all mutating operations

### 8.4 Admin Security (Phase 2)

**REQ-ADMIN-014:** Two-factor authentication (2FA) for admin login: `[Phase 2]`
- TOTP-based 2FA (Google Authenticator, Authy, etc.)
- Optional for MVP, required in Phase 2
- Recovery codes for backup access

### 8.5 Order Management (Deferred)

**REQ-ADMIN-020:** ~~Admin shall view/manage orders~~ `[Phase 2]`
- Pending orders
- Fulfillment status
- Refunds/returns
- Sales reports

---

## 9. Testing Requirements

### 9.1 Test-Driven Development Workflow

**REQ-TEST-001:** Every feature MUST have corresponding tests: `[MVP]`
- Unit tests for all utility functions and hooks
- Component tests for all React components
- Integration tests for API endpoints
- E2E tests for critical user flows

**REQ-TEST-002:** Tests MUST be run after each component is built: `[MVP]`
- Build component → Write tests → Run tests → Verify pass → Move to next component
- No feature is considered complete until tests pass
- CI/CD pipeline blocks deploy if tests fail

**REQ-TEST-003:** Test coverage requirements: `[MVP]`
- Minimum 80% code coverage for new code
- 100% coverage for critical paths (auth, payments, data handling)
- All edge cases documented and tested

### 9.2 Testing Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit Tests | Vitest | Fast unit testing for functions/utilities |
| Component Tests | React Testing Library | Component behavior testing |
| API Tests | Vitest + Supertest | Lambda function testing |
| E2E Tests | Playwright | Full browser automation |
| Mocking | MSW (Mock Service Worker) | API mocking for frontend tests |

### 9.3 Test Categories by Feature

| Feature | Unit Tests | Component Tests | Integration Tests | E2E Tests |
|---------|------------|-----------------|-------------------|-----------|
| Gallery Display | Image utils | GalleryGrid, Lightbox | - | Gallery navigation |
| Client Proofing | Auth utils | PasswordGate, SelectionMode | Auth API | Full proofing flow |
| Booking/Inquiry | Form validation | InquiryForm | Contact API | Submit inquiry |
| Blog | MDX parsing | BlogPost | - | Blog navigation |
| Admin Dashboard | CRUD utils | GalleryEditor, InquiryList | Admin API | Admin workflow |
| Image Processing | Resize utils | - | Lambda trigger | Upload to display |

### 9.4 Test File Structure

```
src/
├── components/
│   ├── gallery/
│   │   ├── GalleryGrid.tsx
│   │   └── GalleryGrid.test.tsx     # Component tests
│   └── ...
├── lib/
│   ├── utils.ts
│   └── utils.test.ts                 # Unit tests
└── ...

lambda/
├── contact/
│   ├── index.ts
│   └── index.test.ts                 # API tests
└── ...

tests/
├── e2e/
│   ├── gallery.spec.ts               # E2E tests
│   ├── client-proofing.spec.ts
│   └── admin.spec.ts
└── fixtures/
    └── ...                           # Test data
```

### 9.5 Development Workflow Enforcement

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Implement  │────▶│ Write Tests │────▶│ Run Tests   │────▶│   Commit    │
│  Feature    │     │             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ▼
                                        ┌───────────┐
                                        │  Pass?    │
                                        └───────────┘
                                         │        │
                                        Yes       No
                                         │        │
                                         ▼        ▼
                                      Commit    Fix & Retest
```

**Pre-commit Hook:**
```bash
# Runs automatically before each commit
pnpm test:changed   # Tests for changed files only
pnpm lint          # Lint check
pnpm type-check    # TypeScript check
```

**CI Pipeline:**
```bash
# Runs on every PR
pnpm test          # Full test suite
pnpm test:coverage # Coverage report
pnpm build         # Build verification
```

---

## 10. Non-Functional Requirements

### 10.1 Security

**REQ-SEC-001:** Security requirements: `[MVP]`
- HTTPS everywhere
- Secure password storage (bcrypt)
- CSRF protection
- XSS prevention
- Rate limiting on forms/APIs

### 10.2 Scalability

**REQ-SCALE-001:** System shall handle: `[MVP]`
- 10,000+ images in portfolio
- 100+ concurrent users
- 1TB+ of media storage

### 10.3 Reliability

**REQ-REL-001:** Availability target: `[MVP]`
- 99.9% uptime
- Automated backups (daily)
- Disaster recovery plan

### 10.4 Compliance

**REQ-COMP-001:** Legal compliance: `[MVP]`
- Privacy policy
- Terms of service
- Cookie consent (GDPR)

---

## 11. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2026 | Claude Code | First draft |
| 1.1 | January 2026 | Claude Code | Added MVP status to all requirements, simplified booking to inquiry form, updated spam protection (no CAPTCHA), removed watermarking |
| 1.2 | January 2026 | Claude Code | Added Section 9: Testing Requirements - test-driven workflow, coverage requirements, testing stack |
| 1.3 | January 2026 | Claude Code | Added accepted image formats (REQ-GAL-022), cascade delete behavior (REQ-GAL-023/024), admin password reset (REQ-ADMIN-012/013), Testimonials (7.5), FAQ (7.6), Package Comparison (7.7), Style Guide (7.8) |
| 1.4 | January 2026 | Claude Code | **MVP Scope Refinement:** Simplified client proofing (full access, no selection limits), admin-configurable categories (not hardcoded), Git-based blog (no web CMS), moved inquiry dashboard to Phase 2, added admin 2FA as Phase 2, added image processing error handling (REQ-GAL-025) |
