import '../app/globals.css';
import { Sidebar, BottomNav } from '../components/Sidebar';

export const metadata = {
  title: 'TikTok Full-Stack Clone',
  description: 'A fully functional TikTok clone built with Next.js and Supabase',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="bg-tiktok-black text-tiktok-text overflow-hidden h-screen w-screen flex flex-col md:flex-row">
        
        {/* Desktop Sidebar */}
        <div className="hidden md:block h-full border-r border-tiktok-dark-hover bg-tiktok-black flex-shrink-0">
          <Sidebar />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 h-full overflow-y-auto no-scrollbar relative">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 w-full z-50 bg-tiktok-black border-t border-tiktok-dark-hover">
          <BottomNav />
        </div>

      </body>
    </html>
  );
}
