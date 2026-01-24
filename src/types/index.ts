/**
 * Type definitions for Pitfal Solutions website
 */

// =============================================================================
// Gallery Types
// =============================================================================

export interface Gallery {
  id: string;
  title: string;
  category: GalleryCategory;
  description: string;
  coverImage: string;
  isPublic: boolean;
  isClientGallery: boolean;
  password?: string;
  expiresAt?: number;
  downloadLimit?: number;
  selectionLimit?: number;
  createdAt: number;
  updatedAt: number;
}

export type GalleryCategory = 'brands' | 'portraits' | 'events' | 'custom';

export interface GalleryImage {
  id: string;
  galleryId: string;
  filename: string;
  title: string;
  description?: string;
  s3Key: string;
  thumbnails: ImageThumbnails;
  dimensions: ImageDimensions;
  exif?: ImageExif;
  tags: string[];
  order: number;
  isFeatured: boolean;
  createdAt: number;
}

export interface ImageThumbnails {
  sm: string; // 150x150
  md: string; // 300x300
  lg: string; // 600x600
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImageExif {
  camera?: string;
  lens?: string;
  focalLength?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: number;
  dateTaken?: string;
}

// =============================================================================
// Client Proofing Types
// =============================================================================

export interface ClientSelection {
  imageId: string;
  galleryId: string;
  selectedAt: number;
  comment?: string;
  sessionToken: string;
}

export interface ClientSession {
  token: string;
  galleryId: string;
  createdAt: number;
  expiresAt: number;
  ipAddress: string;
}

// =============================================================================
// Inquiry Types
// =============================================================================

export interface Inquiry {
  id: string;
  type: 'contact' | 'booking';
  name: string;
  email: string;
  phone?: string;
  sessionType?: SessionType;
  preferredDate?: string;
  message: string;
  status: InquiryStatus;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export type InquiryStatus = 'new' | 'contacted' | 'booked' | 'declined' | 'closed';

export type SessionType = 'Portrait' | 'Brand' | 'Event' | 'Other';

// =============================================================================
// Service/Package Types
// =============================================================================

export interface Service {
  id: string;
  name: string;
  description: string;
  duration: string;
  startingPrice: number;
  deposit: number;
  includes: string[];
}

// =============================================================================
// Testimonial Types
// =============================================================================

export interface Testimonial {
  id: string;
  clientName: string;
  clientPhoto?: string;
  quote: string;
  rating: 1 | 2 | 3 | 4 | 5;
  sessionType: SessionType;
  sessionDate: string;
  featured: boolean;
}

// =============================================================================
// FAQ Types
// =============================================================================

export interface FAQ {
  id: string;
  category: FAQCategory;
  question: string;
  answer: string;
  order: number;
}

export type FAQCategory = 'Booking' | 'Sessions' | 'Delivery' | 'Pricing' | 'General';

// =============================================================================
// Admin Types
// =============================================================================

export interface AdminUser {
  username: string;
  email: string;
  role: 'owner' | 'editor';
  createdAt: number;
  lastLogin: number;
}

export interface AdminSession {
  token: string;
  adminId: string;
  createdAt: number;
  expiresAt: number;
  ipAddress: string;
}

// =============================================================================
// API Types
// =============================================================================

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
  };
  timestamp: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export type ApiErrorCode =
  | 'AUTH_REQUIRED'
  | 'AUTH_INVALID'
  | 'AUTH_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'GALLERY_EXPIRED'
  | 'SELECTION_LIMIT'
  | 'UPLOAD_FAILED'
  | 'EMAIL_FAILED'
  | 'INTERNAL_ERROR';

// =============================================================================
// Site Settings Types
// =============================================================================

export interface SiteSettings {
  businessName: string;
  tagline: string;
  email: string;
  phone: string;
  address: string;
  businessHours: string;
  socialLinks: SocialLinks;
}

export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  twitter?: string;
  youtube?: string;
  tiktok?: string;
}
