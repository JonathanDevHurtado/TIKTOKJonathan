"use client"
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../utils/supabase';
import { useSession } from '../../SessionProvider';
import EditProfileModal from '../../../components/EditProfileModal';
import { useTheme } from '../../../context/ThemeContext';
import { Trash2, Heart, Bookmark, LogOut, Edit2, Menu, Sun, Moon, AlertTriangle, X, Play, MessageSquare, ShieldOff, Shield, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';

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
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedByThem, setBlockedByThem] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const fetchProfile = useCallback(async () => {
    let targetUsername = username;

    if (username === 'me') {
      if (!session) { router.push('/login'); return; }
      const { data: userProfile } = await supabase
        .from('profiles').select('username').eq('id', session.user.id).single();
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

      if (session?.user?.id && session.user.id !== data.id) {
        const [followRes, blockRes, blockedByRes] = await Promise.all([
          supabase.from('followers').select('*').eq('follower_id', session.user.id).eq('following_id', data.id).single(),
          supabase.from('blocks').select('*').eq('blocker_id', session.user.id).eq('blocked_id', data.id).single(),
          supabase.from('blocks').select('*').eq('blocker_id', data.id).eq('blocked_id', session.user.id).single()
        ]);
        setIsFollowing(!!followRes.data);
        setIsBlocked(!!blockRes.data);
        setBlockedByThem(!!blockedByRes.data);
      }

      if (session?.user?.id === data.id) {
        const { data: savedData } = await supabase.from('saves').select('*, videos(*, profiles(username, avatar_url))').eq('user_id', session.user.id);
        if (savedData) setFavorites(savedData.map(s => s.videos).filter(Boolean));
      }
    }
    setLoading(false);
  }, [username, session, router]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleDeleteVideo = async (videoId, e) => {
    e.stopPropagation();
    if (!confirm('¿Eliminar este video?')) return;
    const { error } = await supabase.from('videos').delete().eq('id', videoId);
    if (!error) fetchProfile();
  };

  const handleDeleteAccount = async () => {
    if (!profile) return;
    const { error } = await supabase.from('profiles').delete().eq('id', profile.id);
    if (!error) { await supabase.auth.signOut(); router.push('/'); }
    else alert("Error al borrar cuenta: " + error.message);
  };

  const handleFollow = async () => {
    if (!session) return router.push('/login');
    if (!profile) return;
    const newFollowState = !isFollowing;
    setIsFollowing(newFollowState);
    setStats(prev => ({ ...prev, followers: newFollowState ? prev.followers + 1 : prev.followers - 1 }));
    if (newFollowState) {
      const { error } = await supabase.from('followers').insert({ follower_id: session.user.id, following_id: profile.id });
      if (error && error.code !== '23505') { setIsFollowing(false); setStats(prev => ({ ...prev, followers: prev.followers - 1 })); }
      else { supabase.from('notifications').insert({ user_id: profile.id, actor_id: session.user.id, type: 'follow' }).then(); }
    } else {
      const { error } = await supabase.from('followers').delete().match({ follower_id: session.user.id, following_id: profile.id });
      if (error) { setIsFollowing(true); setStats(prev => ({ ...prev, followers: prev.followers + 1 })); }
    }
  };

  const handleBlock = async () => {
    if (!session || !profile) return;
    setIsOptionsOpen(false);
    const newBlockedState = !isBlocked;
    setIsBlocked(newBlockedState);
    if (newBlockedState) {
      await supabase.from('blocks').insert({ blocker_id: session.user.id, blocked_id: profile.id });
      if (isFollowing) {
        setIsFollowing(false);
        await supabase.from('followers').delete().match({ follower_id: session.user.id, following_id: profile.id });
      }
    } else {
      await supabase.from('blocks').delete().match({ blocker_id: session.user.id, blocked_id: profile.id });
    }
  };

  const isDark = theme === 'dark';

  if (loading) return (
    <div className={`flex-1 flex justify-center items-center h-full ${isDark ? 'bg-[#0a0a0a]' : 'bg-white'}`}>
      <div className="animate-spin w-8 h-8 border-4 border-tiktok-red border-t-transparent rounded-full" />
    </div>
  );

  if (!profile) return (
    <div className={`flex-1 flex flex-col justify-center items-center gap-3 ${isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}`}>
      <p className="text-lg font-bold opacity-50">Perfil no encontrado</p>
    </div>
  );

  const isOwner = session?.user?.id === profile.id;

  if (blockedByThem) return (
    <div className={`flex-1 flex flex-col justify-center items-center gap-4 text-center p-8 ${isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}`}>
      <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
        <Shield className="w-10 h-10 opacity-30" />
      </div>
      <p className="text-xl font-black opacity-60">Usuario no disponible</p>
      <p className="text-sm opacity-30 max-w-xs">No puedes ver este perfil.</p>
      <button onClick={() => router.back()} className="mt-2 px-6 py-2 bg-tiktok-red text-white rounded-full font-bold hover:scale-105 active:scale-95 transition-all">
        Volver
      </button>
    </div>
  );

  return (
    <div className={`w-full max-w-4xl mx-auto h-full flex flex-col transition-colors duration-300 ${isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}`}>

      <div className={`flex justify-end items-center p-4 sticky top-0 z-40 border-b transition-colors ${isDark ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-black/5'}`}>
        {isOwner ? (
          <div className="relative">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className={`p-2 rounded-full transition-all hover:scale-110 ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}>
              <Menu className="w-6 h-6" />
            </button>
            {isMenuOpen && (
              <div className={`absolute right-0 mt-2 w-56 rounded-2xl shadow-2xl border p-2 z-50 animate-in fade-in zoom-in-95 duration-200 ${isDark ? 'bg-[#111] border-white/10' : 'bg-white border-black/10'}`}>
                <button onClick={toggleTheme} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.02] active:scale-95 group ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}>
                  {isDark ? <Sun className="w-5 h-5 text-yellow-400 group-hover:rotate-12 transition-transform" /> : <Moon className="w-5 h-5 text-indigo-600 group-hover:-rotate-12 transition-transform" />}
                  <span className="font-medium">Modo {isDark ? 'Claro' : 'Oscuro'}</span>
                </button>
                <button onClick={() => { supabase.auth.signOut(); router.push('/'); }} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.02] active:scale-95 text-tiktok-red group ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}>
                  <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  <span className="font-medium">Cerrar sesión</span>
                </button>
                <div className={`h-px my-2 mx-2 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
                <button onClick={() => { setIsDeleteModalOpen(true); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.02] active:scale-95 text-red-500 hover:bg-red-500/10 group">
                  <Trash2 className="w-5 h-5" />
                  <span className="font-medium">Borrar cuenta</span>
                </button>
              </div>
            )}
          </div>
        ) : session && (
          <div className="flex items-center gap-2">
            <Link
              href={`/chat/${profile.id}`}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all hover:scale-105 active:scale-95 border ${isDark ? 'border-white/10 hover:bg-white/10' : 'border-black/10 hover:bg-black/5'}`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Mensaje</span>
            </Link>
            <div className="relative">
              <button onClick={() => setIsOptionsOpen(!isOptionsOpen)} className={`p-2 rounded-full transition-all hover:scale-110 ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}>
                <MoreHorizontal className="w-5 h-5" />
              </button>
              {isOptionsOpen && (
                <div className={`absolute right-0 mt-2 w-44 rounded-2xl shadow-2xl border p-2 z-50 animate-in fade-in zoom-in-95 duration-200 ${isDark ? 'bg-[#111] border-white/10' : 'bg-white border-black/10'}`}>
                  <button
                    onClick={handleBlock}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.02] active:scale-95 group ${isBlocked ? 'text-tiktok-red hover:bg-red-500/10' : isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
                  >
                    {isBlocked ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                    <span className="font-medium text-sm">{isBlocked ? 'Desbloquear' : 'Bloquear'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center p-4 md:p-8 animate-in fade-in duration-500">
        <div className="relative mb-4 group cursor-pointer" onClick={() => setIsLightboxOpen(true)}>
          <img
            src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username || 'user'}`}
            alt={profile?.username || 'avatar'}
            className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-tiktok-dark-hover object-cover shadow-xl transition-all duration-500 group-hover:scale-105 group-hover:rotate-3"
          />
          {isOwner && (
            <button onClick={(e) => { e.stopPropagation(); setIsEditModalOpen(true); }} className={`absolute bottom-0 right-0 p-2 rounded-full shadow-lg hover:scale-110 active:scale-90 transition-all border ${isDark ? 'bg-[#1e1e1e] border-white/10 text-white' : 'bg-white border-gray-100 text-black'}`}>
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <h2 className="text-xl font-bold mb-1">@{profile?.username || 'cargando...'}</h2>
        {profile?.full_name && <h3 className="text-sm font-semibold opacity-70 mb-4">{profile.full_name}</h3>}

        <div className="flex gap-8 mb-6 text-center">
          <Link href={`/profile/${profile.username}/following`} className={`group cursor-pointer transition-all hover:scale-110`}>
            <p className="font-bold text-lg group-hover:text-tiktok-red transition-colors">{stats.following}</p>
            <p className={`text-xs ${isDark ? 'opacity-60' : 'opacity-50'}`}>Siguiendo</p>
          </Link>
          <Link href={`/profile/${profile.username}/followers`} className={`group cursor-pointer transition-all hover:scale-110`}>
            <p className="font-bold text-lg group-hover:text-tiktok-red transition-colors">{stats.followers}</p>
            <p className={`text-xs ${isDark ? 'opacity-60' : 'opacity-50'}`}>Seguidores</p>
          </Link>
          <div>
            <p className="font-bold text-lg">{stats.likes}</p>
            <p className={`text-xs ${isDark ? 'opacity-60' : 'opacity-50'}`}>Me gusta</p>
          </div>
        </div>

        {isOwner ? (
          <button
            onClick={() => setIsEditModalOpen(true)}
            className={`flex items-center gap-2 px-12 py-2.5 rounded-full font-bold border transition-all duration-300 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
          >
            <Edit2 className="w-4 h-4" /> Editar perfil
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={handleFollow}
              disabled={isBlocked}
              className={`font-bold py-2.5 px-12 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${isFollowing ? `${isDark ? 'bg-white/10 border border-white/20 text-white' : 'bg-black/5 border border-black/10 text-black'}` : 'bg-tiktok-red text-white hover:bg-[#e0254b] hover:shadow-tiktok-red/30'}`}
            >
              {isFollowing ? 'Siguiendo' : 'Seguir'}
            </button>
          </div>
        )}

        {isBlocked && (
          <div className="mt-4 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" />
            Has bloqueado a este usuario
          </div>
        )}

        <p className={`mt-4 text-sm text-center max-w-sm ${isDark ? 'opacity-70' : 'opacity-60'}`}>{profile.bio || 'Sin biografía todavía.'}</p>
      </div>

      <div className={`flex w-full border-b sticky top-[65px] z-20 transition-colors ${isDark ? 'border-white/5 bg-[#0a0a0a]' : 'border-black/5 bg-white'}`}>
        <button
          onClick={() => setActiveTab('videos')}
          className={`flex-1 py-4 font-bold transition-all duration-300 relative group ${activeTab === 'videos' ? 'text-tiktok-red' : isDark ? 'opacity-40 hover:opacity-100' : 'opacity-30 hover:opacity-70'}`}
        >
          <span className="group-hover:scale-110 inline-block transition-transform">Videos</span>
          {activeTab === 'videos' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-tiktok-red animate-in fade-in slide-in-from-left duration-300" />}
        </button>
        {isOwner && (
          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex-1 py-4 font-bold transition-all duration-300 relative flex items-center justify-center gap-2 group ${activeTab === 'favorites' ? 'text-tiktok-red' : isDark ? 'opacity-40 hover:opacity-100' : 'opacity-30 hover:opacity-70'}`}
          >
            <div className="flex items-center gap-2 group-hover:scale-110 transition-transform">
              <Bookmark className="w-4 h-4" />
              <span>Favoritos</span>
            </div>
            {activeTab === 'favorites' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-tiktok-red animate-in fade-in slide-in-from-right duration-300" />}
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-0.5 flex-1 pb-20">
        {isBlocked ? (
          <div className="col-span-3 flex flex-col items-center justify-center py-20 gap-3 opacity-40 text-center">
            <Shield className="w-10 h-10" />
            <p className="text-sm font-medium">Contenido oculto</p>
          </div>
        ) : ((activeTab === 'videos' ? profile?.videos : favorites) || []).length > 0 ? (
          ((activeTab === 'videos' ? profile?.videos : favorites) || []).filter(v => v && v.id).map(video => (
            <div
              key={video.id}
              className="aspect-[3/4] relative cursor-pointer group overflow-hidden rounded-sm hover:z-10 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
              onClick={() => router.push(`/video/${video.id}`)}
            >
              <video src={video.video_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" muted />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                <Play className="w-8 h-8 text-white scale-0 group-hover:scale-100 transition-transform duration-300 drop-shadow-2xl fill-current" />
              </div>
              {isOwner && activeTab === 'videos' && (
                <button
                  onClick={(e) => handleDeleteVideo(video.id, e)}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500 rounded-full text-white transition-all scale-100 md:scale-0 md:group-hover:scale-100 z-20 md:hover:rotate-90"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        ) : (
          <div className={`col-span-3 text-center py-20 ${isDark ? 'opacity-30' : 'opacity-40'}`}>No hay videos todavía</div>
        )}
      </div>

      {isEditModalOpen && <EditProfileModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} profile={profile} onUpdate={fetchProfile} />}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl border text-center ${isDark ? 'bg-[#111] border-white/10' : 'bg-white border-gray-100'}`}>
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">¿Borrar cuenta?</h3>
            <p className={`text-sm mb-8 ${isDark ? 'opacity-50' : 'opacity-40'}`}>Esta acción es irreversible.</p>
            <div className="flex flex-col gap-3">
              <button onClick={handleDeleteAccount} className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors">Sí, borrar para siempre</button>
              <button onClick={() => setIsDeleteModalOpen(false)} className={`font-bold py-3 rounded-xl transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'}`}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {isLightboxOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsLightboxOpen(false)}>
          <button className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110">
            <X className="w-8 h-8" />
          </button>
          <img
            src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username || 'user'}`}
            alt={profile?.username || 'avatar'}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-full shadow-2xl animate-in zoom-in-95 duration-500"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
