# 08 · Despliegue

Este documento explica cómo está publicada la demo, cómo desplegar la aplicación completa y qué tener en cuenta antes de abrirla al público.

---

## 1. Estado actual

| Entorno | URL | Qué se despliega | Backend |
| --- | --- | --- | --- |
| **GitHub Pages (demo)** | [jonathandevhurtado.github.io/TIKTOKJonathan](https://jonathandevhurtado.github.io/TIKTOKJonathan/) | Build estático antiguo de Vite (`dist/`) | ❌ Sin backend real (Supabase de marcador) |
| **Desarrollo local** | `http://localhost:3000` | Código Next.js actual | ✅ Tu proyecto de Supabase |
| **Producción recomendada** | Pendiente | Código Next.js actual | ✅ Supabase |

> La demo de Pages **no es la app completa**. Sirve para enseñar la interfaz y el feed con datos de ejemplo. El registro, el login, la subida de videos y el chat necesitan un backend y no funcionan allí.

<p align="center">
  <img src="assets/demo-feed.png" alt="Captura del feed de la demo estática en GitHub Pages" width="300">
  <br>
  <sub>Demo estática: feed con datos de ejemplo, sin backend.</sub>
</p>

---

## 2. Por qué la demo es el build antiguo

GitHub Pages solo sirve archivos estáticos: HTML, CSS, JS e imágenes. No ejecuta Node.js, no puede correr `next start` y no puede procesar Server Components, API Routes ni Server Actions.

La versión actual es una app Next.js con rutas dinámicas (`/profile/[username]`, `/video/[id]`, `/chat/[userId]`, `/chat/group/[groupId]`). Aunque casi todas las páginas son de cliente, un despliegue estático requeriría:

1. Configurar `output: 'export'` en `next.config.mjs`.
2. Implementar `generateStaticParams` para cada ruta dinámica.
3. Eliminar o adaptar cualquier uso de APIs de servidor.
4. Revisar los enlaces y el `basePath`.

Eso no está hecho. Por eso se conserva el build de la etapa Vite, que ya era una SPA estática y funciona en Pages con un pequeño parche.

---

## 3. Cómo está publicada la demo

### 3.1. Estructura

```text
rama gh-pages (raíz)
├── index.html          # Build de Vite parcheado
├── 404.html            # Copia de index.html para fallback SPA
├── .nojekyll           # Evita que GitHub procese con Jekyll
├── favicon.svg
├── icons.svg
└── assets/
    ├── index-BwS1EQeN.js
    └── index-FG8Z66tz.css
```

La rama `main` contiene el código fuente y también `dist/`. La rama `gh-pages` contiene **solo** el contenido de `dist/` en la raíz.

### 3.2. El problema del subpath

La app se sirve en:

```text
https://jonathandevhurtado.github.io/TIKTOKJonathan/
```

Ese `/TIKTOKJonathan/` es un subdirectorio. El build original asumía la raíz (`/`), así que habían dos problemas:

1. Los assets se pedían a `/assets/...` en lugar de `/TIKTOKJonathan/assets/...`.
2. El router de React Router no sabía que la app vivía bajo un subpath.

### 3.3. El parche

**`dist/index.html`:**

```diff
- <link rel="icon" type="image/svg+xml" href="/vite.svg" />
+ <link rel="icon" type="image/svg+xml" href="/TIKTOKJonathan/favicon.svg" />

- <title>TikTok Clone - Vite SPA</title>
+ <title>TikTokJonathan · Demo</title>

- <script type="module" crossorigin src="/assets/index-BwS1EQeN.js"></script>
+ <script type="module" crossorigin src="/TIKTOKJonathan/assets/index-BwS1EQeN.js"></script>

- <link rel="stylesheet" crossorigin href="/assets/index-FG8Z66tz.css">
+ <link rel="stylesheet" crossorigin href="/TIKTOKJonathan/assets/index-FG8Z66tz.css">
```

**`dist/assets/index-BwS1EQeN.js`:**

```diff
- E.jsx(Rb,{children:E.jsx(yE,{})})
+ E.jsx(Rb,{basename:"/TIKTOKJonathan",children:E.jsx(yE,{})})
```

`Rb` es el `BrowserRouter` minificado. `basename` le dice que todas las rutas cuelgan de `/TIKTOKJonathan`.

> Si el bundle se regenera, este parche se pierde. Hay que volver a aplicarlo o cambiar el build para que use `base` y `basename` desde el principio.

### 3.4. Corrección del fallback de datos

El build antiguo tenía un bug en el mapeo de los datos de ejemplo del feed:

```js
profiles: { username: z.user, avatar_url: z.avatar }
```

`z.user` es un objeto `{ name, avatar, followers }`, no un string. El reproductor lo renderizaba como hijo de React y lanzaba el error **#31** (“Objects are not valid as a React child”), dejando la pantalla en blanco o en el spinner de carga.

Se corrigió en el bundle:

```diff
- profiles:{username:z.user,avatar_url:z.avatar}
+ profiles:{username:z.user.name,avatar_url:z.user.avatar}
```

Con esto, la demo muestra correctamente los tres videos de ejemplo y sus autores. Es un parche del build, no del código fuente actual de Next.js.

### 3.5. Fallback SPA

GitHub Pages devuelve `404` para rutas que no existen como archivo. Para que `/TIKTOKJonathan/explore` funcione al recargar:

1. Copia `index.html` como `404.html`.
2. Asegúrate de que `404.html` también tiene las rutas parcheadas.

GitHub Pages sirve `404.html` con estado 404, pero el JavaScript de la SPA arranca y React Router renderiza la ruta correcta.

### 3.6. `.nojekyll`

GitHub Pages procesa los sitios con Jekyll por defecto. Jekyll ignora archivos y carpetas que empiezan por `_` o `.` y puede alterar el resultado. Un archivo vacío llamado `.nojekyll` en la raíz desactiva ese procesamiento.

### 3.7. Limitaciones de esta demo

| Limitación | Detalle |
| --- | --- |
| Sin backend | El cliente apunta a `placeholder.supabase.co`; no hay login, base de datos, subida ni chat. |
| Enlaces de compartir | El build antiguo genera `${origin}/video/:id` sin el subpath; el enlace puede dar 404. |
| Contadores | El formateador antiguo convierte `"48.2K"` en `48.2`; se ve raro, pero no rompe nada. |
| Contenido | Los videos, posters y avatares vienen de W3Schools, Picsum y DiceBear; dependen de terceros. |
| Versión | Es el build de la etapa Vite, no refleja las pantallas actuales de Next.js. |

---

## 4. Publicar en GitHub Pages desde cero

### 4.1. Requisitos

- El repositorio debe ser público (o tener GitHub Pro para Pages privado).
- La rama `gh-pages` debe existir.
- El build debe estar parcheado.

### 4.2. Crear la rama `gh-pages`

Desde la raíz del proyecto:

```bash
git checkout --orphan gh-pages
git rm -rf .
cp -r dist/. .
git add .
git commit -m "deploy: demo estática en GitHub Pages"
git push origin gh-pages
git checkout main
```

> `git rm -rf .` borra el árbol de trabajo de la rama nueva, pero los archivos siguen en `main`. No ejecutes esto con cambios sin commitear.

### 4.3. Activar Pages

**Desde la web:**

1. Entra en **Settings → Pages**.
2. En **Source**, elige **Deploy from a branch**.
3. Branch: `gh-pages`.
4. Folder: `/ (root)`.
5. Guarda.

**Desde la API de GitHub:**

```bash
curl -X POST \
  -H "Authorization: token TU_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/JonathanDevHurtado/TIKTOKJonathan/pages \
  -d '{"source":{"branch":"gh-pages","path":"/"}}'
```

### 4.4. Esperar el build

La primera publicación tarda entre 1 y 3 minutos. Puedes seguir el estado en:

- **Actions → pages build and deployment**.
- **Settings → Pages** (muestra la URL cuando termina).
- La API: `GET /repos/JonathanDevHurtado/TIKTOKJonathan/pages`.

### 4.5. Verificar

```bash
curl -I https://jonathandevhurtado.github.io/TIKTOKJonathan/
curl -I https://jonathandevhurtado.github.io/TIKTOKJonathan/assets/index-BwS1EQeN.js
curl -I https://jonathandevhurtado.github.io/TIKTOKJonathan/explore
```

Las tres deberían devolver `200` (la última puede devolver `404` con el HTML de la SPA, que es el comportamiento esperado de `404.html`).

Abre la URL en una ventana de incógnito para evitar caché.

---

## 5. Desplegar la app completa en Vercel (recomendado)

Vercel es la opción más directa para Next.js: detecta el framework, ejecuta `next build` y sirve la app con soporte para rutas dinámicas.

### 5.1. Importar el repositorio

1. Entra en [vercel.com](https://vercel.com/) y conecta tu cuenta de GitHub.
2. Pulsa **Add New → Project**.
3. Importa `JonathanDevHurtado/TIKTOKJonathan`.
4. Configuración:
   - **Framework Preset:** Next.js.
   - **Root Directory:** `./`.
   - **Build Command:** `npm run build`.
   - **Output Directory:** dejar vacío (Vercel lo detecta).
   - **Install Command:** `npm install`.
5. Añade las variables de entorno (ver §5.2).
6. Pulsa **Deploy**.

### 5.2. Variables de entorno

| Variable | Dónde se usa | Ejemplo |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente de Supabase | `https://abcd1234.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente de Supabase | `eyJhbGciOi...` |

Márcalas para **Production**, **Preview** y **Development**. Son públicas (`NEXT_PUBLIC_`), así que no pasa nada porque lleguen al navegador; la seguridad depende de RLS.

> **Nunca** añadas `SUPABASE_SERVICE_ROLE_KEY` al frontend. Si la necesitas, úsala solo en una Edge Function o en un script de servidor.

### 5.3. Configurar Supabase Auth para el dominio

En **Supabase → Authentication → URL Configuration**:

- **Site URL:** `https://tu-proyecto.vercel.app`.
- **Redirect URLs:**
  - `https://tu-proyecto.vercel.app/**`
  - `http://localhost:3000/**` (desarrollo)
  - Tu dominio personalizado si lo tienes.

Sin esto, los enlaces de confirmación y recuperación pueden fallar o redirigir a `localhost`.

### 5.4. Probar el despliegue

1. Abre la URL de Vercel.
2. Regístrate.
3. Verifica que se creó el perfil.
4. Sube un video.
5. Abre la app en otro navegador y comprueba que el video aparece.
6. Prueba el chat en dos pestañas.

### 5.5. Dominio personalizado

1. **Vercel → Project → Settings → Domains**.
2. Añade tu dominio.
3. Configura los DNS que te indique Vercel.
4. Añade el dominio a las **Redirect URLs** de Supabase.
5. Actualiza `homepage` en `package.json` si quieres que apunte al dominio final.

---

## 6. Otras opciones

| Plataforma | Ventajas | Inconvenientes | Nota |
| --- | --- | --- | --- |
| **Vercel** | Integración nativa con Next.js, previews por PR, rollback. | Plan gratuito con límites. | Recomendada. |
| **Netlify** | Buen soporte de Next.js, formularios y funciones. | Configuración algo más manual. | Usa el adaptador de Next.js. |
| **Render** | Web services y bases de datos. | El plan gratuito duerme tras inactividad. | Sirve para Node. |
| **Fly.io / Railway** | Control total, contenedores. | Más configuración y coste. | Para cuando haga falta escalar. |
| **GitHub Pages** | Gratis, simple, integrado en el repo. | Solo estático; no ejecuta Next.js. | Solo para la demo `dist/`. |

### Exportación estática de Next.js (no recomendada todavía)

Si quisieras servir la app Next.js en Pages, necesitarías:

```js
// next.config.mjs
export default {
  output: 'export',
  basePath: '/TIKTOKJonathan',
  images: { unoptimized: true },
}
```

Y adaptar cada ruta dinámica con `generateStaticParams`. Como la app consulta datos en el cliente y las rutas dinámicas dependen de la base de datos, la exportación requeriría un refactor. No es el camino más corto.

---

## 7. Variables por entorno

| Variable | Local | Preview | Producción |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` | Vercel | Vercel |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` | Vercel | Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ Nunca en cliente | Solo servidor | Solo servidor |

### Archivos que no se versionan

- `.env.local`
- `.env`
- `.env.*` (excepto `.env.example`)
- `test_db.cjs`

---

## 8. Checklist de producción

### Seguridad

- [ ] RLS activo en todas las tablas.
- [ ] `get_conversations` valida `auth.uid()`.
- [ ] `notifications` no permite inserts arbitrarios.
- [ ] `group_members` no tiene recursión de políticas.
- [ ] `messages` no permite que el receptor edite contenido.
- [ ] Borrado de cuenta implementado en servidor.
- [ ] Políticas de storage con límites de tamaño.
- [ ] `service_role` fuera del repositorio y del cliente.
- [ ] Claves rotadas si alguna estuvo expuesta.
- [ ] CAPTCHA o rate limiting en Auth si el registro es público.

### Funcionalidad

- [ ] Registro, login y logout.
- [ ] Confirmación de email (si está activa).
- [ ] Feed con videos reales.
- [ ] Like, comentario, guardado y seguimiento.
- [ ] Subida de video y reproducción.
- [ ] Perfil y edición de avatar.
- [ ] Chat directo y grupos.
- [ ] Notificaciones en tiempo real.
- [ ] Tema claro/oscuro.

### Calidad

- [ ] `npm run lint`.
- [ ] `npm run build`.
- [ ] Prueba en móvil real.
- [ ] Prueba en Chrome, Firefox y Safari.
- [ ] Lighthouse > 80 en rendimiento y accesibilidad (objetivo, no garantía actual).
- [ ] Revisión de textos en español.
- [ ] Documentación actualizada.

---

## 9. Rollback

### Vercel

1. **Project → Deployments**.
2. Busca el despliegue anterior estable.
3. **⋯ → Promote to Production** o **Rollback**.

Es instantáneo y no requiere tocar Git.

### GitHub Pages

1. `git checkout gh-pages`.
2. `git revert <commit>` o `git reset --hard <commit-anterior>` + `git push --force-with-lease`.
3. Espera el nuevo build.

Evita `--force` si otras personas trabajan en la rama.

### Base de datos

Los cambios de esquema no se revierten solos. Antes de una migración:

1. Haz un backup desde **Supabase → Database → Backups**.
2. Prueba la migración en un proyecto de staging.
3. Ten un script de rollback.

---

## 10. Costes

| Servicio | Plan gratuito | Cuándo pagar |
| --- | --- | --- |
| GitHub Pages | Repos públicos, 1 GB de sitio, 100 GB/mes de tráfico. | Sitios grandes o privados. |
| Vercel | Hobby: proyectos personales, funciones limitadas. | Uso comercial o tráfico alto. |
| Supabase | Free: 500 MB de base, 1 GB de storage, 2 GB de tráfico. | Más storage, backups, proyectos ilimitados. |

Para un proyecto de portafolio, los planes gratuitos son suficientes. Si subes videos grandes, el storage de Supabase será el primer límite.

---

## 11. Problemas comunes en Pages

| Síntoma | Causa | Solución |
| --- | --- | --- |
| Página en blanco | Assets en `/assets/...` en lugar de `/TIKTOKJonathan/assets/...` | Parchea `index.html`. |
| 404 al recargar `/explore` | Falta `404.html`. | Cópialo desde `index.html`. |
| 404 en assets | El nombre del repo no coincide con el `basename`. | Usa exactamente `/TIKTOKJonathan`. |
| CSS no carga | Ruta absoluta sin subpath. | Parchea el `<link rel="stylesheet">`. |
| El router muestra 404 interno | Falta `basename` en el bundle. | Aplica el parche de `Rb`. |
| Cambios no aparecen | Caché de GitHub Pages o del navegador. | Espera 2 minutos, recarga con `Ctrl+Shift+R`. |
| Jekyll ignora archivos | Falta `.nojekyll`. | Crea el archivo vacío en la raíz de `gh-pages`. |

---

## 12. Automatización futura

Ideas para cuando el proyecto se estabilice:

- **GitHub Action** que ejecute `npm ci`, `npm run lint` y `npm run build` en cada PR.
- **Deploy automático de Vercel** ya funciona con la integración de Git.
- **Deploy de la demo** con una Action que construya y publique en `gh-pages` sin intervención manual.
- **Migraciones** con la CLI de Supabase (`supabase db push`) en lugar de ejecutar SQL a mano.
- **Tipos** generados con `supabase gen types typescript` si se migra a TypeScript.

---

Siguiente: [09 · Limitaciones y roadmap](09-limitaciones-y-roadmap.md) · Volver al [índice](README.md).
