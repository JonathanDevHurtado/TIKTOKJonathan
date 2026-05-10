"use client"
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../utils/supabase';
import { useSession } from '../../SessionProvider';

export default function Profile() {
  const { username } = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      let targetUsername = username;
      
      if (username === 'me') {
        if (!session) {
          router.push('/login');
          return;
        }
        // Buscar el profile del usuario actual
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', session.user.id)
          .single();
          
        if (userProfile) targetUsername = userProfile.username;
      }

      const { data } = await supabase
        .from('profiles')
        .select('*, videos(*)')
        .eq('username', targetUsername)
        .single();
        
      setProfile(data);
      setLoading(false);
    };

    fetchProfile();
  }, [username, session, router]);

  if (loading) return <div className="flex-1 flex justify-center items-center h-full"><div className="animate-spin w-8 h-8 border-4 border-tiktok-red border-t-transparent rounded-full"></div></div>;

  const isMe = username === 'me' || profile?.id === session?.user?.id;

  return (
    <div className="w-full max-w-4xl mx-auto h-full flex flex-col p-4 md:p-8">
      
      <div className="flex flex-col items-center mt-8 mb-6">
        <img 
          src={profile?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (profile?.username || username)} 
          alt={username} 
          className="w-24 h-24 rounded-full border-2 border-tiktok-dark-hover mb-4 object-cover"
        />
        <h1 className="text-2xl font-bold text-white mb-1">@{profile?.username || username}</h1>
        <h2 className="text-md font-semibold text-white mb-4">{profile?.full_name || 'Usuario de TikTok'}</h2>

        <div className="flex gap-6 mb-6 text-white text-center">
          <div className="flex flex-col">
            <strong className="text-lg">0</strong>
            <span className="text-xs text-tiktok-gray">Siguiendo</span>
          </div>
          <div className="flex flex-col">
            <strong className="text-lg">0</strong>
            <span className="text-xs text-tiktok-gray">Seguidores</span>
          </div>
          <div className="flex flex-col">
            <strong className="text-lg">0</strong>
            <span className="text-xs text-tiktok-gray">Me gusta</span>
          </div>
        </div>

        {isMe ? (
          <div className="flex gap-2">
            <button className="bg-[#1e1e1e] hover:bg-tiktok-dark-hover border border-tiktok-gray text-white font-semibold py-2 px-8 rounded-md transition-colors w-full md:w-auto min-w-[150px]">
              Editar perfil
            </button>
            <button 
              onClick={async () => {
                await supabase.auth.signOut();
                router.push('/');
              }} 
              className="bg-red-900/20 hover:bg-red-900/40 border border-red-500/50 text-red-500 font-semibold py-2 px-4 rounded-md transition-colors"
            >
              Salir
            </button>
          </div>
        ) : (
          <button className="bg-tiktok-red hover:bg-[#e0254b] text-white font-bold py-2 px-8 rounded-md transition-colors w-full md:w-auto min-w-[200px]">
            Seguir
          </button>
        )}

        <p className="mt-6 text-sm text-center max-w-md text-white">
          {profile?.bio || 'Sin biografía todavía.'}
        </p>
      </div>

      <div className="flex w-full border-b border-tiktok-dark-hover mb-2">
        <div className="flex-1 text-center py-3 border-b-2 border-white text-white font-semibold cursor-pointer">
          Videos
        </div>
        <div className="flex-1 text-center py-3 text-tiktok-gray font-semibold cursor-pointer hover:text-white transition-colors">
          Me gusta
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 md:gap-4 flex-1">
        {profile?.videos && profile.videos.length > 0 ? (
          profile.videos.map(video => (
            <div key={video.id} className="aspect-[3/4] bg-[#1e1e1e] rounded-md relative cursor-pointer group overflow-hidden">
               <video src={video.video_url} className="w-full h-full object-cover" muted />
               <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                 <span className="text-white text-xs font-semibold">▶ {video.views || 0}</span>
               </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 text-center text-tiktok-gray mt-12 flex flex-col items-center">
            <p className="text-lg font-bold text-white mb-2">No hay videos</p>
            <p>Este usuario no ha publicado videos todavía.</p>
          </div>
        )}
      </div>

    </div>
  );
}
