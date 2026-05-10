"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../utils/supabase';
import { useSession } from '../SessionProvider';
import { useTheme } from '../../context/ThemeContext';
import { MessageSquare, Search, Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function ChatList() {
  const router = useRouter();
  const session = useSession();
  const { theme } = useTheme();
  const [conversations, setConversations] = useState([]);
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const isDark = theme === 'dark';

  useEffect(() => {
    if (!session) { router.push('/login'); return; }
    loadConversations();

    const channel = supabase.channel('chat_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${session.user.id}` }, () => {
        loadConversations();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [session, router]);

  const loadConversations = async () => {
    if (!session) return;
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
      .order('created_at', { ascending: false });

    if (!msgs) { setLoading(false); return; }

    const convMap = new Map();
    for (const msg of msgs) {
      const otherId = msg.sender_id === session.user.id ? msg.receiver_id : msg.sender_id;
      if (!convMap.has(otherId)) {
        convMap.set(otherId, { otherId, lastMsg: msg.content, lastAt: msg.created_at, unread: 0 });
      }
      if (msg.receiver_id === session.user.id && !msg.read) {
        convMap.get(otherId).unread += 1;
      }
    }

    const convList = [...convMap.values()];
    const profileIds = convList.map(c => c.otherId);

    if (profileIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, username, avatar_url').in('id', profileIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
      setConversations(convList.map(c => ({ ...c, profile: profileMap[c.otherId] })).filter(c => c.profile));
    }

    setLoading(false);
  };

  useEffect(() => {
    if (!query.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from('profiles').select('id, username, avatar_url').ilike('username', `%${query}%`).neq('id', session?.user?.id).limit(10);
      setSearchResults(data || []);
    }, 300);
    return () => clearTimeout(t);
  }, [query, session]);

  const formatTime = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'ahora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return d.toLocaleDateString('es', { day: '2-digit', month: '2-digit' });
  };

  if (!session) return null;

  return (
    <div className={`flex flex-col h-full w-full transition-colors duration-300 ${isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}`}>
      {/* Header */}
      <div className={`px-5 py-5 border-b shrink-0 ${isDark ? 'border-white/5' : 'border-black/5'}`}>
        <h1 className="text-2xl font-black mb-4">Mensajes</h1>
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-white/30' : 'text-black/30'}`} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar usuarios..."
            className={`w-full py-2.5 pl-10 pr-4 rounded-xl text-sm outline-none border transition-all focus:ring-2 focus:ring-tiktok-red/30 focus:border-tiktok-red ${isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30' : 'bg-black/5 border-black/10 text-black placeholder:text-black/30'}`}
          />
        </div>

        {searchResults.length > 0 && (
          <div className={`mt-2 rounded-xl border overflow-hidden animate-in fade-in duration-200 ${isDark ? 'bg-[#111] border-white/10' : 'bg-white border-black/10 shadow-xl'}`}>
            {searchResults.map(u => (
              <Link
                key={u.id}
                href={`/chat/${u.id}`}
                className={`flex items-center gap-3 px-4 py-3 transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
                onClick={() => { setQuery(''); setSearchResults([]); }}
              >
                <img src={u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} className="w-9 h-9 rounded-full object-cover" alt={u.username} />
                <p className="font-semibold text-sm">@{u.username}</p>
                <Plus className="w-4 h-4 ml-auto text-tiktok-red" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-tiktok-red animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-8">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
              <MessageSquare className="w-9 h-9 opacity-30" />
            </div>
            <p className="font-bold text-lg opacity-40">Sin mensajes</p>
            <p className="text-sm opacity-30">Busca a un usuario arriba para empezar a chatear</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {conversations.map((conv, i) => (
              <Link
                key={conv.otherId}
                href={`/chat/${conv.otherId}`}
                className={`flex items-center gap-4 px-5 py-4 transition-all duration-200 hover:scale-[1.01] ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="relative shrink-0">
                  <img
                    src={conv.profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.profile.username}`}
                    className="w-13 h-13 w-14 h-14 rounded-full object-cover"
                    alt={conv.profile.username}
                  />
                  {conv.unread > 0 && (
                    <span className="absolute -top-1 -right-1 bg-tiktok-red text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">
                      {conv.unread > 9 ? '9+' : conv.unread}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`font-bold text-sm truncate ${conv.unread > 0 ? 'text-tiktok-red' : ''}`}>@{conv.profile.username}</p>
                    <p className={`text-[11px] shrink-0 ${isDark ? 'text-white/30' : 'text-black/30'}`}>{formatTime(conv.lastAt)}</p>
                  </div>
                  <p className={`text-sm truncate mt-0.5 ${conv.unread > 0 ? 'font-semibold' : `${isDark ? 'text-white/40' : 'text-black/40'}`}`}>
                    {conv.lastMsg}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
