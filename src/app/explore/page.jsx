"use client"
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { Search, Users, Film, ArrowRight, Play, Hash, X, Sparkles, TrendingUp, Eye } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '../../context/ThemeContext';
import { useRouter } from 'next/navigation';

const CATEGORY_COLORS = [
  { from: 'from-violet-600', to: 'to-purple-800', light: 'from-violet-100', lightTo: 'to-purple-200', emoji: '🎮' },
  { from: 'from-rose-500', to: 'to-pink-700', light: 'from-rose-100', lightTo: 'to-pink-200', emoji: '🍳' },
  { from: 'from-emerald-500', to: 'to-teal-700', light: 'from-emerald-100', lightTo: 'to-teal-200', emoji: '🌿' },
  { from: 'from-blue-500', to: 'to-indigo-700', light: 'from-blue-100', lightTo: 'to-indigo-200', emoji: '🎵' },
  { from: 'from-amber-500', to: 'to-orange-700', light: 'from-amber-100', lightTo: 'to-orange-200', emoji: '⚽' },
  { from: 'from-cyan-500', to: 'to-sky-700', light: 'from-cyan-100', lightTo: 'to-sky-200', emoji: '✈️' },
  { from: 'from-fuchsia-500', to: 'to-pink-700', light: 'from-fuchsia-100', lightTo: 'to-pink-200', emoji: '👗' },
  { from: 'from-red-500', to: 'to-rose-800', light: 'from-red-100', lightTo: 'to-rose-200', emoji: '💪' },
  { from: 'from-lime-500', to: 'to-green-700', light: 'from-lime-100', lightTo: 'to-green-200', emoji: '🎨' },
  { from: 'from-sky-400', to: 'to-blue-700', light: 'from-sky-100', lightTo: 'to-blue-200', emoji: '🌐' },
  { from: 'from-yellow-400', to: 'to-amber-600', light: 'from-yellow-100', lightTo: 'to-amber-200', emoji: '😂' },
  { from: 'from-teal-400', to: 'to-emerald-700', light: 'from-teal-100', lightTo: 'to-emerald-200', emoji: '📚' },
];

