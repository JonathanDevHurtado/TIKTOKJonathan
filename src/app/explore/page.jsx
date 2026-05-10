"use client"
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../utils/supabase';
import { Search, Users, Film, ArrowRight, Music, X, Play } from 'lucide-react';
import Link from 'next/link';

export default function Explore() {
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('videos'); // 'videos' | 'usuarios'
  const [results, setResults] = useState({ videos: [], users: [] });
  const [trendingVideos, setTrendingVideos] = useState([]);
  const [defaultUsers, setDefaultUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Fetch initial data (Categories, Trending Videos, and Default Users)
  useEffect(() => {
    const fetchInitialData = async () => {
      setInitialLoading(true);
      try {
        // 1. Categories
        const { data: catData, error: catError } = await supabase.from('categories').select('*');
        if (catError) console.error("Error fetching categories:", catError);
        setCategories(catData || []);

        // 2. Trending Videos (Robust fallback chain)
        let trendData = [];
        
        const fetchWithOrder = async (col) => {
          return await supabase
            .from('videos')
            .select(`*, profiles(username, avatar_url)`)
            .order(col, { ascending: false })
            .limit(12);
        };

        let { data, error } = await fetchWithOrder('likes_count');
        
        if (error || !data) {
          let { data: d2, error: e2 } = await fetchWithOrder('likes');
          if (e2 || !d2) {
            let { data: d3 } = await fetchWithOrder('created_at');
            trendData = d3 || [];
          } else {
            trendData = d2;
          }
        } else {
          trendData = data;
        }

        setTrendingVideos(trendData || []);

        // 3. Default Users
        const { data: userData } = await supabase
          .from('profiles')
          .select('*')
          .limit(15);
        setDefaultUsers(userData || []);

      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setInitialLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // Search Logic
  const handleSearch = useCallback(async (searchTerm) => {
    if (!searchTerm.trim()) {
      setResults({ videos: [], users: [] });
      return;
    }

    setLoading(true);
    try {
      if (activeTab === 'videos') {
        let { data, error } = await supabase
          .from('videos')
          .select(`*, profiles(username, avatar_url)`)
          .ilike('description', `%${searchTerm}%`)
          .order('likes_count', { ascending: false });
        
        if (error) {
          const { data: d2 } = await supabase
            .from('videos')
            .select(`*, profiles(username, avatar_url)`)
            .ilike('description', `%${searchTerm}%`)
            .order('likes', { ascending: false });
          data = d2;
        }
        setResults(prev => ({ ...prev, videos: data || [] }));
      } else {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
          .limit(30);
        setResults(prev => ({ ...prev, users: data || [] }));
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  const handleCategoryClick = (catName) => {
    setQuery(catName);
    setActiveTab('videos');
  };

  const UserList = ({ users }) => (
    <div className="flex flex-col divide-y divide-[var(--border-primary)]">
      {users?.filter(u => u && u.id).map(user => (
        <Link 
          key={user.id} 
          href={`/profile/${user.username}`}
          className="flex items-center gap-4 p-4 hover:bg-[var(--bg-secondary)] transition-colors group"
        >
          <img 
            src={user.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.username} 
            className="w-14 h-14 rounded-full border-2 border-[var(--border-primary)] group-hover:border-tiktok-red transition-colors object-cover"
            alt="avatar"
          />
          <div className="flex-1">
            <p className="font-bold text-[var(--text-primary)] group-hover:text-tiktok-red transition-colors">@{user.username}</p>
            <p className="text-sm text-[var(--text-secondary)]">{user.full_name || 'TikTok User'}</p>
          </div>
          <ArrowRight className="w-5 h-5 text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all" />
        </Link>
      ))}
    </div>
  );

  const VideoGrid = ({ videos }) => (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-0.5">
      {videos?.filter(v => v && v.id).map(video => (
        <Link key={video.id} href={`/video/${video.id}`} className="aspect-[3/4] bg-[var(--bg-secondary)] relative group overflow-hidden">
          <video src={video.video_url} className="w-full h-full object-cover" muted />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Film className="text-white w-8 h-8" />
          </div>
          <div className="absolute bottom-1 left-1 flex items-center gap-1 text-white text-[10px] font-bold drop-shadow-md">
            <Play className="w-2 h-2 fill-current" /> {video.views || 0}
          </div>
        </Link>
      ))}
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto w-full h-full flex flex-col gap-6 pb-24 animate-in fade-in duration-500">
      
      {/* Search Header */}
      <div className="flex flex-col gap-4 sticky top-0 bg-[var(--bg-primary)] z-30 py-2">
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className={`w-5 h-5 transition-colors ${query ? 'text-tiktok-red' : 'text-[var(--text-secondary)]'}`} />
          </div>
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cuentas o videos..." 
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-full py-4 px-12 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-tiktok-red/20 focus:border-tiktok-red transition-all shadow-sm"
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="absolute right-24 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={() => handleSearch(query)}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-tiktok-red hover:bg-[#e0254b] text-white px-6 py-1.5 rounded-full font-bold text-sm transition-all shadow-md active:scale-95"
          >
            Buscar
          </button>
        </div>

        {/* Search Tabs */}
        <div className="flex border-b border-[var(--border-primary)]">
          <button 
            onClick={() => setActiveTab('videos')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 font-bold transition-all relative ${activeTab === 'videos' ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] opacity-50'}`}
          >
            <Film className="w-4 h-4" />
            Videos
            {activeTab === 'videos' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-tiktok-red animate-in slide-in-from-left duration-300" />}
          </button>
          <button 
            onClick={() => setActiveTab('usuarios')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 font-bold transition-all relative ${activeTab === 'usuarios' ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] opacity-50'}`}
          >
            <Users className="w-4 h-4" />
            Usuarios
            {activeTab === 'usuarios' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-tiktok-red animate-in slide-in-from-right duration-300" />}
          </button>
        </div>
      </div>

      {/* Content Area */}
      {loading || initialLoading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="animate-spin w-10 h-10 border-4 border-tiktok-red border-t-transparent rounded-full"></div>
          <p className="text-[var(--text-secondary)] font-medium">Cargando...</p>
        </div>
      ) : (
        <>
          {query.trim() ? (
            /* Search Results */
            <div className="flex-1 min-h-[400px]">
              {activeTab === 'videos' ? (
                results.videos.length > 0 ? <VideoGrid videos={results.videos} /> : (
                  <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                    <Film className="w-12 h-12 text-[var(--text-secondary)] mb-4" />
                    <h3 className="text-xl font-bold mb-2">No hay resultados</h3>
                  </div>
                )
              ) : (
                results.users.length > 0 ? <UserList users={results.users} /> : (
                  <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                    <Users className="w-12 h-12 text-[var(--text-secondary)] mb-4" />
                    <h3 className="text-xl font-bold mb-2">No hay usuarios</h3>
                  </div>
                )
              )}
            </div>
          ) : (
            /* Default View (No Search) */
            <div className="flex flex-col gap-12">
              {activeTab === 'videos' ? (
                <>
                  {/* Trending Section (Top) */}
                  <section>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Tendencias</h2>
                    </div>
                    {trendingVideos.length > 0 ? (
                      <VideoGrid videos={trendingVideos} />
                    ) : (
                      <div className="text-center py-20 bg-[var(--bg-secondary)] rounded-2xl border border-dashed border-[var(--border-primary)]">
                        <Film className="w-10 h-10 text-[var(--text-secondary)] mx-auto mb-2 opacity-50" />
                        <p className="text-[var(--text-secondary)]">Aún no hay videos destacados</p>
                      </div>
                    )}
                  </section>

                  {/* Categories Grid (Bottom) */}
                  <section>
                    <h2 className="text-2xl font-black text-[var(--text-primary)] mb-6 tracking-tight">Explorar Categorías</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {categories?.filter(c => c && c.id).map((cat, idx) => (
                        <div 
                          key={cat.id} 
                          onClick={() => handleCategoryClick(cat.name)}
                          className={`relative overflow-hidden rounded-2xl p-4 cursor-pointer group transition-all duration-300 hover:-translate-y-1 hover:shadow-xl border border-[var(--border-primary)] h-32 flex items-end justify-start
                            ${idx % 4 === 0 ? 'bg-gradient-to-br from-purple-500/10 to-indigo-500/20' : 
                              idx % 4 === 1 ? 'bg-gradient-to-br from-rose-500/10 to-orange-500/20' : 
                              idx % 4 === 2 ? 'bg-gradient-to-br from-emerald-500/10 to-teal-500/20' : 
                              'bg-gradient-to-br from-blue-500/10 to-cyan-500/20'}
                            hover:from-tiktok-red/10 hover:to-tiktok-red/20`}
                        >
                          <span className="font-bold text-[var(--text-primary)] group-hover:text-tiktok-red transition-colors z-10">{cat.name}</span>
                          <div className="absolute inset-0 bg-white/5 dark:bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              ) : (
                /* Usuarios Tab - Default List */
                <section>
                  <h2 className="text-2xl font-black text-[var(--text-primary)] mb-6 tracking-tight">Cuentas recomendadas</h2>
                  {defaultUsers.length > 0 ? (
                    <UserList users={defaultUsers} />
                  ) : (
                    <div className="text-center py-10 opacity-50">No hay usuarios sugeridos</div>
                  )}
                </section>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
