# 09 · Limitaciones y roadmap

Este documento es el registro honesto de lo que falta, lo que está roto y lo que se puede mejorar. Está ordenado por prioridad y pensado para que cualquiera pueda contribuir sin miedo a romper algo.

> **Aviso:** varias limitaciones son de **seguridad**. No despliegues la app en producción con datos reales sin resolver primero los puntos **P0**.

---

## 1. Cómo leer las prioridades

| Prioridad | Significado | Cuándo resolver |
| --- | --- | --- |
| **P0** | Seguridad o pérdida de datos. | Antes de abrir la app al público. |
| **P1** | Bug funcional que rompe un flujo. | En la siguiente iteración. |
| **P2** | UX, accesibilidad o rendimiento. | Cuando haya tiempo. |
| **P3** | Deuda técnica o mejoras grandes. | Roadmap a medio plazo. |

---

## 2. P0 · Seguridad

### 2.1. `get_conversations` no valida al usuario

**Dónde:** `supabase/schema.sql:240-274`

La función es `SECURITY DEFINER` y recibe `user_id` como parámetro. No comprueba que coincida con `auth.uid()`. Cualquier usuario autenticado puede llamar:

```js
await supabase.rpc('get_conversations', { user_id: 'uuid-de-otra-persona' })
```

y obtener el último mensaje, la fecha y el número de no leídos de las conversaciones de otra persona. No devuelve el historial completo, pero es una fuga de metadata privada.

**Solución mínima:**

```sql
CREATE OR REPLACE FUNCTION public.get_conversations(user_id UUID)
RETURNS TABLE (...) AS $$
BEGIN
  IF user_id IS NULL OR user_id <> auth.uid() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  -- resto de la función
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

**Solución recomendada:** eliminar el parámetro y usar `auth.uid()` dentro de la función. Requiere cambiar la llamada del cliente a `supabase.rpc('get_conversations')`.

---

### 2.2. Cualquiera puede insertar notificaciones

**Dónde:** `supabase/schema.sql:291`

```sql
CREATE POLICY "Anyone can insert notifications"
ON public.notifications FOR INSERT WITH CHECK (true);
```

Esto permite que un usuario (o un visitante anónimo, según el rol) inserte notificaciones con cualquier `user_id`, `actor_id` y `type`. Se puede spamear la bandeja de otra persona o suplantar acciones.

**Solución:**

```sql
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;

