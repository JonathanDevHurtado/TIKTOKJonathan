import { HomeIcon, ExploreIcon, ProfileIcon } from './Icons';


export function Logo({ compact }) {
  return (
    <div className={`logo ${compact ? 'logo-compact' : ''}`}>
      <span className="logo-icon">
        <svg viewBox="0 0 48 48" fill="none">
          <path d="M33 8c0 5.523 4.477 10 10 10v8c-4.03 0-7.77-1.2-10.87-3.25V34c0 8.284-6.716 15-15 15S2 42.284 2 34s6.716-15 15-15c.688 0 1.364.046 2.027.135V27.4A7 7 0 0 0 17 27c-3.866 0-7 3.134-7 7s3.134 7 7 7 7-3.134 7-7V8h9z" fill="url(#lg)"/>
          <defs>
            <linearGradient id="lg" x1="2" y1="8" x2="43" y2="48" gradientUnits="userSpaceOnUse">
              <stop stopColor="#25f4ee"/>
              <stop offset="0.5" stopColor="#fe2c55"/>
              <stop offset="1" stopColor="#fe2c55"/>
            </linearGradient>
          </defs>
        </svg>
      </span>
      {!compact && <span className="logo-text">TikTok</span>}
    </div>
  );
}


const NAV = [
  { id: 'home',    label: 'Para ti',  Icon: HomeIcon },
  { id: 'explore', label: 'Explorar', Icon: ExploreIcon },
  { id: 'profile', label: 'Mi perfil', Icon: ProfileIcon },
];

export function Sidebar({ page, setPage, compact }) {
  return (
    <aside className={`sidebar ${compact ? 'sidebar-compact' : ''}`}>
      <div>
        <Logo compact={compact} />
        <nav className="sidebar-nav">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`nav-btn ${page === id ? 'active' : ''}`}
              onClick={() => setPage(id)}
              title={compact ? label : ''}
            >
              <span className="nav-icon"><Icon active={page === id} /></span>
              {!compact && <span className="nav-label">{label}</span>}
              {!compact && page === id && <span className="nav-indicator" />}
            </button>
          ))}
        </nav>

        <button
          className="upload-btn"
          style={compact ? { justifyContent: 'center', padding: '11px' } : {}}
        >
          <span className="upload-plus">+</span>
          {!compact && <span>Subir</span>}
        </button>
      </div>

      {!compact && <p className="sidebar-footer">© 2025 TikTok Clone</p>}
    </aside>
  );
}


export function BottomNav({ page, setPage }) {
  return (
    <nav className="bottom-nav">
      {NAV.map(({ id, label, Icon }) => (
        <button
          key={id}
          className={`bottom-nav-btn ${page === id ? 'active' : ''}`}
          onClick={() => setPage(id)}
        >
          <Icon active={page === id} />
          <span className="text-[10px] font-semibold">{label}</span>
        </button>
      ))}
    </nav>
  );
}
