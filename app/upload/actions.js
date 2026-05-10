'use server';

import { createClient } from '../../utils/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function uploadVideo(formData) {
  const supabase = await createClient();

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const file = formData.get('video_file');
  const description = formData.get('description');
  const categoryId = formData.get('category_id');

  if (!file || file.size === 0) {
    throw new Error('Debes subir un archivo de video');
  }

  // 1. Subir a Supabase Storage
  // Nota: asegúrate de haber creado el bucket "videos"
  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}_${Math.random()}.${fileExt}`;
  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from('videos')
    .upload(fileName, file);

  if (uploadError) {
    console.error(uploadError);
    throw new Error('Error al subir el video');
  }

  // Obtener URL pública
  const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(fileName);

  // 2. Insertar en base de datos
  const { error: dbError } = await supabase.from('videos').insert({
    user_id: user.id,
    video_url: publicUrl,
    description: description,
    category_id: categoryId || null
  });

  if (dbError) {
    console.error(dbError);
    throw new Error('Error al guardar datos del video');
  }

  revalidatePath('/');
  redirect('/profile/me');
}
