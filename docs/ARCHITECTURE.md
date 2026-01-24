# System Architecture - Pitfal Solutions Website

## Document Info
- **Version:** 1.4 (MVP Scope Refined)
- **Last Updated:** January 2026
- **Status:** MVP Architecture Finalized - Updated based on user decisions

---

## 1. Architecture Overview

### 1.1 High-Level Architecture (MVP)

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
                    │
                    ▼
                   SES
              (Email)
```

### 1.2 Design Principles

1. **Serverless-First:** Minimize operational overhead and costs
2. **Static Generation:** Pre-render pages for optimal performance
3. **Edge Caching:** Serve content from CloudFront edge locations
4. **Pay-Per-Use:** Scale costs with actual usage
5. **Infrastructure as Code:** All resources managed via Terraform

### 1.3 MVP Simplifications

| Original Plan | MVP Decision | Rationale |
|---------------|--------------|-----------|
| 4 DynamoDB tables | 3 tables | Removed orders table (Phase 2) |
| Stripe integration | Deferred | No e-commerce in MVP |
| Staging environment | Production only | Simpler deployment |
| Client accounts | Password-per-gallery | Easier for clients |
| Watermarking | None | Client trust model |

---

## 2. Frontend Architecture

### 2.1 Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | Next.js 14+ | React framework with App Router |
| Language | TypeScript | Type-safe development |
| Styling | Tailwind CSS | Utility-first CSS |
| State | React Context + SWR | Client state and data fetching |
| Forms | React Hook Form + Zod | Form handling and validation |
| Animation | Framer Motion | Page transitions, gallery effects |

### 2.2 Application Structure

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Homepage
│   ├── portfolio/
│   │   ├── page.tsx             # Portfolio index
│   │   └── [category]/
│   │       ├── page.tsx         # Category listing
│   │       └── [slug]/
│   │           └── page.tsx     # Individual gallery
│   ├── services/
│   │   └── page.tsx             # Services/packages
│   ├── about/
│   │   └── page.tsx             # About page
│   ├── blog/
│   │   ├── page.tsx             # Blog index
│   │   └── [slug]/
│   │       └── page.tsx         # Blog post
│   ├── contact/
│   │   └── page.tsx             # Contact form
│   ├── client/
│   │   └── [galleryId]/
│   │       └── page.tsx         # Client proofing gallery
│   └── admin/
│       ├── page.tsx             # Dashboard overview
│       ├── login/
│       │   └── page.tsx         # Admin login
│       └── galleries/
│           ├── page.tsx         # Gallery list
│           └── [id]/
│               └── page.tsx     # Edit gallery
│       # Note: inquiries/ and settings/ deferred to Phase 2
├── components/
│   ├── ui/                      # Base UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   └── Card.tsx
│   ├── gallery/                 # Gallery components
│   │   ├── GalleryGrid.tsx
│   │   ├── GalleryMasonry.tsx
│   │   ├── GallerySlideshow.tsx
│   │   ├── GalleryStacked.tsx
│   │   ├── Lightbox.tsx
│   │   └── ImageCard.tsx
│   ├── client/                  # Client proofing components
│   │   ├── ClientGalleryView.tsx
│   │   ├── PasswordGate.tsx
│   │   ├── ImageComment.tsx      # Comment UI for feedback
│   │   └── DownloadButton.tsx
│   │   # Note: SelectionMode.tsx removed - full access model
│   ├── admin/                   # Admin components
│   │   ├── AdminSidebar.tsx      # Navigation
│   │   ├── GalleryList.tsx       # Gallery listing
│   │   ├── GalleryEditor.tsx
│   │   ├── ImageUploader.tsx
│   │   ├── ImageGrid.tsx         # Manage gallery images
│   │   └── CategoryManager.tsx   # Configure categories
│   │   # Note: InquiryList.tsx deferred to Phase 2
│   └── layout/                  # Layout components
│       ├── Header.tsx
│       ├── Footer.tsx
│       └── Navigation.tsx
├── lib/
│   ├── api.ts                   # API client
│   ├── auth.ts                  # Auth utilities
│   └── utils.ts                 # General utilities
├── hooks/
│   ├── useGallery.ts
│   ├── useClientAuth.ts
│   └── useAdmin.ts
├── types/
│   └── index.ts                 # TypeScript types
└── styles/
    └── globals.css              # Global styles
```

### 2.3 Static Generation Strategy

| Page Type | Generation Method | Revalidation |
|-----------|------------------|--------------|
| Homepage | Static (SSG) | On-demand (ISR) |
| Portfolio | Static (SSG) | On-demand |
| Blog posts | Static (SSG) | On-demand |
| Services | Static (SSG) | On-demand |
| Contact | Static (SSG) | None needed |
| Client galleries | Dynamic (SSR) | Per request |
| Admin | Dynamic (SSR) | Per request |

