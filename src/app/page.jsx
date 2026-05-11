"use client"
import { useState, useEffect, useRef, useCallback } from 'react';
import VideoCard from '../components/VideoCard';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '../utils/supabase';
import { useSession } from './SessionProvider';
import { VIDEOS } from '../data/videos';

export default function Feed() {
  const containerRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const isScrolling = useRef(false);
  const touchStart = useRef(0);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedTab, setFeedTab] = useState('forYou');
  const router = useRouter();
  const session = useSession();

  const fetchVideos = useCallback(async (tab) => {
    setLoading(true);
    setActiveIdx(0);

    if (tab === 'following' && session?.user?.id) {
      const { data: followingData } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', session.user.id);

      if (!followingData || followingData.length === 0) {
        setVideos([]);
        setLoading(false);
        return;
      }

      const followingIds = followingData.map(f => f.following_id);
      const { data } = await supabase
        .from('videos')
        .select(`*, profiles(username, avatar_url)`)
        .in('user_id', followingIds)
        .order('created_at', { ascending: false });
      setVideos(data || []);
    } else {
      const { data, error } = await supabase
        .from('videos')
        .select(`*, profiles(username, avatar_url)`)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        setVideos(data);
      } else {
        setVideos(VIDEOS.map(v => ({ ...v, profiles: { username: v.user, avatar_url: v.avatar } })));
      }
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    fetchVideos(feedTab);
  }, [feedTab, fetchVideos]);

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
      const target = e.target;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.closest('input') ||
        target.closest('textarea') ||
        target.closest('form') ||
        target.closest('[data-no-scroll]')
      ) return;
      e.preventDefault();
      if (!isScrolling.current) goTo(activeIdx + (e.deltaY > 0 ? 1 : -1));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [activeIdx, goTo]);

  const onTouchStart = (e) => { touchStart.current = e.touches[0].clientY; };
  const onTouchEnd = (e) => {
    const diff = touchStart.current - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 50) goTo(activeIdx + (diff > 0 ? 1 : -1));
  };

  const EmptyFollowing = () => (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center px-8 h-full">
      <div className="text-6xl animate-bounce">👥</div>
      <h2 className="text-2xl font-black">Sin videos de seguidos</h2>
      <p className="text-[var(--text-secondary)] max-w-sm">Sigue a tus creadores favoritos para ver sus videos aquí.</p>
      <button
        onClick={() => router.push('/explore')}
        className="bg-tiktok-red text-white px-8 py-3 rounded-full font-bold hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-tiktok-red/30"
      >
        Descubrir creadores
      </button>
    </div>
  );

  return (
    <div className="relative h-full w-full mx-auto flex flex-col bg-tiktok-black">
      <div className="absolute top-0 left-0 right-0 z-50 flex justify-center pt-3 pb-2 pointer-events-none">
        <div className="flex gap-1 pointer-events-auto bg-black/30 backdrop-blur-md rounded-full px-1 py-1 border border-white/10 shadow-xl">
          {[
            { id: 'forYou', label: 'Para mí' },
            { id: 'following', label: 'Siguiendo' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFeedTab(tab.id)}
              className={`px-5 py-1.5 rounded-full font-bold text-sm transition-all duration-300 ${
                feedTab === tab.id
                  ? 'bg-white text-black shadow-md scale-105'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center h-full">
          <div className="animate-spin w-8 h-8 border-4 border-tiktok-red border-t-transparent rounded-full" />
        </div>
      ) : feedTab === 'following' && total === 0 ? (
        <EmptyFollowing />
      ) : total === 0 ? (
        <div className="flex-1 flex items-center justify-center text-tiktok-gray h-full">
          <p>Aún no hay videos publicados</p>
        </div>
      ) : (
        <>
          <div className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 flex-col gap-4 z-50">
            <button className="bg-tiktok-dark-hover p-2 rounded-full hover:bg-tiktok-gray transition-colors hover:scale-110 active:scale-90" onClick={() => goTo(activeIdx - 1)}>
              <ChevronUp className="text-white w-6 h-6" />
            </button>
            <button className="bg-tiktok-dark-hover p-2 rounded-full hover:bg-tiktok-gray transition-colors hover:scale-110 active:scale-90" onClick={() => goTo(activeIdx + 1)}>
              <ChevronDown className="text-white w-6 h-6" />
            </button>
          </div>

          <div
            className="h-full w-full overflow-y-auto no-scrollbar snap-y snap-mandatory"
            ref={containerRef}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {videos.filter(v => v && v.id).map((video, i) => (
              <div key={video.id || i} className="h-[100dvh] md:h-full w-full snap-start flex justify-center items-center relative">
                <VideoCard video={video} isActive={i === activeIdx} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
