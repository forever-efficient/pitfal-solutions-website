/**
 * Web Share API wrapper for sharing files via the native share sheet.
 * Used on mobile to let users save photos directly to their Photos app.
 */

const BATCH_SIZE = 20;

export interface ShareProgress {
  phase: 'sharing';
  current: number;
  total: number;
  batchCurrent: number;
  batchTotal: number;
}

/**
 * Shares files via the Web Share API in batches of 20.
 * Returns the number of files successfully shared.
 * Handles user cancellation (AbortError) gracefully.
 */
export async function shareFiles(
  files: File[],
  onProgress?: (progress: ShareProgress) => void
): Promise<number> {
  const totalBatches = Math.ceil(files.length / BATCH_SIZE);
  let sharedCount = 0;

  for (let i = 0; i < totalBatches; i++) {
    const batchFiles = files.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);

    onProgress?.({
      phase: 'sharing',
      current: sharedCount,
      total: files.length,
      batchCurrent: i + 1,
      batchTotal: totalBatches,
    });

    try {
      await navigator.share({ files: batchFiles });
      sharedCount += batchFiles.length;
    } catch (err) {
      // User cancelled the share sheet — stop remaining batches
      if (err instanceof Error && err.name === 'AbortError') {
        return sharedCount;
      }
      throw err;
    }
  }

  return sharedCount;
}
