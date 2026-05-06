import { useState, useEffect, useRef, useCallback } from 'react';
import VideoCard from '../components/VideoCard';
import { VIDEOS } from '../data/videos';

export default function FeedPage({ bp }) {
  const containerRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const isScrolling = useRef(false);
  const touchStart  = useRef(0);
  const total = VIDEOS.length;
  const isMobile = bp === 'mobile';

  const goTo = useCallback((idx) => {
    if (isScrolling.current) return;
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

  return (
    <div className={`feed-wrapper ${isMobile ? 'feed-mobile' : ''}`}>

      {!isMobile && (
        <>
          <button className="feed-arrow feed-arrow-up" onClick={() => goTo(activeIdx - 1)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <polyline points="18 15 12 9 6 15"/>
            </svg>
          </button>
          <button className="feed-arrow feed-arrow-down" onClick={() => goTo(activeIdx + 1)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          <div className="feed-dots">
            {VIDEOS.map((_, i) => (
              <button key={i} className={`feed-dot ${i === activeIdx ? 'active' : ''}`} onClick={() => goTo(i)} />
            ))}
          </div>
        </>
      )}


      {isMobile && (
        <div className="mobile-header">
          <span className="mobile-tab active">Para ti</span>
          <span className="mobile-tab">Siguiendo</span>
        </div>
      )}

      <div
        className={`feed-container ${isMobile ? 'feed-container-mobile' : ''}`}
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {VIDEOS.map((video, i) => (
          <div key={video.id} className={`feed-item ${isMobile ? 'feed-item-mobile' : ''}`}>
            <VideoCard video={video} isActive={i === activeIdx} />
          </div>
        ))}
      </div>
    </div>
  );
}
