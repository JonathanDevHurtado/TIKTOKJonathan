"use client"
import { Sidebar, BottomNav } from '../components/Sidebar';
import { useSession } from './SessionProvider';
import { ThemeProvider } from '../context/ThemeContext';

export default function ClientLayout({ children }) {
  const session = useSession();

  return (
    <ThemeProvider>
      <div className="overflow-hidden h-screen w-screen flex flex-col md:flex-row bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <div className="hidden md:block h-full border-r border-[var(--border-primary)] bg-[var(--bg-primary)] flex-shrink-0">
          <Sidebar session={session} />
        </div>
        <main className="flex-1 h-full overflow-y-auto no-scrollbar relative">
          {children}
        </main>
        <div className="md:hidden fixed bottom-0 w-full z-50 bg-[var(--bg-primary)] border-t border-[var(--border-primary)] pb-safe">
          <BottomNav session={session} />
        </div>
      </div>
    </ThemeProvider>
  );
}