CREATE POLICY "Actors insert their own notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() = actor_id);
```

Opcional: impedir notificaciones a uno mismo.

```sql
WITH CHECK (auth.uid() = actor_id AND auth.uid() <> user_id)
```

---

### 2.3. Recursión de RLS en `group_members`

**Dónde:** `supabase/schema.sql:350`, `:342`

```sql
CREATE POLICY "Members see memberships" ON public.group_members FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_id AND gm.user_id = auth.uid()
  )
);
```

La política de `group_members` consulta `group_members` dentro de su propia definición. PostgreSQL puede detectar recursión infinita y devolver el error `infinite recursion detected in policy for relation "group_members"`. La política de `chat_groups` (`Group members see group`) también consulta `group_members`, así que el problema se propaga.

**Solución:** una función auxiliar `SECURITY DEFINER` que compruebe la membresía sin pasar por RLS.

```sql
CREATE OR REPLACE FUNCTION public.is_group_member(gid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = gid AND user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_group_member(UUID) TO authenticated;

DROP POLICY IF EXISTS "Members see memberships" ON public.group_members;

CREATE POLICY "Members see memberships"
ON public.group_members FOR SELECT
USING (auth.uid() = user_id OR public.is_group_member(group_id));
```

Y reescribir la política de `chat_groups`:

```sql
DROP POLICY IF EXISTS "Group members see group" ON public.chat_groups;

CREATE POLICY "Group members see group"
ON public.chat_groups FOR SELECT
USING (owner_id = auth.uid() OR public.is_group_member(id));
```

---

### 2.4. El receptor puede editar mensajes

**Dónde:** `supabase/schema.sql:235`, `:303`

Hay dos políticas UPDATE sobre `messages`:

- `Users can mark messages as read` permite al receptor actualizar.
- `Users can update their messages` permite al remitente **y al receptor** actualizar cualquier columna.

RLS no permite limitar columnas por política. El receptor podría cambiar el `content` de un mensaje ajeno.

**Solución:** revocar UPDATE directo y usar RPCs específicas.

```sql
DROP POLICY IF EXISTS "Users can mark messages as read" ON public.messages;
DROP POLICY IF EXISTS "Users can update their messages" ON public.messages;

CREATE OR REPLACE FUNCTION public.mark_messages_read(other_user UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.messages
  SET read = true
  WHERE receiver_id = auth.uid()
    AND sender_id = other_user
    AND read = false;
$$;

CREATE OR REPLACE FUNCTION public.edit_message(msg_id UUID, new_content TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.messages
  SET content = new_content, edited = true
  WHERE id = msg_id AND sender_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mensaje no encontrado o sin permiso';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_messages_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.edit_message(UUID, TEXT) TO authenticated;
```

Para el borrado lógico, una función similar que solo permita al remitente.

---

### 2.5. El borrado de cuenta no borra el usuario de Auth

**Dónde:** `src/app/profile/[username]/page.jsx:87-89`

```js
const { error } = await supabase.from('profiles').delete().eq('id', profile.id);
```

Primero, **no hay política DELETE en `profiles`**, así que la operación falla por RLS. Segundo, aunque se añadiera, borrar el perfil no borra el usuario de `auth.users`; el usuario podría seguir autenticándose y quedaría sin perfil.

**Solución:** una Edge Function con `service_role` que:

1. Verifique el JWT del solicitante.
2. Llame a `supabase.auth.admin.deleteUser(user.id)`.
3. Deje que la cascada borre el perfil y el contenido.

Nunca pongas la `service_role` en el cliente.

---

### 2.6. `increment_share` referencia una columna inexistente

**Dónde:** `supabase/schema.sql:184-195`

La función actualiza `videos.shares`, pero la tabla `videos` no tiene esa columna. Si se llama, falla. Hoy el cliente no la usa, pero es una bomba de tiempo.

**Solución A:** añadir la columna.

```sql
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS shares INTEGER DEFAULT 0;
```

**Solución B:** eliminar la función y el contador decorativo.

---

### 2.7. Políticas no idempotentes

**Dónde:** `supabase/schema.sql` (varias)

Varias políticas de `storage` y `notifications` se crean sin `DROP POLICY IF EXISTS`. Reejecutar el esquema falla con `policy already exists`. No es un problema de seguridad, pero impide reconstruir el backend de forma fiable.

**Solución:** añadir `DROP POLICY IF EXISTS ...` antes de cada `CREATE POLICY`, o usar un bloque `DO $$ ... $$` que compruebe la existencia.

---

## 3. P1 · Bugs funcionales

### 3.1. Carrera de sesión al redirigir

**Dónde:** `src/app/upload/page.jsx:34-36`, `src/app/profile/[username]/page.jsx:34`, `:95`

`SessionProvider` arranca con `session = null` y no expone un estado de carga. Las páginas que hacen:

```js
useEffect(() => {
  if (!session) router.push('/login')
}, [session])
```

se ejecutan en el primer render, cuando la sesión todavía no se ha recuperado. Un usuario autenticado puede ser expulsado a `/login` y luego rebotado a `/profile/me`.

**Solución:** añadir `loading` a `SessionProvider` y no redirigir hasta que termine la carga.

```jsx
const [loading, setLoading] = useState(true)

useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    setSession(data.session)
    setLoading(false)
  })
  // ...
}, [])
```

```jsx
if (loading) return <Spinner />
if (!session) router.push('/login')
```

---

### 3.2. El dueño no puede añadir miembros al grupo

**Dónde:** `supabase/schema.sql:351`, `src/app/chat/group/[groupId]/page.jsx:163-164`

La política INSERT solo permite `auth.uid() = user_id`. El dueño del grupo no puede insertar una fila para otro usuario, así que el botón **Añadir** falla silenciosamente (la UI no comprueba el error).

**Solución:**

```sql
DROP POLICY IF EXISTS "Members can join" ON public.group_members;

