import { describe, expect, it, vi, beforeEach } from 'vitest';
import { shareFiles, type ShareProgress } from '@/lib/shareFiles';

describe('shareFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockShare(impl?: (...args: unknown[]) => Promise<void>) {
    const shareFn = vi.fn(impl || (() => Promise.resolve()));
    Object.defineProperty(global, 'navigator', {
      value: { ...global.navigator, share: shareFn },
      writable: true,
      configurable: true,
    });
    return shareFn;
  }

  function makeFiles(count: number): File[] {
    return Array.from({ length: count }, (_, i) =>
      new File(['data'], `photo-${i + 1}.jpg`, { type: 'image/jpeg' })
    );
  }

  it('shares a small batch in a single call', async () => {
    const shareFn = mockShare();
    const files = makeFiles(5);

    const count = await shareFiles(files);

    expect(count).toBe(5);
    expect(shareFn).toHaveBeenCalledTimes(1);
    expect(shareFn).toHaveBeenCalledWith({ files });
  });

  it('batches 25 files into 2 share calls', async () => {
    const shareFn = mockShare();
    const files = makeFiles(25);

    const count = await shareFiles(files);

    expect(count).toBe(25);
    expect(shareFn).toHaveBeenCalledTimes(2);
    // First batch: 20 files
    expect(shareFn.mock.calls[0]![0].files).toHaveLength(20);
    // Second batch: 5 files
    expect(shareFn.mock.calls[1]![0].files).toHaveLength(5);
  });

  it('stops on AbortError and returns partial count', async () => {
    let callCount = 0;
    const shareFn = mockShare(async () => {
      callCount++;
      if (callCount === 2) {
        const err = new Error('User cancelled');
        err.name = 'AbortError';
        throw err;
      }
    });

    const files = makeFiles(45); // 3 batches

    const count = await shareFiles(files);

    // First batch succeeded (20), second cancelled, third never ran
    expect(count).toBe(20);
    expect(shareFn).toHaveBeenCalledTimes(2);
  });

  it('reports progress via callback', async () => {
    mockShare();
    const files = makeFiles(25);
    const progressUpdates: ShareProgress[] = [];

    await shareFiles(files, (p) => progressUpdates.push({ ...p }));

    expect(progressUpdates).toHaveLength(2);
    expect(progressUpdates[0]).toEqual({
      phase: 'sharing',
      current: 0,
      total: 25,
      batchCurrent: 1,
      batchTotal: 2,
    });
    expect(progressUpdates[1]).toEqual({
      phase: 'sharing',
      current: 20,
      total: 25,
      batchCurrent: 2,
      batchTotal: 2,
    });
  });

  it('re-throws non-AbortError errors', async () => {
    mockShare(async () => {
      throw new Error('Something went wrong');
    });

    const files = makeFiles(5);
    await expect(shareFiles(files)).rejects.toThrow('Something went wrong');
  });
});