### 2.4 Image Optimization Pipeline

```
Upload                Process               Serve
  │                     │                     │
  ▼                     ▼                     ▼
┌─────────┐       ┌───────────┐       ┌─────────────┐
│ Original│──────▶│ Lambda    │──────▶│ CloudFront  │
│ (S3)    │       │ (Sharp)   │       │ (CDN)       │
└─────────┘       └───────────┘       └─────────────┘
                        │
            ┌───────────┼───────────┐
            ▼           ▼           ▼
      ┌─────────┐ ┌─────────┐ ┌─────────┐
      │ 320w    │ │ 1280w   │ │ 2560w   │
      │ WebP    │ │ WebP    │ │ WebP    │
      └─────────┘ └─────────┘ └─────────┘
```

#### 2.4.1 Accepted Image Formats

| Format | Extension | Supported | Notes |
|--------|-----------|-----------|-------|
| JPEG | `.jpg`, `.jpeg` | ✓ | Primary format |
| PNG | `.png` | ✓ | For graphics with transparency |
| WebP | `.webp` | ✓ | Modern format, smaller size |
| HEIC/HEIF | `.heic`, `.heif` | ✓ | iPhone photos, converted to WebP |
| TIFF | `.tiff`, `.tif` | ✓ | High-quality source, converted |
| RAW | `.cr2`, `.nef`, `.arw` | ✗ | Not supported; export to JPEG/TIFF first |

**Maximum file size:** 50MB per image

#### 2.4.2 Image Processing Trigger

The `process-image` Lambda is triggered **immediately** when an image is uploaded to S3:

```
┌─────────────────────────────────────────────────────────────────┐
│                     S3 Event Trigger Flow                        │
└─────────────────────────────────────────────────────────────────┘

1. Admin uploads image via presigned URL
         │
         ▼
2. Image lands in S3: originals/{galleryId}/{imageId}.{ext}
         │
         ▼
3. S3 Event Notification fires (s3:ObjectCreated:*)
         │
         ▼
4. Lambda process-image invoked (async)
         │
         ├── Extract EXIF metadata
         ├── Generate WebP variants (320w, 640w, 1280w, 1920w, 2560w)
         ├── Generate thumbnails (150x150, 300x300, 600x600)
         ├── Generate blur placeholder (plaiceholder library)
         └── Update DynamoDB with processing status
         │
         ▼
5. Image ready for display (~5-15 seconds after upload)
```

**S3 Event Filter:**
- Prefix: `originals/`
- Suffix: `.jpg`, `.jpeg`, `.png`, `.webp`, `.heic`, `.tiff`

**Lambda Configuration:**
- Timeout: 30 seconds (handles large images)
- Memory: 1024 MB (Sharp requires memory for image processing)
- Concurrency: 10 reserved (prevents overload during batch uploads)

**Error Handling Strategy:**
When image processing fails (corrupt file, unsupported format, timeout):
1. Log error details to CloudWatch (image ID, gallery ID, error type, stack trace)
2. Update DynamoDB record with `status: 'failed'` and error message
3. **Do NOT stop batch** - continue processing remaining images
4. Admin sees failed images in dashboard with retry option
5. Failed originals remain in S3 for manual inspection

```
┌─────────────────────────────────────────────────────────────────┐
│                     Error Handling Flow                          │
└─────────────────────────────────────────────────────────────────┘

Processing attempt
       │
       ├── Success → Update DynamoDB status: 'complete'
       │
       └── Failure → catch (error)
               │
               ├── Log to CloudWatch
               ├── Update DynamoDB: status: 'failed', error: message
               └── Continue to next image (no throw)
```

#### 2.4.3 Blur Placeholder Generation

**Approach:** CSS-only blur using tiny thumbnails

Chosen over library-based solutions (plaiceholder, blurhash) for:
- Zero additional dependencies
- No bundle size impact
- Simpler implementation
- Good visual quality with minimal complexity

**Implementation:**

