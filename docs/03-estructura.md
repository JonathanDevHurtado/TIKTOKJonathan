# 03 · Estructura del proyecto

Este documento describe qué hay en cada carpeta y qué responsabilidad tiene cada archivo. Es la vista "de mapa" del repositorio; para entender el flujo de datos, lee [02 · Arquitectura](02-arquitectura.md).

---

## 1. Árbol completo

```text
TIKTOKJonathan/
├── .env.example                  # Variables de entorno de ejemplo
├── .gitignore                    # Excluye node_modules, .next, .env y test_db.cjs
├── README.md                     # Presentación y puesta en marcha
├── eslint.config.mjs             # Configuración plana de ESLint + Next.js
├── next.config.mjs               # Configuración de Next.js
├── package.json                  # Dependencias, scripts y metadatos
├── package-lock.json             # Árbol de dependencias bloqueado
├── postcss.config.mjs            # Plugin de Tailwind 4 para PostCSS
│
├── docs/                         # Documentación (este directorio)
│   ├── README.md                 # Índice de documentos
│   ├── 01-historia.md
│   ├── 02-arquitectura.md
│   ├── 03-estructura.md
│   ├── 04-base-de-datos.md
│   ├── 05-branding.md
│   ├── 06-desarrollo.md
│   ├── 07-guia-de-uso.md
│   ├── 08-despliegue.md
│   ├── 09-limitaciones-y-roadmap.md
│   └── assets/
│       ├── banner.svg            # Banner del README
│       ├── logo.svg              # Logo con gradiente
│       └── logo-mono.svg         # Logo monocromo
│
├── public/
│   └── icons.svg                 # Sprite de iconos auxiliares
│
├── src/
│   ├── app/                      # Rutas del App Router
│   │   ├── layout.jsx            # HTML raíz, metadata y providers
│   │   ├── ClientLayout.jsx      # Shell: sidebar + main + bottom nav
│   │   ├── SessionProvider.jsx   # Contexto de sesión de Supabase
│   │   ├── page.jsx              # Feed principal (/)
│   │   ├── icon.svg              # Favicon y app icon
│   │   │
│   │   ├── chat/
│   │   │   ├── page.jsx          # Lista de conversaciones y grupos
│   │   │   ├── [userId]/
│   │   │   │   └── page.jsx      # Mensaje directo
│   │   │   └── group/
│   │   │       └── [groupId]/
│   │   │           └── page.jsx  # Chat de grupo + panel de info
│   │   │
│   │   ├── explore/
│   │   │   └── page.jsx          # Búsqueda, tendencias y categorías
│   │   │
│   │   ├── login/
│   │   │   └── page.jsx          # Inicio de sesión
│   │   │
│   │   ├── notifications/
│   │   │   └── page.jsx          # Bandeja de notificaciones
│   │   │
│   │   ├── profile/
│   │   │   └── [username]/
│   │   │       ├── page.jsx      # Perfil propio o público
│   │   │       ├── followers/
│   │   │       │   └── page.jsx  # Lista de seguidores
│   │   │       └── following/
│   │   │           └── page.jsx  # Lista de seguidos
│   │   │
│   │   ├── register/
│   │   │   └── page.jsx          # Registro
│   │   │
│   │   ├── upload/
│   │   │   └── page.jsx          # Subida de videos
│   │   │
│   │   └── video/
│   │       └── [id]/
│   │           └── page.jsx      # Reproductor individual
│   │
│   ├── components/
│   │   ├── Sidebar.jsx           # Logo, Sidebar, BottomNav
│   │   ├── VideoCard.jsx         # Reproductor + acciones sociales
│   │   └── EditProfileModal.jsx  # Modal de edición de perfil
│   │
│   ├── context/
│   │   └── ThemeContext.jsx      # Tema oscuro/claro persistente
│   │
│   ├── data/
│   │   └── videos.js             # Videos, perfiles y categorías de ejemplo
│   │
│   ├── utils/
│   │   └── supabase.js           # Cliente único de Supabase
│   │
│   └── index.css                 # Tailwind 4 + tokens + estilos base
│
├── supabase/
│   └── schema.sql                # Esquema completo del backend
│
├── dist/                         # Build antiguo de Vite (demo GitHub Pages)
│   ├── index.html
│   ├── 404.html                  # Fallback SPA para GitHub Pages
│   ├── .nojekyll                 # Evita el procesado de Jekyll
│   ├── favicon.svg
│   ├── icons.svg
│   └── assets/
│       ├── index-BwS1EQeN.js
│       └── index-FG8Z66tz.css
│
├── test_db.cjs                   # Script local de prueba (lee variables de entorno; ignorado por Git)
└── node_modules/                 # Dependencias instaladas (ignorado)
```

> `node_modules/`, `.next/`, `.env.local` y `test_db.cjs` no se versionan. `dist/` sí se versiona porque alimenta la demo de GitHub Pages.

---

## 2. Responsabilidad de cada archivo

### Raíz

| Archivo | Responsabilidad |
| --- | --- |
| `package.json` | Nombre, metadatos, scripts y dependencias. |
| `package-lock.json` | Versiones exactas del árbol de npm. No editar a mano. |
| `next.config.mjs` | Configuración mínima de Next.js (`reactStrictMode: true`). |
| `eslint.config.mjs` | Configuración plana de ESLint con `eslint-config-next/core-web-vitals`. Ignora `dist/` y `.next/`. |
| `postcss.config.mjs` | Registra `@tailwindcss/postcss`. |
| `.env.example` | Plantilla de variables públicas de Supabase. |
| `.gitignore` | Excluye dependencias, builds de Next, entornos locales y el script con credenciales. |
| `README.md` | Puerta de entrada: qué es, cómo se ejecuta y dónde está la documentación. |

