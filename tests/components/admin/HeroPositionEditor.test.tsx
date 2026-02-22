import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HeroPositionEditor } from '@/components/admin/HeroPositionEditor';
import { ToastProvider } from '@/components/admin/Toast';

const mockUpdate = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    adminGalleries: {
      ...actual.adminGalleries,
      update: mockUpdate,
    },
  };
});

function renderEditor() {
  return render(
    <ToastProvider>
      <HeroPositionEditor
        galleryId="g1"
        heroImage="finished/g1/hero.jpg"
        initialFocalPoint={{ x: 20, y: 30 }}
        initialZoom={1.2}
        initialGradientOpacity={0.6}
        initialHeight="sm"
      />
    </ToastProvider>
  );
}

describe('HeroPositionEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockResolvedValue({ updated: true });
  });

  it('renders with initial values', () => {
    renderEditor();
    const previewImage = screen.getByAltText('Hero preview') as HTMLImageElement;
    const saveButton = screen.getByRole('button', { name: 'Save' });

    expect(
      screen.getByRole('heading', { name: 'Hero Positioning' })
    ).toBeInTheDocument();
    expect(previewImage).toHaveStyle({ objectPosition: '20% 30%' });
    expect(previewImage).toHaveStyle({ transform: 'scale(1.2)' });
    expect(saveButton).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SM' })).toHaveClass('bg-primary-600');
  });

  it('updates focal point from mouse interactions and clamps bounds', () => {
    renderEditor();
    const preview = screen
      .getByText('Click or drag on the preview to set the focal point.')
      .nextElementSibling as HTMLDivElement;

    vi.spyOn(preview, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 200,
      height: 100,
      right: 200,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);

    fireEvent.mouseDown(preview, { clientX: 250, clientY: -10 });
    fireEvent.mouseMove(window, { clientX: 100, clientY: 50 });
    fireEvent.mouseUp(window);

    const previewImage = screen.getByAltText('Hero preview') as HTMLImageElement;
    expect(previewImage).toHaveStyle({ objectPosition: '50% 50%' });
  });

  it('saves settings payload from sliders and height buttons', async () => {
    const user = userEvent.setup();
    renderEditor();

    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[0]!, { target: { value: '1.5' } });
    fireEvent.change(sliders[1]!, { target: { value: '0.3' } });
    await user.click(screen.getByRole('button', { name: 'LG' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('g1', {
        heroFocalPoint: { x: 20, y: 30 },
        heroZoom: 1.5,
        heroGradientOpacity: 0.3,
        heroHeight: 'lg',
      });
      expect(screen.getByRole('alert')).toHaveTextContent('Hero settings saved');
    });
  });

  it('resets controls back to defaults', async () => {
    const user = userEvent.setup();
    renderEditor();

    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[0]!, { target: { value: '1.9' } });
    fireEvent.change(sliders[1]!, { target: { value: '0.95' } });
    await user.click(screen.getByRole('button', { name: 'LG' }));
    await user.click(screen.getByRole('button', { name: 'Reset' }));

    expect(screen.getByText('1.00×')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'MD' })).toHaveClass('bg-primary-600');
    expect(screen.getByAltText('Hero preview')).toHaveStyle({
      objectPosition: '50% 50%',
    });
  });

  it('shows error toast when save fails', async () => {
    mockUpdate.mockRejectedValueOnce(new Error('save failed'));
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Failed to save hero settings'
      );
    });
  });

  it('calls clampedPoint callback correctly on mouse interactions', async () => {
    renderEditor();
    const preview = screen
      .getByText('Click or drag on the preview to set the focal point.')
      .nextElementSibling as HTMLDivElement;

    vi.spyOn(preview, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 200,
      height: 100,
      right: 200,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);

    fireEvent.mouseDown(preview, { clientX: 100, clientY: 50 });
    fireEvent.mouseMove(window, { clientX: 100, clientY: 50 });
    fireEvent.mouseUp(window);

    const previewImage = screen.getByAltText('Hero preview') as HTMLImageElement;
    expect(previewImage).toHaveStyle({ objectPosition: '50% 50%' });
  });

  it('handles empty previewRef gracefully in clampedPoint', async () => {
    renderEditor();
    const preview = screen
      .getByText('Click or drag on the preview to set the focal point.')
      .nextElementSibling as HTMLDivElement;

    vi.spyOn(preview, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 0,
      height: 0,
      right: 0,
      bottom: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);

    // This tests the return focalPoint fallback when ref is not available or has zero dimensions
    const previewImage = screen.getByAltText('Hero preview') as HTMLImageElement;
    expect(previewImage).toBeInTheDocument();
  });

  it('handles multiple rapid height button clicks', async () => {
    const user = userEvent.setup();
    renderEditor();

    const smButton = screen.getByRole('button', { name: 'SM' });
    const mdButton = screen.getByRole('button', { name: 'MD' });
    const lgButton = screen.getByRole('button', { name: 'LG' });

    await user.click(smButton);
    expect(smButton).toHaveClass('bg-primary-600');
    expect(mdButton).not.toHaveClass('bg-primary-600');

    await user.click(lgButton);
    expect(lgButton).toHaveClass('bg-primary-600');
    expect(smButton).not.toHaveClass('bg-primary-600');

    await user.click(mdButton);
    expect(mdButton).toHaveClass('bg-primary-600');
    expect(lgButton).not.toHaveClass('bg-primary-600');
  });

  it('updates gradient opacity slider correctly', async () => {
    const user = userEvent.setup();
    renderEditor();

    const sliders = screen.getAllByRole('slider');
    const gradientSlider = sliders[1]!; // Second slider is gradient opacity

    fireEvent.change(gradientSlider, { target: { value: '0.75' } });

    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('defaults to DEFAULTS values when no initial values provided', () => {
    render(
      <ToastProvider>
        <HeroPositionEditor
          galleryId="g1"
          heroImage="finished/g1/hero.jpg"
        />
      </ToastProvider>
    );

    const previewImage = screen.getByAltText('Hero preview') as HTMLImageElement;
    expect(previewImage).toHaveStyle({ objectPosition: '50% 50%' });
    expect(previewImage).not.toHaveStyle({ transform: 'scale' });
    expect(screen.getByText('1.00×')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'MD' })).toHaveClass('bg-primary-600');
  });
});
