'use client';

import { useState, useRef, useCallback } from 'react';
import { adminGalleries } from '@/lib/api';
import { useToast } from './Toast';

const MEDIA_URL = process.env.NEXT_PUBLIC_MEDIA_URL || '';

interface FocalPoint {
  x: number;
  y: number;
}

type HeroHeight = 'sm' | 'md' | 'lg';

interface HeroPositionEditorProps {
  galleryId: string;
  heroImage: string;
  initialFocalPoint?: FocalPoint;
  initialZoom?: number;
  initialGradientOpacity?: number;
  initialHeight?: HeroHeight;
}

const DEFAULTS = {
  focalPoint: { x: 50, y: 50 } as FocalPoint,
  zoom: 1.0,
  gradientOpacity: 0.5,
  height: 'md' as HeroHeight,
};

const HEIGHT_CLASSES: Record<HeroHeight, string> = {
  sm: 'h-[35vh]',
  md: 'h-[55vh]',
  lg: 'h-[75vh]',
};

export function HeroPositionEditor({
  galleryId,
  heroImage,
  initialFocalPoint,
  initialZoom,
  initialGradientOpacity,
  initialHeight,
}: HeroPositionEditorProps) {
  const { showSuccess, showError } = useToast();
  const [focalPoint, setFocalPoint] = useState<FocalPoint>(
    initialFocalPoint ?? DEFAULTS.focalPoint
  );
  const [zoom, setZoom] = useState(initialZoom ?? DEFAULTS.zoom);
  const [gradientOpacity, setGradientOpacity] = useState(
    initialGradientOpacity ?? DEFAULTS.gradientOpacity
  );
  const [height, setHeight] = useState<HeroHeight>(initialHeight ?? DEFAULTS.height);
  const [saving, setSaving] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const clampedPoint = useCallback((clientX: number, clientY: number): FocalPoint => {
    if (!previewRef.current) return focalPoint;
    const rect = previewRef.current.getBoundingClientRect();
    const x = Math.round(((clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((clientY - rect.top) / rect.height) * 100);
    return {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    };
  }, [focalPoint]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      setFocalPoint(clampedPoint(e.clientX, e.clientY));

      const handleMouseMove = (ev: MouseEvent) => {
        setFocalPoint((prev) => {
          if (!previewRef.current) return prev;
          const rect = previewRef.current.getBoundingClientRect();
          const x = Math.round(((ev.clientX - rect.left) / rect.width) * 100);
          const y = Math.round(((ev.clientY - rect.top) / rect.height) * 100);
          return {
            x: Math.max(0, Math.min(100, x)),
            y: Math.max(0, Math.min(100, y)),
          };
        });
      };
      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [clampedPoint]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      setFocalPoint(clampedPoint(touch.clientX, touch.clientY));

      const handleTouchMove = (ev: TouchEvent) => {
        ev.preventDefault();
        const t = ev.touches[0];
        if (!t) return;
        setFocalPoint((prev) => {
          if (!previewRef.current) return prev;
          const rect = previewRef.current.getBoundingClientRect();
          const x = Math.round(((t.clientX - rect.left) / rect.width) * 100);
          const y = Math.round(((t.clientY - rect.top) / rect.height) * 100);
          return {
            x: Math.max(0, Math.min(100, x)),
            y: Math.max(0, Math.min(100, y)),
          };
        });
      };
      const handleTouchEnd = () => {
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    },
    [clampedPoint]
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminGalleries.update(galleryId, {
        heroFocalPoint: focalPoint,
        heroZoom: zoom,
        heroGradientOpacity: gradientOpacity,
        heroHeight: height,
      });
      showSuccess('Hero settings saved');
    } catch {
      showError('Failed to save hero settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFocalPoint(DEFAULTS.focalPoint);
    setZoom(DEFAULTS.zoom);
    setGradientOpacity(DEFAULTS.gradientOpacity);
    setHeight(DEFAULTS.height);
  };

  const imgSrc = `${MEDIA_URL}/${heroImage}`;

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900">Hero Positioning</h2>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="text-sm px-3 py-1.5 text-neutral-600 hover:text-neutral-900 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-sm px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Live preview — click/drag to set focal point */}
      <div>
        <p className="text-sm text-neutral-500 mb-2">
          Click or drag on the preview to set the focal point.
        </p>
        <div
          ref={previewRef}
          className={`relative w-full overflow-hidden rounded-lg bg-neutral-900 cursor-crosshair select-none ${HEIGHT_CLASSES[height]}`}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgSrc}
            alt="Hero preview"
            className="absolute inset-0 w-full h-full pointer-events-none"
            draggable={false}
            style={{
              objectFit: 'cover',
              objectPosition: `${focalPoint.x}% ${focalPoint.y}%`,
              opacity: 0.9,
              transform: zoom !== 1 ? `scale(${zoom})` : undefined,
              transformOrigin: `${focalPoint.x}% ${focalPoint.y}%`,
              userSelect: 'none',
            }}
          />
          {/* Gradient overlay */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-black to-transparent pointer-events-none"
            style={{ opacity: gradientOpacity }}
          />
          {/* Focal point crosshair */}
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${focalPoint.x}%`,
              top: `${focalPoint.y}%`,
              transform: 'translate(-50%, -50%)',
              width: 20,
              height: 20,
            }}
          >
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/80" style={{ transform: 'translateX(-50%)' }} />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-white/80" style={{ transform: 'translateY(-50%)' }} />
            <div
              className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full border-2 border-white bg-white/20 shadow-md"
              style={{ transform: 'translate(-50%, -50%)' }}
            />
          </div>
        </div>
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-neutral-700">Zoom</label>
            <span className="text-sm text-neutral-500">{zoom.toFixed(2)}×</span>
          </div>
          <input
            type="range"
            min={1}
            max={2}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-full accent-primary-600"
          />
          <div className="flex justify-between text-xs text-neutral-400 mt-1">
            <span>1×</span>
            <span>2×</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-neutral-700">Text overlay</label>
            <span className="text-sm text-neutral-500">{Math.round(gradientOpacity * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={gradientOpacity}
            onChange={(e) => setGradientOpacity(parseFloat(e.target.value))}
            className="w-full accent-primary-600"
          />
          <div className="flex justify-between text-xs text-neutral-400 mt-1">
            <span>None</span>
            <span>Full</span>
          </div>
        </div>
      </div>

      {/* Height toggle */}
      <div>
        <label className="text-sm font-medium text-neutral-700 mb-2 block">Height</label>
        <div className="flex gap-2">
          {(['sm', 'md', 'lg'] as HeroHeight[]).map((h) => (
            <button
              key={h}
              onClick={() => setHeight(h)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                height === h
                  ? 'bg-primary-600 border-primary-600 text-white'
                  : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-400'
              }`}
            >
              {h.toUpperCase()}
            </button>
          ))}
        </div>
        <p className="text-xs text-neutral-400 mt-1.5">S = 35vh · M = 55vh · L = 75vh</p>
      </div>
    </div>
  );
}
