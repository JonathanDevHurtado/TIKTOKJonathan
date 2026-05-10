import '../index.css';
import ClientLayout from './ClientLayout';
import { SessionProvider } from './SessionProvider';

export const metadata = {
  title: 'TikTok Clone',
  description: 'TikTok Clone built con Next.js',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <SessionProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </SessionProvider>
      </body>
    </html>
  );
}
