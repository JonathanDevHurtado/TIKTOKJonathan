'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, User, Plus } from 'lucide-react';

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

const NAV = [
  { id: 'home',    label: 'Para ti',  href: '/', Icon: Home },
  { id: 'explore', label: 'Explorar', href: '/explore', Icon: Compass },
  { id: 'profile', label: 'Mi perfil', href: '/profile/me', Icon: User },
];

export function Sidebar({ compact }) {
  const pathname = usePathname();

  return (
    <aside className={`h-full w-20 lg:w-60 flex flex-col justify-between py-5 px-2 lg:px-4 ${compact ? 'w-20' : ''}`}>
      <div className="flex flex-col gap-6">
        <Logo compact={compact} />
        <nav className="flex flex-col gap-2">
          {NAV.map(({ id, label, href, Icon }) => {
            const isActive = pathname === href || (id === 'profile' && pathname.startsWith('/profile'));
            return (
              <Link
                key={id}
                href={href}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group ${isActive ? 'text-tiktok-red' : 'text-tiktok-text hover:bg-tiktok-dark-hover'}`}
                title={compact ? label : ''}
              >
                <Icon className={`w-7 h-7 flex-shrink-0 transition-transform group-hover:scale-105 ${isActive ? 'fill-current' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                {!compact && <span className={`font-semibold text-lg hidden lg:block ${isActive ? 'text-tiktok-red' : ''}`}>{label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="px-2 w-full mt-4">
          <Link href="/upload" className="flex items-center justify-center gap-2 bg-tiktok-red hover:bg-[#e0254b] text-white p-3 rounded-xl transition-colors font-bold w-full">
            <Plus className="w-6 h-6" strokeWidth={3} />
            <span className="hidden lg:block">Subir</span>
          </Link>
        </div>
      </div>

      {!compact && <p className="text-xs text-tiktok-gray text-center hidden lg:block">© 2026 TikTok Clone</p>}
    </aside>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="flex justify-around items-center h-16 pb-safe">
      {NAV.map(({ id, label, href, Icon }) => {
        const isActive = pathname === href || (id === 'profile' && pathname.startsWith('/profile'));
        return (
          <Link
            key={id}
            href={href}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${isActive ? 'text-tiktok-text' : 'text-tiktok-gray hover:text-white'}`}
          >
            <Icon className={`w-6 h-6 ${isActive ? 'fill-current text-white' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
            <span className={`text-[10px] font-medium ${isActive ? 'font-bold text-white' : ''}`}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
