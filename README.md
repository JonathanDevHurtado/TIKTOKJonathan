# TikTokJonathan

Red social de videos cortos inspirada en TikTok. Es mi **proyecto de graduación** como Desarrollador Web: una aplicación completa con autenticación, subida de videos, feed vertical, perfiles, interacciones, chat y notificaciones.

**Autor:** Jonathan Hurtado
**Contacto:** [JonathanHurtadoDev@proton.me](mailto:JonathanHurtadoDev@proton.me)

> Proyecto académico. Funciona, pero no está pensado para producción tal cual: no incluye moderación de contenido, límites de subida ni configuración de despliegue.

## Funcionalidades

- **Feed vertical** de videos a pantalla completa, con scroll por rueda, teclado y gestos táctiles.
- **Autenticación** con Supabase: registro, inicio de sesión y sesión persistente.
- **Subida de videos** a Supabase Storage con categoría, descripción y vista previa.
- **Explorar**: búsqueda de videos y usuarios, categorías y sección de tendencias.
- **Perfiles**: avatar, nombre, biografía y cumpleaños; edición de perfil, seguidores y seguidos, videos publicados, me gusta y guardados.
- **Interacciones**: me gusta, guardados, comentarios, compartir y contador de reproducciones.
- **Chat**: mensajes directos 1:1 y chats grupales (crear grupo, añadir miembros, administración y salida del grupo).
- **Notificaciones** de me gusta, comentarios, seguidores y mensajes.
- **Bloqueo de usuarios**.
- **Tema claro/oscuro** y diseño responsive mobile-first.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 (App Router), React 19 |
| Estilos | Tailwind CSS 4, Lucide React |
| Backend / BaaS | Supabase (Auth, Postgres, Storage) |
| Base de datos | PostgreSQL con Row Level Security (RLS) |

## Estructura

```
src/
├── app/                  # Rutas (App Router)
│   ├── page.jsx          # Feed principal
│   ├── explore/          # Explorar y búsqueda
│   ├── upload/           # Subida de videos
│   ├── profile/          # Perfiles, seguidores y seguidos
│   ├── chat/             # Mensajes 1:1 y grupos
│   ├── notifications/    # Notificaciones
│   ├── login/            # Inicio de sesión
│   ├── register/         # Registro
│   └── video/[id]/       # Detalle y reproductor
├── components/           # VideoCard, Sidebar, EditProfileModal
├── context/              # Tema claro/oscuro
└── utils/supabase.js     # Cliente de Supabase
supabase/schema.sql       # Tablas, políticas RLS y buckets de Storage
```

## Puesta en marcha

### 1. Requisitos

- Node.js 20 o superior
- Un proyecto en [Supabase](https://supabase.com)

### 2. Instalación

```bash
git clone https://github.com/JonathanDevHurtado/TIKTOKJonathan.git
cd TIKTOKJonathan
npm install
```

### 3. Variables de entorno

```bash
cp .env.example .env.local
```

Rellena `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` con los valores de tu proyecto (Supabase → Settings → API).

### 4. Base de datos

Ejecuta `supabase/schema.sql` en el **SQL Editor** de Supabase. El script crea las tablas, las políticas RLS y los buckets `videos`, `avatars` y `chat-media`.

### 5. Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm start` | Servidor de producción |
| `npm run lint` | ESLint |

## Notas

- La clave `anon` de Supabase es pública por diseño: la seguridad depende de las políticas RLS incluidas en `supabase/schema.sql`.
- `test_db.cjs` es un script de comprobación de conexión. Usa las variables de entorno: `node --env-file=.env.local test_db.cjs`.
- La identidad visual de TikTok se usa únicamente con fines educativos.
