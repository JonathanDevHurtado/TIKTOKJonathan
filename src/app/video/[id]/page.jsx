"use client"
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../utils/supabase';
import VideoCard from '../../../components/VideoCard';
import { ChevronLeft, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

export default function VideoPage() {
  const { id } = useParams();
  const router = useRouter();
  const { theme } = useTheme();
  const [videos, setVideos] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const isScrolling = useRef(false);
  const touchStart = useRef(0);

  useEffect(() => {
    const fetchVideos = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data: allVideos, error } = await supabase
          .from('videos')
          .select(`*, profiles(username, avatar_url)`)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (allVideos && allVideos.length > 0) {
          setVideos(allVideos);
          const idx = allVideos.findIndex(v => v.id === id);
          setCurrentIdx(idx >= 0 ? idx : 0);
        }
      } catch (err) {
        console.error("Error fetching videos:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, [id]);

  const goTo = useCallback((idx) => {
    if (isScrolling.current || videos.length === 0) return;
    const clamped = ((idx % videos.length) + videos.length) % videos.length;
    isScrolling.current = true;
    setCurrentIdx(clamped);
    router.replace(`/video/${videos[clamped].id}`, { scroll: false });
    setTimeout(() => { isScrolling.current = false; }, 600);
  }, [videos, router]);

  useEffect(() => {
    const onWheel = (e) => {
      const target = e.target;
      if (target.closest('input') || target.closest('textarea') || target.closest('form') || target.closest('[data-no-scroll]')) return;
      e.preventDefault();
      if (!isScrolling.current) goTo(currentIdx + (e.deltaY > 0 ? 1 : -1));
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, [currentIdx, goTo]);

  const onTouchStart = (e) => { touchStart.current = e.touches[0].clientY; };
  const onTouchEnd = (e) => {
    const diff = touchStart.current - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 50) goTo(currentIdx + (diff > 0 ? 1 : -1));
  };

  const isDark = theme === 'dark';

  if (loading) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center h-screen ${isDark ? 'bg-[#0a0a0a]' : 'bg-[#f8f8f8]'}`}>
        <Loader2 className="w-10 h-10 text-tiktok-red animate-spin mb-4" />
        <p className={`text-sm font-medium ${isDark ? 'text-white/50' : 'text-black/50'}`}>Cargando video...</p>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center h-screen gap-4 ${isDark ? 'bg-[#0a0a0a] text-white' : 'bg-[#f8f8f8] text-black'}`}>
        <h1 className="text-2xl font-bold">Video no encontrado</h1>
        <button onClick={() => router.back()} className="bg-tiktok-red text-white px-8 py-2 rounded-full font-bold hover:scale-105 active:scale-95 transition-transform">
          Regresar
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex-1 h-screen relative flex items-center justify-center overflow-hidden transition-colors duration-300 ${isDark ? 'bg-[#0a0a0a]' : 'bg-[#f0f0f0]'}`}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <button
        onClick={() => router.back()}
        className={`absolute top-6 left-6 z-[100] p-3 rounded-full transition-all hover:scale-110 active:scale-95 group shadow-xl border backdrop-blur-sm ${isDark ? 'bg-white/10 hover:bg-white/20 text-white border-white/10' : 'bg-black/10 hover:bg-black/20 text-black border-black/10'}`}
      >
        <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
      </button>

      <div className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 flex-col gap-3 z-50">
        <button
          onClick={() => goTo(currentIdx - 1)}
          className={`p-3 rounded-full transition-all hover:scale-110 active:scale-90 shadow-xl border backdrop-blur-sm ${isDark ? 'bg-white/10 hover:bg-white/20 text-white border-white/10' : 'bg-black/10 hover:bg-black/20 text-black border-black/10'}`}
        >
          <ChevronUp className="w-5 h-5" />
        </button>
        <button
          onClick={() => goTo(currentIdx + 1)}
          className={`p-3 rounded-full transition-all hover:scale-110 active:scale-90 shadow-xl border backdrop-blur-sm ${isDark ? 'bg-white/10 hover:bg-white/20 text-white border-white/10' : 'bg-black/10 hover:bg-black/20 text-black border-black/10'}`}
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>

      <div className={`absolute top-6 right-6 z-[100] px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm border ${isDark ? 'bg-black/40 text-white/70 border-white/10' : 'bg-white/40 text-black/70 border-black/10'}`}>
        {currentIdx + 1} / {videos.length}
      </div>

      <div className="h-full w-full max-w-lg md:h-[calc(100vh-2rem)] md:rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <VideoCard video={videos[currentIdx]} isActive={true} />
      </div>
    </div>
  );
}