CREATE POLICY "Users join or owners add"
ON public.group_members FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.chat_groups g
    WHERE g.id = group_id AND g.owner_id = auth.uid()
  )
);
```

Además, la UI debería mostrar el error si la inserción falla.

---

### 3.3. `router.push` durante el render

**Dónde:** `src/app/login/page.jsx:16-19`, `src/app/register/page.jsx:17-20`

```jsx
if (session) {
  router.push('/profile/me');
  return null;
}
```

`router.push` es un efecto secundario y no debe ejecutarse durante el render. React puede lanzar la advertencia *"Cannot update a component while rendering a different component"* y el comportamiento es impredecible.

**Solución:**

```jsx
useEffect(() => {
  if (session) router.push('/profile/me')
}, [session, router])

if (session) return null
```

---

### 3.4. `text-tiktok-cyan` no existe

**Dónde:** `src/index.css:3-8`, usado en `src/components/Sidebar.jsx:141`, `src/app/upload/page.jsx:107`, `src/app/notifications/page.jsx:57`

El token `--color-tiktok-cyan` no está definido en `@theme`. Las clases `text-tiktok-cyan` y `border-l-tiktok-cyan` no generan color.

**Solución:**

```css
@theme {
  --color-tiktok-cyan: #25f4ee;
}
```

---

### 3.5. Búsqueda con interpolación en `.or()`

**Dónde:** `src/app/explore/page.jsx:158`

```js
.or(`username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
```

Si el usuario escribe comas, paréntesis o caracteres especiales, puede romper la sintaxis de PostgREST o alterar el filtro. No es una inyección SQL clásica (PostgREST parametriza), pero sí una inyección de filtros.

**Solución:** sanear la entrada.

```js
const safe = searchTerm.replace(/[%,()]/g, '').trim()
if (!safe) return
.or(`username.ilike.%${safe}%,full_name.ilike.%${safe}%`)
```

O mejor, una función RPC con `ILIKE` parametrizado.

---

### 3.6. Enlace de compartir sin subpath

**Dónde:** `src/components/VideoCard.jsx:244`

```js
const link = `${window.location.origin}/video/${video.id}`;
```

En GitHub Pages, el video vive en `/TIKTOKJonathan/video/...`. El enlace copiado apunta a `/video/...` y da 404.

**Solución:** usar un `basePath` configurable.

```js
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
const link = `${window.location.origin}${basePath}/video/${video.id}`
```

En la app Next.js actual, `basePath` es vacío; solo afecta a la demo estática.

---

### 3.7. Validación de subida incompleta

**Dónde:** `src/app/upload/page.jsx:53`, `:116`

La UI dice "Menos de 50MB", pero el código solo comprueba que el archivo exista y no esté vacío. Tampoco valida el tipo MIME real, solo el `accept` del input.

**Solución:**

```js
const MAX_SIZE = 50 * 1024 * 1024
const ALLOWED = ['video/mp4', 'video/webm']

if (file.size > MAX_SIZE) {
  setError('El video supera los 50 MB')
  return
}
if (!ALLOWED.includes(file.type)) {
  setError('Formato no soportado')
  return
}
```

Y configurar el límite en el bucket de Supabase.

---

### 3.8. Realtime incompleto en grupos

**Dónde:** `supabase/schema.sql` (publicación), `src/app/chat/group/[groupId]/page.jsx`

`chat_groups` y `group_members` no están en la publicación `supabase_realtime`, pero el chat se suscribe a sus cambios. Los eventos no llegan hasta añadirlas.

**Solución:**

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
```

Comprueba antes si ya están:

```sql
SELECT tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```

---

## 4. P2 · UX, accesibilidad y rendimiento

| # | Limitación | Dónde | Mejora |
| --- | --- | --- | --- |
| 1 | El feed carga todos los videos. | `src/app/page.jsx` | Paginación con `.range()` y carga al llegar al final. |
| 2 | Cada `VideoCard` renderiza un `<video>` aunque no esté activo. | `src/components/VideoCard.jsx` | Montar solo el activo y los adyacentes; `preload="none"`. |
| 3 | No hay `loading` skeletons. | Varias páginas | Estados de carga consistentes. |
| 4 | Los errores de Supabase se muestran tal cual. | Login, subida, chat | Traducir y suavizar los mensajes. |
| 5 | No hay `ErrorBoundary`. | `src/app` | Añadir uno global y otro por ruta. |
| 6 | Los `toast` son inconsistentes. | Feed, perfil, chat | Un proveedor global de notificaciones. |
| 7 | Faltan `aria-label` en botones de icono. | `VideoCard`, `Sidebar`, chats | Añadirlos. |
| 8 | `div` clicables sin teclado. | Tarjetas, menús | Usar `<button>` o añadir rol y `onKeyDown`. |
| 9 | No se respeta `prefers-reduced-motion`. | Animaciones | Media query global. |
| 10 | Modales sin trampa de foco ni `Escape`. | Comentarios, editar perfil, grupos | Gestionar foco. |
| 11 | Contraste de blanco sobre rojo. | Botones | Revisar tamaños o usar un rojo más oscuro. |
| 12 | Videos sin subtítulos. | Feed | `<track kind="captions">`. |
| 13 | Enlaces de compartir sin `basePath`. | `VideoCard.jsx` | Ver §3.6. |
| 14 | No hay `next/image` ni optimización. | Avatares, miniaturas | Migrar a `next/image` o `loading="lazy"`. |
| 15 | La barra de progreso no es accesible por teclado. | `VideoCard` | Usar `<input type="range">` o botones. |

---

## 5. P3 · Deuda técnica

| # | Deuda | Impacto | Propuesta |
| --- | --- | --- | --- |
| 1 | JavaScript sin tipos. | Errores en ejecución. | Migrar a TypeScript o usar JSDoc + `checkJs`. |
| 2 | Sin tests. | Regresiones silenciosas. | Vitest + Testing Library; Playwright para flujos. |
| 3 | Sin CI. | Calidad manual. | GitHub Action con lint, build y tests. |
| 4 | Consultas dentro de las páginas. | Difícil reutilizar y testear. | Extraer `src/services/` o `src/lib/`. |
| 5 | Sin caché de datos. | Consultas repetidas. | TanStack Query o SWR. |
| 6 | Sin normalización de entidades. | Duplicación y desincronización. | Store o consultas cacheadas. |
| 7 | Sin logs ni monitorización. | Errores invisibles en producción. | Sentry o similar. |
| 8 | `dist/` desactualizado. | La demo no refleja el código actual. | Regenerar o redirigir la demo a Vercel. |
| 9 | `@tailwindcss/vite` sin uso. | Dependencia muerta. | Eliminar de `package.json`. |
| 10 | Sin `LICENSE`. | Falta claridad legal. | Añadir una licencia si se decide. |
| 11 | Sin migraciones versionadas. | Cambios de esquema manuales. | Supabase CLI + `supabase/migrations`. |
| 12 | Sin tipos generados de la base. | Columnas mal escritas. | `supabase gen types`. |
| 13 | Sin límites de almacenamiento. | Costes y abuso. | Configurar buckets y cuotas. |
| 14 | Sin moderación de contenido. | Riesgo si se abre al público. | Reportes, bloqueo de palabras, revisión. |
| 15 | Sin término de servicio ni privacidad. | Obligaciones legales si hay usuarios reales. | Redactar antes de abrir. |

---

## 6. Roadmap propuesto

### Fase 0 · Seguridad (1–2 días)

- [ ] Arreglar `get_conversations`.
- [ ] Arreglar INSERT de `notifications`.
- [ ] Arreglar recursión de `group_members` y `chat_groups`.
- [ ] Separar edición y lectura de mensajes con RPC.
- [ ] Implementar borrado de cuenta en servidor.
- [ ] Añadir `shares` o eliminar `increment_share`.
- [ ] Hacer idempotentes las políticas.
- [ ] Revisar todas las políticas con `pg_policies`.

**Criterio de salida:** un usuario autenticado no puede leer ni modificar datos de otro fuera de lo público.

### Fase 1 · Flujos rotos (2–3 días)

- [ ] Estado `loading` en `SessionProvider`.
- [ ] Añadir miembros al grupo.
- [ ] Mover `router.push` a `useEffect`.
- [ ] Token `tiktok-cyan`.
- [ ] Sanear búsqueda.
- [ ] `basePath` en compartir.
- [ ] Validar tamaño y tipo de video.
- [ ] Publicar tablas de grupo en realtime.

**Criterio de salida:** todos los flujos de la [guía de uso](07-guia-de-uso.md) funcionan sin errores visibles.

### Fase 2 · Calidad (1 semana)

- [ ] Tests unitarios de utilidades y componentes clave.
- [ ] Tests E2E de registro, login, subida y chat.
- [ ] CI con lint + build + tests.
- [ ] Manejo de errores centralizado.
- [ ] Skeletons y estados vacíos consistentes.
- [ ] Auditoría de accesibilidad (teclado, foco, contraste, ARIA).
- [ ] `prefers-reduced-motion`.
- [ ] Paginación del feed y `preload="none"`.

**Criterio de salida:** `npm run lint`, `npm run build` y los tests pasan en CI.

### Fase 3 · Producto (1–2 semanas)

- [ ] Mensajes con imagen/video/gif.
- [ ] Respuestas y likes en comentarios.
- [ ] Notificaciones push o email.
- [ ] Búsqueda de texto completo.
- [ ] Reportes y moderación.
- [ ] Edición de perfil más completa (enlaces, pronombres).
- [ ] PWA instalable.
- [ ] Analítica respetuosa con la privacidad.

### Fase 4 · Escala (opcional)

- [ ] Migrar a TypeScript.
- [ ] Extraer capa de servicios.
- [ ] Caché con TanStack Query.
- [ ] Migraciones con Supabase CLI.
- [ ] CDN para videos.
- [ ] Rate limiting y CAPTCHA.
- [ ] Observabilidad (Sentry, logs estructurados).

---

## 7. Definición de "terminado"

Una tarea se considera terminada cuando:

1. El código compila (`npm run build`).
2. Pasa el lint (`npm run lint`).
3. Se probó manualmente el flujo afectado.
4. No introduce claves ni datos sensibles.
5. Actualiza la documentación si cambia el esquema, las rutas o el comportamiento.
6. Si toca seguridad, tiene una prueba o una verificación SQL documentada.

---

## 8. Cómo contribuir

1. Haz un fork.
2. Crea una rama: `git checkout -b fix/rls-group-members`.
3. Haz cambios pequeños y atómicos.
4. Ejecuta lint y build.
5. Abre un PR describiendo:
   - Qué problema resuelve.
   - Cómo lo probaste.
   - Qué archivos toca.
   - Si requiere migración SQL.

### Convención de commits

```text
feat: añadir paginación al feed
fix: validar auth.uid() en get_conversations
docs: documentar políticas de storage
refactor: extraer cliente de Supabase
test: cubrir registro y login
chore: actualizar dependencias
```

### Qué no hacer

- No commitees `.env.local`, `test_db.cjs` ni claves.
- No uses `service_role` en el cliente.
- No desactives RLS para "probar rápido".
- No borres políticas sin entender qué permiten.
- No hagas `git push --force` a `main` o `gh-pages` compartidas.

---

## 9. Registro de esta documentación

| Fecha | Cambio |
| --- | --- |
| 2026-10-20 | Versión inicial: historia, arquitectura, estructura, base de datos, branding, desarrollo, guía de uso, despliegue y roadmap. |

---

## 10. Correcciones aplicadas en esta versión

| Fecha | Corrección | Archivos |
| --- | --- | --- |
| 2026-10-20 | El fallback del feed pasaba el objeto `user` completo a `profiles.username`, lo que provocaba el error de React #31 y dejaba la pantalla en blanco. Ahora usa `user.name` y `user.avatar`. | `src/app/page.jsx`, `dist/assets/index-BwS1EQeN.js` |
| 2026-10-20 | `npm run lint` usaba `next lint`, eliminado en Next.js 16. Se migró a ESLint CLI con configuración plana. | `package.json`, `eslint.config.mjs`, `package-lock.json` |
| 2026-10-20 | Se eliminaron errores del nuevo React Compiler lint: `EmptyFollowing` fuera del render, `useMemo` en listas filtradas, `onPlay`/`onPause` en el reproductor y supresiones justificadas para la carga inicial de tema y datos. | `src/app/page.jsx`, `src/app/profile/[username]/{followers,following}/page.jsx`, `src/components/VideoCard.jsx`, `src/context/ThemeContext.jsx` |
| 2026-10-20 | Documentación completa, banner, logo monocromo, captura de la demo y guía de publicación. | `README.md`, `docs/`, `docs/assets/` |

> Tras estas correcciones, `npm run lint` termina con **0 errores** y 24 advertencias (principalmente `@next/next/no-img-element`). `npm run build` compila correctamente.

---

Volver al [índice](README.md) · [README principal](../README.md).
