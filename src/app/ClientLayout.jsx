"use client"
import { Sidebar, BottomNav } from '../components/Sidebar';
import { useSession } from './SessionProvider';

export default function ClientLayout({ children }) {
  const session = useSession();

  return (
    <div className="bg-tiktok-black text-tiktok-text overflow-hidden h-screen w-screen flex flex-col md:flex-row">
      <div className="hidden md:block h-full border-r border-tiktok-dark-hover bg-tiktok-black flex-shrink-0">
        <Sidebar session={session} />
      </div>
      <main className="flex-1 h-full overflow-y-auto no-scrollbar relative">
        {children}
      </main>
      <div className="md:hidden fixed bottom-0 w-full z-50 bg-tiktok-black border-t border-tiktok-dark-hover pb-safe">
        <BottomNav session={session} />
      </div>
    </div>
  );
}
