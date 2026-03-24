/**
 * Platform detection utilities for mobile-optimized download experience.
 * Uses feature detection first, user-agent as secondary signal.
 */

export function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent;
  // Check for common mobile indicators
  if (/Android|iPhone|iPod/i.test(ua)) return true;
  // iPad reports as Mac in newer iOS — check touch support
  if (/iPad/i.test(ua)) return true;
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 0) return true;

  return false;
}

/**
 * Feature-detects whether the browser supports sharing File objects
 * via the Web Share API (navigator.share + navigator.canShare).
 */
export function canShareFiles(): boolean {
  if (typeof navigator === 'undefined') return false;
  // Only use Web Share API on mobile — desktop browsers may report canShare
  // support but reject navigator.share() with "Permission denied"
  if (!isMobile()) return false;
  if (!navigator.share || !navigator.canShare) return false;

  try {
    const testFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
    return navigator.canShare({ files: [testFile] });
  } catch {
    return false;
  }
}

export type DownloadStrategy = 'share' | 'individual' | 'zip';

/**
 * Determines the best download strategy for the current device:
 * - 'share': Web Share API available (iOS Safari 15+, Android Chrome 93+) → native share sheet
 * - 'individual': Mobile but no share support → download files one-by-one
 * - 'zip': Desktop → ZIP via JSZip (current behavior)
 */
export function getDownloadStrategy(): DownloadStrategy {
  if (canShareFiles()) return 'share';
  if (isMobile()) return 'individual';
  return 'zip';
}
