'use client';

import { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, Volume2, VolumeX, Music, Play } from 'lucide-react';

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
  const videoRef = useRef(null);
  const [liked, setLiked]     = useState(false);
  const [saved, setSaved]     = useState(false);
  const [playing, setPlaying] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [heartPos, setHeartPos]   = useState({ x: 0, y: 0 });
  const [progress, setProgress]   = useState(0);
  const [muted, setMuted] = useState(true);

  // Mapear campos desde data simulada o DB real
  const videoUrl = video.video_url || video.src;
  const username = video.profiles?.username || video.user?.name || 'usuario';
  const avatarUrl = video.profiles?.avatar_url || video.user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback';
  const description = video.description || video.desc || '';
  const song = video.song || 'Sonido original';
  const likesCount = video.likes || 0;
  const commentsCount = video.comments || 0;
  const sharesCount = video.shares || 0;
  const savesCount = video.saves || 0;

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
    
    // Doble click para like
    if (e.detail === 2) {
      const rect = e.currentTarget.getBoundingClientRect();
      setHeartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setShowHeart(true); 
      setLiked(true);
      setTimeout(() => setShowHeart(false), 900);
    }
  };

  const handleLike = (e) => {
    e.stopPropagation();
    setLiked(p => !p); 
    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 400);
  };

  return (
    <div className="relative w-full h-full md:h-[calc(100vh-2rem)] md:w-fit md:aspect-[9/16] md:rounded-2xl overflow-hidden bg-black flex items-center justify-center cursor-pointer group" onClick={handleClick}>
      
      <video
        ref={videoRef}
        src={videoUrl}
        poster={video.poster}
        loop 
        muted={muted} 
        playsInline 
        preload="metadata"
        onTimeUpdate={() => {
          const v = videoRef.current;
          if (v?.duration) setProgress((v.currentTime / v.duration) * 100);
        }}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Play/Pause Indicator Overlay */}
      <div className={`absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity duration-300 ${playing ? 'opacity-0' : 'opacity-100'}`}>
        <Play className="w-16 h-16 text-white/80 fill-current" />
      </div>

      {/* Double Click Heart Animation */}
      {showHeart && (
        <div 
          className="absolute text-red-500 text-6xl drop-shadow-2xl animate-ping" 
          style={{ left: heartPos.x - 30, top: heartPos.y - 30, pointerEvents: 'none' }}
        >
          <Heart className="w-20 h-20 fill-current" />
        </div>
      )}

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
        <div className="h-full bg-white/80 transition-all duration-75" style={{ width: `${progress}%` }} />
      </div>

      {/* Mute Button */}
      <button
        className="absolute top-4 right-4 p-2 rounded-full bg-black/40 backdrop-blur-sm text-white z-20 hover:bg-black/60 transition"
        onClick={e => { e.stopPropagation(); setMuted(m => !m); }}
      >
        {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>

      {/* Info Overlay (Bottom Left) */}
      <div className="absolute bottom-0 left-0 p-4 pb-6 w-3/4 flex flex-col gap-2 z-20 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-white drop-shadow-md hover:underline">@{username}</span>
          <span className="text-white text-xs">·</span>
          <button className="text-tiktok-cyan font-bold text-sm" onClick={e => e.stopPropagation()}>Seguir</button>
        </div>
        <p className="text-sm text-white drop-shadow-md line-clamp-3">{description}</p>
        <div className="flex items-center gap-2 text-white mt-1">
          <Music className="w-4 h-4 animate-spin-slow" />
          <span className="text-sm drop-shadow-md whitespace-nowrap overflow-hidden text-ellipsis w-48 marquee">{song}</span>
        </div>
      </div>

      {/* Action Buttons (Right Side) */}
      <div className="absolute bottom-6 right-4 flex flex-col gap-4 z-20" onClick={e => e.stopPropagation()}>
        <div className="relative mb-2">
          <img src={avatarUrl} alt={username} className="w-12 h-12 rounded-full border-2 border-white object-cover" />
          <button className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-tiktok-red text-white rounded-full w-5 h-5 flex items-center justify-center text-lg font-bold border border-white">
            +
          </button>
        </div>
        
        <ActionBtn
          icon={Heart}
          label={liked ? formatNum(likesCount + 1) : formatNum(likesCount)}
          active={liked} 
          filled={liked}
          onClick={handleLike} 
          pulse={likeAnim}
        />
        <ActionBtn icon={MessageCircle} filled={true} label={formatNum(commentsCount)} />
        <ActionBtn icon={Bookmark} filled={saved} active={saved} label={formatNum(savesCount)} onClick={e => { e.stopPropagation(); setSaved(s => !s); }} />
        <ActionBtn icon={Share2} filled={true} label={formatNum(sharesCount)} />
        
        <div className="w-12 h-12 mt-2 rounded-full bg-[#1e1e1e] border-8 border-[#2e2e2e] flex items-center justify-center animate-spin-slow overflow-hidden">
          <img src={avatarUrl} alt="Audio" className="w-full h-full object-cover" />
        </div>
      </div>

    </div>
  );
}
