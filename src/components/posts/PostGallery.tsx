import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface PostGalleryProps {
  images: readonly string[];
  title: string;
}

export function PostGallery({ images, title }: PostGalleryProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedMap, setFailedMap] = useState<Record<number, boolean>>({});

  const scrollTo = (index: number) => {
    const safeIdx = Math.max(0, Math.min(images.length - 1, index));
    setActiveIndex(safeIdx);
    const el = trackRef.current;
    if (el) {
      el.scrollTo({ left: safeIdx * el.clientWidth, behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== activeIndex && idx >= 0 && idx < images.length) {
      setActiveIndex(idx);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
        <div
          ref={trackRef}
          onScroll={handleScroll}
          className="flex snap-x snap-mandatory overflow-x-auto no-scrollbar"
          aria-label={`Galeri foto ${title}`}
        >
          {images.map((src, idx) => (
            <div
              key={`${src}-${idx}`}
              className="aspect-[4/3] w-full shrink-0 snap-center bg-zinc-100"
            >
              {!failedMap[idx] ? (
                <img
                  src={src}
                  alt={`${title} - foto ${idx + 1}`}
                  referrerPolicy="no-referrer"
                  onError={() => setFailedMap((prev) => ({ ...prev, [idx]: true }))}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-500">
                  <ImageOff className="h-8 w-8" aria-hidden="true" />
                  <span className="text-sm">Gambar tidak dapat dimuat</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => scrollTo(activeIndex - 1)}
              disabled={activeIndex === 0}
              aria-label="Foto sebelumnya"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-950 shadow-sm transition-all duration-150 hover:scale-105 active:scale-95 disabled:opacity-35 cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollTo(activeIndex + 1)}
              disabled={activeIndex === images.length - 1}
              aria-label="Foto berikutnya"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-950 shadow-sm transition-all duration-150 hover:scale-105 active:scale-95 disabled:opacity-35 cursor-pointer"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-zinc-950/85 px-2.5 py-1 text-xs font-medium text-white tabular-nums">
              {activeIndex + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((src, idx) => (
            <button
              key={`thumb-${src}-${idx}`}
              type="button"
              onClick={() => scrollTo(idx)}
              aria-label={`Lihat foto ${idx + 1}`}
              aria-current={idx === activeIndex ? 'true' : undefined}
              className={cn(
                'relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-lg border cursor-pointer transition-all duration-200',
                idx === activeIndex
                  ? 'border-zinc-950 opacity-100'
                  : 'border-zinc-200 opacity-65 hover:opacity-100'
              )}
            >
              <img
                src={src}
                alt={`${title} - pratinjau ${idx + 1}`}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
              {idx === activeIndex && (
                <motion.span
                  layoutId="gallery-thumb-active"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-inset ring-zinc-950"
                  aria-hidden="true"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
