import { useState } from 'react';
import { PlayIcon, LikesIcon } from '../components/Icons';
import { PROFILE_VIDEOS } from '../data/videos';

const TABS = ['videos', 'me gusta', 'guardados'];

export default function ProfilePage() {
  const [tab, setTab] = useState('videos');

  return (
    <div className="profile-page">

      <div className="profile-cover">
        <img src="https://picsum.photos/seed/cover99/1200/300" alt="cover" className="cover-img" />
        <div className="cover-overlay" />
      </div>

      <div className="profile-main">

        <div className="profile-header">
          <div className="profile-avatar-wrap">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=jonathan"
              alt="avatar"
              className="profile-avatar"
            />
            <div className="avatar-ring" />
          </div>

          <div className="profile-info">
            <h1 className="profile-name">Jonathan Dev</h1>
            <p className="profile-handle">@jonathan dev</p>
            <p className="profile-bio">
              🚀 Full-stack developer · 🎨 UI/UX lover · 🎵 Music enthusiast
            </p>


            <div className="flex gap-7 mb-4 flex-wrap">
              {[['124', 'Siguiendo'], ['124.5K', 'Seguidores'], ['2.3M', 'Me gustas']].map(([num, lbl]) => (
                <div key={lbl} className="flex flex-col items-center gap-0.5">
                  <span className="stat-num">{num}</span>
                  <span className="stat-label">{lbl}</span>
                </div>
              ))}
            </div>


            <div className="flex gap-2.5 flex-wrap">
              <button className="btn-primary">Editar perfil</button>
              <button className="btn-ghost">Compartir</button>
            </div>
          </div>
        </div>


        <div className="profile-tabs">
          {TABS.map(t => (
            <button
              key={t}
              className={`tab-btn capitalize ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>


        <div className="videos-grid">
          {PROFILE_VIDEOS.map(v => (
            <div key={v.id} className="grid-thumb">
              <img src={v.thumb} alt="" loading="lazy" />
              <div className="grid-thumb-overlay">
                <LikesIcon />
                <span className="text-xs font-bold text-white">{v.likes}</span>
              </div>
              <div className="grid-play-btn">
                <PlayIcon />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
