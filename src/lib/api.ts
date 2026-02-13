/**
 * API client for Pitfal Solutions backend
 * Handles all client and admin API interactions
 *
 * Uses token-based auth (Authorization header) for cross-origin compatibility.
 * Tokens are stored in sessionStorage and sent as Bearer tokens.
 * Lambdas also accept cookies for same-origin (production with custom domain).
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// =============================================================================
// Shared Types
// =============================================================================

export interface GallerySection {
  id: string;
  title: string;
  description?: string;
  images: string[];
}

export interface BulkDownloadResult {
  downloads: Array<{
    key: string;
    downloadUrl: string;
  }>;
}

// Token storage keys
const ADMIN_TOKEN_KEY = 'pitfal_admin_token';
const CLIENT_TOKEN_KEY = 'pitfal_client_token';

function getStoredToken(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function storeToken(key: string, token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) sessionStorage.setItem(key, token);
    else sessionStorage.removeItem(key);
  } catch {
    // sessionStorage unavailable (e.g. private browsing in some browsers)
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public fieldErrors?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  // Select the right token based on path
  const token = path.startsWith('/api/admin')
    ? getStoredToken(ADMIN_TOKEN_KEY)
    : path.startsWith('/api/client')
      ? getStoredToken(CLIENT_TOKEN_KEY)
      : null;

  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new ApiError(
      data.error || 'Request failed',
      res.status,
      data.code,
      data.errors
    );
  }

  return data.data;
}

// =============================================================================
// Client Auth
// =============================================================================

export const clientAuth = {
  login: async (galleryId: string, password: string) => {
    const data = await request<{
      authenticated: boolean;
      galleryId: string;
      galleryTitle: string;
      token: string;
    }>('/api/client/auth', {
      method: 'POST',
      body: JSON.stringify({ galleryId, password }),
    });
    if (data.token) storeToken(CLIENT_TOKEN_KEY, data.token);
    return data;
  },

  check: () =>
    request<{ authenticated: boolean; galleryId?: string }>('/api/client/auth'),

  logout: async () => {
    const data = await request<{ authenticated: boolean }>('/api/client/auth', {
      method: 'DELETE',
    });
    storeToken(CLIENT_TOKEN_KEY, null);
    return data;
  },
};

// =============================================================================
// Client Gallery
// =============================================================================

export const clientGallery = {
  get: (galleryId: string) =>
    request<{
      gallery: {
        id: string;
        title: string;
        description?: string;
        images: Array<{ key: string; alt?: string }>;
        heroImage: string | null;
        sections: GallerySection[];
        category: string;
      };
      comments: Array<{
        id: string;
        imageKey: string;
        author: string;
        text: string;
        createdAt: string;
      }>;
    }>(`/api/client/${galleryId}`),

  addComment: (
    galleryId: string,
    imageKey: string,
    author: string,
    text: string
  ) =>
    request<{
      comment: {
        id: string;
        imageKey: string;
        author: string;
        text: string;
        createdAt: string;
      };
    }>(`/api/client/${galleryId}/comment`, {
      method: 'POST',
      body: JSON.stringify({ imageKey, author, text }),
    }),

  getDownloadUrl: (galleryId: string, imageKey: string, size: 'full' | 'web' = 'full') =>
    request<{ downloadUrl: string }>(`/api/client/${galleryId}/download`, {
      method: 'POST',
      body: JSON.stringify({ imageKey, size }),
    }),

  bulkDownload: (galleryId: string, imageKeys?: string[]) =>
    request<BulkDownloadResult>(`/api/client/${galleryId}/bulk-download`, {
      method: 'POST',
      body: JSON.stringify(imageKeys ? { imageKeys } : {}),
    }),
};

// =============================================================================
// Admin Auth
// =============================================================================

export const adminAuth = {
  login: async (username: string, password: string) => {
    const data = await request<{
      authenticated: boolean;
      username: string;
      token: string;
    }>('/api/admin/auth', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (data.token) storeToken(ADMIN_TOKEN_KEY, data.token);
    return data;
  },

  check: () =>
    request<{ authenticated: boolean; username?: string }>('/api/admin/auth'),

  logout: async () => {
    const data = await request<{ authenticated: boolean }>('/api/admin/auth', {
      method: 'DELETE',
    });
    storeToken(ADMIN_TOKEN_KEY, null);
    return data;
  },
};

// =============================================================================
// Admin Galleries
// =============================================================================

export const adminGalleries = {
  list: () =>
    request<{
      galleries: Array<{
        id: string;
        title: string;
        category: string;
        type: string;
        slug: string;
        imageCount: number;
        sectionCount: number;
        heroImage: string | null;
        featured: boolean;
        createdAt: string;
        updatedAt: string;
      }>;
    }>('/api/admin/galleries'),

  get: (id: string) =>
    request<{
      gallery: {
        id: string;
        title: string;
        description?: string;
        category: string;
        type: string;
        slug: string;
        images: Array<{ key: string; alt?: string }>;
        heroImage?: string;
        sections?: GallerySection[];
        featured?: boolean;
        createdAt: string;
        updatedAt: string;
      };
    }>(`/api/admin/galleries/${id}`),

  create: (data: {
    title: string;
    description?: string;
    category: string;
    type: string;
    slug: string;
    password?: string;
    featured?: boolean;
    heroImage?: string;
    sections?: GallerySection[];
  }) =>
    request<{
      gallery: {
        id: string;
        title: string;
        category: string;
        type: string;
        slug: string;
        createdAt: string;
        updatedAt: string;
      };
    }>('/api/admin/galleries', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (
    id: string,
    data: {
      title?: string;
      description?: string;
      category?: string;
      type?: string;
      slug?: string;
      featured?: boolean;
      images?: Array<{ key: string; alt?: string }>;
      heroImage?: string | null;
      sections?: GallerySection[];
      password?: string;
    }
  ) =>
    request<{ updated: boolean }>(`/api/admin/galleries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ deleted: boolean }>(`/api/admin/galleries/${id}`, {
      method: 'DELETE',
    }),

  bulkDownload: (galleryId: string, imageKeys?: string[]) =>
    request<BulkDownloadResult>(
      `/api/admin/galleries/${galleryId}/bulk-download`,
      {
        method: 'POST',
        body: JSON.stringify(imageKeys ? { imageKeys } : {}),
      }
    ),
};

// =============================================================================
// Admin Images
// =============================================================================

export const adminImages = {
  getUploadUrl: (galleryId: string, filename: string, contentType: string) =>
    request<{ uploadUrl: string; key: string }>('/api/admin/images', {
      method: 'POST',
      body: JSON.stringify({ galleryId, filename, contentType }),
    }),

  updateAlt: (imageKey: string, galleryId: string, alt: string) =>
    request<{ updated: boolean }>('/api/admin/images', {
      method: 'PUT',
      body: JSON.stringify({ imageKey, galleryId, alt }),
    }),

  delete: (imageKey: string, galleryId: string) =>
    request<{ deleted: boolean }>('/api/admin/images', {
      method: 'DELETE',
      body: JSON.stringify({ imageKey, galleryId }),
    }),
};

// =============================================================================
// Admin Inquiries
// =============================================================================

export const adminInquiries = {
  list: (status?: string) =>
    request<{ inquiries: Array<Record<string, unknown>> }>(
      `/api/admin/inquiries${status ? `?status=${status}` : ''}`
    ),

  update: (id: string, status: string) =>
    request<{ updated: boolean }>(`/api/admin/inquiries/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  delete: (id: string) =>
    request<{ deleted: boolean }>(`/api/admin/inquiries/${id}`, {
      method: 'DELETE',
    }),
};

// =============================================================================
// Admin Gallery Notifications
// =============================================================================

export const adminNotify = {
  sendGalleryReady: (
    galleryId: string,
    clientEmail: string,
    clientName: string,
    expirationDays?: number
  ) =>
    request<{ notified: boolean }>(
      `/api/admin/galleries/${galleryId}/notify`,
      {
        method: 'POST',
        body: JSON.stringify({ clientEmail, clientName, expirationDays }),
      }
    ),
};
