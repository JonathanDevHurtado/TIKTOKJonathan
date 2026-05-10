'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import VideoCard from './VideoCard';
import { ChevronUp, ChevronDown } from 'lucide-react';

export default function FeedClient({ initialVideos }) {
  const containerRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const isScrolling = useRef(false);
  const touchStart  = useRef(0);
  const total = initialVideos.length;

  const goTo = useCallback((idx) => {
    if (isScrolling.current || total === 0) return;
    const realIdx = ((idx % total) + total) % total;
    isScrolling.current = true;
    setActiveIdx(realIdx);
    containerRef.current?.children[realIdx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => { isScrolling.current = false; }, 700);
  }, [total]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      if (!isScrolling.current) goTo(activeIdx + (e.deltaY > 0 ? 1 : -1));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [activeIdx, goTo]);

  const onTouchStart = (e) => { touchStart.current = e.touches[0].clientY; };
  const onTouchEnd   = (e) => {
    const diff = touchStart.current - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 50) goTo(activeIdx + (diff > 0 ? 1 : -1));
  };

  if (total === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-tiktok-gray h-full">
        <p>Aún no hay videos publicados</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full max-w-[600px] flex justify-center bg-tiktok-black overflow-hidden">
      
      {/* Desktop Controls */}
      <div className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 flex-col gap-4 z-50">
        <button 
          className="bg-tiktok-dark-hover p-2 rounded-full hover:bg-tiktok-gray transition-colors" 
          onClick={() => goTo(activeIdx - 1)}
        >
          <ChevronUp className="text-white w-6 h-6" />
        </button>
        <button 
          className="bg-tiktok-dark-hover p-2 rounded-full hover:bg-tiktok-gray transition-colors" 
          onClick={() => goTo(activeIdx + 1)}
        >
          <ChevronDown className="text-white w-6 h-6" />
        </button>
      </div>

      <div
        className="h-full w-full overflow-y-auto no-scrollbar snap-y snap-mandatory"
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {initialVideos.map((video, i) => (
          <div key={video.id || i} className="h-full w-full snap-start flex justify-center items-center relative">
            <VideoCard video={video} isActive={i === activeIdx} />
          </div>
        ))}
      </div>
    </div>
  );
}
