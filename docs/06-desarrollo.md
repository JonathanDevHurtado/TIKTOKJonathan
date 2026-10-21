# 06 · Desarrollo

Guía práctica para instalar, ejecutar, mantener y ampliar el proyecto. Si solo quieres ver la app funcionando, empieza por el [README principal](../README.md).

---

## 1. Requisitos

| Herramienta | Versión mínima | Verificado con |
| --- | --- | --- |
| Node.js | 20 | 24.19 |
| npm | 10 | 12.2 |
| Git | 2.30 | 2.56 |
| Supabase | Proyecto en la nube o local | — |
| Navegador | Chrome, Firefox, Edge o Safari recientes | Firefox |

No se necesita Docker salvo que quieras usar Supabase local.

---

## 2. Instalación desde cero

```bash
git clone https://github.com/JonathanDevHurtado/TIKTOKJonathan.git
cd TIKTOKJonathan
npm install
cp .env.example .env.local
```

Edita `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-publica
```

Arranca:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### ¿Qué pasa si no configuras Supabase?

La app arranca igual porque `src/utils/supabase.js` usa valores de marcador:

```js
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
```

El feed cae en los datos de ejemplo de `src/data/videos.js`. Login, registro, subida, chat y notificaciones **no funcionarán**.

---

## 3. Configurar Supabase

### 3.1. Crear el proyecto

