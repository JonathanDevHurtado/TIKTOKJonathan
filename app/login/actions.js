'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '../../utils/supabase/server';

export async function login(formData) {
  const supabase = await createClient();

  const data = {
    email: formData.get('email'),
    password: formData.get('password'),
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    // Manejo básico de error (podría mejorarse devolviendo el error al frontend)
    redirect('/login?error=Could not authenticate user');
  }

  revalidatePath('/', 'layout');
  redirect('/');
}
