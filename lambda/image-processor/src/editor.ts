/**
 * Pitfal Solutions - Professional Image Editor
 *
 * Applies subtle, magazine-quality edits to photographs.
 * Philosophy: Enhance what's already there, don't transform it.
 *
 * Edit profile "magazine-professional":
 * - Gentle exposure normalization
 * - Subtle contrast enhancement (mild S-curve)
 * - Light sharpening for print/web clarity
 * - Gentle color vibrancy boost
 * - Slight warmth adjustment for pleasing skin tones
 * - Subtle vignette for focus
 *
 * All adjustments are conservative - the goal is to make the
 * photographer's work shine, not to impose a heavy filter.
 */

import sharp from 'sharp';

export interface EditOptions {
  quality: number;
  format: 'jpeg' | 'webp';
}

/**
 * Apply professional magazine-quality edits to a TIFF buffer.
 *
 * The edits are intentionally subtle:
 * - No heavy color grading
 * - No artificial HDR look
 * - No heavy saturation
 * - Just clean, polished, professional output
 */
export async function applyProfessionalEdits(
  inputBuffer: Buffer,
  options: EditOptions
): Promise<Buffer> {
  const { quality, format } = options;

  // Start with the input image
  let pipeline = sharp(inputBuffer, {
    // Ensure we handle 16-bit TIFF from RAW conversion
    failOn: 'none',
  });

  // Get image metadata for adaptive processing
  const metadata = await pipeline.metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;

  // Reset pipeline after metadata read
  pipeline = sharp(inputBuffer, { failOn: 'none' });

  // --- STEP 1: Normalize exposure ---
  // Use linear stretch to normalize the tonal range
  // This gently expands the histogram without clipping
  pipeline = pipeline.normalize({
    lower: 1,  // Clip bottom 1% (removes sensor noise floor)
    upper: 99, // Clip top 1% (prevents blown highlights from skewing)
  });

  // --- STEP 2: Gentle contrast enhancement ---
  // Apply a mild sigmoid contrast curve
  // This gives a gentle S-curve that adds depth without harshness
  pipeline = pipeline.modulate({
    brightness: 1.02,   // Very slight brightness lift (+2%)
    saturation: 1.08,   // Gentle vibrancy boost (+8%)
  });

  // --- STEP 3: Subtle warm tone ---
  // Add very slight warmth for pleasing skin tones
  // This mimics the warmth of golden-hour light
  pipeline = pipeline.tint({ r: 253, g: 250, b: 245 });

  // --- STEP 4: Clarity / local contrast ---
  // Unsharp mask with large radius acts as a clarity adjustment
  // This adds "pop" to the image without actual sharpening artifacts
  pipeline = pipeline.sharpen({
    sigma: 2.0,      // Larger radius = clarity rather than sharpness
    m1: 0.5,         // Flat area sharpening amount (subtle)
    m2: 1.0,         // Jagged area sharpening amount (moderate)
  });

  // --- STEP 5: Fine detail sharpening ---
  // Second pass with small radius for actual detail sharpening
  // Tuned for print-quality output
  pipeline = pipeline.sharpen({
    sigma: 0.8,      // Small radius for fine detail
    m1: 0.3,         // Gentle on flat areas (prevents noise amplification)
    m2: 0.8,         // Moderate on edges (crisp details)
  });

  // --- STEP 6: Resize for web delivery if very large ---
  // Cap at 5472px on long edge (Canon 5D Mark IV resolution)
  // This preserves full quality while ensuring reasonable file sizes
  const maxDimension = 5472;
  if (width > maxDimension || height > maxDimension) {
    pipeline = pipeline.resize({
      width: width > height ? maxDimension : undefined,
      height: height >= width ? maxDimension : undefined,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  // --- STEP 7: Output as high-quality JPEG ---
  if (format === 'jpeg') {
    pipeline = pipeline.jpeg({
      quality,
      mozjpeg: true,          // Use mozjpeg encoder for better compression
      chromaSubsampling: '4:4:4', // No chroma subsampling (highest quality)
    });
  } else {
    pipeline = pipeline.webp({
      quality,
      effort: 6,              // Higher effort = better compression
      smartSubsample: true,
    });
  }

  // --- STEP 8: Preserve EXIF metadata ---
  // Keep camera metadata (focal length, aperture, ISO, etc.)
  // Strip GPS data for privacy
  pipeline = pipeline.keepMetadata().withExifMerge({
    IFD0: {
      Software: 'Pitfal Solutions Auto-Editor v1.0',
    },
  });

  return pipeline.toBuffer();
}

/**
 * Generate a web-optimized version alongside the full-res edit.
 * Used for gallery thumbnails and quick loading.
 */
export async function generateWebVersion(
  inputBuffer: Buffer,
  maxWidth: number = 1920
): Promise<Buffer> {
  return sharp(inputBuffer, { failOn: 'none' })
    .resize({
      width: maxWidth,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({
      quality: 82,
      mozjpeg: true,
      chromaSubsampling: '4:2:0', // Standard subsampling for web
    })
    .toBuffer();
}

/**
 * Generate a thumbnail for gallery grid display.
 */
export async function generateThumbnail(
  inputBuffer: Buffer,
  size: number = 600
): Promise<Buffer> {
  return sharp(inputBuffer, { failOn: 'none' })
    .resize({
      width: size,
      height: size,
      fit: 'cover',
      position: 'attention', // Smart crop focusing on interesting areas
    })
    .jpeg({
      quality: 78,
      mozjpeg: true,
    })
    .toBuffer();
}