1. Entra en [supabase.com](https://supabase.com/) y crea un proyecto.
2. Espera a que termine el aprovisionamiento.
3. Guarda la **Project URL** y la **anon public key** de **Project Settings → API**.

### 3.2. Ejecutar el esquema

1. Abre **SQL Editor**.
2. Pega el contenido completo de [`supabase/schema.sql`](../supabase/schema.sql).
3. Ejecuta.
4. Revisa **Table Editor**: deben aparecer 13 tablas.
5. Revisa **Storage**: deben existir `videos`, `avatars` y `chat-media`.

> Si el script falla a mitad, revisa el error. Las políticas de storage y notificaciones no tienen `DROP POLICY IF EXISTS`, así que una segunda ejecución puede fallar con "policy already exists". En ese caso, crea un proyecto nuevo o elimina las políticas existentes antes de reintentar.

### 3.3. Configurar Auth

En **Authentication → Providers → Email**:

- Activa **Enable email provider**.
- Para desarrollo, desactiva **Confirm email** si no quieres configurar SMTP.
- Para producción, activa la confirmación y configura un proveedor SMTP.

En **Authentication → URL Configuration**:

- **Site URL:** `http://localhost:3000` en desarrollo; tu dominio en producción.
- **Redirect URLs:** añade `http://localhost:3000/**` y `https://tu-dominio/**`.

### 3.4. Verificar permisos

Ejecuta en el SQL Editor:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Todas deben tener `rowsecurity = true`.

### 3.5. Probar el registro

1. Abre `/register`.
2. Crea una cuenta.
3. Comprueba en **Table Editor → profiles** que se creó el perfil.
4. Si no se creó, revisa el trigger `on_auth_user_created` y los logs de Auth.

---

## 4. Scripts

| Comando | Qué hace | Cuándo usarlo |
| --- | --- | --- |
| `npm run dev` | Next.js en modo desarrollo con recarga en caliente. | Día a día. |
| `npm run build` | Compila la app para producción. | Antes de desplegar. |
| `npm run start` | Sirve el build de producción. | Probar el build localmente. |
| `npm run lint` | Ejecuta ESLint. | Antes de commit. |

### Build de producción

```bash
npm run build
npm run start
```

Si el build falla, revisa primero los imports y el uso de APIs de navegador (`window`, `localStorage`, `document`) en componentes que no sean de cliente. Todas las páginas ya llevan `"use client"`, pero un componente nuevo podría olvidarlo.

---

## 5. Convenciones de código

### 5.1. Componentes

- Un componente por archivo, con export default.
- Los que usan hooks, eventos o APIs del navegador llevan `"use client"` en la primera línea.
- Los nombres van en PascalCase.
- Los props se desestructuran en la firma.

```jsx
"use client"
export default function MiComponente({ video, isActive }) {
  // ...
}
```

### 5.2. Páginas

- Siempre en `src/app/<ruta>/page.jsx`.
- Si necesitan estado o efectos, `"use client"`.
- La lógica de carga va en `useEffect` con función async interna (no se puede pasar una función async directamente a `useEffect`).

```jsx
useEffect(() => {
  const load = async () => {
    const { data } = await supabase.from('videos').select('*')
    setVideos(data || [])
  }
  load()
}, [])
```

### 5.3. Consultas

- Usa el cliente exportado de `src/utils/supabase.js`.
- Selecciona solo las columnas necesarias cuando la tabla crezca.
- Para contadores usa `{ count: 'exact', head: true }`.
- Maneja siempre `error` o al menos un fallback.

### 5.4. Estilos

- Tailwind directamente en `className`.
- Para colores de marca, usa los tokens (`bg-tiktok-red`, `text-tiktok-gray`).
- Para superficies y texto que cambian con el tema, usa variables CSS (`bg-[var(--bg-secondary)]`, `text-[var(--text-primary)]`).
- Evita estilos inline salvo valores dinámicos (progreso, posiciones).

### 5.5. Textos

- Español, segunda persona, frases cortas.
- Errores: qué pasó y qué puede hacer el usuario.
- Sigue la guía de [Branding](05-branding.md#8-voz-y-tono).

### 5.6. Git

- Commits en imperativo y con alcance: `feat: añadir filtro de categorías`, `fix: corregir badge de notificaciones`.
- Un commit por cambio lógico.
- No commitees `.env.local`, `test_db.cjs` ni `node_modules`.

---

## 6. Recetas

### 6.1. Añadir una página

1. Crea `src/app/mi-pagina/page.jsx`.
2. Añade `"use client"` si usa hooks.
3. Impórtala desde un enlace o añádela a la navegación.

```jsx
"use client"

export default function MiPagina() {
  return <div className="p-8">Hola</div>
}
```

### 6.2. Añadir un ítem de navegación

Edita el array `NAV` en `src/components/Sidebar.jsx`. Hay dos:

- `Sidebar` para escritorio.
- `BottomNav` para móvil.

Usa un icono de `lucide-react` y una ruta existente.

### 6.3. Añadir una tabla

1. Añade el `CREATE TABLE` a `supabase/schema.sql`.
2. Activa RLS: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`.
3. Crea políticas de SELECT, INSERT, UPDATE y DELETE según corresponda.
4. Documenta la tabla en [04 · Base de datos](04-base-de-datos.md).
5. Ejecuta el SQL en Supabase.

### 6.4. Añadir una función RPC

```sql
CREATE OR REPLACE FUNCTION public.mi_funcion(parametro UUID)
RETURNS void AS $$
BEGIN
  -- lógica
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.mi_funcion(UUID) TO authenticated;
```

Llámala desde el cliente:

```js
const { error } = await supabase.rpc('mi_funcion', { parametro: id })
```

> `SECURITY DEFINER` salta RLS. Úsalo solo cuando sea necesario y valida siempre `auth.uid()` dentro de la función.

### 6.5. Añadir realtime

```js
const channel = supabase
  .channel('mi-canal')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'mi_tabla',
    filter: `user_id=eq.${userId}`,
  }, (payload) => {
    // actualizar estado
  })
  .subscribe()

return () => supabase.removeChannel(channel)
```

Recuerda añadir la tabla a la publicación:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.mi_tabla;
```

### 6.6. Cambiar los colores

1. Edita los tokens en `src/index.css` (`@theme`).
2. Edita las variables de `:root` y `.light`.
3. Revisa contrastes.
4. Actualiza [05 · Branding](05-branding.md).