```typescript
// Frontend: components/gallery/BlurImage.tsx
export function BlurImage({ src, thumbnailSrc, alt }: BlurImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative">
      {/* Tiny thumbnail with CSS blur */}
      <img
        src={thumbnailSrc} // 20x20 pixel thumbnail
        alt=""
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300
          ${loaded ? 'opacity-0' : 'opacity-100'}
          blur-lg scale-110`} // CSS blur + scale to hide edges
        aria-hidden="true"
      />
      {/* Full resolution image */}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={`w-full h-full object-cover transition-opacity duration-300
          ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}
```

**Thumbnail Generation (Lambda):**
- Generate 20x20 pixel thumbnail during image processing
- Store at `thumbnails/{galleryId}/{imageId}/blur.webp`
- ~200-500 bytes per image (negligible storage cost)

**CSS Classes:**
```css
.blur-lg { filter: blur(16px); }
.scale-110 { transform: scale(1.1); } /* Hide blur edges */
```

**Storage:** Blur thumbnails stored in S3 at `thumbnails/{galleryId}/{imageId}/blur.webp`

---

## 3. Backend Architecture

### 3.1 Lambda Functions (MVP)

| Function | Trigger | Purpose |
|----------|---------|---------|
| `api-contact` | API Gateway | Handle contact form submissions |
| `api-client-auth` | API Gateway | Authenticate client gallery access |
| `api-client-gallery` | API Gateway | Client gallery operations (comments, downloads) |
| `api-admin` | API Gateway | Admin operations (gallery CRUD, categories) |
| `process-image` | S3 Event | Generate image variants on upload |
| `send-email` | SNS | Send transactional emails via SES |

### 3.2 API Endpoints (MVP)

```
API Gateway (REST)
│
├── /contact
│   └── POST    → Submit contact/inquiry form
│
├── /client
│   ├── /auth
│   │   ├── POST   → Authenticate with gallery password
│   │   └── DELETE → Logout (invalidate session)
│   ├── /:galleryId
│   │   ├── GET  → Get gallery (requires auth token)
│   │   └── POST → Add comment to image
│   └── /:galleryId/download
│       └── POST → Generate signed download URL (any image)
│
└── /admin
    ├── /auth
    │   ├── POST   → Admin login
    │   ├── DELETE → Admin logout (invalidate session)
    │   └── /reset-password
    │       ├── POST → Request password reset (sends email)
    │       └── PUT  → Complete password reset (with token)
    ├── /galleries
    │   ├── GET  → List all galleries
    │   ├── POST → Create gallery
    │   └── /:id
    │       ├── GET    → Get gallery details
    │       ├── PUT    → Update gallery
    │       └── DELETE → Delete gallery (cascades to images/comments)
    ├── /images
    │   ├── POST → Upload image (returns presigned URL)
    │   └── /:id
    │       ├── PUT    → Update image metadata
    │       └── DELETE → Delete image (cascades to comments)
    └── /categories
        ├── GET  → List categories
        ├── POST → Create category
        └── /:id
            ├── PUT    → Update category
            └── DELETE → Delete category

    # MVP: Read-only inquiry viewing
    └── /inquiries
        └── GET  → List inquiries (view-only, no management actions)

    # Phase 2 endpoints (not in MVP):
    # PUT /inquiries/:id - Update inquiry status
    # DELETE /inquiries/:id - Archive/delete inquiry
    # /settings - Site settings management

# Note: Testimonials and FAQ are static content stored in /content/*.json
# No API endpoints needed - content is bundled at build time
```

### 3.3 API Error Response Schema

All API endpoints return consistent error responses:

```typescript
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;           // Machine-readable error code
    message: string;        // Human-readable message
    details?: object;       // Additional context (validation errors, etc.)
    requestId?: string;     // For debugging/support
  };
  timestamp: string;        // ISO 8601 timestamp
}

// Success response wrapper
interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}
```

**Standard Error Codes:**

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_REQUIRED` | 401 | Authentication required |
| `AUTH_INVALID` | 401 | Invalid credentials |
| `AUTH_EXPIRED` | 401 | Session/token expired |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `RATE_LIMITED` | 429 | Too many requests |
| `GALLERY_EXPIRED` | 410 | Client gallery has expired |
| `SELECTION_LIMIT` | 400 | Selection limit exceeded |
| `UPLOAD_FAILED` | 500 | Image upload/processing failed |
| `EMAIL_FAILED` | 500 | Email delivery failed |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

**Example Error Response:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "fields": {
        "email": "Invalid email format",
        "phone": "Phone number too short"
      }
    },
    "requestId": "req_abc123"
  },
  "timestamp": "2026-01-15T10:30:00.000Z"
}
```

### 3.3 Lambda Function Structure

```
lambda/
├── contact/
│   ├── index.ts          # Handler
│   ├── schema.ts         # Zod validation
│   └── templates/        # Email templates
│       ├── contact-ack.html
│       └── inquiry-notify.html
├── client-auth/
│   ├── index.ts          # Password verification
│   └── jwt.ts            # Token generation
├── client-gallery/
│   ├── index.ts          # Gallery operations
│   ├── selections.ts     # Selection handling
│   └── download.ts       # Signed URL generation
├── admin/
│   ├── index.ts          # Router
│   ├── galleries.ts      # Gallery CRUD
│   ├── images.ts         # Image management
│   ├── inquiries.ts      # Inquiry management
│   └── auth.ts           # Admin authentication
├── process-image/
│   ├── index.ts          # S3 trigger handler
│   └── resize.ts         # Sharp image processing
├── send-email/
│   └── index.ts          # SES email sender
└── shared/
    ├── db.ts             # DynamoDB client
    ├── email.ts          # SES client
    ├── s3.ts             # S3 client
    └── response.ts       # API response helpers
```

---

## 4. Data Architecture (MVP)

### 4.1 DynamoDB Tables (Simplified to 3 Tables)

#### Table 1: pitfal-galleries (Single-Table Design)

This table uses a single-table design pattern to store galleries, images, selections, and client sessions.

```
Table: pitfal-galleries
│
├── Gallery Metadata
│   ├── PK: GALLERY#{galleryId}
│   ├── SK: METADATA
│   └── Attributes:
│       ├── title: string
│       ├── category: string (brands|portraits|events|custom)
│       ├── description: string
│       ├── coverImage: string (imageId)
│       ├── isPublic: boolean
│       ├── isClientGallery: boolean
│       ├── password: string (hashed, for client galleries)
│       ├── expiresAt: number (optional, epoch)
│       ├── downloadLimit: number (optional)
│       ├── selectionLimit: number (optional, for client galleries)
│       ├── createdAt: number
│       └── updatedAt: number
│
├── Images (same table, different SK)
│   ├── PK: GALLERY#{galleryId}
│   ├── SK: IMAGE#{imageId}
│   └── Attributes:
│       ├── filename: string
│       ├── title: string
│       ├── description: string
│       ├── s3Key: string
│       ├── thumbnails: { sm, md, lg, xl }
│       ├── dimensions: { width, height }
│       ├── exif: object
│       ├── tags: string[]
│       ├── order: number
│       ├── isFeatured: boolean
│       └── createdAt: number
│
├── Client Selections (for proofing galleries)
│   ├── PK: GALLERY#{galleryId}
│   ├── SK: SELECTION#{imageId}
│   └── Attributes:
│       ├── selectedAt: number
│       ├── comment: string (optional)
│       └── sessionToken: string
│
└── Client Sessions (auth tokens)
    ├── PK: GALLERY#{galleryId}
    ├── SK: SESSION#{token}
    └── Attributes:
        ├── createdAt: number
        ├── expiresAt: number
        └── ipAddress: string

Global Secondary Indexes (GSI):

GSI: byCategory
├── PK: category (e.g., "brands", "portraits", "events")
├── SK: createdAt
└── Projects: galleryId, title, coverImage, isPublic
└── Use case: List all public galleries by category for portfolio page

GSI: byFeatured
├── PK: isFeatured (string: "true" or "false")
├── SK: createdAt
└── Projects: galleryId, imageId, s3Key, thumbnails
└── Use case: Get featured images for homepage hero section

GSI: byCreatedDate
├── PK: entityType (e.g., "GALLERY", "IMAGE")
├── SK: createdAt
└── Projects: galleryId, title, category, isPublic
└── Use case: List newest galleries for "Recent Work" section, admin dashboard
```

#### Table 2: pitfal-inquiries

```
Table: pitfal-inquiries
├── PK: INQUIRY#{inquiryId}
├── SK: METADATA
└── Attributes:
    ├── type: string (contact|booking)
    ├── name: string
    ├── email: string
    ├── phone: string (optional)
    ├── sessionType: string (optional, for booking inquiries)
    ├── preferredDate: string (optional, text field)
    ├── message: string
    ├── status: string (new|contacted|booked|declined|closed)
    ├── notes: string (admin notes)
    ├── createdAt: number
    └── updatedAt: number

GSI: byStatus
├── PK: STATUS#{status}
├── SK: INQUIRY#{inquiryId}
└── Projects: inquiryId, name, email, type, createdAt
```

#### Table 3: pitfal-admin

```
Table: pitfal-admin
│
├── Admin Users
│   ├── PK: ADMIN#{username}
│   ├── SK: METADATA
│   └── Attributes:
│       ├── passwordHash: string
│       ├── email: string
│       ├── role: string (owner|editor)
│       ├── createdAt: number
│       └── lastLogin: number
│
├── Admin Sessions
│   ├── PK: SESSION#{token}
│   ├── SK: METADATA
│   └── Attributes:
│       ├── adminId: string
│       ├── createdAt: number
│       ├── expiresAt: number
│       └── ipAddress: string
│
└── Site Settings
    ├── PK: SETTINGS
    ├── SK: {key} (e.g., "site-info", "email-templates", "services")
    └── Attributes:
        └── value: object (flexible JSON)
```

### 4.2 S3 Bucket Structure

```
pitfal-media/
├── originals/
│   └── {galleryId}/
│       └── {imageId}.{ext}
├── processed/
│   └── {galleryId}/
│       └── {imageId}/
│           ├── 320w.webp
│           ├── 640w.webp
│           ├── 1280w.webp
│           ├── 1920w.webp
│           └── 2560w.webp
├── thumbnails/
│   └── {galleryId}/
│       └── {imageId}/
│           ├── sm.webp (150x150)
│           ├── md.webp (300x300)
│           └── lg.webp (600x600)
├── videos/
│   └── {galleryId}/
│       └── {videoId}.mp4
├── blur/
│   └── {galleryId}/
│       └── {imageId}.txt (base64 blur hash)
└── downloads/
    └── {downloadToken}/
        └── {filename}.zip (temporary, auto-deleted after 24h)
```

---

## 5. Infrastructure Architecture

### 5.1 Terraform Module Structure

```
infrastructure/terraform/
├── main.tf              # Provider and backend config
├── variables.tf         # Input variables
├── outputs.tf           # Output values
├── s3.tf               # S3 buckets (static site, media)
├── cloudfront.tf       # CloudFront distribution
├── lambda.tf           # Lambda functions
├── api-gateway.tf      # API Gateway REST API
├── dynamodb.tf         # DynamoDB tables (3 tables)
├── ses.tf              # SES configuration
├── route53.tf          # DNS records
├── acm.tf              # SSL certificates
├── iam.tf              # IAM roles and policies
└── modules/
    └── lambda-function/
        ├── main.tf
        ├── variables.tf
        └── outputs.tf
```

### 5.2 AWS Resource Map

```
┌─────────────────────────────────────────────────────────────────┐
│                         Route 53                                 │
│  pitfal.solutions → CloudFront                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                       CloudFront                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Origin 1    │  │ Origin 2    │  │ Origin 3                │  │
│  │ S3 (static) │  │ S3 (media)  │  │ API Gateway             │  │
│  │ /*          │  │ /media/*    │  │ /api/*                  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                         Lambda                                   │
│  ┌──────────┐ ┌───────────┐ ┌───────────┐ ┌──────────────────┐  │
│  │ contact  │ │client-auth│ │client-gal │ │ process-image    │  │
│  └──────────┘ └───────────┘ └───────────┘ └──────────────────┘  │
│  ┌──────────┐ ┌───────────┐                                      │
│  │  admin   │ │send-email │                                      │
│  └──────────┘ └───────────┘                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      Data Layer                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                      DynamoDB                                │ │
│  │  ┌────────────────┐ ┌─────────────┐ ┌────────────────────┐  │ │
│  │  │pitfal-galleries│ │pitfal-      │ │pitfal-admin        │  │ │
│  │  │(galleries,     │ │inquiries    │ │(users, sessions,   │  │ │
│  │  │ images,        │ │             │ │ settings)          │  │ │
│  │  │ selections,    │ │             │ │                    │  │ │
│  │  │ sessions)      │ │             │ │                    │  │ │
│  │  └────────────────┘ └─────────────┘ └────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────┐                                             │
│  │       SES       │                                             │
│  │  (transactional │                                             │
│  │   emails)       │                                             │
│  └─────────────────┘                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Security Architecture

### 6.1 Authentication Flow (Client Proofing - MVP)

Simple password-based authentication per gallery using HttpOnly cookies:

```
1. Client visits gallery URL (e.g., /client/abc123)
          │
          ▼
2. Browser automatically sends session cookie (if exists)
          │
          ├─── Cookie exists → API validates session
          │                         │
          │                    ┌────┴────┐
          │                    ▼         ▼
          │               Valid      Invalid/Expired
          │                 │            │
          │                 ▼            ▼
          │            Show gallery   Show password form
          │
          └─── No cookie → Show password form
                              │
                              ▼
3. Client enters password
          │
          ▼
4. POST /api/client/auth
   {galleryId, password}
          │
          ▼
5. Lambda validates:
   - Gallery exists
   - Password matches (bcrypt)
   - Gallery not expired
          │
          ▼
6. Sets HttpOnly cookie with session token (7 day expiry)
          │
          ▼
7. Cookie automatically sent with all subsequent requests
```

**Cookie Configuration:**

```typescript
// lambda/client-auth/index.ts
const sessionCookie = {
  name: 'pitfal_client_session',
  value: sessionToken,
  options: {
    httpOnly: true,      // Prevents XSS token theft
    secure: true,        // HTTPS only
    sameSite: 'Strict',  // CSRF protection
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    path: '/client',     // Only sent to client gallery routes
    domain: '.pitfal.solutions'
  }
};
```

**Session Refresh (Sliding Expiration):**
- On each authenticated request, check if session expires within 24 hours
- If so, issue new cookie with refreshed 7-day expiry
- Ensures active users stay logged in

```typescript
// lambda/shared/session.ts
function shouldRefreshSession(expiresAt: number): boolean {
  const oneDayFromNow = Date.now() + (24 * 60 * 60 * 1000);
  return expiresAt < oneDayFromNow;
}
```

### 6.2 Admin Authentication Flow

Basic session-based authentication:

```
1. Admin visits /admin
          │
          ▼
2. Check for session token (httpOnly cookie)
          │
          ├─── Token exists → Validate
          │                      │
          │                 ┌────┴────┐
          │                 ▼         ▼
          │            Valid      Invalid
          │              │            │
          │              ▼            ▼
          │         Dashboard    Login page
          │
          └─── No token → Login page
                              │
                              ▼
3. Admin enters credentials
          │
          ▼
4. POST /api/admin/auth
   {username, password}
          │
          ▼
5. Lambda validates:
   - User exists in pitfal-admin table
   - Password matches (bcrypt)
          │
          ▼
6. Creates session in DynamoDB
   Returns session token (7 day expiry)
          │
          ▼
7. Set httpOnly cookie with token
```

### 6.3 Security Measures

| Layer | Measure |
|-------|---------|
| Transport | HTTPS (TLS 1.3) via CloudFront |
| API | API Gateway throttling (10 req/sec burst, 5 req/sec sustained) |
| Data | Encryption at rest (S3, DynamoDB) |
| Auth | HttpOnly cookies (client), HttpOnly cookies (admin) |
| Passwords | bcrypt hashing (cost factor 12) |
| Forms | Honeypot fields, API Gateway per-client throttling |
| Media | Signed URLs for downloads (1-hour expiry) |
| XSS | Content-Security-Policy headers, HttpOnly cookies |
| CSRF | SameSite=Strict cookies, double-submit token (admin) |

**Rate Limiting via API Gateway:**

API Gateway provides built-in throttling without additional infrastructure:

```hcl
# infrastructure/terraform/api-gateway.tf
resource "aws_api_gateway_method_settings" "all" {
  rest_api_id = aws_api_gateway_rest_api.pitfal.id
  stage_name  = aws_api_gateway_stage.prod.stage_name
  method_path = "*/*"

  settings {
    throttling_burst_limit = 10   # Max concurrent requests
    throttling_rate_limit  = 5    # Sustained requests per second
  }
}

# Stricter limits for auth endpoints
resource "aws_api_gateway_method_settings" "auth" {
  rest_api_id = aws_api_gateway_rest_api.pitfal.id
  stage_name  = aws_api_gateway_stage.prod.stage_name
  method_path = "client/auth/POST"

  settings {
    throttling_burst_limit = 3    # Prevent brute force
    throttling_rate_limit  = 1    # 1 attempt per second max
  }
}
```

When throttled, API Gateway returns HTTP 429 with `Retry-After` header.

#### 6.3.1 CSRF Protection for Admin Actions

Admin actions use a double-submit cookie pattern:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CSRF Protection Flow                          │
└─────────────────────────────────────────────────────────────────┘

1. On admin login, server generates CSRF token
         │
         ▼
2. Token stored in:
   - httpOnly cookie: pitfal_csrf (SameSite=Strict)
   - Response body: { csrfToken: "..." }
         │
         ▼
3. Frontend stores token in memory (not localStorage)
         │
         ▼
4. All mutating requests (POST, PUT, DELETE) include:
   - Cookie: pitfal_csrf (automatic)
   - Header: X-CSRF-Token (explicit)
         │
         ▼
5. Server validates both values match
```

**Implementation:**

```typescript
// lambda/shared/csrf.ts
import crypto from 'crypto';

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function validateCsrfToken(
  cookieToken: string | undefined,
  headerToken: string | undefined
): boolean {
  if (!cookieToken || !headerToken) return false;
  return crypto.timingSafeEqual(
    Buffer.from(cookieToken),
    Buffer.from(headerToken)
  );
}
```

**Exempt Endpoints:** (read-only operations)
- `GET /admin/*` - All GET requests
- `POST /admin/auth` - Login (no session yet)
- `POST /admin/auth/reset-password` - Password reset request

**Protected Endpoints:** (all state-changing operations)
- `POST /admin/galleries` - Create gallery
- `PUT /admin/galleries/:id` - Update gallery
- `DELETE /admin/galleries/:id` - Delete gallery
- `POST /admin/images` - Upload image
- `DELETE /admin/images/:id` - Delete image
- `PUT /admin/inquiries/:id` - Update inquiry
- `PUT /admin/settings` - Update settings

#### 6.3.2 Session Invalidation

**Client Gallery Sessions:**
- Token stored in `httpOnly` cookie (pitfal_client_session)
- DELETE `/api/client/auth` invalidates session in DynamoDB
- Response clears cookie with `Max-Age=0`
- Sessions auto-expire after 7 days (with sliding refresh)

**Admin Sessions:**
- Token stored in `httpOnly` cookie (pitfal_admin_session)
- DELETE `/api/admin/auth` invalidates session in DynamoDB
- Cookie cleared with `Max-Age=0`
- Sessions auto-expire after 7 days

```typescript
// lambda/admin/auth.ts - Logout handler
async function handleLogout(sessionToken: string): Promise<void> {
  await dynamodb.delete({
    TableName: 'pitfal-admin',
    Key: {
      PK: `SESSION#${sessionToken}`,
      SK: 'METADATA'
    }
  });
}
```

### 6.4 Cascade Delete Implementation

When a gallery or image is deleted, related resources must be cleaned up:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Gallery Deletion Flow                          │
└─────────────────────────────────────────────────────────────────┘

1. Admin requests DELETE /admin/galleries/:id
          │
          ▼
2. Mark gallery status as 'deleting' (prevents access)
          │
          ▼
3. Query all images in gallery (PK=GALLERY#id, SK begins_with IMAGE#)
          │
          ▼
4. For each image, delete from S3:
   ├── originals/{galleryId}/{imageId}.*
   ├── processed/{galleryId}/{imageId}/*
   ├── thumbnails/{galleryId}/{imageId}/*
   └── (Retry up to 3 times on failure)
          │
          ▼
5. Delete all DynamoDB items:
   ├── Gallery metadata (PK=GALLERY#id, SK=METADATA)
   ├── All images (PK=GALLERY#id, SK=IMAGE#*)
   ├── All comments (PK=GALLERY#id, SK=COMMENT#*)
   └── All sessions (PK=GALLERY#id, SK=SESSION#*)
          │
          ▼
6. Return success response
```

