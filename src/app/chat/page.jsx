"use client"
import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { useSession } from '../SessionProvider';
import { useTheme } from '../../context/ThemeContext';
import { Search, Loader2, MessageSquare, Plus, Users, Shield, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function ChatList() {
  const session = useSession();
  const { theme } = useTheme();
  
  const [conversations, setConversations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!session) return;

    const loadChats = async () => {
      // Direct Messages
      const { data: convs, error } = await supabase.rpc('get_conversations', { user_id: session.user.id });
      if (!error && convs) {
        const withProfiles = await Promise.all(convs.map(async (c) => {
          const { data: profile } = await supabase.from('profiles').select('username, avatar_url, full_name').eq('id', c.other_user_id).single();
          return { ...c, profile };
        }));
        setConversations(withProfiles.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at)));
      }

      // Group Chats
      const { data: groupMemberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', session.user.id);

      if (groupMemberships && groupMemberships.length > 0) {
        const groupIds = groupMemberships.map(g => g.group_id);
        const { data: groupData } = await supabase
          .from('chat_groups')
          .select('*')
          .in('id', groupIds)
          .order('created_at', { ascending: false });
        
        // Count unread for groups
        const groupsWithUnread = await Promise.all((groupData || []).map(async g => {
          // Simplistic unread count for groups: we would need a last_read_at in group_members, but for now we just show if there's any recent msg
          // Real unread logic for groups is complex, we'll keep it simple
          return { ...g, unread_count: 0 }; 
        }));
        setGroups(groupsWithUnread);
      }

      setLoading(false);
    };

    loadChats();

    const dmChannel = supabase.channel('chat_list_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${session.user.id}` }, () => {
        loadChats();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages' }, () => {
        loadChats();
      })
      .subscribe();

    return () => supabase.removeChannel(dmChannel);
  }, [session]);

  useEffect(() => {
    const searchUsers = async () => {
      if (search.length < 2) { setSearchResults([]); return; }
      setIsSearching(true);
      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, full_name')
        .ilike('username', `%${search}%`)
        .neq('id', session?.user?.id)
        .limit(10);
      setSearchResults(data || []);
      setIsSearching(false);
    };
    const t = setTimeout(searchUsers, 400);
    return () => clearTimeout(t);
  }, [search, session]);

  const createGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim() || creating || !session) return;
    setCreating(true);
    
    // 1. Create group
    const { data: newGroup, error: groupError } = await supabase
      .from('chat_groups')
      .insert({ name: groupName.trim(), description: groupDesc.trim(), owner_id: session.user.id })
      .select()
      .single();

    if (!groupError && newGroup) {
      // 2. Add creator to members
      await supabase.from('group_members').insert({ group_id: newGroup.id, user_id: session.user.id });
      // 3. Close and redirect
      setIsCreatingGroup(false);
      setGroupName('');
      setGroupDesc('');
      window.location.href = `/chat/group/${newGroup.id}`; // using window.location to force full load
    } else {
      console.error(groupError);
      alert("Error creando grupo");
    }
    setCreating(false);
  };

  const isDark = theme === 'dark';
  if (!session) return null;

  return (
    <div className={`flex flex-col h-[100dvh] w-full transition-colors duration-300 ${isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}`}>
      <div className={`px-4 py-5 border-b sticky top-0 z-30 ${isDark ? 'border-white/5 bg-[#0a0a0a]/90 backdrop-blur-md' : 'border-black/5 bg-white/90 backdrop-blur-md'}`}>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-black tracking-tight">Mensajes</h1>
          <button 
            onClick={() => setIsCreatingGroup(true)}
            className="flex items-center gap-1 bg-tiktok-red text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-md hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> Grupo
          </button>
        </div>
        
        <div className="relative">
          <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-white/40' : 'text-black/40'}`} />
          <input
            type="text"
            placeholder="Buscar usuarios para chatear..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full py-2.5 pl-10 pr-4 rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-tiktok-red/30 ${isDark ? 'bg-white/5 border border-white/10 text-white placeholder:text-white/30' : 'bg-black/5 border border-black/10 text-black placeholder:text-black/30'}`}
          />
          {isSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-tiktok-red" />}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {search.length >= 2 ? (
          <div className="p-2 animate-in fade-in duration-300">
            <p className={`px-2 py-2 text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-black/40'}`}>Resultados de búsqueda</p>
            {searchResults.length === 0 && !isSearching && (
              <p className="px-2 py-4 text-sm opacity-50 text-center">No se encontraron usuarios</p>
            )}
            {searchResults.map(user => (
              <Link key={user.id} href={`/chat/${user.id}`} className={`flex items-center gap-4 p-3 rounded-xl transition-all ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}>
                <img src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} className="w-12 h-12 rounded-full object-cover shadow-sm" alt="avatar" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">@{user.username}</p>
                  {user.full_name && <p className={`text-xs truncate ${isDark ? 'text-white/40' : 'text-black/40'}`}>{user.full_name}</p>}
                </div>
              </Link>
            ))}
          </div>
        ) : loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-tiktok-red animate-spin" /></div>
        ) : (
          <div className="p-2 flex flex-col gap-1 animate-in fade-in duration-300 pb-20">
            
            {/* GROUPS LIST */}
            {groups.length > 0 && (
              <>
                <p className={`px-3 py-2 text-xs font-bold uppercase tracking-wider mt-2 ${isDark ? 'text-white/40' : 'text-black/40'}`}>Tus Grupos</p>
                {groups.map(group => (
                  <Link key={group.id} href={`/chat/group/${group.id}`} className={`flex items-center gap-4 p-3 rounded-xl transition-all group ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}>
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-md ${isDark ? 'bg-white/10' : 'bg-black/5'}`}>
                      {group.avatar_url ? (
                        <img src={group.avatar_url} className="w-full h-full object-cover rounded-xl" alt="group" />
                      ) : (
                        <Users className="w-7 h-7 opacity-50" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <p className="font-bold text-base truncate group-hover:text-tiktok-red transition-colors">{group.name}</p>
                      </div>
                      <p className={`text-sm truncate ${isDark ? 'text-white/50' : 'text-black/50'}`}>{group.description || 'Sin descripción'}</p>
                    </div>
                  </Link>
                ))}
                <div className={`h-px mx-4 my-2 ${isDark ? 'bg-white/5' : 'bg-black/5'}`} />
              </>
            )}

            {/* DIRECT MESSAGES LIST */}
            <p className={`px-3 py-2 text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-black/40'}`}>Mensajes Directos</p>
            {conversations.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                 <MessageSquare className="w-12 h-12" />
                 <p className="font-medium text-sm text-center max-w-xs">Busca a un usuario arriba para empezar a chatear</p>
               </div>
            ) : (
              conversations.map(conv => (
                <Link key={conv.other_user_id} href={`/chat/${conv.other_user_id}`} className={`flex items-center gap-4 p-3 rounded-xl transition-all group ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}>
                  <img src={conv.profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.profile?.username}`} className="w-14 h-14 rounded-full object-cover shadow-md shrink-0" alt="avatar" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <p className="font-bold text-base truncate group-hover:text-tiktok-red transition-colors">@{conv.profile?.username}</p>
                      <span className={`text-[10px] font-semibold whitespace-nowrap ${Number(conv.unread_count) > 0 ? 'text-tiktok-red' : isDark ? 'text-white/30' : 'text-black/30'}`}>
                        {new Date(conv.last_message_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className={`text-sm truncate ${Number(conv.unread_count) > 0 ? 'font-bold' : isDark ? 'text-white/50' : 'text-black/50'}`}>
                      {conv.last_message}
                    </p>
                  </div>
                  {Number(conv.unread_count) > 0 && (
                    <div className="w-5 h-5 rounded-full bg-tiktok-red text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-md">
                      {conv.unread_count}
                    </div>
                  )}
                </Link>
              ))
            )}
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {isCreatingGroup && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-8 sm:zoom-in-95 ${isDark ? 'bg-[#111] border border-white/10' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2"><Users className="w-6 h-6 text-tiktok-red" /> Nuevo Grupo</h3>
              <button onClick={() => setIsCreatingGroup(false)} className={`p-2 rounded-full ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'}`}>
                <ArrowRight className="w-5 h-5 rotate-180" />
              </button>
            </div>
            
            <form onSubmit={createGroup} className="flex flex-col gap-4">
              <div>
                <label className={`text-xs font-bold uppercase tracking-wider mb-2 block ${isDark ? 'text-white/50' : 'text-black/50'}`}>Nombre del Grupo</label>
                <input 
                  type="text" 
                  required
                  maxLength={30}
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  placeholder="Ej. Amigos de TikTok" 
                  className={`w-full p-3 rounded-xl outline-none focus:ring-2 focus:ring-tiktok-red transition-all ${isDark ? 'bg-white/5 border border-white/10' : 'bg-black/5 border border-black/10'}`} 
                />
              </div>
              
              <div>
                <label className={`text-xs font-bold uppercase tracking-wider mb-2 block ${isDark ? 'text-white/50' : 'text-black/50'}`}>Descripción (Opcional)</label>
                <input 
                  type="text" 
                  maxLength={100}
                  value={groupDesc}
                  onChange={e => setGroupDesc(e.target.value)}
                  placeholder="De qué trata este grupo..." 
                  className={`w-full p-3 rounded-xl outline-none focus:ring-2 focus:ring-tiktok-red transition-all ${isDark ? 'bg-white/5 border border-white/10' : 'bg-black/5 border border-black/10'}`} 
                />
              </div>

              <div className={`p-4 rounded-xl mt-2 flex items-start gap-3 ${isDark ? 'bg-tiktok-red/10 text-tiktok-red/90' : 'bg-red-50 text-red-600'}`}>
                <Shield className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed font-medium">Serás el administrador de este grupo. Podrás invitar miembros, cambiar la foto y editar el nombre más tarde.</p>
              </div>

              <button 
                type="submit" 
                disabled={!groupName.trim() || creating}
                className="w-full bg-tiktok-red text-white font-bold py-3.5 rounded-xl mt-4 flex justify-center items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg hover:shadow-tiktok-red/30 disabled:opacity-50"
              >
                {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Crear y Continuar'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