### 6.7. Añadir un modal

- Usa `fixed inset-0 z-[100]` con fondo `bg-black/60 backdrop-blur-sm`.
- Cierra al hacer clic fuera y con un botón `X`.
- Bloquea el scroll del fondo si es necesario.
- Añade `role="dialog"` y `aria-modal="true"` (pendiente en los modales actuales).

---

## 7. Troubleshooting

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| `supabaseUrl is required` | Falta `.env.local` o la URL está vacía. | Copia `.env.example` y rellena los valores. |
| `Invalid API key` | Anon key incorrecta o de otro proyecto. | Revisa **Project Settings → API**. |
| `new row violates row-level security policy` | La política no permite esa operación. | Revisa la política de la tabla y que `auth.uid()` coincida. |
| `permission denied for table ...` | RLS activo sin política para esa operación. | Añade la política que falta. |
| `relation "public.x" does not exist` | El esquema no se ejecutó o falló a mitad. | Ejecuta `schema.sql` en un proyecto limpio. |
| `column "shares" does not exist` | `increment_share` referencia una columna inexistente. | Añade la columna o no llames a la función. |
| El login no hace nada | Confirmación de email activa o credenciales incorrectas. | Revisa el mensaje de error y la configuración de Auth. |
| El registro crea el usuario pero no el perfil | El trigger no se creó. | Ejecuta la sección del trigger en SQL Editor. |
| El video subido no se reproduce | Bucket privado o URL incorrecta. | Verifica que el bucket `videos` sea público. |
| `403` al subir un archivo | Política de storage o sesión ausente. | Revisa que `auth.uid() = owner` y que haya sesión. |
| Realtime no actualiza | Tabla fuera de la publicación. | `ALTER PUBLICATION supabase_realtime ADD TABLE ...`. |
| Los estilos no se aplican | Clase inexistente (p. ej. `tiktok-cyan`) o falta el plugin de Tailwind. | Revisa `src/index.css` y `postcss.config.mjs`. |
| El puerto 3000 está ocupado | Otro proceso lo usa. | `PORT=3001 npm run dev` o mata el proceso. |
| Error de hidratación | Uso de `window`/`localStorage` en render. | Mueve la lógica a `useEffect`. |
| GitHub Pages muestra 404 al entrar a una ruta | Falta el fallback `404.html` o el `basename`. | Revisa [08 · Despliegue](08-despliegue.md). |

### Ver logs

- **Desarrollo:** consola del navegador y terminal de Next.js.
- **Supabase:** **Logs → Postgres / Auth / Storage / Realtime**.
- **Red:** pestaña Network para ver las peticiones a `*.supabase.co` y sus respuestas.

### Depurar RLS

Si una consulta devuelve `[]` sin error, puede ser RLS. Prueba temporalmente con la `service_role` en un script de servidor (nunca en el navegador) o revisa las políticas:

```sql
SELECT * FROM pg_policies WHERE tablename = 'mi_tabla';
```

---

## 8. Checklist antes de commit

- [ ] `npm run lint` sin errores nuevos.
- [ ] `npm run build` compila.
- [ ] Probé login, feed y la pantalla que toqué.
- [ ] No incluí `.env.local`, claves ni `test_db.cjs`.
- [ ] Actualicé la documentación si cambié esquema, rutas o comportamiento.
- [ ] Los textos nuevos están en español y siguen la guía de voz.

---

## 9. Checklist antes de desplegar

- [ ] Variables de entorno configuradas en el hosting.
- [ ] RLS revisado en todas las tablas.
- [ ] `service_role` fuera del cliente.
- [ ] Redirect URLs de Auth configuradas.
- [ ] Buckets con límites de tamaño.
- [ ] Build de producción probado.
- [ ] Backup o plan de rollback.

---

Siguiente: [07 · Guía de uso](07-guia-de-uso.md) · Volver al [índice](README.md).
