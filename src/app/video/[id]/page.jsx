"use client"
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../utils/supabase';
import VideoCard from '../../../components/VideoCard';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

export default function VideoPage() {
  const { id } = useParams();
  const router = useRouter();
  const { theme } = useTheme();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideo = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('videos')
          .select(`*, profiles(username, avatar_url)`)
          .eq('id', id)
          .single();
        if (error) throw error;
        setVideo(data);
      } catch (error) {
        console.error("Error fetching video:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchVideo();
  }, [id]);

  if (loading) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center h-screen ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#f8f8f8]'}`}>
        <Loader2 className="w-10 h-10 text-tiktok-red animate-spin mb-4" />
        <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white/50' : 'text-black/50'}`}>Cargando video...</p>
      </div>
    );
  }

  if (!video) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center h-screen gap-4 ${theme === 'dark' ? 'bg-[#0a0a0a] text-white' : 'bg-[#f8f8f8] text-black'}`}>
        <h1 className="text-2xl font-bold">Video no encontrado</h1>
        <button
          onClick={() => router.back()}
          className="bg-tiktok-red text-white px-8 py-2 rounded-full font-bold hover:scale-105 active:scale-95 transition-transform"
        >
          Regresar
        </button>
      </div>
    );
  }

  return (
    <div className={`flex-1 h-screen relative flex items-center justify-center overflow-hidden transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#f0f0f0]'}`}>
      <button
        onClick={() => router.back()}
        className={`absolute top-6 left-6 z-[100] p-3 rounded-full transition-all hover:scale-110 active:scale-95 group shadow-xl border backdrop-blur-sm ${theme === 'dark' ? 'bg-white/10 hover:bg-white/20 text-white border-white/10' : 'bg-black/10 hover:bg-black/20 text-black border-black/10'}`}
      >
        <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
      </button>

      <div className="h-full w-full max-w-lg md:h-[calc(100vh-2rem)] md:rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <VideoCard video={video} isActive={true} />
      </div>
    </div>
  );
}
