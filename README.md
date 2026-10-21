<p align="center">
  <img src="docs/assets/banner.svg" alt="TikTokJonathan — clon de TikTok con Next.js y Supabase" width="100%">
</p>

<h1 align="center">TikTokJonathan</h1>

<p align="center">
  Red social de videos cortos inspirada en TikTok.<br>
  <strong>Proyecto de graduación</strong> como Desarrollador Web: autenticación, subida de videos, feed vertical, perfiles, interacciones, chat y notificaciones.
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=000000">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white">
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-2-3FCF8E?logo=supabase&logoColor=white">
  <img alt="Estado" src="https://img.shields.io/badge/estado-proyecto_académico-yellow">
</p>

<p align="center">
  <a href="https://jonathandevhurtado.github.io/TIKTOKJonathan/"><strong>🌐 Demo estática</strong></a>
  ·
  <a href="docs/README.md"><strong>📚 Documentación completa</strong></a>
  ·
  <a href="#-puesta-en-marcha"><strong>🚀 Puesta en marcha</strong></a>
</p>

**Autor:** Jonathan Hurtado
**Contacto:** [JonathanHurtadoDev@proton.me](mailto:JonathanHurtadoDev@proton.me)

> [!IMPORTANT]
> La demo de GitHub Pages es el **build estático antiguo** que se conserva en `dist/`. Sirve para ver la interfaz y el feed con datos de ejemplo. El código actual es una aplicación **Next.js + Supabase**: para probar el registro, la base de datos, la subida de videos y el chat necesitas configurar tu propio proyecto de Supabase (ver [puesta en marcha](#-puesta-en-marcha)).

<p align="center">
  <img src="docs/assets/demo-feed.png" alt="Captura del feed de la demo estática de TikTokJonathan" width="280">
  <br>
  <sub>Vista de la demo estática: feed vertical con datos de ejemplo.</sub>
</p>

> Proyecto académico. Funciona, pero no está pensado para producción tal cual: no incluye moderación de contenido ni límites de subida, y varias políticas RLS necesitan revisión. Lee [limitaciones y roadmap](docs/09-limitaciones-y-roadmap.md) antes de abrirlo al público.

---

## 📖 Índice

- [Funcionalidades](#-funcionalidades)
- [Stack](#-stack)
- [Demo](#-demo)
- [Estructura](#-estructura)
- [Puesta en marcha](#-puesta-en-marcha)
- [Scripts](#-scripts)
- [Documentación](#-documentación)
- [Estado y limitaciones](#-estado-y-limitaciones)
- [Seguridad](#-seguridad)
- [Autor](#-autor)

---

## ✨ Funcionalidades

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

### Detalles que quizá no se ven a primera vista

- Feed con *scroll snap*, autoplay del video activo y doble toque para dar like.
- Contador de vistas atómico en PostgreSQL (`increment_view`).
- Mensajes en tiempo real con Supabase Realtime y envío optimista.
- Buckets públicos para `videos`, `avatars` y `chat-media`.
- Datos de ejemplo como *fallback* cuando la base de datos está vacía.
- Interfaz completamente en español.

---

## 🧰 Stack

| Capa | Tecnología |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19 |
| Estilos | Tailwind CSS 4, Lucide React |
| Backend / BaaS | Supabase (Auth, Postgres, Storage, Realtime) |
| Base de datos | PostgreSQL con Row Level Security (RLS) |
| Tooling | ESLint 9 + `eslint-config-next`, PostCSS |

> El proyecto es JavaScript (`.jsx`), no TypeScript. No hay tests automatizados todavía; las pruebas son manuales.

---

## 🌐 Demo

**Demo estática:** [jonathandevhurtado.github.io/TIKTOKJonathan](https://jonathandevhurtado.github.io/TIKTOKJonathan/)

Es el build de la etapa Vite, parcheado para funcionar bajo el subpath de GitHub Pages. Muestra el feed con tres videos de ejemplo y permite navegar por la interfaz, pero **no tiene backend**: el login, la base de datos, la subida y el chat no funcionan allí. Para la app completa, ejecútala en local o despliégala en Vercel (ver [08 · Despliegue](docs/08-despliegue.md)).

---

## 📁 Estructura

```text
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
├── data/                 # Datos de ejemplo del feed
└── utils/supabase.js     # Cliente de Supabase
supabase/schema.sql       # Tablas, políticas RLS y buckets de Storage
docs/                     # Documentación detallada
dist/                     # Build antiguo para la demo de GitHub Pages
```

La estructura completa, archivo por archivo, está en [03 · Estructura](docs/03-estructura.md).

---

## 🚀 Puesta en marcha

### 1. Requisitos

- Node.js 20 o superior.
- Un proyecto en [Supabase](https://supabase.com).
- npm (incluido con Node).

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

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-publica
```

La clave `anon` es pública por diseño; **nunca** pongas la `service_role` en el cliente.

### 4. Base de datos

Ejecuta [`supabase/schema.sql`](supabase/schema.sql) en el **SQL Editor** de Supabase. El script crea las tablas, las políticas RLS, las funciones RPC y los buckets `videos`, `avatars` y `chat-media`.

> Si vuelves a ejecutar el esquema, algunas políticas pueden fallar porque no usan `DROP POLICY IF EXISTS`. Lee las notas en [04 · Base de datos](docs/04-base-de-datos.md).

### 5. Auth

En **Authentication → Providers → Email**, activa el proveedor. Para desarrollo puedes desactivar la confirmación por email; para producción, configura SMTP y las *redirect URLs*.

### 6. Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

---

## 📜 Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo de Next.js. |
| `npm run build` | Build de producción. |
| `npm run start` | Sirve el build de producción. |
| `npm run lint` | Ejecuta ESLint (`eslint .`). |

> `test_db.cjs` era un script local de comprobación de conexión. **No se versiona** (está en `.gitignore`). Si lo usas, pasa las variables con `node --env-file=.env.local test_db.cjs` y nunca lo subas al repositorio.

---

## 📚 Documentación

La documentación completa está en [`docs/`](docs/README.md):

| Documento | Contenido |
| --- | --- |
| [01 · Historia](docs/01-historia.md) | Cómo nació y cómo evolucionó el proyecto. |
| [02 · Arquitectura](docs/02-arquitectura.md) | Capas, flujos, providers y decisiones técnicas. |
| [03 · Estructura](docs/03-estructura.md) | Árbol de archivos y responsabilidad de cada uno. |
| [04 · Base de datos](docs/04-base-de-datos.md) | Tablas, relaciones, RLS, RPC y storage. |
| [05 · Branding](docs/05-branding.md) | Nombre, logo, colores, tipografía y voz. |
| [06 · Desarrollo](docs/06-desarrollo.md) | Setup, convenciones, recetas y troubleshooting. |
| [07 · Guía de uso](docs/07-guia-de-uso.md) | Recorrido funcional de la aplicación. |
| [08 · Despliegue](docs/08-despliegue.md) | GitHub Pages, Vercel y configuración de producción. |
| [09 · Limitaciones y roadmap](docs/09-limitaciones-y-roadmap.md) | Bugs conocidos, seguridad, deuda técnica y próximos pasos. |

---

## 📊 Estado y limitaciones

**Implementado:** autenticación, perfiles, feed, likes, comentarios, guardados, seguidores, subida de videos, notificaciones, chat directo y grupos.

**Requiere configuración externa:** Supabase (URL + anon key), buckets de storage y *redirect URLs* de Auth.

**Limitaciones conocidas:**

- La demo de GitHub Pages no tiene backend.
- Hay problemas de seguridad y bugs documentados: RLS de grupos, borrado de cuenta, `increment_share`, etc.
- No hay tests automatizados ni TypeScript.

**No la uses en producción con datos reales sin revisar** [09 · Limitaciones y roadmap](docs/09-limitaciones-y-roadmap.md).

---

## 🔐 Seguridad

- La clave `anon` de Supabase está diseñada para vivir en el cliente. La protección real son las políticas RLS.
- La clave `service_role` **nunca** debe llegar al navegador ni al repositorio.
- `test_db.cjs` está excluido por `.gitignore`.
- Si encuentras una vulnerabilidad, abre un *issue* **sin incluir datos sensibles** ni claves.
- Revisa la sección de seguridad del [roadmap](docs/09-limitaciones-y-roadmap.md) antes de desplegar.

---

## 👤 Autor

**Jonathan Hurtado** — Desarrollador Web

- GitHub: [@JonathanDevHurtado](https://github.com/JonathanDevHurtado)
- Contacto: [JonathanHurtadoDev@proton.me](mailto:JonathanHurtadoDev@proton.me)
- Proyecto: [github.com/JonathanDevHurtado/TIKTOKJonathan](https://github.com/JonathanDevHurtado/TIKTOKJonathan)

Proyecto de graduación, hecho con curiosidad, muchas horas de prueba y error, y ganas de aprender cómo funciona una aplicación completa por dentro.

---

## 📄 Licencia y aviso

Este es un proyecto académico y de portafolio. **No se ha definido una licencia de reutilización.** Si quieres usar parte del código, contacta primero con el autor.

TikTok es una marca registrada de ByteDance. Este proyecto no está afiliado ni respaldado por TikTok; la identidad visual se usa únicamente con fines educativos.
