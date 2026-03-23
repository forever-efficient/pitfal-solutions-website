import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { isMobile, canShareFiles, getDownloadStrategy } from '@/lib/platform';

describe('platform', () => {
  const originalNavigator = global.navigator;

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  function mockNavigator(overrides: Record<string, unknown>) {
    Object.defineProperty(global, 'navigator', {
      value: { ...originalNavigator, ...overrides },
      writable: true,
      configurable: true,
    });
  }

  describe('isMobile', () => {
    it('returns true for iPhone user agent', () => {
      mockNavigator({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)' });
      expect(isMobile()).toBe(true);
    });

    it('returns true for Android user agent', () => {
      mockNavigator({ userAgent: 'Mozilla/5.0 (Linux; Android 14)' });
      expect(isMobile()).toBe(true);
    });

    it('returns true for iPad user agent', () => {
      mockNavigator({ userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0)' });
      expect(isMobile()).toBe(true);
    });

    it('returns true for iPad reporting as Mac (touch check)', () => {
      mockNavigator({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        maxTouchPoints: 5,
      });
      expect(isMobile()).toBe(true);
    });

    it('returns false for desktop Mac', () => {
      mockNavigator({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        maxTouchPoints: 0,
      });
      expect(isMobile()).toBe(false);
    });

    it('returns false for desktop Chrome', () => {
      mockNavigator({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120',
        maxTouchPoints: 0,
      });
      expect(isMobile()).toBe(false);
    });
  });

  describe('canShareFiles', () => {
    it('returns false when navigator.share is missing', () => {
      mockNavigator({ share: undefined, canShare: undefined });
      expect(canShareFiles()).toBe(false);
    });

    it('returns false when navigator.canShare is missing', () => {
      mockNavigator({ share: vi.fn(), canShare: undefined });
      expect(canShareFiles()).toBe(false);
    });

    it('returns true when canShare returns true for files', () => {
      mockNavigator({
        share: vi.fn(),
        canShare: vi.fn().mockReturnValue(true),
      });
      expect(canShareFiles()).toBe(true);
    });

    it('returns false when canShare returns false for files', () => {
      mockNavigator({
        share: vi.fn(),
        canShare: vi.fn().mockReturnValue(false),
      });
      expect(canShareFiles()).toBe(false);
    });

    it('returns false when canShare throws', () => {
      mockNavigator({
        share: vi.fn(),
        canShare: vi.fn().mockImplementation(() => { throw new Error('Not allowed'); }),
      });
      expect(canShareFiles()).toBe(false);
    });
  });

  describe('getDownloadStrategy', () => {
    it('returns share when canShareFiles is true', () => {
      mockNavigator({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
        share: vi.fn(),
        canShare: vi.fn().mockReturnValue(true),
      });
      expect(getDownloadStrategy()).toBe('share');
    });

    it('returns individual for mobile without share support', () => {
      mockNavigator({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_0)',
        share: undefined,
        canShare: undefined,
        maxTouchPoints: 5,
      });
      expect(getDownloadStrategy()).toBe('individual');
    });

    it('returns zip for desktop', () => {
      mockNavigator({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        share: undefined,
        canShare: undefined,
        maxTouchPoints: 0,
      });
      expect(getDownloadStrategy()).toBe('zip');
    });
  });
});
