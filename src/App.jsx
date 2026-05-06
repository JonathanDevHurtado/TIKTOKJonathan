import { useState } from 'react';
import { Sidebar, BottomNav } from './components/Sidebar';
import FeedPage    from './pages/FeedPage';
import ExplorePage from './pages/ExplorePage';
import ProfilePage from './pages/ProfilePage';
import { useBreakpoint } from './hooks';
import './App.css';

export default function App() {
  const [page, setPage] = useState('home');
  const bp       = useBreakpoint();
  const isMobile = bp === 'mobile';
  const isTablet = bp === 'tablet';

  return (
    <div className={`app-layout app-${bp}`}>

      {!isMobile && (
        <Sidebar page={page} setPage={setPage} compact={isTablet} />
      )}

      <main className="main-content">
        {page === 'home'    && <FeedPage    bp={bp} />}
        {page === 'explore' && <ExplorePage />}
        {page === 'profile' && <ProfilePage />}
      </main>


      {isMobile && <BottomNav page={page} setPage={setPage} />}
    </div>
  );
}
