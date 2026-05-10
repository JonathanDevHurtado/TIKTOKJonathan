"use client"
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../utils/supabase';
import { useSession } from '../../../SessionProvider';
import { useTheme } from '../../../../context/ThemeContext';
import { ChevronLeft, Search, UserCheck, UserPlus } from 'lucide-react';
import Link from 'next/link';

export default function FollowersList() {
  const { username } = useParams();
  const router = useRouter();
  const session = useSession();
  const { theme } = useTheme();
  const [followers, setFollowers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState(new Set());
  const isDark = theme === 'dark';

  useEffect(() => {
    const load = async () => {
      const { data: profileData } = await supabase.from('profiles').select('id').eq('username', username).single();
      if (!profileData) { setLoading(false); return; }

      const { data } = await supabase
        .from('followers')
        .select('follower_id, profiles!followers_follower_id_fkey(id, username, avatar_url, full_name)')
        .eq('following_id', profileData.id);

      const list = (data || []).map(r => r.profiles).filter(Boolean);
      setFollowers(list);
      setFiltered(list);

      if (session?.user?.id) {
        const { data: myFollowing } = await supabase.from('followers').select('following_id').eq('follower_id', session.user.id);
        setFollowingIds(new Set((myFollowing || []).map(r => r.following_id)));
      }
      setLoading(false);
    };
    load();
  }, [username, session]);

  useEffect(() => {
    if (!query.trim()) { setFiltered(followers); return; }
    setFiltered(followers.filter(u => u.username?.toLowerCase().includes(query.toLowerCase())));
  }, [query, followers]);

  const handleFollow = async (userId) => {
    if (!session) return router.push('/login');
    const isFollowing = followingIds.has(userId);
    if (isFollowing) {
      setFollowingIds(prev => { const n = new Set(prev); n.delete(userId); return n; });
      await supabase.from('followers').delete().match({ follower_id: session.user.id, following_id: userId });
    } else {
      setFollowingIds(prev => new Set([...prev, userId]));
      await supabase.from('followers').insert({ follower_id: session.user.id, following_id: userId });
    }
  };

  return (
    <div className={`flex flex-col h-full w-full transition-colors duration-300 ${isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}`}>
      <div className={`flex items-center gap-3 px-4 py-4 border-b sticky top-0 z-10 ${isDark ? 'border-white/5 bg-[#0a0a0a]' : 'border-black/5 bg-white'}`}>
        <button onClick={() => router.back()} className={`p-2 rounded-full transition-all hover:scale-110 ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-black">Seguidores de @{username}</h1>
      </div>

      <div className="px-4 py-3">
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-white/30' : 'text-black/30'}`} />
          <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar..." className={`w-full py-2.5 pl-10 pr-4 rounded-xl text-sm outline-none border transition-all focus:ring-2 focus:ring-tiktok-red/30 focus:border-tiktok-red ${isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30' : 'bg-black/5 border-black/10 text-black placeholder:text-black/30'}`} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-tiktok-red border-t-transparent rounded-full" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 opacity-30 text-center">
            <UserCheck className="w-10 h-10" />
            <p className="font-medium">Sin seguidores{query ? ' que coincidan' : ' todavía'}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1 pb-10">
            {filtered.map((user, i) => (
              <div key={user.id} className={`flex items-center gap-4 py-3 animate-in fade-in slide-in-from-bottom-2 duration-300`} style={{ animationDelay: `${i * 30}ms` }}>
                <Link href={`/profile/${user.username}`} className="flex items-center gap-4 flex-1 min-w-0 group">
                  <img src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} className="w-12 h-12 rounded-full object-cover border-2 border-transparent group-hover:border-tiktok-red transition-all shrink-0" alt={user.username} />
                  <div className="min-w-0">
                    <p className="font-bold text-sm group-hover:text-tiktok-red transition-colors truncate">@{user.username}</p>
                    {user.full_name && <p className={`text-xs truncate ${isDark ? 'text-white/40' : 'text-black/40'}`}>{user.full_name}</p>}
                  </div>
                </Link>
                {session && user.id !== session.user.id && (
                  <button
                    onClick={() => handleFollow(user.id)}
                    className={`shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full font-bold text-sm transition-all hover:scale-105 active:scale-95 ${followingIds.has(user.id) ? `border ${isDark ? 'border-white/20 text-white/70' : 'border-black/20 text-black/60'}` : 'bg-tiktok-red text-white hover:bg-rose-600'}`}
                  >
                    {followingIds.has(user.id) ? <><UserCheck className="w-3.5 h-3.5" /> Siguiendo</> : <><UserPlus className="w-3.5 h-3.5" /> Seguir</>}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
