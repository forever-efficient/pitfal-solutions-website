'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { publicGalleries, type VideoPreviewInfo } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';

interface VideoCarouselProps {
  fallback: React.ReactNode;
}

export function VideoCarousel({ fallback }: VideoCarouselProps) {
  const [previews, setPreviews] = useState<VideoPreviewInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    publicGalleries.getVideoPreviews()
      .then(data => setPreviews(data.previews))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Pause/resume on hover
  useEffect(() => {
    const video = videoRefs.current[current];
    if (!video) return;
    if (paused) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
  }, [paused, current]);

  // When current video ends, advance to next
  const handleEnded = useCallback((index: number) => {
    if (index !== current) return;
    if (previews.length <= 1) {
      // Only one video — restart it
      const video = videoRefs.current[0];
      if (video) { video.currentTime = 0; video.play().catch(() => {}); }
    } else {
      setCurrent(c => (c + 1) % previews.length);
    }
  }, [current, previews.length]);

  // Play/pause videos based on current index
  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      if (i === current) {
        video.currentTime = 0;
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [current]);

  // IntersectionObserver to pause when not visible
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry || !entry.isIntersecting) {
          videoRefs.current.forEach(v => v?.pause());
        } else {
          videoRefs.current[current]?.play().catch(() => {});
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, [current]);

  if (loading) {
    return <div className="aspect-[4/3] bg-neutral-200 rounded-2xl animate-pulse" />;
  }

  if (previews.length === 0) {
    return <>{fallback}</>;
  }

  const preview = previews[current];
  if (!preview) return <>{fallback}</>;

  return (
    <div
      ref={containerRef}
      className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-black shadow-lg hover:shadow-xl transition-shadow duration-300"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      {/* Video layers */}
      {previews.map((p, i) => (
        <video
          key={p.previewKey}
          ref={el => { videoRefs.current[i] = el; }}
          src={getImageUrl(p.previewKey)}
          muted
          autoPlay={i === current}
          playsInline
          onEnded={() => handleEnded(i)}
          preload={i === current ? 'auto' : 'metadata'}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            i === current ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}

      {/* Gradient + text overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      <div className="absolute inset-0 p-6 flex flex-col justify-end">
        <span className="text-accent-400 text-sm font-semibold uppercase tracking-wider mb-2">
          videography
        </span>
        <h3 className="text-white font-bold text-xl lg:text-2xl leading-tight">
          {preview.title || 'Cinematic Video Production'}
        </h3>
      </div>

      {/* Link overlay */}
      <Link
        href={preview.youtubeUrl || `/portfolio/videography`}
        target={preview.youtubeUrl ? '_blank' : undefined}
        rel={preview.youtubeUrl ? 'noopener noreferrer' : undefined}
        className="absolute inset-0 z-10"
        aria-label={`View ${preview.title || 'video'}`}
      />

      {/* Navigation arrows (desktop) */}
      {previews.length > 1 && (
        <>
          <button
            onClick={(e) => { e.preventDefault(); setCurrent(c => (c - 1 + previews.length) % previews.length); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
            aria-label="Previous video"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.preventDefault(); setCurrent(c => (c + 1) % previews.length); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
            aria-label="Next video"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Dot indicators */}
      {previews.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
          {previews.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.preventDefault(); setCurrent(i); }}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === current ? 'bg-white' : 'bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to video ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
