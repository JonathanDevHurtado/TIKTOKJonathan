"use client"
import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabase';
import { useSession } from '../SessionProvider';
import { useTheme } from '../../context/ThemeContext';
import { Heart, MessageCircle, UserPlus, MessageSquare, Bell } from 'lucide-react';
import Link from 'next/link';

export default function NotificationsPage() {
  const session = useSession();
  const { theme } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select(`*, actor:actor_id(username, avatar_url), video:video_id(video_url)`)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      
      setNotifications(data || []);
      setLoading(false);

      // Mark as read
      await supabase.from('notifications').update({ read: true }).eq('user_id', session.user.id).eq('read', false);
    };

    fetchNotifications();

    const channel = supabase.channel('notifications_page')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` }, (payload) => {
        // Fetch actor data for the new notification
        supabase.from('profiles').select('username, avatar_url').eq('id', payload.new.actor_id).single().then(({ data: actor }) => {
          if (payload.new.video_id) {
            supabase.from('videos').select('video_url').eq('id', payload.new.video_id).single().then(({ data: video }) => {
              setNotifications(prev => [{ ...payload.new, actor, video }, ...prev]);
            });
          } else {
            setNotifications(prev => [{ ...payload.new, actor }, ...prev]);
          }
        });
        // Mark this new one as read since we are on the page
        supabase.from('notifications').update({ read: true }).eq('id', payload.new.id);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [session]);

  const isDark = theme === 'dark';

  if (!session) return null;

  const getIcon = (type) => {
    switch(type) {
      case 'like': return <Heart className="w-6 h-6 text-tiktok-red fill-current" />;
      case 'comment': return <MessageCircle className="w-6 h-6 text-tiktok-cyan fill-current" />;
      case 'follow': return <UserPlus className="w-6 h-6 text-blue-500 fill-current" />;
      case 'message': return <MessageSquare className="w-6 h-6 text-green-500 fill-current" />;
      default: return <Bell className="w-6 h-6 text-gray-500 fill-current" />;
    }
  };

  const getMessage = (notif) => {
    switch(notif.type) {
      case 'like': return 'le ha gustado tu video.';
      case 'comment': return `ha comentado: "${notif.message}"`;
      case 'follow': return 'ha empezado a seguirte.';
      case 'message': return `te ha enviado un mensaje: "${notif.message}"`;
      default: return 'nueva notificación.';
    }
  };

  const formatTime = (dateString) => {
    const diff = new Date() - new Date(dateString);
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `hace ${days} d`;
    if (hours > 0) return `hace ${hours} h`;
    if (mins > 0) return `hace ${mins} m`;
    return 'ahora';
  };

  return (
    <div className={`w-full max-w-2xl mx-auto min-h-screen pb-24 transition-colors duration-300 ${isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}`}>
      <div className={`sticky top-0 z-30 px-4 py-5 border-b backdrop-blur-xl transition-colors ${isDark ? 'bg-[#0a0a0a]/90 border-white/5' : 'bg-white/90 border-black/5'}`}>
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
          <Bell className="w-6 h-6 text-tiktok-red" />
          Bandeja de Entrada
        </h1>
      </div>

      <div className="flex flex-col">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-tiktok-red border-t-transparent rounded-full" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 opacity-40">
            <Bell className="w-16 h-16 mb-4" />
            <p className="font-bold text-lg">No hay notificaciones</p>
            <p className="text-sm">Las notificaciones sobre likes, comentarios y seguidores aparecerán aquí.</p>
          </div>
        ) : (
          <div className="divide-y transition-colors duration-300 animate-in fade-in slide-in-from-bottom-4 pt-2">
            {notifications.map((notif, i) => (
              <div 
                key={notif.id} 
                className={`flex items-start gap-4 p-4 transition-all duration-300 hover:scale-[1.01] ${!notif.read ? (isDark ? 'bg-tiktok-red/10' : 'bg-tiktok-red/5') : (isDark ? 'hover:bg-white/5' : 'hover:bg-black/5')}`}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <Link href={`/profile/${notif.actor?.username}`} className="relative shrink-0 mt-1 hover:scale-110 transition-transform">
                  <img 
                    src={notif.actor?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${notif.actor?.username}`} 
                    className="w-12 h-12 rounded-full object-cover shadow-md"
                    alt="avatar"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full shadow-sm scale-90">
                    {getIcon(notif.type)}
                  </div>
                </Link>

                <div className="flex-1 min-w-0 flex flex-col justify-center min-h-[3rem]">
                  <p className="text-sm">
                    <Link href={`/profile/${notif.actor?.username}`} className="font-bold hover:underline">{notif.actor?.username}</Link>{' '}
                    <span className={isDark ? 'opacity-80' : 'opacity-70'}>{getMessage(notif)}</span>
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? 'text-white/40' : 'text-black/40'}`}>{formatTime(notif.created_at)}</p>
                </div>

                {notif.video?.video_url && notif.type !== 'follow' && notif.type !== 'message' && (
                  <Link href={`/video/${notif.video_id}`} className="shrink-0 hover:scale-105 transition-transform hover:shadow-lg rounded-md overflow-hidden">
                    <video src={notif.video.video_url} className="w-12 h-16 object-cover pointer-events-none" />
                  </Link>
                )}
                
                {notif.type === 'message' && (
                  <Link href={`/chat/${notif.actor_id}`} className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-tiktok-red text-white hover:scale-110 active:scale-95 transition-transform shadow-md hover:shadow-tiktok-red/40">
                    <MessageSquare className="w-4 h-4 fill-current" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
