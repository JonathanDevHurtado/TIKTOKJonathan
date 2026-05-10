"use client"
import { useState, useEffect, useRef, useCallback } from 'react';
import VideoCard from '../components/VideoCard';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '../utils/supabase';
import { VIDEOS } from '../data/videos';

export default function Feed() {
  const containerRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const isScrolling = useRef(false);
  const touchStart  = useRef(0);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchVideos = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/register');
        return;
      }

      const { data, error } = await supabase
        .from('videos')
        .select(`*, profiles(username, avatar_url)`)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        setVideos(data);
      } else {
        // Fallback to local data
        setVideos(VIDEOS.map(v => ({...v, profiles: { username: v.user, avatar_url: v.avatar }})));
      }
      setLoading(false);
    };
    fetchVideos();
  }, []);

  const total = videos.length;

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

  if (loading) {
    return <div className="flex-1 flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-4 border-tiktok-red border-t-transparent rounded-full"></div></div>;
  }

  if (total === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-tiktok-gray h-full">
        <p>Aún no hay videos publicados</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full mx-auto flex justify-center bg-tiktok-black">
      
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
        {videos.map((video, i) => (
          <div key={video.id || i} className="h-[100dvh] md:h-full w-full snap-start flex justify-center items-center relative">
            <VideoCard video={video} isActive={i === activeIdx} />
          </div>
        ))}
      </div>
    </div>
  );
}
