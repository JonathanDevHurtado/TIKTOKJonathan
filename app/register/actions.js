'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '../../utils/supabase/server';

export async function signup(formData) {
  const supabase = await createClient();

  const data = {
    email: formData.get('email'),
    password: formData.get('password'),
    options: {
      data: {
        username: formData.get('username'),
      }
    }
  };

  const { error } = await supabase.auth.signUp(data);

  if (error) {
    redirect('/register?error=Could not authenticate user');
  }

  revalidatePath('/', 'layout');
  redirect('/');
}
