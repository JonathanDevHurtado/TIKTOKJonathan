"use client"
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../utils/supabase';
import { useSession } from '../../../SessionProvider';
import { useTheme } from '../../../../context/ThemeContext';
import { ChevronLeft, Send, Loader2, Users, Settings, UserPlus, Image as ImageIcon, Smile, MoreVertical, Edit2, Trash2, Paperclip, X, LogOut, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function GroupChatPage() {
  const { groupId } = useParams();
  const router = useRouter();
  const session = useSession();
  const { theme } = useTheme();
  
  const [messages, setMessages] = useState([]);
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  
  // Media upload state
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const avatarInputRef = useRef(null);

  // Group settings state
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [searchNewUser, setSearchNewUser] = useState('');
  const [userResults, setUserResults] = useState([]);

  // Edit/Delete msg state
  const [editingMsg, setEditingMsg] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const isDark = theme === 'dark';

  const EMOJIS = ['😂','❤️','🥺','🔥','😍','😊','🥰','✨','👍','🙏','😭','👀','🎉','💯','😎'];

  useEffect(() => {
    if (!session) { router.push('/login'); return; }

    const loadData = async () => {
      // Load group
      const { data: gData, error: gErr } = await supabase
        .from('chat_groups')
        .select('*')
        .eq('id', groupId)
        .single();
      
      if (gErr || !gData) { router.push('/chat'); return; }
      setGroup(gData);
      setEditName(gData.name);
      setEditDesc(gData.description || '');

      // Load members
      const { data: mData } = await supabase
        .from('group_members')
        .select('user_id, profiles:user_id(username, avatar_url, full_name)')
        .eq('group_id', groupId);
      
      if (!mData?.find(m => m.user_id === session.user.id)) {
        // user is not a member!
        router.push('/chat'); return;
      }
      setMembers(mData.map(m => m.profiles));

      // Load messages
      const { data: msgs } = await supabase
        .from('group_messages')
        .select('*, profiles:sender_id(username, avatar_url)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });
      setMessages(msgs || []);

      setLoading(false);
    };
    loadData();

    const channel = supabase.channel(`group_${groupId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` }, (payload) => {
        supabase.from('profiles').select('username, avatar_url').eq('id', payload.new.sender_id).single().then(({ data: profile }) => {
          setMessages(prev => {
            if (prev.find(m => m.id === payload.new.id)) return prev;
            return [...prev, { ...payload.new, profiles: profile }];
          });
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` }, (payload) => {
        setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_groups', filter: `id=eq.${groupId}` }, (payload) => {
        if (payload.eventType === 'UPDATE') setGroup(payload.new);
        if (payload.eventType === 'DELETE') router.push('/chat');
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_members', filter: `group_id=eq.${groupId}` }, (payload) => {
         supabase.from('profiles').select('username, avatar_url, full_name').eq('id', payload.new.user_id).single().then(({ data }) => {
            if (data) setMembers(prev => [...prev, data]);
         });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'group_members', filter: `group_id=eq.${groupId}` }, (payload) => {
         if (payload.old.user_id === session.user.id) router.push('/chat'); // I was kicked/left
         setMembers(prev => prev.filter(m => m.id !== payload.old.user_id));
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [session, groupId, router]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, mediaPreview]);

  // Click outside to close menus
  useEffect(() => {
    const handleClick = () => { setActiveMenu(null); setShowEmojis(false); };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return alert("Máximo 10MB");
    setMediaFile(file);
    setMediaPreview({ url: URL.createObjectURL(file), type: file.type.startsWith('video/') ? 'video' : 'image' });
  };

  const clearMedia = () => {
    setMediaFile(null); setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendMessage = async (e) => {
    e?.preventDefault();
    if ((!content.trim() && !mediaFile) || sending || uploading || !session) return;
    setSending(true);

    let mediaUrl = null; let mediaType = null;
    if (mediaFile) {
      setUploading(true);
      const fileExt = mediaFile.name.split('.').pop();
      const filePath = `groups/${groupId}/${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('chat-media').upload(filePath, mediaFile);
      if (!error) {
        mediaUrl = supabase.storage.from('chat-media').getPublicUrl(filePath).data.publicUrl;
        mediaType = mediaFile.type.startsWith('video/') ? 'video' : 'image';
      }
      setUploading(false); clearMedia();
    }

    const text = content.trim(); setContent(''); inputRef.current?.focus();

    if (editingMsg) {
      await supabase.from('group_messages').update({ content: text, edited: true }).eq('id', editingMsg.id);
      setEditingMsg(null);
    } else {
      const optimisticId = Date.now().toString();
      const optimisticMsg = {
        id: optimisticId, group_id: groupId, sender_id: session.user.id, content: text, media_url: mediaUrl, media_type: mediaType, created_at: new Date().toISOString(), optimistic: true, profiles: { username: session.user.user_metadata?.username, avatar_url: session.user.user_metadata?.avatar_url }
      };
      setMessages(prev => [...prev, optimisticMsg]);
      const { data, error } = await supabase.from('group_messages').insert({ group_id: groupId, sender_id: session.user.id, content: text, media_url: mediaUrl, media_type: mediaType }).select('*, profiles:sender_id(username, avatar_url)').single();
      if (!error && data) setMessages(prev => prev.map(m => m.id === optimisticId ? data : m));
      else setMessages(prev => prev.filter(m => m.id !== optimisticId));
    }
    setSending(false);
  };

  const deleteMessage = async (msgId) => {
    if (!confirm('¿Eliminar mensaje?')) return;
    await supabase.from('group_messages').update({ deleted: true, content: 'Mensaje eliminado' }).eq('id', msgId);
  };

  // --- Group Settings Functions ---
  const isOwner = group?.owner_id === session?.user?.id;

  const updateGroup = async () => {
    if (!isOwner) return;
    await supabase.from('chat_groups').update({ name: editName, description: editDesc }).eq('id', groupId);
  };

  const uploadGroupAvatar = async (e) => {
    if (!isOwner) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const filePath = `groups/${groupId}/avatar_${Date.now()}.png`;
    await supabase.storage.from('chat-media').upload(filePath, file);
    const url = supabase.storage.from('chat-media').getPublicUrl(filePath).data.publicUrl;
    await supabase.from('chat_groups').update({ avatar_url: url }).eq('id', groupId);
  };

  const searchUsersToAdd = async (q) => {
    setSearchNewUser(q);
    if (q.length < 2) { setUserResults([]); return; }
    const { data } = await supabase.from('profiles').select('id, username, avatar_url').ilike('username', `%${q}%`).limit(5);
    setUserResults(data?.filter(u => !members.find(m => m.id === u.id)) || []);
  };

  const addUser = async (userId) => {
    await supabase.from('group_members').insert({ group_id: groupId, user_id: userId });
    setSearchNewUser(''); setUserResults([]);
  };

  const leaveGroup = async () => {
    if (isOwner && members.length > 1) {
      return alert("Eres el dueño. Transfiere el grupo o elimínalo.");
    }
    if (confirm("¿Seguro que quieres salir del grupo?")) {
      await supabase.from('group_members').delete().match({ group_id: groupId, user_id: session.user.id });
      router.push('/chat');
    }
  };

  const deleteGroup = async () => {
    if (!isOwner) return;
    if (confirm("¿Estás seguro de que deseas ELIMINAR el grupo para todos? Esta acción no se puede deshacer.")) {
      await supabase.from('chat_groups').delete().eq('id', groupId);
      router.push('/chat');
    }
  };

  const formatTime = (ts) => new Date(ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

  if (!session || !group) return <div className="h-screen w-full flex items-center justify-center"><Loader2 className="w-8 h-8 text-tiktok-red animate-spin" /></div>;

  return (
    <div className={`flex h-screen w-full overflow-hidden transition-colors duration-300 ${isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}`}>
      
      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${showSidebar ? 'mr-0 lg:mr-80' : ''}`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b shrink-0 z-20 shadow-sm ${isDark ? 'border-white/5 bg-[#0a0a0a]/90 backdrop-blur-md' : 'border-black/5 bg-white/90 backdrop-blur-md'}`}>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/chat')} className={`p-2 rounded-full transition-all hover:scale-110 active:scale-90 ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setShowSidebar(true)}>
              <div className={`w-10 h-10 rounded-xl overflow-hidden shrink-0 ${isDark ? 'bg-white/10' : 'bg-black/5'}`}>
                {group.avatar_url ? <img src={group.avatar_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="group" /> : <Users className="w-full h-full p-2 opacity-50" />}
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-sm truncate group-hover:text-tiktok-red transition-colors">{group.name}</h2>
                <p className={`text-xs truncate ${isDark ? 'text-white/40' : 'text-black/40'}`}>{members.length} miembros</p>
              </div>
            </div>
          </div>
          <button onClick={() => setShowSidebar(!showSidebar)} className={`p-2 rounded-full transition-all ${showSidebar ? 'bg-tiktok-red text-white' : isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}>
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 custom-scrollbar relative">
          {messages.map((msg, i) => {
            const isMe = msg.sender_id === session.user.id;
            const prev = messages[i - 1];
            const showSender = !isMe && (!prev || prev.sender_id !== msg.sender_id);
            
            return (
              <div key={msg.id} className={`flex items-end gap-2 group/msg ${isMe ? 'justify-end flex-row-reverse' : 'justify-start'}`}>
                {!isMe && (
                  showSender ? (
                    <img src={msg.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.profiles?.username}`} className="w-7 h-7 rounded-full shrink-0 mb-1" alt="avatar" />
                  ) : <div className="w-7 h-7 shrink-0" />
                )}

                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                  {showSender && !msg.deleted && <span className={`text-[10px] font-bold mb-1 ml-1 ${isDark ? 'text-white/40' : 'text-black/40'}`}>@{msg.profiles?.username}</span>}
                  
                  <div className={`relative rounded-2xl flex flex-col shadow-sm transition-all ${msg.optimistic ? 'opacity-60' : 'opacity-100'} ${
                      isMe ? 'bg-tiktok-red text-white rounded-br-sm' : isDark ? 'bg-white/10 text-white rounded-bl-sm' : 'bg-gray-100 text-black rounded-bl-sm'
                    } ${msg.deleted ? 'bg-transparent border border-dashed !text-gray-400 italic' : ''}`}
                  >
                    {!msg.deleted && msg.media_url && (
                      <div className="p-1">
                        {msg.media_type === 'video' ? <video src={msg.media_url} controls className="max-w-full rounded-xl max-h-[300px]" /> : <img src={msg.media_url} className="max-w-full rounded-xl max-h-[300px] object-cover" alt="media" />}
                      </div>
                    )}
                    {msg.content && <div className="px-3 py-2 text-sm whitespace-pre-wrap break-words">{msg.content}</div>}
                    {!msg.deleted && msg.edited && <span className="text-[10px] opacity-60 px-3 pb-1 -mt-1 text-right block">editado</span>}
                  </div>
                </div>

                {/* Context Menu for sender */}
                {isMe && !msg.deleted && !msg.optimistic && (
                  <div className="relative opacity-0 group-hover/msg:opacity-100 transition-opacity mb-1">
                    <button onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === msg.id ? null : msg.id); }} className={`p-1 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}><MoreVertical className="w-4 h-4 opacity-50" /></button>
                    {activeMenu === msg.id && (
                      <div className={`absolute bottom-6 right-0 z-50 w-32 rounded-xl shadow-xl border overflow-hidden animate-in zoom-in-95 ${isDark ? 'bg-[#111] border-white/10' : 'bg-white border-black/10'}`}>
                        {!msg.media_url && <button onClick={() => { setEditingMsg(msg); setContent(msg.content); setActiveMenu(null); inputRef.current?.focus(); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}><Edit2 className="w-3.5 h-3.5" /> Editar</button>}
                        <button onClick={() => { deleteMessage(msg.id); setActiveMenu(null); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}><Trash2 className="w-3.5 h-3.5" /> Eliminar</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <form onSubmit={sendMessage} className={`shrink-0 flex items-end gap-2 px-4 py-3 border-t z-20 ${isDark ? 'border-white/5 bg-[#0a0a0a]' : 'border-black/5 bg-white'}`}>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*,.gif" className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} className={`p-2.5 rounded-full transition-all hover:scale-110 active:scale-95 shrink-0 mb-1 ${isDark ? 'text-white/50 hover:bg-white/10' : 'text-black/50 hover:bg-black/5'}`}><Paperclip className="w-5 h-5" /></button>
          
          <div className="relative flex-1">
            <textarea
              ref={inputRef} value={content} onChange={e => setContent(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }}
              placeholder="Enviar a grupo..."
              className={`w-full px-4 py-3 pr-10 rounded-2xl text-sm outline-none transition-all border focus:ring-2 focus:ring-tiktok-red/30 focus:border-tiktok-red resize-none min-h-[44px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30' : 'bg-gray-100 border-transparent text-black placeholder:text-black/40 focus:bg-white'}`}
              rows={1} style={{ height: content ? 'auto' : '44px' }}
            />
            <div className="absolute right-2 bottom-2 z-50">
              <button type="button" onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); setShowEmojis(!showEmojis); }} className={`p-1.5 rounded-full transition-colors ${isDark ? 'text-white/40 hover:text-white' : 'text-black/40 hover:text-black'}`}><Smile className="w-5 h-5" /></button>
              {showEmojis && (
                <div className={`absolute bottom-10 right-0 p-2 rounded-2xl shadow-2xl border w-64 grid grid-cols-5 gap-1 animate-in zoom-in-95 ${isDark ? 'bg-[#111] border-white/10' : 'bg-white border-black/10'}`} onPointerDown={e => e.stopPropagation()}>
                  {EMOJIS.map(e => <button key={e} type="button" onPointerDown={(evt) => { evt.preventDefault(); evt.stopPropagation(); setContent(prev => prev + e); setShowEmojis(false); setTimeout(() => inputRef.current?.focus(), 10); }} className={`text-2xl p-1 rounded-xl hover:scale-125 transition-transform ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>{e}</button>)}
                </div>
              )}
            </div>
          </div>
          <button type="submit" disabled={(!content.trim() && !mediaFile) || sending || uploading} className="w-11 h-11 mb-0.5 shrink-0 flex items-center justify-center bg-tiktok-red rounded-full text-white disabled:opacity-40 hover:scale-110 active:scale-90 transition-all shadow-md"><Send className="w-5 h-5" /></button>
        </form>
      </div>

      {/* Settings Sidebar Overlay for Mobile / Fixed for Desktop */}
      {showSidebar && (
        <div className={`absolute lg:relative right-0 top-0 bottom-0 w-full lg:w-80 border-l z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 ${isDark ? 'bg-[#111] border-white/5' : 'bg-white border-black/5'}`}>
          <div className={`p-4 border-b flex items-center justify-between shrink-0 ${isDark ? 'border-white/5' : 'border-black/5'}`}>
            <h3 className="font-bold text-lg">Info. del Grupo</h3>
            <button onClick={() => setShowSidebar(false)} className={`p-2 rounded-full lg:hidden ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}><X className="w-5 h-5" /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 custom-scrollbar">
            {/* Header info */}
            <div className="flex flex-col items-center text-center gap-3">
              <div className="relative group cursor-pointer" onClick={() => isOwner && avatarInputRef.current?.click()}>
                <div className={`w-24 h-24 rounded-2xl overflow-hidden shadow-lg border-2 ${isDark ? 'border-white/10 bg-white/5' : 'border-black/5 bg-black/5'}`}>
                   {group.avatar_url ? <img src={group.avatar_url} className="w-full h-full object-cover" alt="group" /> : <Users className="w-full h-full p-5 opacity-50" />}
                </div>
                {isOwner && (
                  <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ImageIcon className="w-8 h-8 text-white" />
                  </div>
                )}
                <input type="file" ref={avatarInputRef} onChange={uploadGroupAvatar} accept="image/*" className="hidden" />
              </div>
              
              {isOwner ? (
                <div className="w-full space-y-2">
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} onBlur={updateGroup} className={`w-full text-center font-bold text-lg rounded-lg p-1 border-transparent focus:border-tiktok-red focus:ring-1 focus:ring-tiktok-red outline-none bg-transparent ${isDark ? 'text-white' : 'text-black'}`} />
                  <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} onBlur={updateGroup} placeholder="Añade una descripción..." className={`w-full text-center text-sm rounded-lg p-1 border-transparent focus:border-tiktok-red focus:ring-1 focus:ring-tiktok-red outline-none resize-none bg-transparent ${isDark ? 'text-white/60' : 'text-black/60'}`} rows={2} />
                </div>
              ) : (
                <div>
                  <h2 className="font-bold text-xl">{group.name}</h2>
                  <p className={`text-sm mt-1 ${isDark ? 'text-white/60' : 'text-black/60'}`}>{group.description}</p>
                </div>
              )}
            </div>

            {/* Invite */}
            <div className="space-y-3">
              <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-black/40'}`}>Añadir Miembros</h4>
              <div className="relative">
                <UserPlus className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-white/40' : 'text-black/40'}`} />
                <input type="text" value={searchNewUser} onChange={e => searchUsersToAdd(e.target.value)} placeholder="Buscar usuario..." className={`w-full py-2.5 pl-9 pr-3 rounded-xl text-sm outline-none border focus:border-tiktok-red ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10 text-black'}`} />
              </div>
              {userResults.length > 0 && (
                <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-white/10' : 'border-black/10'}`}>
                  {userResults.map(u => (
                    <div key={u.id} className={`flex items-center justify-between p-2 ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}>
                      <div className="flex items-center gap-2">
                        <img src={u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} className="w-8 h-8 rounded-full" alt="avatar" />
                        <span className="text-sm font-bold truncate max-w-[100px]">@{u.username}</span>
                      </div>
                      <button onClick={() => addUser(u.id)} className="text-xs bg-tiktok-red text-white px-2 py-1 rounded-lg hover:scale-105 transition-transform">Añadir</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Members List */}
            <div className="space-y-3 flex-1">
              <h4 className={`text-xs font-bold uppercase tracking-wider flex justify-between ${isDark ? 'text-white/40' : 'text-black/40'}`}>
                <span>Miembros</span>
                <span>{members.length}</span>
              </h4>
              <div className="flex flex-col gap-2">
                {members.map(m => (
                  <div key={m.username} className={`flex items-center justify-between p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}>
                    <Link href={`/profile/${m.username}`} className="flex items-center gap-3">
                      <img src={m.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.username}`} className="w-10 h-10 rounded-full object-cover shadow-sm" alt="avatar" />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">@{m.username}</span>
                        {group.owner_id === m.id && <span className="text-[10px] text-tiktok-red font-black uppercase">Administrador</span>}
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Danger Zone */}
            <div className="pt-4 border-t space-y-2 shrink-0">
              <button onClick={leaveGroup} className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl font-bold transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-black/5 hover:bg-black/10 text-black'}`}>
                <LogOut className="w-4 h-4" /> Salir del grupo
              </button>
              {isOwner && (
                <button onClick={deleteGroup} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl font-bold bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors">
                  <ShieldAlert className="w-4 h-4" /> Eliminar Grupo
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
