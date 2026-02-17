// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSharp = vi.hoisted(() => vi.fn());

vi.mock('sharp', () => ({
  default: mockSharp,
}));

const {
  applyProfessionalEdits,
  generateWebVersion,
  generateThumbnail,
} = await import('../../../lambda/image-processor/src/editor');

type Pipeline = {
  metadata: ReturnType<typeof vi.fn>;
  normalize: ReturnType<typeof vi.fn>;
  modulate: ReturnType<typeof vi.fn>;
  tint: ReturnType<typeof vi.fn>;
  sharpen: ReturnType<typeof vi.fn>;
  resize: ReturnType<typeof vi.fn>;
  jpeg: ReturnType<typeof vi.fn>;
  webp: ReturnType<typeof vi.fn>;
  keepMetadata: ReturnType<typeof vi.fn>;
  withExifMerge: ReturnType<typeof vi.fn>;
  toBuffer: ReturnType<typeof vi.fn>;
};

function createPipeline(options?: {
  width?: number;
  height?: number;
  output?: string;
}): Pipeline {
  const width = options?.width ?? 3000;
  const height = options?.height ?? 2000;
  const output = options?.output ?? 'processed';

  const pipeline = {} as Pipeline;

  pipeline.metadata = vi.fn(async () => ({ width, height }));
  pipeline.normalize = vi.fn(() => pipeline);
  pipeline.modulate = vi.fn(() => pipeline);
  pipeline.tint = vi.fn(() => pipeline);
  pipeline.sharpen = vi.fn(() => pipeline);
  pipeline.resize = vi.fn(() => pipeline);
  pipeline.jpeg = vi.fn(() => pipeline);
  pipeline.webp = vi.fn(() => pipeline);
  pipeline.keepMetadata = vi.fn(() => pipeline);
  pipeline.withExifMerge = vi.fn(() => pipeline);
  pipeline.toBuffer = vi.fn(async () => Buffer.from(output));

  return pipeline;
}

describe('lambda/image-processor/src/editor', () => {
  beforeEach(() => {
    mockSharp.mockReset();
  });

  it('applies professional edits and outputs JPEG with resize for wide images', async () => {
    const metadataReader = createPipeline({ width: 6000, height: 4000 });
    const processor = createPipeline({ output: 'jpeg-output' });

    mockSharp
      .mockImplementationOnce(() => metadataReader)
      .mockImplementationOnce(() => processor);

    const output = await applyProfessionalEdits(Buffer.from('input'), {
      quality: 92,
      format: 'jpeg',
    });

    expect(output).toEqual(Buffer.from('jpeg-output'));
    expect(mockSharp).toHaveBeenCalledTimes(2);
    expect(mockSharp).toHaveBeenNthCalledWith(1, Buffer.from('input'), { failOn: 'none' });
    expect(mockSharp).toHaveBeenNthCalledWith(2, Buffer.from('input'), { failOn: 'none' });

    expect(metadataReader.metadata).toHaveBeenCalledTimes(1);

    expect(processor.normalize).toHaveBeenCalledWith({ lower: 1, upper: 99 });
    expect(processor.modulate).toHaveBeenCalledWith({ brightness: 1.02, saturation: 1.08 });
    expect(processor.tint).toHaveBeenCalledWith({ r: 253, g: 250, b: 245 });
    expect(processor.sharpen).toHaveBeenNthCalledWith(1, { sigma: 2, m1: 0.5, m2: 1.0 });
    expect(processor.sharpen).toHaveBeenNthCalledWith(2, { sigma: 0.8, m1: 0.3, m2: 0.8 });

    expect(processor.resize).toHaveBeenCalledWith({
      width: 5472,
      height: undefined,
      fit: 'inside',
      withoutEnlargement: true,
    });

    expect(processor.jpeg).toHaveBeenCalledWith({
      quality: 92,
      mozjpeg: true,
      chromaSubsampling: '4:4:4',
    });
    expect(processor.webp).not.toHaveBeenCalled();

    expect(processor.keepMetadata).toHaveBeenCalledTimes(1);
    expect(processor.withExifMerge).toHaveBeenCalledWith({
      IFD0: {
        Software: 'Pitfal Solutions Auto-Editor v1.0',
      },
    });
    expect(processor.toBuffer).toHaveBeenCalledTimes(1);
  });

  it('outputs WebP and resizes using height for tall images', async () => {
    const metadataReader = createPipeline({ width: 3000, height: 7000 });
    const processor = createPipeline({ output: 'webp-output' });

    mockSharp
      .mockImplementationOnce(() => metadataReader)
      .mockImplementationOnce(() => processor);

    const output = await applyProfessionalEdits(Buffer.from('input'), {
      quality: 85,
      format: 'webp',
    });

    expect(output).toEqual(Buffer.from('webp-output'));
    expect(processor.resize).toHaveBeenCalledWith({
      width: undefined,
      height: 5472,
      fit: 'inside',
      withoutEnlargement: true,
    });
    expect(processor.webp).toHaveBeenCalledWith({
      quality: 85,
      effort: 6,
      smartSubsample: true,
    });
    expect(processor.jpeg).not.toHaveBeenCalled();
  });

  it('skips resize when image is already below max dimensions', async () => {
    const metadataReader = createPipeline({ width: 2048, height: 1365 });
    const processor = createPipeline({ output: 'no-resize-output' });

    mockSharp
      .mockImplementationOnce(() => metadataReader)
      .mockImplementationOnce(() => processor);

    const output = await applyProfessionalEdits(Buffer.from('input'), {
      quality: 90,
      format: 'jpeg',
    });

    expect(output).toEqual(Buffer.from('no-resize-output'));
    expect(processor.resize).not.toHaveBeenCalled();
  });

  it('generates default web version output', async () => {
    const pipeline = createPipeline({ output: 'web-version' });
    mockSharp.mockImplementationOnce(() => pipeline);

    const output = await generateWebVersion(Buffer.from('input'));

    expect(output).toEqual(Buffer.from('web-version'));
    expect(mockSharp).toHaveBeenCalledWith(Buffer.from('input'), { failOn: 'none' });
    expect(pipeline.resize).toHaveBeenCalledWith({
      width: 1920,
      fit: 'inside',
      withoutEnlargement: true,
    });
    expect(pipeline.jpeg).toHaveBeenCalledWith({
      quality: 82,
      mozjpeg: true,
      chromaSubsampling: '4:2:0',
    });
  });

  it('generates thumbnail with custom size', async () => {
    const pipeline = createPipeline({ output: 'thumbnail' });
    mockSharp.mockImplementationOnce(() => pipeline);

    const output = await generateThumbnail(Buffer.from('input'), 720);

    expect(output).toEqual(Buffer.from('thumbnail'));
    expect(mockSharp).toHaveBeenCalledWith(Buffer.from('input'), { failOn: 'none' });
    expect(pipeline.resize).toHaveBeenCalledWith({
      width: 720,
      height: 720,
      fit: 'cover',
      position: 'attention',
    });
    expect(pipeline.jpeg).toHaveBeenCalledWith({
      quality: 78,
      mozjpeg: true,
    });
  });
});
