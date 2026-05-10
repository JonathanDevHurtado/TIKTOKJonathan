import { createClient } from '../utils/supabase/server';
import FeedClient from '../components/FeedClient';

// For local dev while DB is empty
import { VIDEOS } from '../data/videos';

export const revalidate = 0; // Dynamic route

export default async function Home() {
  const supabase = await createClient();

  // Obtener videos de la base de datos (con perfil del autor)
  const { data: dbVideos, error } = await supabase
    .from('videos')
    .select(`
      *,
      profiles (
        username,
        avatar_url
      )
    `)
    .order('created_at', { ascending: false });

  // Si hay error o la DB está vacía, mostrar los de prueba temporalmente para evitar que la app se rompa al inicio
  const videos = (dbVideos && dbVideos.length > 0) ? dbVideos : VIDEOS.map(v => ({...v, profiles: { username: v.user, avatar_url: v.avatar }}));

  return (
    <div className="h-full w-full bg-tiktok-black flex justify-center">
      <FeedClient initialVideos={videos} />
    </div>
  );
}