**Error Handling:**

```typescript
// lambda/admin/galleries.ts
async function deleteGallery(galleryId: string): Promise<void> {
  // Step 1: Mark as deleting (optimistic lock)
  await db.update({
    Key: { PK: `GALLERY#${galleryId}`, SK: 'METADATA' },
    UpdateExpression: 'SET #status = :status',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':status': 'deleting' },
    ConditionExpression: 'attribute_exists(PK)' // Fail if already deleted
  });

  // Step 2: Delete S3 objects (with retry)
  const s3Errors: string[] = [];
  for (const image of images) {
    try {
      await deleteImageFromS3(galleryId, image.imageId);
    } catch (error) {
      s3Errors.push(image.imageId);
      console.error(`S3 delete failed for ${image.imageId}:`, error);
    }
  }

  // Step 3: Delete DynamoDB items (batch)
  await batchDeleteItems(galleryId);

  // Step 4: Log any S3 failures for manual cleanup
  if (s3Errors.length > 0) {
    console.warn(`Orphaned S3 files for gallery ${galleryId}:`, s3Errors);
    // Phase 2: Send admin notification
  }
}
```

**Orphan Cleanup (Phase 2):**
- Scheduled Lambda runs daily to find orphaned S3 files
- Compares S3 objects against DynamoDB records
- Deletes files not referenced in database

### 6.5 IAM Roles

```
Lambda Execution Role (pitfal-lambda-role):
├── DynamoDB:
│   ├── GetItem, PutItem, UpdateItem, DeleteItem, Query
│   └── Resources: pitfal-galleries, pitfal-inquiries, pitfal-admin
├── S3:
│   ├── GetObject, PutObject, DeleteObject
│   └── Resources: pitfal-media/*
├── SES:
│   └── SendEmail, SendTemplatedEmail
├── CloudWatch:
│   └── CreateLogGroup, CreateLogStream, PutLogEvents
└── SSM (Parameter Store):
    └── GetParameter (for secrets)

CloudFront OAC:
└── S3: GetObject
    └── Resources: pitfal-static/*, pitfal-media/*

API Gateway Role:
└── Lambda: InvokeFunction
    └── Resources: pitfal-* functions
```

---

## 7. Deployment Architecture (MVP)

### 7.1 CI/CD Pipeline

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Push    │───▶│  Build   │───▶│  Test    │───▶│  Deploy  │
│  (main)  │    │  (Next)  │    │  (Jest)  │    │(Terraform)│
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                      │
                                    ┌─────────────────┼─────────────────┐
                                    ▼                 ▼                 ▼
                              ┌──────────┐     ┌──────────┐     ┌──────────┐
                              │ S3 Sync  │     │ Lambda   │     │Invalidate│
                              │ (static) │     │ Deploy   │     │CloudFront│
                              └──────────┘     └──────────┘     └──────────┘
```

### 7.2 Environment Strategy (MVP)

| Environment | Purpose | URL |
|-------------|---------|-----|
| Development | Local dev | localhost:3000 |
| Production | Live site | www.pitfal.solutions |

> **Note:** Staging environment deferred to Phase 2. MVP deploys directly to production with manual verification before merge.

### 7.3 Local Development with S3

**Requirement:** Local development MUST connect to real S3 buckets for serving photos and videos.

This ensures:
- Developers see actual media content during development
- Image optimization pipeline is tested with real assets
- No need for large local media files or mocks

```
┌─────────────────────────────────────────────────────────────────┐
│                    Local Development                             │
│                                                                   │
│  localhost:3000 (Next.js dev server)                             │
│         │                                                         │
│         ├── Static pages/components → Local files                │
│         │                                                         │
│         └── Media (images/videos) → S3 via CloudFront            │
│                                         │                         │
│                              ┌──────────┴──────────┐             │
│                              ▼                     ▼             │
│                        pitfal-media         CloudFront CDN       │
│                        (S3 bucket)          (cached delivery)    │
└─────────────────────────────────────────────────────────────────┘
```

**Configuration:**

```typescript
// lib/config.ts
export const config = {
  // Media always served from production S3/CloudFront
  mediaBaseUrl: process.env.NEXT_PUBLIC_MEDIA_URL || 'https://media.pitfal.solutions',

  // API endpoint changes based on environment
  apiBaseUrl: process.env.NODE_ENV === 'development'
    ? 'http://localhost:3001/api'  // Local API (optional)
    : 'https://www.pitfal.solutions/api',
};
```

**Environment Variables (`.env.local`):**

```bash
# Media - always use production S3/CloudFront
NEXT_PUBLIC_MEDIA_URL=https://media.pitfal.solutions

# AWS credentials for local Lambda testing (optional)
AWS_PROFILE=pitfal
AWS_REGION=us-west-2

# For local API development (optional)
LOCAL_API_PORT=3001
```

**Why This Approach:**

1. **Single source of truth** - All environments use the same media bucket
2. **No sync issues** - Local dev always has current portfolio
3. **Realistic testing** - Image loading, CDN caching works the same
4. **Cost effective** - S3 reads are cheap, no need for separate dev bucket
5. **Simpler setup** - No local media management required

**Local API Options:**

| Option | When to Use |
|--------|-------------|
| Use production API | Simple frontend work, no API changes |
| Local Lambda (SAM/Serverless) | API development, testing Lambda logic |
| Mock API (MSW) | Unit testing, offline development |

### 7.4 Deployment Phases

**Phase A: Manual First Deploy**
- Run Terraform manually
- Verify each resource
- Document any issues

**Phase B: Semi-Automated (Week 2+)**
- GitHub Actions for build/test
- Manual approval for deploy
- Terraform via CI

**Phase C: Full CI/CD (Future)**
- Automatic deploys on merge
- Canary deployments
- Automated rollback

---

## 8. Monitoring & Observability

### 8.1 CloudWatch Dashboards

- **Site Performance:** Response times, error rates
- **Lambda Metrics:** Invocations, duration, errors
- **API Gateway:** Requests, latency, 4xx/5xx
- **Cost:** Daily/monthly cost breakdown

### 8.2 Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| High error rate | >5% 5xx in 5min | Email owner |
| Lambda throttling | Any throttle event | Email owner |
| Billing spike | >150% of average | Email owner |
| Certificate expiry | <30 days | Email owner |

### 8.3 Logging

```
CloudWatch Log Groups:
├── /aws/lambda/pitfal-contact
├── /aws/lambda/pitfal-client-auth
├── /aws/lambda/pitfal-client-gallery
├── /aws/lambda/pitfal-admin
├── /aws/lambda/pitfal-process-image
├── /aws/lambda/pitfal-send-email
├── /aws/api-gateway/pitfal-api
└── /aws/cloudfront/pitfal-distribution
```

---

## 9. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2026 | Claude Code | First draft |
| 1.1 | January 2026 | Claude Code | Simplified to 3 DynamoDB tables, updated auth flows for MVP, removed orders table, updated architecture diagrams |
| 1.2 | January 2026 | Claude Code | Added Section 7.3: Local Development with S3 - configuration for connecting to production S3/CloudFront during local dev |
| 1.3 | January 2026 | Claude Code | Added API error response schema (3.3), accepted image formats (2.4.1), image processing trigger details (2.4.2), plaiceholder for blur generation (2.4.3), CSRF protection details (6.3.1), session invalidation (6.3.2), admin password reset and cascade delete endpoints |
| 1.4 | January 2026 | Claude Code | **Major refinements:** (1) Added 3 DynamoDB GSIs (byCategory, byFeatured, byCreatedDate) for efficient queries; (2) Changed client auth from localStorage to HttpOnly cookies with 7-day sliding sessions; (3) Updated rate limiting to use API Gateway throttling; (4) Replaced plaiceholder library with CSS-only blur approach; (5) Added cascade delete implementation details (6.4); (6) Marked /admin/inquiries as read-only for MVP; (7) Noted testimonials/FAQ as static content |
