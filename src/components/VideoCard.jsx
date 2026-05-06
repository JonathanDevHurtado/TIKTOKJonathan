import { useState, useEffect, useRef } from 'react';
import { HeartIcon, CommentIcon, ShareIcon, SaveIcon, MuteIcon, UnmuteIcon, MusicIcon, PauseIcon } from './Icons';


function parseNum(s) {
  if (!s) return 0;
  const n = parseFloat(s);
  if (s.includes('K')) return Math.round(n * 1000);
  if (s.includes('M')) return Math.round(n * 1_000_000);
  return n;
}
function formatNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}


function ActionBtn({ icon, label, active, onClick, pulse }) {
  return (
    <button
      className={`action-btn ${active ? 'active' : ''} ${pulse ? 'pulse' : ''}`}
      onClick={onClick}
    >
      <span className="action-icon">{icon}</span>
      <span className="action-label">{label}</span>
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
      setShowHeart(true); setLiked(true);
      setTimeout(() => setShowHeart(false), 900);
    }
  };

  const handleLike = (e) => {
    e.stopPropagation();
    setLiked(p => !p); setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 400);
  };

  return (
    <div className="video-card" onClick={handleClick}>
      <video
        ref={videoRef}
        src={video.src}
        poster={video.poster}
        loop muted={muted} playsInline preload="metadata"
        onTimeUpdate={() => {
          const v = videoRef.current;
          if (v?.duration) setProgress((v.currentTime / v.duration) * 100);
        }}
        className="video-el"
      />


      <div className={`play-indicator ${playing ? '' : 'visible'}`}>
        <PauseIcon />
      </div>


      {showHeart && (
        <div className="dbl-heart" style={{ left: heartPos.x, top: heartPos.y }}>❤️</div>
      )}


      <div className="video-progress">
        <div className="video-progress-fill" style={{ width: `${progress}%` }} />
      </div>


      <button
        className="mute-btn"
        onClick={e => { e.stopPropagation(); setMuted(m => !m); }}
      >
        {muted ? <MuteIcon /> : <UnmuteIcon />}
      </button>


      <div className="video-overlay">
        <div className="video-user">
          <img src={video.user.avatar} alt={video.user.name} className="user-avatar" />
          <div className="user-info">
            <span className="user-name">@{video.user.name}</span>
            <span className="user-followers">{video.user.followers}</span>
          </div>
          <button className="follow-btn" onClick={e => e.stopPropagation()}>Seguir</button>
        </div>
        <p className="video-desc">{video.desc}</p>
        <div className="video-song">
          <MusicIcon />
          <span>{video.song}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {video.tags.map(t => (
            <span key={t} className="tag">{t}</span>
          ))}
        </div>
      </div>


      <div className="action-btns" onClick={e => e.stopPropagation()}>
        <ActionBtn
          icon={<HeartIcon filled={liked} />}
          label={liked ? formatNum(parseNum(video.likes) + 1) : video.likes}
          active={liked} onClick={handleLike} pulse={likeAnim}
        />
        <ActionBtn icon={<CommentIcon />} label={video.comments} />
        <ActionBtn icon={<ShareIcon />}   label={video.shares} />
        <ActionBtn
          icon={<SaveIcon filled={saved} />}
          label={video.saves} active={saved}
          onClick={e => { e.stopPropagation(); setSaved(s => !s); }}
        />
      </div>
    </div>
  );
}
