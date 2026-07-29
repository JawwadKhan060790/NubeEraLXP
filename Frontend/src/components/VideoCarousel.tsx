/**
 * VideoCarousel.tsx
 *
 * A premium shared video carousel that renders multiple video slides.
 * Supports YouTube embeds and direct file URLs (uploaded videos).
 * Shows prev/next arrows and a slide counter badge only when there are multiple videos.
 * Falls back to a "no video" empty state when the urls array is empty.
 */

import { ChevronLeft, ChevronRight, PlayCircle } from 'lucide-react';
import React, { useState } from 'react';
import { resolveMediaUrl } from '@/utils/urlHelper';

interface VideoCarouselProps {
  urls: string[];
  /** Optional label shown above the counter badge */
  title?: string;
  className?: string;
}

const isYoutube = (url: string) =>
  url.includes('youtube.com') || url.includes('youtu.be');

const getYoutubeId = (url: string) =>
  url.includes('v=')
    ? url.split('v=')[1]?.split('&')[0]
    : url.split('/').pop()?.split('?')[0];

const VideoCarousel: React.FC<VideoCarouselProps> = ({ urls, className = '' }) => {
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);

  // Filter out empty/whitespace-only entries
  const validUrls = urls.filter(u => u && u.trim().length > 0);

  const navigate = (dir: -1 | 1) => {
    if (fading) return;
    setFading(true);
    setTimeout(() => {
      setCurrent(prev => {
        const next = prev + dir;
        if (next < 0) return validUrls.length - 1;
        if (next >= validUrls.length) return 0;
        return next;
      });
      setFading(false);
    }, 200);
  };

  if (validUrls.length === 0) {
    return (
      <div className={`w-full h-full flex items-center justify-center text-white/10 ${className}`}>
        <PlayCircle className="w-20 h-20" />
      </div>
    );
  }

  const url = validUrls[current];
  const isYt = isYoutube(url);
  const videoId = isYt ? getYoutubeId(url) : null;
  const hasMultiple = validUrls.length > 1;

  return (
    <div className={`relative w-full h-full group ${className}`}>
      {/* Video player */}
      <div
        className="w-full h-full transition-opacity duration-200"
        style={{ opacity: fading ? 0 : 1 }}
      >
        {isYt && videoId ? (
          <iframe
            key={`yt-${current}`}
            className="w-full h-full border-0"
            src={`https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0`}
            allowFullScreen
            title={`Video ${current + 1}`}
          />
        ) : (
          <video
            key={`vid-${current}`}
            className="w-full h-full bg-black object-contain"
            src={resolveMediaUrl(url)}
            controls
            controlsList="nodownload"
          />
        )}
      </div>

      {/* Navigation — only shown when there are multiple slides */}
      {hasMultiple && (
        <>
          {/* Prev button */}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10
                       w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm border border-white/10
                       flex items-center justify-center text-white
                       opacity-0 group-hover:opacity-100 transition-opacity duration-200
                       hover:bg-black/70 active:scale-95 cursor-pointer"
            title="Previous video"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Next button */}
          <button
            type="button"
            onClick={() => navigate(1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10
                       w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm border border-white/10
                       flex items-center justify-center text-white
                       opacity-0 group-hover:opacity-100 transition-opacity duration-200
                       hover:bg-black/70 active:scale-95 cursor-pointer"
            title="Next video"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Slide counter badge */}
          <div className="absolute top-3 right-3 z-10
                          px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-white/10
                          text-white text-[11px] font-bold tracking-wider select-none">
            {current + 1} / {validUrls.length}
          </div>

          {/* Dot indicators */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
            {validUrls.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  if (!fading && i !== current) {
                    setFading(true);
                    setTimeout(() => { setCurrent(i); setFading(false); }, 200);
                  }
                }}
                className={`rounded-full transition-all duration-200 cursor-pointer
                  ${i === current
                    ? 'w-5 h-2 bg-white'
                    : 'w-2 h-2 bg-white/40 hover:bg-white/70'
                  }`}
                title={`Video ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default VideoCarousel;
