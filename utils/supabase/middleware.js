import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Si faltan las variables de entorno, no crasheamos el servidor con error 500.
  // Solo permitimos continuar la petición (aunque la auth no funcionará).
  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Faltan variables de entorno de Supabase (NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY). Configúralas en Vercel para que funcione el Middleware.')
    return supabaseResponse
  }

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Obtener usuario de manera segura
    const {
      data: { user },
      error
    } = await supabase.auth.getUser()

    // Si hay un error de fetch (por ejemplo URL de supabase inválida), retornamos normal
    if (error && error.status !== 401 && error.status !== 403 && error.status !== 400) {
      console.error('Error de Supabase auth en Middleware:', error)
      return supabaseResponse
    }

    // Lógica de protección de rutas
    const isUploadPath = request.nextUrl.pathname.startsWith('/upload')
    const isAuthPath = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register')

    // Si NO está logueado y va a una ruta privada
    if (!user && isUploadPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Si SÍ está logueado y va a una ruta de auth
    if (user && isAuthPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  } catch (error) {
    // Capturamos cualquier otro error inesperado en Edge Runtime
    console.error('Error inesperado en Middleware Edge Runtime:', error)
    return NextResponse.next({ request })
  }
}