function formatNum(n) {
  if (!n) return '0';
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

export default function Explore() {
  const { theme } = useTheme();
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [activeSearchTab, setActiveSearchTab] = useState('videos');
  const [results, setResults] = useState({ videos: [], users: [] });
  const [trendingVideos, setTrendingVideos] = useState([]);
  const [defaultUsers, setDefaultUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);
  const [categoryVideos, setCategoryVideos] = useState([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const observerRef = useRef(null);
  const inputRef = useRef(null);

  const loadMoreVideos = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    
    if (activeCategory) {
      const currentIds = categoryVideos.map(v => v.id);
      let query = supabase.from('videos').select(`*, profiles(username, avatar_url)`);
      if (currentIds.length > 0) {
        query = query.order('created_at', { ascending: false }).range(page * 20, (page + 1) * 20 - 1);
      } else {
        query = query.eq('category_id', activeCategory.id).order('created_at', { ascending: false }).limit(20);
      }
      
      const { data } = await query;
      
      if (data && data.length > 0) {
        setCategoryVideos(prev => {
          const newVids = data.filter(d => !prev.find(p => p.id === d.id));
          return [...prev, ...newVids];
        });
        setPage(p => p + 1);
      } else {
        setHasMore(false);
      }
    }
    setLoading(false);
  }, [activeCategory, categoryVideos, page, loading, hasMore]);

  const lastElementRef = useCallback(node => {
    if (loading) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreVideos();
      }
    });
    if (node) observerRef.current.observe(node);
  }, [loading, hasMore, loadMoreVideos]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setInitialLoading(true);
      try {
        const { data: catData } = await supabase.from('categories').select('*').order('name');
        setCategories(catData || []);

        let trendData = [];
        const { data, error } = await supabase
          .from('videos')
          .select(`*, profiles(username, avatar_url)`)
          .order('views', { ascending: false })
          .limit(12);
        if (!error && data) trendData = data;
        setTrendingVideos(trendData);

        const { data: userData } = await supabase.from('profiles').select('*').limit(15);
        setDefaultUsers(userData || []);
      } catch (err) {
        console.error("Error loading explore:", err);
      } finally {
        setInitialLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const handleSearch = useCallback(async (searchTerm) => {
    if (!searchTerm.trim()) {
      setResults({ videos: [], users: [] });
      return;
    }
    setLoading(true);
    try {
      const [videoRes, userRes] = await Promise.all([
        supabase
          .from('videos')
          .select(`*, profiles(username, avatar_url)`)
          .ilike('description', `%${searchTerm}%`)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
          .limit(20)
      ]);
      setResults({
        videos: videoRes.data || [],
        users: userRes.data || []
      });
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => handleSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  const handleCategoryClick = async (cat) => {
    if (activeCategory?.id === cat.id) {
      setActiveCategory(null);
      setCategoryVideos([]);
      setPage(1);
      setHasMore(true);
      return;
    }
    setActiveCategory(cat);
    setCategoryLoading(true);
    setPage(1);
    setHasMore(true);
    try {
      const { data } = await supabase
        .from('videos')
        .select(`*, profiles(username, avatar_url)`)
        .eq('category_id', cat.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setCategoryVideos(data || []);
      if (data && data.length < 20) {
        // If we got less than 20, we don't have more strictly in this category,
        // but loadMoreVideos will fetch randoms next time it fires
      }
    } catch (err) {
      console.error("Error loading category videos:", err);
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleVideoClick = async (video) => {
    // Increment view optimistically
    try {
      await supabase.rpc('increment_view', { vid_id: video.id });
    } catch (err) {
      console.error(err);
    }
    router.push(`/video/${video.id}`);
  };

  const VideoCard = ({ video, idx = 0, innerRef }) => (
    <div
      ref={innerRef}
      onClick={() => handleVideoClick(video)}
      className="aspect-[9/16] relative group overflow-hidden rounded-xl shadow-md cursor-pointer"
      style={{ animationDelay: `${idx * 50}ms` }}
    >
      <video src={video.video_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" muted />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-100 transition-all duration-300 flex flex-col justify-end p-3">
        <p className="text-white text-xs font-bold truncate">@{video.profiles?.username}</p>
        {video.description && <p className="text-white/70 text-[10px] truncate mt-0.5">{video.description}</p>}
      </div>
      
      {/* View count indicator */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1 text-white/90 text-[10px] font-bold drop-shadow-md">
        <Play className="w-3 h-3 fill-current" />
        <span>{formatNum(video.views || 0)}</span>
      </div>

      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center scale-0 group-hover:scale-100 transition-transform duration-300">
          <Play className="text-white w-5 h-5 fill-current" />
        </div>
      </div>
    </div>
  );

  const UserRow = ({ user, idx = 0 }) => (
    <Link
      href={`/profile/${user.username}`}
      className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 hover:scale-[1.01] hover:shadow-md group ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
      style={{ animationDelay: `${idx * 40}ms` }}
    >
      <img
        src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
        className="w-14 h-14 rounded-full object-cover border-2 border-transparent group-hover:border-tiktok-red transition-all"
        alt={user.username}
      />
      <div className="flex-1 min-w-0">
        <p className="font-bold group-hover:text-tiktok-red transition-colors truncate">@{user.username}</p>
        <p className={`text-sm truncate ${theme === 'dark' ? 'text-white/50' : 'text-black/50'}`}>{user.full_name || 'TikTok User'}</p>
      </div>
      <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-tiktok-red" />
    </Link>
  );

  const isSearching = query.trim().length > 0;

  return (
    <div className={`w-full min-h-full flex flex-col pb-24 transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}`}>

      {/* Sticky Search Bar */}
      <div className={`sticky top-0 z-30 px-4 py-4 border-b transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0a0a0a]/90 border-white/5 backdrop-blur-xl' : 'bg-white/90 border-black/5 backdrop-blur-xl'}`}>
        <div className="max-w-3xl mx-auto">
          <div className="relative">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${query ? 'text-tiktok-red' : 'text-gray-400'}`} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar videos, usuarios, descripciones..."
              className={`w-full py-3.5 pl-12 pr-28 rounded-2xl text-sm font-medium outline-none transition-all duration-300 border focus:ring-2 focus:ring-tiktok-red/30 focus:border-tiktok-red ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30' : 'bg-black/5 border-black/10 text-black placeholder:text-black/30'}`}
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-24 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => handleSearch(query)}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-tiktok-red hover:bg-rose-600 text-white px-5 py-1.5 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95"
            >
              Buscar
            </button>
          </div>

          {/* Search Tabs - only show when searching */}
          {isSearching && (
            <div className={`flex mt-3 rounded-xl overflow-hidden border transition-all duration-300 ${theme === 'dark' ? 'border-white/10' : 'border-black/10'}`}>
              {[
                { id: 'videos', label: 'Videos', icon: Film, count: results.videos.length },
                { id: 'usuarios', label: 'Usuarios', icon: Users, count: results.users.length }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSearchTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 font-semibold text-sm transition-all duration-200 ${activeSearchTab === tab.id ? 'bg-tiktok-red text-white' : theme === 'dark' ? 'text-white/50 hover:text-white' : 'text-black/50 hover:text-black'}`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeSearchTab === tab.id ? 'bg-white/20' : 'bg-tiktok-red/20 text-tiktok-red'}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto w-full px-4 py-6 flex flex-col gap-10">

        {/* SEARCH RESULTS */}
        {isSearching ? (
          <div className="animate-in fade-in duration-300">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin w-8 h-8 border-4 border-tiktok-red border-t-transparent rounded-full" />
              </div>
            ) : activeSearchTab === 'videos' ? (
              results.videos.length > 0 ? (
                <div>
                  <p className={`text-sm mb-4 font-medium ${theme === 'dark' ? 'text-white/40' : 'text-black/40'}`}>{results.videos.length} videos encontrados</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {results.videos.map((v, i) => <VideoCard key={v.id} video={v} idx={i} />)}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}>
                    <Film className="w-9 h-9 opacity-30" />
                  </div>
                  <p className="font-bold text-lg opacity-50">Sin resultados para "{query}"</p>
                  <p className="text-sm opacity-30">Prueba con otras palabras</p>
                </div>
              )
            ) : (
              results.users.length > 0 ? (
                <div>
                  <p className={`text-sm mb-4 font-medium ${theme === 'dark' ? 'text-white/40' : 'text-black/40'}`}>{results.users.length} usuarios encontrados</p>
                  <div className="flex flex-col gap-1">
                    {results.users.map((u, i) => <UserRow key={u.id} user={u} idx={i} />)}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}>
                    <Users className="w-9 h-9 opacity-30" />
                  </div>
                  <p className="font-bold text-lg opacity-50">Sin usuarios para "{query}"</p>
                </div>
              )
            )}
          </div>
        ) : initialLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-tiktok-red border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* TRENDING SECTION */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-tiktok-red" />
                  <h2 className="text-xl font-black tracking-tight">Tendencias</h2>
                </div>
              </div>
              {trendingVideos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {trendingVideos.map((v, i) => <VideoCard key={v.id} video={v} idx={i} />)}
                </div>
              ) : (
                <div className={`flex items-center justify-center py-16 rounded-2xl border border-dashed ${theme === 'dark' ? 'border-white/10' : 'border-black/10'}`}>
                  <p className="opacity-30 text-sm">No hay videos todavía</p>
                </div>
              )}
            </section>

            {/* CATEGORIES SECTION */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
              <div className="flex items-center gap-3 mb-5">
                <Hash className="w-5 h-5 text-tiktok-red" />
                <h2 className="text-xl font-black tracking-tight">Categorías</h2>
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-2 mb-6">
                {categories.map((cat, idx) => {
                  const colors = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                  const isActive = activeCategory?.id === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryClick(cat)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm transition-all duration-300 hover:scale-105 active:scale-95 border ${
                        isActive
                          ? 'bg-tiktok-red text-white border-tiktok-red shadow-lg shadow-tiktok-red/30'
                          : theme === 'dark'
                            ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                            : 'bg-black/5 border-black/10 hover:bg-black/10 text-black'
                      }`}
                    >
                      <span>{colors.emoji}</span>
                      <span className="capitalize">{cat.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Category Videos (with Infinite Scroll) */}
              {activeCategory && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{CATEGORY_COLORS[categories.findIndex(c => c.id === activeCategory.id) % CATEGORY_COLORS.length]?.emoji}</span>
                      <h3 className="font-bold text-lg capitalize">{activeCategory.name}</h3>
                    </div>
                    <button
                      onClick={() => { setActiveCategory(null); setCategoryVideos([]); }}
                      className={`p-1.5 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
                    >
                      <X className="w-4 h-4 opacity-50" />
                    </button>
                  </div>

                  {categoryLoading && categoryVideos.length === 0 ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin w-8 h-8 border-4 border-tiktok-red border-t-transparent rounded-full" />
                    </div>
                  ) : categoryVideos.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {categoryVideos.map((v, i) => {
                        if (i === categoryVideos.length - 1) {
                          return <VideoCard innerRef={lastElementRef} key={v.id} video={v} idx={i % 20} />;
                        } else {
                          return <VideoCard key={v.id} video={v} idx={i % 20} />;
                        }
                      })}
                      
                      {loading && (
                        <div className="col-span-2 sm:col-span-3 flex justify-center py-6">
                           <div className="animate-spin w-6 h-6 border-2 border-tiktok-red border-t-transparent rounded-full" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed gap-3 ${theme === 'dark' ? 'border-white/10' : 'border-black/10'}`}>
                      <Hash className="w-8 h-8 opacity-20" />
                      <p className="opacity-30 text-sm">No hay videos en esta categoría aún</p>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* RECOMMENDED USERS */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
              <div className="flex items-center gap-3 mb-5">
                <Sparkles className="w-5 h-5 text-tiktok-red" />
                <h2 className="text-xl font-black tracking-tight">Usuarios nuevos</h2>
              </div>
              {defaultUsers.length > 0 ? (
                <div className={`rounded-2xl border overflow-hidden divide-y transition-colors duration-300 ${theme === 'dark' ? 'border-white/5 divide-white/5' : 'border-black/5 divide-black/5'}`}>
                  {defaultUsers.map((u, i) => <UserRow key={u.id} user={u} idx={i} />)}
                </div>
              ) : (
                <div className="text-center py-10 opacity-30 text-sm">Sin usuarios sugeridos</div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
