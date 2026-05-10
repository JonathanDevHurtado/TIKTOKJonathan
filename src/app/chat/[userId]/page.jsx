"use client"
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../utils/supabase';
import { useSession } from '../../SessionProvider';
import { useTheme } from '../../../context/ThemeContext';
import { ChevronLeft, Send, Loader2, MessageCircle, Image as ImageIcon, Smile, MoreVertical, Edit2, Trash2, Paperclip, X } from 'lucide-react';
import Link from 'next/link';

export default function ChatPage() {
  const { userId } = useParams();
  const router = useRouter();
  const session = useSession();
  const { theme } = useTheme();
  
  const [messages, setMessages] = useState([]);
  const [otherUser, setOtherUser] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  
  // Media upload state
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Edit/Delete state
  const [editingMsg, setEditingMsg] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const isDark = theme === 'dark';

  const EMOJIS = ['😂','❤️','🥺','🔥','😍','😊','🥰','✨','👍','🙏','😭','👀','🎉','💯','😎'];

  useEffect(() => {
    if (!session) { router.push('/login'); return; }

    const loadData = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, full_name')
        .eq('id', userId)
        .single();
      setOtherUser(profile);

      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${session.user.id})`)
        .order('created_at', { ascending: true });
      setMessages(msgs || []);

      await supabase.from('messages').update({ read: true })
        .eq('sender_id', userId).eq('receiver_id', session.user.id).eq('read', false);

      setLoading(false);
    };
    loadData();

    const channel = supabase.channel(`chat_${[session.user.id, userId].sort().join('_')}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          if (payload.new.sender_id === userId || payload.new.receiver_id === userId) {
            setMessages(prev => {
              if (prev.find(m => m.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });
            if (payload.new.sender_id === userId) {
              supabase.from('messages').update({ read: true }).eq('id', payload.new.id);
            }
          }
        } else if (payload.eventType === 'UPDATE') {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [session, userId, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, mediaPreview]);

  // Click outside to close menus
  useEffect(() => {
    const handleClick = () => { setActiveMenu(null); setShowEmojis(false); };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert("El archivo no puede pesar más de 10MB");
      return;
    }

    setMediaFile(file);
    const url = URL.createObjectURL(file);
    setMediaPreview({ url, type: file.type.startsWith('video/') ? 'video' : 'image' });
  };

  const clearMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendMessage = async (e) => {
    e?.preventDefault();
    if ((!content.trim() && !mediaFile) || sending || uploading || !session) return;
    setSending(true);

    let mediaUrl = null;
    let mediaType = null;

    if (mediaFile) {
      setUploading(true);
      const fileExt = mediaFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, mediaFile);

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(filePath);
        mediaUrl = publicUrl;
        mediaType = mediaFile.type.startsWith('video/') ? 'video' : 'image';
      }
      setUploading(false);
      clearMedia();
    }

    const text = content.trim();
    setContent('');
    inputRef.current?.focus();

    if (editingMsg) {
      // Edit existing message
      await supabase.from('messages').update({ 
        content: text, 
        edited: true 
      }).eq('id', editingMsg.id);
      setEditingMsg(null);
    } else {
      // Send new message
      const optimisticId = Date.now().toString();
      const optimisticMsg = {
        id: optimisticId,
        sender_id: session.user.id,
        receiver_id: userId,
        content: text,
        media_url: mediaUrl,
        media_type: mediaType,
        created_at: new Date().toISOString(),
        read: false,
        optimistic: true
      };
      setMessages(prev => [...prev, optimisticMsg]);

      const { data, error } = await supabase.from('messages').insert({
        sender_id: session.user.id,
        receiver_id: userId,
        content: text,
        media_url: mediaUrl,
        media_type: mediaType
      }).select().single();

      if (!error && data) {
        setMessages(prev => prev.map(m => m.id === optimisticId ? data : m));
        supabase.from('notifications').insert({ user_id: userId, actor_id: session.user.id, type: 'message', message: text || (mediaUrl ? '[Archivo adjunto]' : '') }).then();
      } else {
        setMessages(prev => prev.filter(m => m.id !== optimisticId));
      }
    }
    setSending(false);
  };

  const deleteMessage = async (msgId) => {
    if (!confirm('¿Eliminar mensaje para todos?')) return;
    await supabase.from('messages').update({ deleted: true, content: 'Este mensaje fue eliminado' }).eq('id', msgId);
  };

  const startEdit = (msg) => {
    setEditingMsg(msg);
    setContent(msg.content);
    inputRef.current?.focus();
  };

  const cancelEdit = () => {
    setEditingMsg(null);
    setContent('');
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  };

  if (!session) return null;

  return (
    <div className={`flex flex-col h-screen w-full transition-colors duration-300 ${isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}`}>
      {/* Header */}
      <div className={`flex items-center gap-3 px-4 py-3 border-b shrink-0 z-20 shadow-sm ${isDark ? 'border-white/5 bg-[#0a0a0a]/90 backdrop-blur-md' : 'border-black/5 bg-white/90 backdrop-blur-md'}`}>
        <button onClick={() => router.push('/chat')} className={`p-2 rounded-full transition-all hover:scale-110 active:scale-90 ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        {otherUser ? (
          <Link href={`/profile/${otherUser.username}`} className="flex items-center gap-3 group">
            <img
              src={otherUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser.username}`}
              className="w-10 h-10 rounded-full object-cover border-2 border-transparent group-hover:border-tiktok-red transition-all"
              alt={otherUser.username}
            />
            <div>
              <p className="font-bold text-sm group-hover:text-tiktok-red transition-colors">@{otherUser.username}</p>
              {otherUser.full_name && <p className={`text-xs ${isDark ? 'text-white/40' : 'text-black/40'}`}>{otherUser.full_name}</p>}
            </div>
          </Link>
        ) : (
          <div className={`w-32 h-4 rounded-full animate-pulse ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2 custom-scrollbar relative">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-tiktok-red animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 opacity-40 text-center">
            <MessageCircle className="w-12 h-12" />
            <p className="font-medium">Empieza la conversación</p>
            <p className="text-sm">Di hola a @{otherUser?.username}</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.sender_id === session.user.id;
            const prev = messages[i - 1];
            const showTime = !prev || new Date(msg.created_at) - new Date(prev.created_at) > 5 * 60 * 1000;
            
            return (
              <div key={msg.id}>
                {showTime && (
                  <p className={`text-center text-[10px] my-3 font-semibold uppercase ${isDark ? 'text-white/30' : 'text-black/40'}`}>
                    {formatTime(msg.created_at)}
                  </p>
                )}
                <div className={`flex items-end gap-2 group/msg ${isMe ? 'justify-end flex-row-reverse' : 'justify-start'}`}>
                  
                  {/* Message Bubble */}
                  <div className={`relative max-w-[75%] rounded-2xl flex flex-col shadow-sm transition-all ${msg.optimistic ? 'opacity-60' : 'opacity-100'} ${
                      isMe ? 'bg-tiktok-red text-white rounded-br-sm' : isDark ? 'bg-white/10 text-white rounded-bl-sm' : 'bg-gray-100 text-black rounded-bl-sm'
                    } ${msg.deleted ? 'bg-transparent border border-dashed !text-gray-400 italic' : ''}`}
                  >
                    {!msg.deleted && msg.media_url && (
                      <div className="p-1">
                        {msg.media_type === 'video' ? (
                          <video src={msg.media_url} controls className="max-w-full rounded-xl max-h-[300px]" />
                        ) : (
                          <img src={msg.media_url} className="max-w-full rounded-xl max-h-[300px] object-cover" alt="media" />
                        )}
                      </div>
                    )}
                    
                    {msg.content && (
                      <div className="px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {msg.content}
                      </div>
                    )}

                    {!msg.deleted && msg.edited && (
                      <span className="text-[10px] opacity-60 px-4 pb-1 -mt-1 text-right">editado</span>
                    )}
                  </div>

                  {/* Context Menu for sender */}
                  {isMe && !msg.deleted && !msg.optimistic && (
                    <div className="relative opacity-0 group-hover/msg:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === msg.id ? null : msg.id); }}
                        className={`p-1.5 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                      >
                        <MoreVertical className="w-4 h-4 opacity-50" />
                      </button>
                      
                      {activeMenu === msg.id && (
                        <div className={`absolute bottom-8 right-0 z-50 w-32 rounded-xl shadow-xl border overflow-hidden animate-in zoom-in-95 ${isDark ? 'bg-[#111] border-white/10' : 'bg-white border-black/10'}`}>
                          {!msg.media_url && (
                            <button onClick={() => { startEdit(msg); setActiveMenu(null); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>
                              <Edit2 className="w-3.5 h-3.5" /> Editar
                            </button>
                          )}
                          <button onClick={() => { deleteMessage(msg.id); setActiveMenu(null); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>
                            <Trash2 className="w-3.5 h-3.5" /> Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Editing indicator */}
      {editingMsg && (
        <div className={`px-4 py-2 flex items-center justify-between text-xs border-t ${isDark ? 'bg-white/5 border-white/5 text-white/70' : 'bg-black/5 border-black/5 text-black/70'}`}>
          <div className="flex items-center gap-2">
            <Edit2 className="w-3 h-3" />
            <span>Editando mensaje</span>
          </div>
          <button onClick={cancelEdit} className="hover:underline">Cancelar</button>
        </div>
      )}

      {/* Media Preview */}
      {mediaPreview && (
        <div className={`px-4 py-3 flex items-start gap-3 border-t ${isDark ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
          <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-black/20">
            {mediaPreview.type === 'video' ? (
              <video src={mediaPreview.url} className="w-full h-full object-cover" />
            ) : (
              <img src={mediaPreview.url} className="w-full h-full object-cover" alt="preview" />
            )}
            <button onClick={clearMedia} className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 text-white shadow-lg transform hover:scale-110">
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1 text-xs opacity-50 mt-1">Archivo adjunto ({mediaFile.name})</div>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={sendMessage}
        className={`shrink-0 flex items-end gap-2 px-4 py-3 border-t z-20 ${isDark ? 'border-white/5 bg-[#0a0a0a]' : 'border-black/5 bg-white'}`}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*,video/*,.gif" 
          className="hidden" 
        />
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`p-2.5 rounded-full transition-all hover:scale-110 active:scale-95 shrink-0 mb-1 ${isDark ? 'text-white/50 hover:bg-white/10 hover:text-white' : 'text-black/50 hover:bg-black/5 hover:text-black'}`}
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <div className="relative flex-1">
          <textarea
            ref={inputRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e);
              }
            }}
            placeholder="Escribe un mensaje..."
            className={`w-full px-4 py-3 pr-10 rounded-2xl text-sm outline-none transition-all border focus:ring-2 focus:ring-tiktok-red/30 focus:border-tiktok-red resize-none max-h-32 min-h-[44px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30' : 'bg-gray-100 border-transparent text-black placeholder:text-black/40 focus:bg-white'}`}
            rows={1}
            style={{ height: content ? 'auto' : '44px' }}
          />
          
          {/* Emojis Toggle */}
          <div className="absolute right-2 bottom-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowEmojis(!showEmojis); }}
              className={`p-1.5 rounded-full transition-colors ${isDark ? 'text-white/40 hover:text-white' : 'text-black/40 hover:text-black'}`}
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Emoji Picker Popover */}
            {showEmojis && (
              <div 
                className={`absolute bottom-10 right-0 p-2 rounded-2xl shadow-2xl border w-64 grid grid-cols-5 gap-1 animate-in zoom-in-95 ${isDark ? 'bg-[#111] border-white/10' : 'bg-white border-black/10'}`}
                onClick={e => e.stopPropagation()}
              >
                {EMOJIS.map(e => (
                  <button 
                    key={e} 
                    type="button"
                    onClick={() => { setContent(prev => prev + e); setShowEmojis(false); inputRef.current?.focus(); }}
                    className={`text-2xl p-1 rounded-xl hover:scale-125 transition-transform ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={(!content.trim() && !mediaFile) || sending || uploading}
          className="w-11 h-11 mb-0.5 shrink-0 flex items-center justify-center bg-tiktok-red rounded-full text-white disabled:opacity-40 hover:scale-110 active:scale-90 transition-all shadow-md hover:shadow-tiktok-red/30"
        >
          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </form>
    </div>
  );
}