### `src/app/` — rutas

| Archivo | Responsabilidad |
| --- | --- |
| `layout.jsx` | Componente de servidor. Define `<html lang="es">`, metadata y envuelve la app en `SessionProvider` y `ClientLayout`. |
| `ClientLayout.jsx` | Componente cliente. Monta `ThemeProvider`, la sidebar de escritorio, el `<main>` con scroll y la navegación inferior móvil. |
| `SessionProvider.jsx` | Contexto de sesión. Escucha `getSession()` y `onAuthStateChange()`. Expone `useSession()`. |
| `page.jsx` | Feed principal. Tabs, carga de videos, scroll snap y fallback a datos de ejemplo. |
| `icon.svg` | Icono de la app y favicon. |

### `src/app/chat/`

| Archivo | Responsabilidad |
| --- | --- |
| `chat/page.jsx` | Lista de conversaciones (RPC `get_conversations`), búsqueda de usuarios y creación de grupos. |
| `chat/[userId]/page.jsx` | Mensaje directo: carga perfil, historial, marca leídos, envía/edita/borra y escucha realtime. |
| `chat/group/[groupId]/page.jsx` | Chat de grupo: mensajes, miembros, avatar, nombre, descripción, añadir miembros, salir y eliminar. |

### `src/app/profile/`

| Archivo | Responsabilidad |
| --- | --- |
| `profile/[username]/page.jsx` | Perfil propio o público. Resuelve `me`, carga estadísticas, favoritos, bloqueos, edición, borrado de cuenta y *lightbox* del avatar. |
| `.../followers/page.jsx` | Lista de seguidores con búsqueda y botón de seguir. |
| `.../following/page.jsx` | Lista de seguidos con la misma lógica. |

### Otros archivos de `src/`

| Archivo | Responsabilidad |
| --- | --- |
| `components/Sidebar.jsx` | Exporta `Logo`, `Sidebar` y `BottomNav`. Contiene la navegación y los badges de notificaciones. |
| `components/VideoCard.jsx` | Reproductor y todas las acciones sociales. Es el componente más grande y el más acoplado. |
| `components/EditProfileModal.jsx` | Formulario de edición con subida de avatar, bio, cumpleaños, edad y género. |
| `context/ThemeContext.jsx` | Provee `theme` y `toggleTheme`; persiste en `localStorage`. |
| `data/videos.js` | Datos de ejemplo para el feed, el perfil y las categorías. |
| `utils/supabase.js` | Crea y exporta el cliente de Supabase. |
| `index.css` | Importa Tailwind, define tokens, variables de tema, scrollbars y `pb-safe`. |

### `supabase/`

| Archivo | Responsabilidad |
| --- | --- |
| `schema.sql` | Única fuente de verdad del backend. Se ejecuta en el SQL Editor de Supabase. |

### `dist/`

Build compilado de la etapa Vite. **No se edita a mano** salvo los parches necesarios para GitHub Pages: las rutas del subpath, el `basename` del router y el mapeo de los datos de ejemplo (documentados en [08 · Despliegue](08-despliegue.md)). Si se regenera, hay que volver a aplicar los tres parches.

---

## 3. Convenciones de nombres

| Elemento | Convención | Ejemplo |
| --- | --- | --- |
| Carpetas de ruta | minúsculas, sin espacios | `notifications`, `profile` |
| Parámetros dinámicos | corchetes | `[username]`, `[id]` |
| Componentes | PascalCase | `VideoCard`, `EditProfileModal` |
| Funciones y variables | camelCase | `handleLike`, `fetchVideos` |
| Constantes globales | MAYÚSCULAS | `VIDEOS`, `CATEGORY_MAPPING` |
| Archivos de componentes | PascalCase | `Sidebar.jsx` |
| Archivos de página | siempre `page.jsx` | `src/app/explore/page.jsx` |
| Tablas SQL | snake_case plural | `group_messages`, `notifications` |
| Columnas SQL | snake_case | `created_at`, `avatar_url` |

### ¿Dónde va cada cosa?

- **Una pantalla nueva** → `src/app/<ruta>/page.jsx`.
- **Un componente reutilizable** → `src/components/`.
- **Un contexto global** → `src/context/`.
- **Una función auxiliar de datos** → `src/utils/` (hoy solo hay una).
- **Datos estáticos** → `src/data/`.
- **Un cambio de backend** → `supabase/schema.sql` + actualizar la documentación.

---

## 4. Qué no tocar sin cuidado

| Zona | Motivo |
| --- | --- |
| `package-lock.json` | Se regenera con npm; editarlo a mano rompe la reproducibilidad. |
| `dist/assets/*.js` | Está minificado. Solo se parchea lo imprescindible para GitHub Pages. |
| `supabase/schema.sql` en producción | Un `DROP` o un cambio de RLS puede dejar la app sin acceso o expuesta. |
| `src/utils/supabase.js` | Cambiar el fallback o las variables afecta a toda la app. |
| `.env.local` | Nunca se versiona; contiene la configuración real. |

---

## 5. Archivos que no existen (y quizá deberían)

| Falta | Impacto |
| --- | --- |
| `tailwind.config.js` | No es necesario en Tailwind 4; la configuración vive en `index.css`. |
| `src/types/` o `tsconfig.json` | No hay tipos; los errores se detectan en ejecución. |
| `tests/` o `*.test.jsx` | No hay tests automatizados. |
| `middleware.js` | No hay protección de rutas a nivel de servidor. |
| `src/lib/` o `src/services/` | Las consultas están dentro de las páginas. |
| `LICENSE` | No se ha definido licencia. |
| `.github/workflows/` | No hay CI/CD. |

---

Siguiente: [04 · Base de datos](04-base-de-datos.md) · Volver al [índice](README.md).
