#!/usr/bin/env npx tsx

/**
 * Image Optimization Script for Pitfal Solutions
 *
 * Converts images to WebP, generates multiple sizes for srcset,
 * creates thumbnails, and generates blur placeholders.
 *
 * Usage:
 *   pnpm optimize:images [directory]
 *   npx tsx scripts/optimize-images.ts ./public/images
 *
 * Requirements:
 *   - sharp (npm install sharp)
 *   - plaiceholder (npm install plaiceholder)
 */

import sharp from 'sharp';
import { getPlaiceholder } from 'plaiceholder';
import * as fs from 'fs/promises';
import * as path from 'path';

// Configuration
const CONFIG = {
  // Responsive image sizes (srcset widths)
  sizes: [320, 640, 1280, 1920, 2560],

  // Thumbnail dimensions
  thumbnails: [
    { name: 'sm', width: 150, height: 150 },
    { name: 'md', width: 300, height: 300 },
    { name: 'lg', width: 600, height: 600 },
  ],

  // WebP quality
  quality: 80,

  // Supported input formats
  supportedFormats: ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.tiff', '.tif'],

  // Output structure
  outputDirs: {
    processed: 'processed',
    thumbnails: 'thumbnails',
    blur: 'blur',
  },
};

interface ImageStats {
  originalSize: number;
  processedSize: number;
  filename: string;
}

interface ProcessingResult {
  totalImages: number;
  processed: number;
  failed: number;
  originalTotalSize: number;
  processedTotalSize: number;
  errors: string[];
}

async function findImages(directory: string): Promise<string[]> {
  const images: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip output directories
        if (
          entry.name === CONFIG.outputDirs.processed ||
          entry.name === CONFIG.outputDirs.thumbnails ||
          entry.name === CONFIG.outputDirs.blur
        ) {
          continue;
        }
        await walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (CONFIG.supportedFormats.includes(ext)) {
          images.push(fullPath);
        }
      }
    }
  }

  await walk(directory);
  return images;
}

async function processImage(imagePath: string, outputDir: string): Promise<ImageStats> {
  const filename = path.basename(imagePath, path.extname(imagePath));
  const relativePath = path.dirname(imagePath);
  const stats = await fs.stat(imagePath);

  // Create output directories
  const processedDir = path.join(outputDir, CONFIG.outputDirs.processed, filename);
  const thumbnailDir = path.join(outputDir, CONFIG.outputDirs.thumbnails, filename);
  const blurDir = path.join(outputDir, CONFIG.outputDirs.blur);

  await fs.mkdir(processedDir, { recursive: true });
  await fs.mkdir(thumbnailDir, { recursive: true });
  await fs.mkdir(blurDir, { recursive: true });

  // Read image
  const imageBuffer = await fs.readFile(imagePath);
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  let processedSize = 0;

  // Generate responsive sizes
  for (const width of CONFIG.sizes) {
    // Only generate if image is larger than target
    if (metadata.width && metadata.width >= width) {
      const outputPath = path.join(processedDir, `${width}w.webp`);
      await image
        .clone()
        .resize(width)
        .webp({ quality: CONFIG.quality })
        .toFile(outputPath);

      const outputStats = await fs.stat(outputPath);
      processedSize += outputStats.size;
    }
  }

  // Generate thumbnails
  for (const thumb of CONFIG.thumbnails) {
    const outputPath = path.join(thumbnailDir, `${thumb.name}.webp`);
    await image
      .clone()
      .resize(thumb.width, thumb.height, { fit: 'cover' })
      .webp({ quality: CONFIG.quality })
      .toFile(outputPath);

    const outputStats = await fs.stat(outputPath);
    processedSize += outputStats.size;
  }

  // Generate blur placeholder using plaiceholder
  const { base64 } = await getPlaiceholder(imageBuffer, { size: 10 });
  const blurPath = path.join(blurDir, `${filename}.txt`);
  await fs.writeFile(blurPath, base64);

  return {
    originalSize: stats.size,
    processedSize,
    filename,
  };
}

async function main(): Promise<void> {
  const inputDir = process.argv[2] || './public/images';

  console.log('🖼️  Pitfal Solutions Image Optimizer');
  console.log('=====================================');
  console.log(`📁 Input directory: ${inputDir}`);

  // Verify directory exists
  try {
    await fs.access(inputDir);
  } catch {
    console.error(`❌ Directory not found: ${inputDir}`);
    process.exit(1);
  }

  // Find all images
  console.log('\n🔍 Finding images...');
  const images = await findImages(inputDir);
  console.log(`   Found ${images.length} images`);

  if (images.length === 0) {
    console.log('No images to process.');
    return;
  }

  // Process images
  const result: ProcessingResult = {
    totalImages: images.length,
    processed: 0,
    failed: 0,
    originalTotalSize: 0,
    processedTotalSize: 0,
    errors: [],
  };

  console.log('\n⚙️  Processing images...');

  for (const imagePath of images) {
    try {
      process.stdout.write(`   Processing: ${path.basename(imagePath)}...`);
      const stats = await processImage(imagePath, inputDir);
      result.processed++;
      result.originalTotalSize += stats.originalSize;
      result.processedTotalSize += stats.processedSize;
      console.log(' ✓');
    } catch (error) {
      result.failed++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(`${path.basename(imagePath)}: ${errorMessage}`);
      console.log(' ✗');
    }
  }

  // Print summary
  console.log('\n📊 Summary');
  console.log('=====================================');
  console.log(`   Total images:     ${result.totalImages}`);
  console.log(`   Processed:        ${result.processed}`);
  console.log(`   Failed:           ${result.failed}`);
  console.log(`   Original size:    ${formatBytes(result.originalTotalSize)}`);
  console.log(`   Processed size:   ${formatBytes(result.processedTotalSize)}`);

  const savings = result.originalTotalSize - result.processedTotalSize;
  const savingsPercent =
    result.originalTotalSize > 0
      ? ((savings / result.originalTotalSize) * 100).toFixed(1)
      : '0';

  if (savings > 0) {
    console.log(`   Size savings:     ${formatBytes(savings)} (${savingsPercent}%)`);
  }

  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    for (const error of result.errors) {
      console.log(`   - ${error}`);
    }
  }

  console.log('\n✅ Done!');
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
