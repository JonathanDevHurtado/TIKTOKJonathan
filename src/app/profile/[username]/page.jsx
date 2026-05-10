"use client"
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../utils/supabase';
import { useSession } from '../../SessionProvider';
import EditProfileModal from '../../../components/EditProfileModal';
import { useTheme } from '../../../context/ThemeContext';
import { Trash2, Heart, Bookmark, LogOut, Edit2, Menu, Sun, Moon, AlertTriangle, X, Play } from 'lucide-react';

export default function Profile() {
  const { username } = useParams();
  const session = useSession();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('videos');
  const [favorites, setFavorites] = useState([]);
  const [stats, setStats] = useState({ followers: 0, following: 0, likes: 0 });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const fetchProfile = useCallback(async () => {
    let targetUsername = username;
    
    if (username === 'me') {
      if (!session) {
        router.push('/login');
        return;
      }
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
      
    if (data) {
      setProfile(data);
      
      const { count: followersCount } = await supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', data.id);
      const { count: followingCount } = await supabase.from('followers').select('*', { count: 'exact', head: true }).eq('follower_id', data.id);
      
      const videoIds = data.videos?.map(v => v.id) || [];
      let totalLikes = 0;
      if (videoIds.length > 0) {
        const { count: likesCount } = await supabase.from('likes').select('*', { count: 'exact', head: true }).in('video_id', videoIds);
        totalLikes = likesCount || 0;
      }

      setStats({ followers: followersCount || 0, following: followingCount || 0, likes: totalLikes });

      if (session?.user?.id === data.id) {
        const { data: savedData } = await supabase.from('saves').select('*, videos(*, profiles(username, avatar_url))').eq('user_id', session.user.id);
        if (savedData) setFavorites(savedData.map(s => s.videos));
      }
    }
    setLoading(false);
  }, [username, session, router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleDeleteVideo = async (videoId, e) => {
    e.stopPropagation();
    if (!confirm('¿Estás seguro de que quieres eliminar este video?')) return;
    const { error } = await supabase.from('videos').delete().eq('id', videoId);
    if (!error) fetchProfile();
  };

  const handleDeleteAccount = async () => {
    if (!profile) return;
    const { error } = await supabase.from('profiles').delete().eq('id', profile.id);
    if (!error) {
      await supabase.auth.signOut();
      router.push('/');
    } else {
      alert("Error al borrar cuenta: " + error.message);
    }
  };

  if (loading) return <div className="flex-1 flex justify-center items-center h-full"><div className="animate-spin w-8 h-8 border-4 border-tiktok-red border-t-transparent rounded-full"></div></div>;

  if (!profile) return <div className="flex-1 flex justify-center items-center">Perfil no encontrado</div>;

  const isOwner = session?.user?.id === profile.id;

  return (
    <div className={`w-full max-w-4xl mx-auto h-full flex flex-col transition-colors duration-500 ${theme === 'dark' ? 'bg-tiktok-black text-white' : 'bg-white text-black'}`}>
      
      {/* Top Header with Hamburger Menu */}
      <div className="flex justify-end items-center p-4 sticky top-0 z-40 bg-inherit border-b border-tiktok-dark-hover/10">
        {isOwner && (
          <div className="relative">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 hover:bg-tiktok-dark-hover/10 rounded-full transition-colors">
              <Menu className="w-6 h-6" />
            </button>
            
            {isMenuOpen && (
              <div className={`absolute right-0 mt-2 w-56 rounded-xl shadow-2xl border p-2 z-50 animate-in fade-in zoom-in-95 duration-200 ${theme === 'dark' ? 'bg-[#1e1e1e] border-tiktok-dark-hover' : 'bg-white border-gray-100'}`}>
                <button onClick={toggleTheme} className="w-full flex items-center gap-3 p-3 hover:bg-tiktok-dark-hover/10 rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-95 group">
                  {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-400 group-hover:rotate-12 transition-transform" /> : <Moon className="w-5 h-5 text-indigo-600 group-hover:-rotate-12 transition-transform" />}
                  <span className="font-medium">Modo {theme === 'dark' ? 'Claro' : 'Oscuro'}</span>
                </button>
                <button onClick={() => { supabase.auth.signOut(); router.push('/'); }} className="w-full flex items-center gap-3 p-3 hover:bg-tiktok-dark-hover/10 rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-95 text-tiktok-red group">
                  <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  <span className="font-medium">Cerrar sesión</span>
                </button>
                <div className="h-px bg-tiktok-dark-hover/10 my-2 mx-2" />
                <button onClick={() => { setIsDeleteModalOpen(true); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 p-3 hover:bg-red-500/10 rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-95 text-red-500 group">
                  <Trash2 className="w-5 h-5 group-hover:shake transition-transform" />
                  <span className="font-medium">Borrar cuenta</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col items-center p-4 md:p-8">
        <div className="relative mb-4">
          <img 
            src={profile?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (profile?.username || 'user')} 
            alt={profile?.username || 'avatar'} 
            className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-tiktok-dark-hover object-cover shadow-xl"
          />
          {isOwner && (
            <button onClick={() => setIsEditModalOpen(true)} className="absolute bottom-0 right-0 bg-white text-black p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform">
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <h2 className="text-xl font-bold mb-1">@{profile?.username || 'cargando...'}</h2>
        {profile?.full_name && <h3 className="text-sm font-semibold opacity-70 mb-4">{profile.full_name}</h3>}

        <div className="flex gap-8 mb-6 text-center">
          <div><p className="font-bold text-lg">{stats.following}</p><p className="text-xs opacity-60">Siguiendo</p></div>
          <div><p className="font-bold text-lg">{stats.followers}</p><p className="text-xs opacity-60">Seguidores</p></div>
          <div><p className="font-bold text-lg">{stats.likes}</p><p className="text-xs opacity-60">Me gusta</p></div>
        </div>

        {isOwner ? (
          <button 
            onClick={() => setIsEditModalOpen(true)} 
            className={`flex items-center gap-2 px-12 py-2.5 rounded-full font-bold border transition-all duration-300 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg ${theme === 'dark' ? 'bg-[#2a2a2a] border-tiktok-dark-hover hover:bg-[#3a3a3a]' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
          >
            <Edit2 className="w-4 h-4" /> Editar perfil
          </button>
        ) : (
          <button className="bg-tiktok-red hover:bg-[#e0254b] text-white font-bold py-2.5 px-16 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 hover:shadow-tiktok-red/20">Seguir</button>
        )}

        <p className="mt-6 text-sm text-center max-w-sm opacity-80">{profile.bio || 'Sin biografía todavía.'}</p>
      </div>

      {/* Tabs */}
      <div className="flex w-full border-b border-tiktok-dark-hover/10">
        <button onClick={() => setActiveTab('videos')} className={`flex-1 py-3 font-semibold relative ${activeTab === 'videos' ? 'opacity-100' : 'opacity-40'}`}>
          Videos
          {activeTab === 'videos' && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-current rounded-full" />}
        </button>
        {isOwner && (
          <button onClick={() => setActiveTab('favorites')} className={`flex-1 py-3 font-semibold relative flex items-center justify-center gap-2 ${activeTab === 'favorites' ? 'opacity-100' : 'opacity-40'}`}>
            <Bookmark className="w-4 h-4" /> Favoritos
            {activeTab === 'favorites' && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-current rounded-full" />}
          </button>
        )}
      </div>

      {/* Grid - Mobile First 3 columns */}
      <div className="grid grid-cols-3 gap-0.5 flex-1 pb-20">
        {((activeTab === 'videos' ? profile?.videos : favorites) || [])?.length > 0 ? (
          ((activeTab === 'videos' ? profile?.videos : favorites) || []).filter(v => v && v.id).map(video => (
            <div 
              key={video.id} 
              className="aspect-[3/4] bg-tiktok-dark-hover/5 relative cursor-pointer group overflow-hidden" 
              onClick={() => router.push(`/video/${video.id}`)}
            >
               <video src={video.video_url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" muted />
               <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
               <div className="absolute bottom-2 left-2 flex items-center gap-1.5 text-white text-xs font-bold drop-shadow-md z-10">
                 <Play className="w-3 h-3 fill-current" />
                 {video.views || 0}
               </div>
               {isOwner && activeTab === 'videos' && (
                 <button 
                   onClick={(e) => handleDeleteVideo(video.id, e)} 
                   className="absolute top-2 right-2 p-1.5 bg-black/40 hover:bg-red-500 rounded-full text-white transition-all transform scale-0 group-hover:scale-100 z-20"
                 >
                   <X className="w-4 h-4" />
                 </button>
               )}
            </div>
          ))
        ) : (
          <div className="col-span-3 text-center py-20 opacity-40">No hay videos todavía</div>
        )}
      </div>

      {/* Modals */}
      {isEditModalOpen && <EditProfileModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} profile={profile} onUpdate={fetchProfile} />}
      
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl border text-center ${theme === 'dark' ? 'bg-[#121212] border-tiktok-dark-hover' : 'bg-white border-gray-100'}`}>
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">¿Borrar cuenta?</h3>
            <p className="text-sm opacity-60 mb-8">Esta acción es irreversible. Se borrarán todos tus videos y datos de perfil.</p>
            <div className="flex flex-col gap-3">
              <button onClick={handleDeleteAccount} className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors">Sí, borrar para siempre</button>
              <button onClick={() => setIsDeleteModalOpen(false)} className={`font-bold py-3 rounded-xl transition-colors ${theme === 'dark' ? 'bg-[#1e1e1e] hover:bg-tiktok-dark-hover' : 'bg-gray-100 hover:bg-gray-200'}`}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
