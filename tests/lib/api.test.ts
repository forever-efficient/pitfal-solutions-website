import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  adminAuth,
  adminGalleries,
  adminImages,
  adminImagen,
  adminInquiries,
  adminNotify,
  adminProcessing,
  clientAuth,
  clientGallery,
  publicGalleries,
} from '@/lib/api';

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = {
  success: false;
  error: string;
  code?: string;
  errors?: Array<{ field: string; message: string }>;
};

function mockFetchJson<T>(payload: ApiSuccess<T> | ApiFailure, status = 200, ok = true) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok,
    status,
    json: async () => payload,
  });
}

describe('lib/api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn() as unknown as typeof fetch;
    sessionStorage.clear();
  });

  it('uses empty base URL for non-localhost (deployed) environments', async () => {
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, hostname: 'www.pitfal.solutions' },
      writable: true,
      configurable: true,
    });

    try {
      mockFetchJson({ success: true, data: { images: [] } });
      await publicGalleries.getFeaturedImages(5);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/galleries/featured/images?limit=5',
        expect.any(Object)
      );
    } finally {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
        configurable: true,
      });
    }
  });

  it('stores and uses client auth token for client endpoints', async () => {
    mockFetchJson({
      success: true,
      data: {
        authenticated: true,
        galleryId: 'g1',
        galleryTitle: 'Gallery 1',
        token: 'client-token',
      },
    });

    await clientAuth.login('g1', 'secret');
    expect(sessionStorage.getItem('pitfal_client_token')).toBe('client-token');

    mockFetchJson({
      success: true,
      data: {
        authenticated: true,
        galleryId: 'g1',
      },
    });

    await clientAuth.check();

    expect(global.fetch).toHaveBeenLastCalledWith('/api/client/auth', {
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: 'Bearer client-token',
      },
    });
  });

  it('stores and uses admin token for admin endpoints', async () => {
    mockFetchJson({
      success: true,
      data: { authenticated: true, username: 'admin', token: 'admin-token' },
    });

    await adminAuth.login('admin', 'secret');
    expect(sessionStorage.getItem('pitfal_admin_token')).toBe('admin-token');

    mockFetchJson({
      success: true,
      data: { galleries: [] },
    });

    await adminGalleries.list();

    expect(global.fetch).toHaveBeenLastCalledWith('/api/admin/galleries', {
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: 'Bearer admin-token',
      },
    });
  });

  it('clears stored token on logout for both auth flows', async () => {
    sessionStorage.setItem('pitfal_client_token', 'client-token');
    sessionStorage.setItem('pitfal_admin_token', 'admin-token');

    mockFetchJson({ success: true, data: { authenticated: false } });
    await clientAuth.logout();
    expect(sessionStorage.getItem('pitfal_client_token')).toBeNull();

    mockFetchJson({ success: true, data: { authenticated: false } });
    await adminAuth.logout();
    expect(sessionStorage.getItem('pitfal_admin_token')).toBeNull();
  });

  it('throws ApiError with status/code/fieldErrors when backend returns failure payload', async () => {
    mockFetchJson(
      {
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: [{ field: 'password', message: 'Too short' }],
      },
      400,
      false
    );

    await expect(clientAuth.login('g1', 'x')).rejects.toEqual(
      expect.objectContaining<ApiError>({
        name: 'ApiError',
        message: 'Validation failed',
        status: 400,
        code: 'VALIDATION_ERROR',
        fieldErrors: [{ field: 'password', message: 'Too short' }],
      })
    );
  });

  it('throws ApiError when success is false even with 200 status', async () => {
    mockFetchJson({
      success: false,
      error: 'Logical failure',
    });

    await expect(clientAuth.check()).rejects.toEqual(
      expect.objectContaining<ApiError>({
        message: 'Logical failure',
        status: 200,
      })
    );
  });

  it('calls every client gallery endpoint with expected path and payload', async () => {
    mockFetchJson({
      success: true,
      data: {
        gallery: {
          id: 'g1',
          title: 'Gallery',
          images: [],
          heroImage: null,
          sections: [],
          category: 'events',
        },
        comments: [],
      },
    });
    await clientGallery.get('g1');

    mockFetchJson({
      success: true,
      data: {
        comment: {
          id: 'c1',
          imageKey: 'k1',
          author: 'A',
          text: 'Hi',
          createdAt: '2025-01-01',
        },
      },
    });
    await clientGallery.addComment('g1', 'k1', 'A', 'Hi');

    mockFetchJson({
      success: true,
      data: { downloadUrl: 'https://example.com/file.jpg' },
    });
    await clientGallery.getDownloadUrl('g1', 'k1', 'web');

    mockFetchJson({
      success: true,
      data: { downloads: [{ key: 'k1', downloadUrl: 'u1' }] },
    });
    await clientGallery.bulkDownload('g1', ['k1'], 'full');

    mockFetchJson({
      success: true,
      data: { downloads: [] },
    });
    await clientGallery.bulkDownload('g1');

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      '/api/client/g1',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        }),
      })
    );

    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      '/api/client/g1/comment',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          imageKey: 'k1',
          author: 'A',
          text: 'Hi',
        }),
      })
    );

    expect(global.fetch).toHaveBeenNthCalledWith(
      3,
      '/api/client/g1/download',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          imageKey: 'k1',
          size: 'web',
        }),
      })
    );

    expect(global.fetch).toHaveBeenNthCalledWith(
      4,
      '/api/client/g1/bulk-download',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          imageKeys: ['k1'],
          size: 'full',
        }),
      })
    );

    expect(global.fetch).toHaveBeenNthCalledWith(
      5,
      '/api/client/g1/bulk-download',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({}),
      })
    );
  });

  it('calls every admin gallery endpoint with expected path and payload', async () => {
    mockFetchJson({ success: true, data: { galleries: [] } });
    await adminGalleries.list();

    mockFetchJson({
      success: true,
      data: {
        gallery: {
          id: 'g1',
          title: 'Gallery',
          category: 'events',
          slug: 'gallery',
          images: [],
          createdAt: '2025-01-01',
          updatedAt: '2025-01-01',
        },
      },
    });
    await adminGalleries.get('g1');

    mockFetchJson({
      success: true,
      data: {
        gallery: {
          id: 'g1',
          title: 'Gallery',
          category: 'events',
          slug: 'gallery',
          createdAt: '2025-01-01',
          updatedAt: '2025-01-01',
        },
      },
    });
    await adminGalleries.create({
      title: 'Gallery',
      category: 'events',
      slug: 'gallery',
      featured: true,
    });

    mockFetchJson({ success: true, data: { updated: true } });
    await adminGalleries.update('g1', {
      title: 'Updated',
      heroImage: null,
      heroHeight: 'lg',
    });

    mockFetchJson({ success: true, data: { deleted: true } });
    await adminGalleries.delete('g1');

    mockFetchJson({ success: true, data: { downloads: [] } });
    await adminGalleries.bulkDownload('g1', ['k1', 'k2']);

    mockFetchJson({ success: true, data: { downloads: [] } });
    await adminGalleries.bulkDownload('g2');

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      '/api/admin/galleries',
      expect.objectContaining({ headers: expect.any(Object) })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      '/api/admin/galleries/g1',
      expect.objectContaining({ headers: expect.any(Object) })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      3,
      '/api/admin/galleries',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          title: 'Gallery',
          category: 'events',
          slug: 'gallery',
          featured: true,
        }),
      })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      4,
      '/api/admin/galleries/g1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          title: 'Updated',
          heroImage: null,
          heroHeight: 'lg',
        }),
      })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      5,
      '/api/admin/galleries/g1',
      expect.objectContaining({ method: 'DELETE' })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      6,
      '/api/admin/galleries/g1/bulk-download',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ imageKeys: ['k1', 'k2'] }),
      })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      7,
      '/api/admin/galleries/g2/bulk-download',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({}),
      })
    );
  });

  it('calls admin image, inquiry, notify, and processing endpoints', async () => {
    mockFetchJson({ success: true, data: { uploadUrl: 'u', key: 'k' } });
    await adminImages.getUploadUrl('file.jpg', 'image/jpeg');

    mockFetchJson({ success: true, data: { updated: true } });
    await adminImages.updateAlt('k', 'g1', 'alt text');

    mockFetchJson({ success: true, data: { deleted: true } });
    await adminImages.delete('k', 'g1');

    mockFetchJson({ success: true, data: { images: [] } });
    await adminImages.listReady();

    mockFetchJson({ success: true, data: { assigned: 2, failed: 0, failedKeys: [] } });
    await adminImages.assign(['key1', 'key2'], 'g1');

    mockFetchJson({ success: true, data: { deleted: 2 } });
    await adminImages.deleteFromReady(['key1', 'key2']);

    mockFetchJson({ success: true, data: { inquiries: [] } });
    await adminInquiries.list();

    mockFetchJson({ success: true, data: { inquiries: [] } });
    await adminInquiries.list('new');

    mockFetchJson({ success: true, data: { updated: true } });
    await adminInquiries.update('i1', 'read');

    mockFetchJson({ success: true, data: { deleted: true } });
    await adminInquiries.delete('i1');

    mockFetchJson({ success: true, data: { notified: true } });
    await adminNotify.sendGalleryReady('g1', 'client@example.com', 'Client', 7);

    mockFetchJson({ success: true, data: { jobs: [] } });
    await adminProcessing.listJobs('g1');

    mockFetchJson({ success: true, data: { jobId: 'j1' } });
    await adminProcessing.triggerJob('g1', ['raw1']);

    mockFetchJson({
      success: true,
      data: { processingMode: 'manual', imagenProfileId: 'p1' },
    });
    await adminProcessing.getSettings();

    mockFetchJson({ success: true, data: { updated: true } });
    await adminProcessing.updateSettings({ processingMode: 'auto' });

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      '/api/admin/images',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          filename: 'file.jpg',
          contentType: 'image/jpeg',
        }),
      })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      '/api/admin/images',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          imageKey: 'k',
          galleryId: 'g1',
          alt: 'alt text',
        }),
      })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      3,
      '/api/admin/images',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({
          imageKey: 'k',
          galleryId: 'g1',
        }),
      })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(4, '/api/admin/images/ready', expect.any(Object));
    expect(global.fetch).toHaveBeenNthCalledWith(
      5,
      '/api/admin/images/assign',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ keys: ['key1', 'key2'], galleryId: 'g1' }),
      })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      6,
      '/api/admin/images/ready',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ keys: ['key1', 'key2'] }),
      })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(7, '/api/admin/inquiries', expect.any(Object));
    expect(global.fetch).toHaveBeenNthCalledWith(
      8,
      '/api/admin/inquiries?status=new',
      expect.any(Object)
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      9,
      '/api/admin/inquiries/i1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ status: 'read' }),
      })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      10,
      '/api/admin/inquiries/i1',
      expect.objectContaining({ method: 'DELETE' })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      11,
      '/api/admin/galleries/g1/notify',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          clientEmail: 'client@example.com',
          clientName: 'Client',
          expirationDays: 7,
        }),
      })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      12,
      '/api/admin/processing-jobs?galleryId=g1',
      expect.any(Object)
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      13,
      '/api/admin/processing-jobs',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ galleryId: 'g1', rawKeys: ['raw1'] }),
      })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(14, '/api/admin/settings', expect.any(Object));
    expect(global.fetch).toHaveBeenNthCalledWith(
      15,
      '/api/admin/settings',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ processingMode: 'auto' }),
      })
    );
  });

  it('calls auth helpers and public galleries endpoints', async () => {
    mockFetchJson({
      success: true,
      data: {
        authenticated: true,
        galleryId: 'g/1',
        token: 'client-token-2',
      },
    });
    await clientAuth.check('g/1');

    mockFetchJson({
      success: true,
      data: { authenticated: true, username: 'admin' },
    });
    await adminAuth.check();

    mockFetchJson({ success: true, data: { success: true } });
    await adminAuth.changePassword('old-pass', 'new-pass');

    mockFetchJson({ success: true, data: { galleries: [] } });
    await publicGalleries.getFeatured();

    mockFetchJson({ success: true, data: { images: [] } });
    await publicGalleries.getFeaturedImages(12);

    mockFetchJson({ success: true, data: { galleries: [] } });
    await publicGalleries.getByCategory('portraits');

    mockFetchJson({
      success: true,
      data: {
        gallery: {
          id: 'g1',
          title: 'Public Gallery',
          category: 'portraits',
          slug: 'public-gallery',
          images: [],
          createdAt: '2026-01-01',
        },
      },
    });
    await publicGalleries.getGallery('portraits', 'public-gallery');

    mockFetchJson({ success: true, data: { previews: [] } });
    await publicGalleries.getVideoPreviews();

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      '/api/client/auth?galleryId=g%2F1',
      expect.any(Object)
    );
    expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/admin/auth', expect.any(Object));
    expect(global.fetch).toHaveBeenNthCalledWith(
      3,
      '/api/admin/auth',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: 'old-pass',
          newPassword: 'new-pass',
        }),
      })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      4,
      '/api/galleries/featured',
      expect.any(Object)
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      5,
      '/api/galleries/featured/images?limit=12',
      expect.any(Object)
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      6,
      '/api/galleries/portraits',
      expect.any(Object)
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      7,
      '/api/galleries/portraits/public-gallery',
      expect.any(Object)
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      8,
      '/api/galleries/video-previews',
      expect.any(Object)
    );
  });

  it('calls all admin imagen endpoints with expected payloads', async () => {
    mockFetchJson({ success: true, data: { uploadUrl: 'https://u', key: 'raw/a.cr3' } });
    await adminImagen.getUploadUrl('a.cr3', 'application/octet-stream');

    mockFetchJson({ success: true, data: { files: [] } });
    await adminImagen.listUploads();

    mockFetchJson({ success: true, data: { jobIds: ['job-1'] } });
    await adminImagen.process(['raw/a.cr3']);

    mockFetchJson({ success: true, data: { jobs: [] } });
    await adminImagen.listJobs();

    mockFetchJson({ success: true, data: { files: [] } });
    await adminImagen.listEdited();

    mockFetchJson({ success: true, data: { approved: 1 } });
    await adminImagen.approve(['edited/a.jpg']);

    mockFetchJson({ success: true, data: { deleted: 1 } });
    await adminImagen.deleteEdited(['edited/a.jpg']);

    mockFetchJson({ success: true, data: { deleted: 1 } });
    await adminImagen.deleteUploads(['raw/a.cr3']);

    mockFetchJson({ success: true, data: { deleted: 1 } });
    await adminImagen.deleteJobs(['job-1']);

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      '/api/admin/imagen/upload',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          filename: 'a.cr3',
          contentType: 'application/octet-stream',
        }),
      })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/admin/imagen/upload', expect.any(Object));
    expect(global.fetch).toHaveBeenNthCalledWith(
      3,
      '/api/admin/imagen/process',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ rawKeys: ['raw/a.cr3'] }),
      })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(4, '/api/admin/imagen/jobs', expect.any(Object));
    expect(global.fetch).toHaveBeenNthCalledWith(5, '/api/admin/imagen/edited', expect.any(Object));
    expect(global.fetch).toHaveBeenNthCalledWith(
      6,
      '/api/admin/imagen/approve',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ keys: ['edited/a.jpg'] }),
      })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      7,
      '/api/admin/imagen/edited',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ keys: ['edited/a.jpg'] }),
      })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      8,
      '/api/admin/imagen/upload',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ keys: ['raw/a.cr3'] }),
      })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      9,
      '/api/admin/imagen/jobs',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ jobIds: ['job-1'] }),
      })
    );
  });

  it('retries GETs on transient 5xx/429 and returns the eventual success payload', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => '', json: async () => ({}) })
      .mockResolvedValueOnce({ ok: false, status: 429, text: async () => '', json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: { galleries: [{ id: 'g1' }] } }),
      });

    const result = await publicGalleries.getByCategory('portraits');
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ galleries: [{ id: 'g1' }] });
  });

  it('does not retry POSTs on 500', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ success: false, error: 'boom' }),
    });

    await expect(clientAuth.login('g1', 'pw')).rejects.toBeInstanceOf(ApiError);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('gives up after max retries and throws the final ApiError', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: false, status: 503, text: async () => '', json: async () => ({}) })
      .mockResolvedValueOnce({ ok: false, status: 503, text: async () => '', json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => '',
        json: async () => ({ success: false, error: 'unavailable' }),
      });

    await expect(publicGalleries.getByCategory('events')).rejects.toMatchObject({
      name: 'ApiError',
      status: 503,
    });
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
});
