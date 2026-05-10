import Link from 'next/link';
import { login } from './actions';

export default function LoginPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-tiktok-black px-4">
      <div className="w-full max-w-md bg-[#121212] p-8 rounded-2xl border border-tiktok-dark-hover shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Iniciar Sesión</h1>
          <p className="text-tiktok-gray">Bienvenido de nuevo a TikTok Clone</p>
        </div>

        <form className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="email">
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full bg-[#1e1e1e] border border-tiktok-dark-hover rounded-xl px-4 py-3 text-white focus:outline-none focus:border-tiktok-red transition-colors"
              placeholder="tu@correo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full bg-[#1e1e1e] border border-tiktok-dark-hover rounded-xl px-4 py-3 text-white focus:outline-none focus:border-tiktok-red transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            formAction={login}
            className="w-full bg-tiktok-red hover:bg-[#e0254b] text-white font-bold py-3 rounded-xl transition-colors mt-2"
          >
            Entrar
          </button>
        </form>

        <div className="mt-6 text-center text-tiktok-gray text-sm">
          ¿No tienes una cuenta?{' '}
          <Link href="/register" className="text-tiktok-red hover:underline font-semibold">
            Regístrate aquí
          </Link>
        </div>
      </div>
    </div>
  );
}
