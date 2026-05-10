"use client"
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../utils/supabase';
import { useSession } from '../../SessionProvider';
import { useTheme } from '../../../context/ThemeContext';
import { ChevronLeft, Send, Loader2, MessageCircle } from 'lucide-react';
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
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

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
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${session.user.id}`
      }, (payload) => {
        if (payload.new.sender_id === userId) {
          setMessages(prev => [...prev, payload.new]);
          supabase.from('messages').update({ read: true }).eq('id', payload.new.id);
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [session, userId, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!content.trim() || sending || !session) return;
    setSending(true);
    const optimistic = {
      id: Date.now().toString(),
      sender_id: session.user.id,
      receiver_id: userId,
      content: content.trim(),
      created_at: new Date().toISOString(),
      read: false,
      optimistic: true
    };
    setMessages(prev => [...prev, optimistic]);
    const text = content.trim();
    setContent('');
    inputRef.current?.focus();

    const { data, error } = await supabase.from('messages').insert({
      sender_id: session.user.id,
      receiver_id: userId,
      content: text
    }).select().single();

    if (!error && data) {
      setMessages(prev => prev.map(m => m.id === optimistic.id ? data : m));
    } else {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
    }
    setSending(false);
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  };

  const isDark = theme === 'dark';

  if (!session) return null;

  return (
    <div className={`flex flex-col h-screen w-full transition-colors duration-300 ${isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}`}>
      {/* Header */}
      <div className={`flex items-center gap-3 px-4 py-3 border-b shrink-0 ${isDark ? 'border-white/5 bg-[#0a0a0a]' : 'border-black/5 bg-white'}`}>
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
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
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
                  <p className={`text-center text-[10px] my-2 ${isDark ? 'text-white/20' : 'text-black/30'}`}>
                    {formatTime(msg.created_at)}
                  </p>
                )}
                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm transition-all ${
                      msg.optimistic ? 'opacity-60' : 'opacity-100'
                    } ${
                      isMe
                        ? 'bg-tiktok-red text-white rounded-br-sm'
                        : isDark
                          ? 'bg-white/10 text-white rounded-bl-sm'
                          : 'bg-black/5 text-black rounded-bl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        className={`shrink-0 flex items-center gap-3 px-4 py-3 border-t ${isDark ? 'border-white/5 bg-[#0a0a0a]' : 'border-black/5 bg-white'}`}
      >
        <input
          ref={inputRef}
          type="text"
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(e)}
          placeholder="Escribe un mensaje..."
          className={`flex-1 px-4 py-3 rounded-2xl text-sm outline-none transition-all border focus:ring-2 focus:ring-tiktok-red/30 focus:border-tiktok-red ${isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30' : 'bg-black/5 border-black/10 text-black placeholder:text-black/30'}`}
        />
        <button
          type="submit"
          disabled={!content.trim() || sending}
          className="w-11 h-11 flex items-center justify-center bg-tiktok-red rounded-full text-white disabled:opacity-40 hover:scale-110 active:scale-90 transition-all shadow-md hover:shadow-tiktok-red/30"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
