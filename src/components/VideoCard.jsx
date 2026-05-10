"use client"
import { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, Volume2, VolumeX, Music, Play, X, Send, PictureInPicture } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '../utils/supabase';
import { useSession } from '../app/SessionProvider';

function formatNum(n) {
  if (!n) return '0';
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function ActionBtn({ icon: Icon, label, active, onClick, pulse, filled }) {
  return (
    <button
      className="flex flex-col items-center gap-1 group"
      onClick={onClick}
    >
      <div className={`p-3 rounded-full bg-black/40 backdrop-blur-sm transition-transform ${pulse ? 'scale-125' : ''} ${active ? 'text-tiktok-red' : 'text-white'}`}>
        <Icon className={`w-7 h-7 ${filled ? 'fill-current' : ''}`} strokeWidth={2} />
      </div>
      <span className="text-white text-xs font-semibold drop-shadow-md">{label}</span>
    </button>
  );
}

export default function VideoCard({ video, isActive }) {
  const session = useSession();
  const videoRef = useRef(null);
  const [liked, setLiked]     = useState(false);
  const [saved, setSaved]     = useState(false);
  const [playing, setPlaying] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [heartPos, setHeartPos]   = useState({ x: 0, y: 0 });
  const [progress, setProgress]   = useState(0);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(1);
  const [isFollowing, setIsFollowing] = useState(false);

  const togglePiP = async (e) => {
    e.stopPropagation();
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled && videoRef.current) {
        await videoRef.current.requestPictureInPicture();
      } else if (videoRef.current && videoRef.current.webkitSetPresentationMode) {
        videoRef.current.webkitSetPresentationMode(
          videoRef.current.webkitPresentationMode === 'picture-in-picture' ? 'inline' : 'picture-in-picture'
        );
      } else {
        alert("Tu navegador no soporta Picture-in-Picture.");
      }
    } catch (err) {
      alert("Error al abrir Picture-in-Picture: " + err.message);
    }
  };

  // Estados de DB
  const [likesCount, setLikesCount] = useState(video.likes || 0);
  const [commentsCount, setCommentsCount] = useState(video.comments || 0);
  const [savesCount, setSavesCount] = useState(video.saves || 0);
  const [sharesCount, setSharesCount] = useState(video.shares || 0);
  
  // Modal de comentarios
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  const videoUrl = video.video_url || video.src;
  const username = video.profiles?.username || video.user?.name || 'usuario';
  const avatarUrl = video.profiles?.avatar_url || video.user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback';
  const description = video.description || video.desc || '';
  const song = video.song || 'Sonido original';

  useEffect(() => {
    // Cargar likes reales
    const fetchStats = async () => {
      if (!video.id) return;
      
      const { count: lCount } = await supabase.from('likes').select('*', { count: 'exact', head: true }).eq('video_id', video.id);
      if (lCount !== null) setLikesCount(lCount);

      const { count: cCount } = await supabase.from('comments').select('*', { count: 'exact', head: true }).eq('video_id', video.id);
      if (cCount !== null) setCommentsCount(cCount);

      if (session?.user) {
        const { data } = await supabase.from('likes').select('id').eq('video_id', video.id).eq('user_id', session.user.id).single();
        if (data) setLiked(true);

        const { data: saveData } = await supabase.from('saves').select('id').eq('video_id', video.id).eq('user_id', session.user.id).single();
        if (saveData) setSaved(true);

        if (video.user_id) {
          const { data: followData } = await supabase.from('followers').select('follower_id').eq('follower_id', session.user.id).eq('following_id', video.user_id).single();
          if (followData) setIsFollowing(true);
        }
      }
    };
    fetchStats();
  }, [video.id, session]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive) { v.play().catch(() => {}); setPlaying(true); }
    else          { v.pause(); v.currentTime = 0; setPlaying(false); }
  }, [isActive]);

  const handleClick = (e) => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else          { v.pause(); setPlaying(false); }
    
    if (e.detail === 2) {
      const rect = e.currentTarget.getBoundingClientRect();
      setHeartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setShowHeart(true); 
      setTimeout(() => setShowHeart(false), 900);
      
      if (!liked && session) {
        setLiked(true);
        setLikesCount(prev => prev + 1);
        supabase.from('likes').insert({ video_id: video.id, user_id: session.user.id })
          .then(({ error }) => {
            if (error && error.code !== '23505') alert("Error al guardar el like: " + error.message);
          });
      }
    }
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!session) return alert("Debes iniciar sesión para dar me gusta");

    const newLikedState = !liked;
    setLiked(newLikedState);
    setLikesCount(prev => newLikedState ? prev + 1 : prev - 1);
    
    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 400);

    if (newLikedState) {
      const { error } = await supabase.from('likes').insert({ video_id: video.id, user_id: session.user.id });
      if (error && error.code !== '23505') alert("Error al guardar el like: " + error.message);
    } else {
      const { error } = await supabase.from('likes').delete().match({ video_id: video.id, user_id: session.user.id });
      if (error) alert("Error al quitar el like: " + error.message);
    }
  };

  const handleFollow = async (e) => {
    e.stopPropagation();
    if (!session) return alert("Debes iniciar sesión para seguir a un usuario");
    if (!video.user_id) return alert("Error: No se puede identificar al autor del video.");

    if (isFollowing) {
      setIsFollowing(false);
      const { error } = await supabase.from('followers').delete().match({ follower_id: session.user.id, following_id: video.user_id });
      if (error) alert("Error al dejar de seguir: " + error.message);
    } else {
      setIsFollowing(true);
      const { error } = await supabase.from('followers').insert({ follower_id: session.user.id, following_id: video.user_id });
      if (error) alert("Error al seguir: " + error.message);
    }
  };

  const openComments = async (e) => {
    e.stopPropagation();
    setShowComments(true);
    const { data, error } = await supabase.from('comments').select('*, profiles(username, avatar_url)').eq('video_id', video.id).order('created_at', { ascending: true });
    if (error) alert("Error cargando comentarios: " + error.message);
    if (data) setComments(data);
  };

  const postComment = async (e) => {
    e.preventDefault();
    if (!session) return alert("Debes iniciar sesión para comentar");
    if (!newComment.trim()) return;

    const { data, error } = await supabase.from('comments').insert({
      video_id: video.id,
      user_id: session.user.id,
      content: newComment.trim()
    }).select('*, profiles(username, avatar_url)').single();

    if (error) {
      alert("Error al publicar comentario: " + error.message);
      return;
    }

    if (data) {
      setComments([...comments, data]);
      setNewComment('');
      setCommentsCount(prev => prev + 1);
    }
  };

  const handleSave = async (e) => {
    e.stopPropagation();
    if (!session) return alert("Debes iniciar sesión para guardar videos");

    const newSavedState = !saved;
    setSaved(newSavedState);
    setSavesCount(prev => newSavedState ? prev + 1 : prev - 1);

    if (newSavedState) {
      const { error } = await supabase.from('saves').insert({ video_id: video.id, user_id: session.user.id });
      if (error && error.code !== '23505') console.error("Error saving:", error);
    } else {
      await supabase.from('saves').delete().match({ video_id: video.id, user_id: session.user.id });
    }
  };

  const handleShare = async (e) => {
    e.stopPropagation();
    const link = `${window.location.origin}/video/${video.id}`;
    navigator.clipboard.writeText(link);
    alert("¡Enlace copiado al portapapeles!");
    setSharesCount(prev => prev + 1);
    await supabase.rpc('increment_share', { vid_id: video.id });
  };

  return (
    <div className="relative w-full h-full md:h-[calc(100vh-2rem)] md:w-fit md:aspect-[9/16] md:rounded-2xl overflow-hidden bg-black flex items-center justify-center cursor-pointer group" onClick={handleClick}>
      
      <video
        ref={videoRef}
        src={videoUrl}
        loop 
        muted={muted} 
        playsInline
        disablePictureInPicture
        preload="metadata"
        onTimeUpdate={() => {
          const v = videoRef.current;
          if (v?.duration) setProgress((v.currentTime / v.duration) * 100);
        }}
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className={`absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity duration-300 ${playing ? 'opacity-0' : 'opacity-100'}`}>
        <Play className="w-16 h-16 text-white/80 fill-current" />
      </div>

      {showHeart && (
        <div 
          className="absolute text-red-500 text-6xl drop-shadow-2xl animate-ping" 
          style={{ left: heartPos.x - 30, top: heartPos.y - 30, pointerEvents: 'none' }}
        >
          <Heart className="w-20 h-20 fill-current" />
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
        <div className="h-full bg-white/80 transition-all duration-75" style={{ width: `${progress}%` }} />
      </div>

      {/* Picture in Picture (Top Left) */}
      <button
        className="absolute top-4 left-4 p-2 rounded-full bg-black/40 backdrop-blur-sm text-white z-20 hover:bg-black/60 transition"
        onClick={togglePiP}
      >
        <PictureInPicture className="w-5 h-5" />
      </button>

      {/* Control de Volumen con Scroll (Top Right) */}
      <div 
        className="absolute top-4 right-4 flex items-center gap-2 z-20 bg-black/40 backdrop-blur-sm rounded-full p-2 hover:bg-black/60 transition-all duration-300 w-10 hover:w-32 overflow-hidden group"
        onClick={e => e.stopPropagation()}
      >
        <button
          className="text-white flex-shrink-0"
          onClick={() => {
            setMuted(!muted);
            if (videoRef.current) videoRef.current.muted = !muted;
          }}
        >
          {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
        
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.01" 
          value={muted ? 0 : volume}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            setVolume(val);
            setMuted(val === 0);
            if (videoRef.current) {
              videoRef.current.volume = val;
              videoRef.current.muted = val === 0;
            }
          }}
          className="w-16 h-1 bg-white/30 rounded-full appearance-none cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
        />
      </div>

      <div className="absolute bottom-0 left-0 p-4 pb-28 md:pb-6 w-3/4 flex flex-col gap-2 z-20 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
        <div className="flex items-center gap-2 mb-1 pointer-events-auto" onClick={e => e.stopPropagation()}>
          <Link href={`/profile/${username}`} className="font-bold text-white drop-shadow-md hover:underline">@{username}</Link>
          {session?.user?.id !== video.user_id && (
            <>
              <span className="text-white text-xs">·</span>
              <button onClick={handleFollow} className={`font-bold text-sm ${isFollowing ? 'text-white' : 'text-tiktok-cyan'}`}>
                {isFollowing ? 'Siguiendo' : 'Seguir'}
              </button>
            </>
          )}
        </div>
        <p className="text-sm text-white drop-shadow-md line-clamp-3 pointer-events-auto">{description}</p>
      </div>

      <div className="absolute bottom-6 right-4 flex flex-col gap-4 z-20 pointer-events-auto" onClick={e => e.stopPropagation()}>
        <div className="relative mb-2">
          <Link href={`/profile/${username}`}>
            <img src={avatarUrl} alt={username} className="w-12 h-12 rounded-full border-2 border-white object-cover" />
          </Link>
          {!isFollowing && session?.user?.id !== video.user_id && (
            <button 
              onClick={handleFollow}
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-tiktok-red text-white rounded-full w-5 h-5 flex items-center justify-center text-lg font-bold border border-white"
            >
              +
            </button>
          )}
        </div>
        
        <ActionBtn
          icon={Heart}
          label={formatNum(likesCount)}
          active={liked} 
          filled={liked}
          onClick={handleLike} 
          pulse={likeAnim}
        />
        <ActionBtn icon={MessageCircle} filled={true} label={formatNum(commentsCount)} onClick={openComments} />
        <ActionBtn icon={Bookmark} filled={saved} active={saved} label={formatNum(savesCount)} onClick={handleSave} />
        <ActionBtn icon={Share2} filled={true} label={formatNum(sharesCount)} onClick={handleShare} />
      </div>

      {/* Modal de Comentarios superpuesto */}
      {showComments && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:flex-row md:justify-end" onClick={e => e.stopPropagation()}>
          {/* Fondo oscuro en móvil, invisible en PC para no tapar el video central */}
          <div className="absolute inset-0 bg-black/60 md:bg-transparent" onClick={() => setShowComments(false)}></div>
          
          <div className="relative bg-[#121212] w-full h-[70%] md:h-screen md:w-[400px] rounded-t-2xl md:rounded-none md:border-l md:border-tiktok-dark-hover flex flex-col animate-slide-up shadow-2xl z-10">
            
            <div className="flex justify-between items-center p-4 border-b border-tiktok-dark-hover">
              <span className="font-bold text-white">{commentsCount} comentarios</span>
              <button onClick={() => setShowComments(false)} className="text-tiktok-gray hover:text-white"><X /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
              {comments.length === 0 ? (
                <p className="text-tiktok-gray text-center my-auto">Sé el primero en comentar.</p>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="flex gap-3">
                    <img src={c.profiles?.avatar_url || avatarUrl} className="w-8 h-8 rounded-full bg-tiktok-dark-hover" />
                    <div>
                      <p className="text-sm font-semibold text-tiktok-gray">{c.profiles?.username || 'usuario'}</p>
                      <p className="text-white text-sm">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={postComment} className="p-4 border-t border-tiktok-dark-hover flex gap-2">
              <input 
                type="text" 
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Añadir comentario..." 
                className="flex-1 bg-[#1e1e1e] text-white rounded-full px-4 py-2 text-sm focus:outline-none focus:border-tiktok-gray border border-transparent transition-colors"
              />
              <button type="submit" disabled={!newComment.trim()} className="text-tiktok-red disabled:opacity-50 p-2">
                <Send className="w-5 h-5" />
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
