"use client"
import { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, Volume2, VolumeX, Music, Play, X, Send, PictureInPicture, Plus, Eye } from 'lucide-react';
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

function ActionBtn({ icon: Icon, label, active, onClick, pulse, filled, hideLabel }) {
  return (
    <button
      className="flex flex-col items-center gap-1 group"
      onClick={onClick}
    >
      <div className={`p-3 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] backdrop-blur-sm transition-all duration-300 ${pulse ? 'scale-125' : ''} ${active ? 'text-tiktok-red shadow-[0_0_15px_rgba(254,44,85,0.3)]' : 'text-[var(--text-primary)]'} group-hover:scale-110 group-active:scale-90 shadow-lg group-hover:shadow-xl`}>
        <Icon className={`w-7 h-7 ${filled ? 'fill-current' : ''} transition-all duration-300 ${active ? 'scale-110' : ''}`} strokeWidth={2.5} />
      </div>
      {!hideLabel && label && <span className="text-[var(--text-primary)] text-xs font-bold drop-shadow-md transition-colors group-hover:text-white">{label}</span>}
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

  const [likesCount, setLikesCount] = useState(video.likes || 0);
  const [commentsCount, setCommentsCount] = useState(video.comments || 0);
  const [savesCount, setSavesCount] = useState(video.saves || 0);
  const [sharesCount, setSharesCount] = useState(video.shares || 0);
  const [viewsCount, setViewsCount] = useState(video.views || 0);
  const viewTracked = useRef(false); // prevents double-counting per mount
  
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  const videoUrl = video.video_url || video.src;
  const username = video.profiles?.username || video.user?.name || 'usuario';
  const avatarUrl = video.profiles?.avatar_url || video.user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback';
  const description = video.description || video.desc || '';
  const song = video.song || 'Sonido original';

  useEffect(() => {
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
    if (isActive) {
      v.play().catch(() => {});
      setPlaying(true);

      // Track view after 3 seconds of watching (once per component mount)
      if (!viewTracked.current && video.id) {
        const timer = setTimeout(async () => {
          viewTracked.current = true;
          // Try RPC first, then fall back to direct column increment
          const { error: rpcError } = await supabase.rpc('increment_view', { vid_id: video.id });
          if (rpcError) {
            // Fallback: read current views and increment
            const { data: current } = await supabase
              .from('videos')
              .select('views')
              .eq('id', video.id)
              .single();
            if (current !== null) {
              const newViews = (current?.views || 0) + 1;
              await supabase
                .from('videos')
                .update({ views: newViews })
                .eq('id', video.id);
              setViewsCount(newViews);
            }
          } else {
            setViewsCount(prev => prev + 1);
          }
        }, 3000);
        return () => clearTimeout(timer);
      }
    } else {
      v.pause();
      v.currentTime = 0;
      setPlaying(false);
    }
  }, [isActive, video.id]);

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
      await supabase.from('likes').delete().match({ video_id: video.id, user_id: session.user.id });
    }
  };

  const handleFollow = async (e) => {
    e?.stopPropagation();
    if (!session) return alert("Debes iniciar sesión para seguir a este usuario");
    if (session.user.id === video.user_id) return alert("No puedes seguirte a ti mismo");

    const newFollowState = !isFollowing;
    setIsFollowing(newFollowState);

    if (newFollowState) {
      const { error } = await supabase.from('followers').insert({ 
        follower_id: session.user.id, 
        following_id: video.user_id 
      });
      if (error && error.code !== '23505') {
        console.error("Error following:", error);
        setIsFollowing(false);
      }
    } else {
      const { error } = await supabase.from('followers').delete().match({ 
        follower_id: session.user.id, 
        following_id: video.user_id 
      });
      if (error) {
        console.error("Error unfollowing:", error);
        setIsFollowing(true);
      }
    }
  };

  const postComment = async (e) => {
    e.preventDefault();
    if (!session || !newComment.trim()) return;
    const { data, error } = await supabase.from('comments').insert({ video_id: video.id, user_id: session.user.id, content: newComment.trim() }).select('*, profiles(username, avatar_url)').single();
    if (!error && data) {
      setComments(prev => [data, ...prev]);
      setNewComment('');
      setCommentsCount(prev => prev + 1);
    }
  };

  const handleSave = async (e) => {
    e.stopPropagation();
    if (!session) return alert("Debes iniciar sesión para guardar videos");

    const newSavedState = !saved;
    setSaved(newSavedState);

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

  const togglePiP = async (e) => {
    e.stopPropagation();
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (videoRef.current) await videoRef.current.requestPictureInPicture();
    } catch (err) { console.error(err); }
  };

  const CommentsContent = () => (
    <>
      <div className="flex justify-between items-center p-4 border-b border-[var(--border-primary)]">
        <span className="font-bold">{commentsCount} comentarios</span>
        <button onClick={() => setShowComments(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
        {comments.length === 0 ? (
          <p className="text-[var(--text-secondary)] text-center my-auto">Sé el primero en comentar.</p>
        ) : (
          comments.map(c => (
            <div key={c.id} className="flex gap-3 animate-in fade-in duration-300">
              <img 
                src={c.profiles?.avatar_url || avatarUrl} 
                className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] object-cover" 
                alt="avatar"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold text-[var(--text-secondary)]">@{c.profiles?.username || 'usuario'}</p>
                <p className="text-sm break-words">{c.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={postComment} className="p-4 border-t border-[var(--border-primary)] flex gap-2 bg-[var(--bg-primary)]">
        <input 
          type="text" 
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="Añadir comentario..." 
          className="flex-1 bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-primary)] rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-tiktok-red transition-all"
        />
        <button type="submit" disabled={!newComment.trim()} className="text-tiktok-red disabled:opacity-50 p-2 hover:scale-110 transition-transform">
          <Send className="w-5 h-5" />
        </button>
      </form>
    </>
  );

  return (
    <div 
      className={`relative flex flex-col md:flex-row h-full w-full bg-[var(--bg-primary)] overflow-hidden transition-all duration-500 ease-in-out
        ${showComments ? 'md:max-w-[1000px] md:h-[calc(100vh-4rem)] md:rounded-2xl shadow-2xl' : 'md:w-fit md:aspect-[9/16] md:h-[calc(100vh-2rem)] md:rounded-2xl'}`}
      onClick={handleClick}
    >
      <div className="flex-1 relative flex items-center justify-center bg-[var(--bg-primary)] h-full overflow-hidden">
        <video
          ref={videoRef}
          src={videoUrl}
          loop 
          muted={muted} 
          playsInline
          className="w-full h-full object-contain"
          onTimeUpdate={() => {
            if (videoRef.current?.duration) setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
          }}
        />

        <div className={`absolute inset-0 flex items-center justify-center bg-black/10 transition-opacity duration-300 ${playing ? 'opacity-0' : 'opacity-100'}`}>
          <Play className="w-16 h-16 text-white opacity-80 fill-current" />
        </div>

        {showHeart && (
          <div className="absolute text-red-500 animate-ping" style={{ left: heartPos.x - 30, top: heartPos.y - 30, pointerEvents: 'none' }}>
            <Heart className="w-20 h-20 fill-current" />
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--border-primary)] z-20">
          <div className="h-full bg-tiktok-red" style={{ width: `${progress}%` }} />
        </div>

        <div className="absolute top-4 left-4 z-20">
          <button onClick={togglePiP} className="p-2 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] hover:scale-110 transition shadow-lg">
            <PictureInPicture className="w-5 h-5" />
          </button>
        </div>

        <div 
          className="absolute top-4 right-4 flex items-center gap-2 z-20 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-full p-2 hover:w-32 transition-all duration-300 w-10 overflow-hidden group/vol shadow-lg"
          onClick={e => e.stopPropagation()}
        >
          <button className="text-[var(--text-primary)] flex-shrink-0" onClick={() => { setMuted(!muted); if (videoRef.current) videoRef.current.muted = !muted; }}>
            {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <input 
            type="range" min="0" max="1" step="0.01" 
            value={muted ? 0 : volume}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setVolume(val);
              setMuted(val === 0);
              if (videoRef.current) { videoRef.current.volume = val; videoRef.current.muted = val === 0; }
            }}
            className="w-20 accent-tiktok-red"
          />
        </div>

        <div className="absolute right-2 bottom-20 flex flex-col items-center gap-6 z-10 pointer-events-auto" onClick={e => e.stopPropagation()}>
          <div className="relative mb-2">
            <Link href={`/profile/${username}`} onClick={e => e.stopPropagation()}>
              <img src={avatarUrl} className="w-12 h-12 rounded-full border-2 border-white object-cover shadow-xl hover:scale-110 transition-transform" alt="avatar" />
            </Link>
            {!isFollowing && session?.user?.id !== video.user_id && (
              <button 
                onClick={handleFollow}
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-tiktok-red text-white rounded-full p-0.5 shadow-lg hover:scale-125 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
          <ActionBtn icon={Heart} label={formatNum(likesCount)} active={liked} onClick={handleLike} pulse={likeAnim} filled={liked} />
          <ActionBtn icon={MessageCircle} label={formatNum(commentsCount)} onClick={(e) => { e.stopPropagation(); setShowComments(!showComments); }} />
          <ActionBtn icon={Bookmark} label={null} active={saved} onClick={handleSave} filled={saved} hideLabel={true} />
          <ActionBtn icon={Share2} label={formatNum(sharesCount)} onClick={handleShare} />
        </div>

        <div className="absolute left-4 bottom-8 right-16 z-10 pointer-events-none">
          <Link href={`/profile/${username}`} onClick={e => e.stopPropagation()} className="inline-block pointer-events-auto">
            <h3 className="font-bold text-lg text-white drop-shadow-lg mb-2 hover:underline transition-all">@{username}</h3>
          </Link>
          <p className="text-white text-sm mb-3 drop-shadow-lg line-clamp-2 max-w-xs">{description}</p>
          <div className="flex items-center gap-2 group pointer-events-auto cursor-pointer w-fit" onClick={e => e.stopPropagation()}>
            <Music className="w-4 h-4 text-white animate-spin-slow" />
            <span className="text-white text-sm truncate max-w-[150px] drop-shadow-lg">{song}</span>
          </div>
        </div>
      </div>

      {showComments && (
        <div className="hidden md:flex w-[350px] flex-col bg-[var(--bg-secondary)] border-l border-[var(--border-primary)] animate-slide-in-right z-10" onClick={e => e.stopPropagation()}>
          <CommentsContent />
        </div>
      )}

      {showComments && (
        <div className="md:hidden fixed inset-0 z-[100] flex flex-col justify-end" onClick={e => e.stopPropagation()}>
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowComments(false)}></div>
          <div className="relative bg-[var(--bg-secondary)] w-full h-[75%] rounded-t-2xl flex flex-col animate-slide-up shadow-2xl z-10">
            <CommentsContent />
          </div>
        </div>
      )}
    </div>
  );
}
