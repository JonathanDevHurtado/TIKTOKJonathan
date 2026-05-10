"use client"
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, User, Plus, LogIn, MessageSquare, Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';

export function Logo({ compact }) {
  return (
    <Link href="/" className={`flex items-center gap-2 p-2 rounded-xl hover:bg-tiktok-dark-hover transition-colors w-fit ${compact ? 'mx-auto' : ''}`}>
      <span className="flex-shrink-0">
        <svg viewBox="0 0 48 48" fill="none" className="w-8 h-8">
          <path d="M33 8c0 5.523 4.477 10 10 10v8c-4.03 0-7.77-1.2-10.87-3.25V34c0 8.284-6.716 15-15 15S2 42.284 2 34s6.716-15 15-15c.688 0 1.364.046 2.027.135V27.4A7 7 0 0 0 17 27c-3.866 0-7 3.134-7 7s3.134 7 7 7 7-3.134 7-7V8h9z" fill="url(#lg)"/>
          <defs>
            <linearGradient id="lg" x1="2" y1="8" x2="43" y2="48" gradientUnits="userSpaceOnUse">
              <stop stopColor="#25f4ee"/>
              <stop offset="0.5" stopColor="#fe2c55"/>
              <stop offset="1" stopColor="#fe2c55"/>
            </linearGradient>
          </defs>
        </svg>
      </span>
      {!compact && <span className="font-bold text-2xl tracking-tight hidden lg:block">TikTok</span>}
    </Link>
  );
}

export function Sidebar({ compact, session }) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!session) return;
    
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('read', false);
      setUnreadCount(count || 0);
    };
    
    fetchUnread();

    const channel = supabase.channel('sidebar_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` }, () => {
        setUnreadCount(p => p + 1);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [session]);

  const NAV = [
    { id: 'home',          label: 'Inicio',       href: '/',                Icon: Home },
    { id: 'explore',       label: 'Explorar',     href: '/explore',         Icon: Compass },
    { id: 'chat',          label: 'Mensajes',     href: '/chat',            Icon: MessageSquare, requiresAuth: true },
    { id: 'notifications', label: 'Bandeja',      href: '/notifications',   Icon: Bell,          requiresAuth: true, badge: unreadCount },
    { id: 'profile',       label: session ? 'Mi perfil' : 'Registrarse', href: session ? '/profile/me' : '/register', Icon: session ? User : LogIn },
  ];

  return (
    <aside className={`h-full w-20 lg:w-60 flex flex-col justify-between py-5 px-2 lg:px-4 ${compact ? 'w-20' : ''} border-r border-[var(--border-primary)] bg-[var(--bg-primary)]`}>
      <div className="flex flex-col gap-6">
        <Logo compact={compact} />
        <nav className="flex flex-col gap-2">
          {NAV.map(({ id, label, href, Icon, requiresAuth, badge }) => {
            if (requiresAuth && !session) return null;
            const isActive = pathname === href || (id === 'profile' && pathname.startsWith('/profile')) || (id === 'chat' && pathname.startsWith('/chat'));
            
            return (
              <Link
                key={id}
                href={href}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group relative ${isActive ? 'text-tiktok-red' : 'text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'}`}
                title={compact ? label : ''}
              >
                <div className="relative">
                  <Icon className={`w-7 h-7 flex-shrink-0 transition-transform ${badge > 0 ? 'animate-wiggle' : 'group-hover:scale-110'} ${isActive ? 'fill-current' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-tiktok-red text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-md animate-in zoom-in">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                {!compact && <span className={`font-semibold text-lg hidden lg:block ${isActive ? 'text-tiktok-red' : ''}`}>{label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="px-2 w-full mt-4">
          <Link href={session ? "/upload" : "/login"} className="flex items-center justify-center gap-2 bg-tiktok-red hover:bg-[#e0254b] active:scale-95 text-white p-3 rounded-xl transition-all font-bold w-full hover:scale-105 hover:shadow-lg hover:shadow-tiktok-red/20">
            <Plus className="w-6 h-6" strokeWidth={3} />
            <span className="hidden lg:block">Subir</span>
          </Link>
        </div>
      </div>

      {!compact && <p className="text-xs text-[var(--text-secondary)] text-center hidden lg:block">© 2026 TikTok</p>}
    </aside>
  );
}

export function BottomNav({ session }) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!session) return;
    const fetchUnread = async () => {
      const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id).eq('read', false);
      setUnreadCount(count || 0);
    };
    fetchUnread();
    const channel = supabase.channel('bottom_notifications').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` }, () => { setUnreadCount(p => p + 1); }).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` }, () => { fetchUnread(); }).subscribe();
    return () => supabase.removeChannel(channel);
  }, [session]);

  const NAV = [
    { id: 'home',          label: 'Inicio',       href: '/',                Icon: Home },
    { id: 'explore',       label: 'Explorar',     href: '/explore',         Icon: Compass },
    { id: 'upload',        label: 'Subir',        href: session ? '/upload' : '/login', Icon: Plus, isCenter: true },
    { id: 'notifications', label: 'Bandeja',      href: '/notifications',   Icon: Bell,          requiresAuth: true, badge: unreadCount },
    { id: 'profile',       label: session ? 'Perfil' : 'Registro',  href: session ? '/profile/me' : '/register', Icon: session ? User : LogIn },
  ];

  return (
    <nav className="flex justify-around items-center h-16 w-full max-w-md mx-auto border-t border-[var(--border-primary)] bg-[var(--bg-primary)]">
      {NAV.map(({ id, label, href, Icon, isCenter, requiresAuth, badge }) => {
        if (requiresAuth && !session) return null;
        const isActive = pathname === href || (id === 'profile' && pathname.startsWith('/profile')) || (id === 'chat' && pathname.startsWith('/chat')) || (id === 'notifications' && pathname.startsWith('/notifications'));

        if (isCenter) {
          return (
            <Link key={id} href={href} className="flex flex-col items-center justify-center h-full px-2 group">
               <div className="bg-[var(--text-primary)] text-[var(--bg-primary)] h-8 px-4 rounded-lg flex items-center justify-center border-l-4 border-l-tiktok-cyan border-r-4 border-r-tiktok-red transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg active:scale-90 shadow-sm">
                  <Icon className="w-5 h-5 font-bold" strokeWidth={3} />
               </div>
            </Link>
          );
        }

        return (
          <Link
            key={id}
            href={href}
            className={`flex flex-col items-center justify-center h-full px-3 gap-1 transition-all duration-200 hover:scale-110 active:scale-95 ${isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            <div className="relative">
              <Icon className={`w-6 h-6 transition-transform ${badge > 0 ? 'animate-wiggle' : ''} ${isActive ? 'fill-current' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
              {badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-tiktok-red text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-md animate-in zoom-in">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-medium transition-all ${isActive ? 'font-bold' : ''}`}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
