import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  cn,
  formatDate,
  formatPrice,
  formatBytes,
  slugify,
  truncate,
  getImageUrl,
  debounce,
  generateId,
  isValidEmail,
  isValidPhone,
} from '@/lib/utils';

describe('cn (classNames utility)', () => {
  it('merges class names correctly', () => {
    const result = cn('foo', 'bar');
    expect(result).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    const result = cn('base', true && 'included', false && 'excluded');
    expect(result).toBe('base included');
  });

  it('handles undefined and null values', () => {
    const result = cn('base', undefined, null, 'end');
    expect(result).toBe('base end');
  });

  it('handles arrays of classes', () => {
    const result = cn(['foo', 'bar'], 'baz');
    expect(result).toBe('foo bar baz');
  });

  it('merges Tailwind classes correctly (tailwind-merge)', () => {
    // tailwind-merge should dedupe conflicting classes
    const result = cn('px-4 py-2', 'px-6');
    expect(result).toBe('py-2 px-6');
  });

  it('handles empty input', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('handles object syntax', () => {
    const result = cn({ foo: true, bar: false, baz: true });
    expect(result).toBe('foo baz');
  });
});

describe('formatDate', () => {
  it('formats Date object correctly', () => {
    const date = new Date(2024, 0, 15); // Jan 15, 2024 (month is 0-indexed)
    const result = formatDate(date);
    expect(result).toContain('January');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('formats date string correctly', () => {
    const date = new Date(2024, 5, 20); // June 20, 2024
    const result = formatDate(date);
    expect(result).toContain('June');
    expect(result).toContain('20');
    expect(result).toContain('2024');
  });

  it('formats timestamp correctly', () => {
    const date = new Date(2024, 2, 10); // March 10, 2024
    const timestamp = date.getTime();
    const result = formatDate(timestamp);
    expect(result).toContain('March');
    expect(result).toContain('10');
    expect(result).toContain('2024');
  });

  it('accepts custom options', () => {
    const date = new Date(2024, 0, 15); // Jan 15, 2024
    const result = formatDate(date, { month: 'short' });
    expect(result).toContain('Jan');
  });
});

describe('formatPrice', () => {
  it('formats price without cents by default', () => {
    const result = formatPrice(1500);
    expect(result).toBe('$1,500');
  });

  it('formats price with cents when specified', () => {
    const result = formatPrice(1500.99, { showCents: true });
    expect(result).toBe('$1,500.99');
  });

  it('formats with different currency', () => {
    const result = formatPrice(100, { currency: 'EUR' });
    expect(result).toContain('100');
  });

  it('handles zero', () => {
    const result = formatPrice(0);
    expect(result).toBe('$0');
  });
});

describe('formatBytes', () => {
  it('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
  });

  it('formats bytes', () => {
    expect(formatBytes(500)).toBe('500 Bytes');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
  });

  it('formats gigabytes', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
  });

  it('respects decimals parameter', () => {
    expect(formatBytes(1500, 1)).toBe('1.5 KB');
  });

  it('handles negative decimals', () => {
    expect(formatBytes(1500, -1)).toBe('1 KB');
  });
});

describe('slugify', () => {
  it('converts text to lowercase', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('replaces spaces with hyphens', () => {
    expect(slugify('foo bar baz')).toBe('foo-bar-baz');
  });

  it('removes special characters', () => {
    expect(slugify('Hello! World?')).toBe('hello-world');
  });

  it('removes multiple consecutive hyphens', () => {
    expect(slugify('hello---world')).toBe('hello-world');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('-hello world-')).toBe('hello-world');
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });
});

describe('truncate', () => {
  it('returns full text if shorter than length', () => {
    expect(truncate('short', 10)).toBe('short');
  });

  it('returns full text if equal to length', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });

  it('truncates text and adds ellipsis', () => {
    expect(truncate('hello world', 5)).toBe('hello...');
  });

  it('handles empty string', () => {
    expect(truncate('', 5)).toBe('');
  });
});

describe('getImageUrl', () => {
  it('returns URL containing the key', () => {
    const result = getImageUrl('images/photo.jpg');
    expect(result).toContain('images/photo.jpg');
  });

  it('returns same URL regardless of size hint', () => {
    const base = getImageUrl('images/photo.jpg');
    expect(getImageUrl('images/photo.jpg', 'sm')).toBe(base);
    expect(getImageUrl('images/photo.jpg', 'md')).toBe(base);
    expect(getImageUrl('images/photo.jpg', 'lg')).toBe(base);
    expect(getImageUrl('images/photo.jpg', 'xl')).toBe(base);
    expect(getImageUrl('images/photo.jpg', 'original')).toBe(base);
  });

  it('builds URL from NEXT_PUBLIC_MEDIA_URL env var', () => {
    const result = getImageUrl('site/hero-bg.jpg');
    expect(result).toMatch(/https?:\/\/.+\/site\/hero-bg\.jpg/);
  });

  it('works with gallery/ prefixed keys', () => {
    const result = getImageUrl('gallery/g1/photo.jpg');
    expect(result).toContain('gallery/g1/photo.jpg');
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('delays function execution', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('only calls once when called multiple times within wait period', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced();
    debounced();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('passes arguments to the function', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('arg1', 'arg2');
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });
});

describe('generateId', () => {
  it('generates string of default length 8', () => {
    const id = generateId();
    expect(id).toHaveLength(8);
  });

  it('generates string of specified length', () => {
    const id = generateId(16);
    expect(id).toHaveLength(16);
  });

  it('generates alphanumeric characters only', () => {
    const id = generateId(100);
    expect(id).toMatch(/^[A-Za-z0-9]+$/);
  });

  it('generates unique ids', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId(16));
    }
    expect(ids.size).toBe(100);
  });
});

describe('isValidEmail', () => {
  it('returns true for valid email', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
  });

  it('returns true for email with subdomain', () => {
    expect(isValidEmail('test@mail.example.com')).toBe(true);
  });

  it('returns false for email without @', () => {
    expect(isValidEmail('testexample.com')).toBe(false);
  });

  it('returns false for email without domain', () => {
    expect(isValidEmail('test@')).toBe(false);
  });

  it('returns false for email with spaces', () => {
    expect(isValidEmail('test @example.com')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });
});

describe('isValidPhone', () => {
  it('returns true for valid phone number', () => {
    expect(isValidPhone('303-555-1234')).toBe(true);
  });

  it('returns true for phone with parentheses', () => {
    expect(isValidPhone('(303) 555-1234')).toBe(true);
  });

  it('returns true for phone with dots', () => {
    expect(isValidPhone('303.555.1234')).toBe(true);
  });

  it('returns true for phone with country code', () => {
    expect(isValidPhone('+1 303 555 1234')).toBe(true);
  });

  it('returns false for too short phone', () => {
    expect(isValidPhone('555-1234')).toBe(false);
  });

  it('returns false for letters in phone', () => {
    expect(isValidPhone('abc-def-ghij')).toBe(false);
  });
});
