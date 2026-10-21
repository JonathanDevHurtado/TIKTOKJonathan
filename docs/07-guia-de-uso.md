# 07 · Guía de uso

Recorrido funcional de TikTokJonathan, pantalla por pantalla. Está pensada para alguien que abre la app por primera vez, no para programadores. Si buscas instrucciones técnicas, ve a [06 · Desarrollo](06-desarrollo.md).

> **Antes de empezar:** la demo de GitHub Pages es un build estático sin backend. Muestra el feed con datos de ejemplo, pero el registro, el login y las acciones sociales no funcionan allí. Para probar todo necesitas ejecutar la app con tu propio Supabase ([puesta en marcha](../README.md#-puesta-en-marcha)).

---

## 1. Mapa de pantallas

```text
┌─────────────────────────────────────────────────────────────┐
│  Sidebar (escritorio)        Bottom nav (móvil)             │
│  Inicio · Explorar · Mensajes · Bandeja · Perfil · Subir    │
└─────────────────────────────────────────────────────────────┘
        │
        ├── /                  Feed vertical (Para mí / Siguiendo)
        ├── /explore           Buscar, tendencias, categorías, usuarios
        ├── /video/[id]        Reproductor individual
        ├── /upload            Subir video
        ├── /profile/me        Mi perfil
        ├── /profile/[user]    Perfil público
        │     ├── /followers   Seguidores
        │     └── /following   Seguidos
        ├── /chat              Conversaciones y grupos
        │     ├── /chat/[userId]        Mensaje directo
        │     └── /chat/group/[groupId] Grupo
        ├── /notifications     Bandeja
        ├── /login             Iniciar sesión
        └── /register          Crear cuenta
```

---

## 2. Primeros pasos

### 2.1. Crear una cuenta

1. Pulsa **Registrarse** en la barra inferior (móvil) o **Registrarse** en la sidebar (escritorio).
2. Rellena:
   - **Nombre de usuario:** será tu `@` público. Debe ser único.
   - **Correo electrónico.**
   - **Contraseña:** mínimo 6 caracteres.
3. Pulsa **Crear cuenta**.

Si la confirmación por email está activa, Supabase enviará un correo. Hasta que lo confirmes, el login puede fallar. Si está desactivada, entrarás directamente.

### 2.2. Iniciar sesión

1. Ve a **Iniciar sesión**.
2. Introduce email y contraseña.
3. Pulsa **Entrar**.

Si ya hay una sesión activa, la app te redirige a tu perfil.

### 2.3. Cerrar sesión

1. Abre tu perfil (`/profile/me`).
2. Pulsa el menú **☰** arriba a la derecha.
3. Elige **Cerrar sesión**.

---

## 3. Feed principal (`/`)

### 3.1. Tabs

- **Para mí:** todos los videos, del más reciente al más antiguo.
- **Siguiendo:** solo videos de las cuentas que sigues. Si no sigues a nadie, verás un estado vacío con un botón para descubrir creadores.

### 3.2. Navegación

- **Rueda del ratón:** sube o baja un video.
- **Gesto táctil:** desliza hacia arriba o abajo.
- **Flechas laterales (escritorio):** botones ▲ y ▼.
- **Scroll snap:** cada video ocupa la pantalla completa.

### 3.3. Reproducción

- El video activo se reproduce automáticamente y en bucle.
- Si el navegador bloquea el autoplay con sonido, se reproduce en silencio.
- **Clic/tap en el video:** pausa o reanuda.
- **Doble clic/tap:** da like y muestra un corazón animado.
- **Control de volumen:** arriba a la derecha; se expande al pasar el ratón.
- **Barra de progreso:** en la parte inferior del video.

### 3.4. Acciones sociales

| Acción | Cómo | Qué pasa |
| --- | --- | --- |
| **Like** | Corazón ❤️ | Se guarda en `likes`; el autor recibe una notificación. |
| **Comentarios** | Icono 💬 | Abre el panel lateral (escritorio) o inferior (móvil). |
| **Guardar** | Marcador 🔖 | Se guarda en `saves` y aparece en **Favoritos** de tu perfil. |
| **Compartir** | Icono de compartir | Copia el enlace del video al portapapeles. |
| **Seguir** | Botón **+** sobre el avatar | Sigues al autor; recibe una notificación. |
| **Borrar** | Papelera 🗑️ | Solo si el video es tuyo; pide confirmación. |

### 3.5. Comentarios

- Se cargan al abrir el panel, del más reciente al más antiguo.
- Escribe en el campo inferior y pulsa **Enviar**.
- Los comentarios nuevos aparecen arriba.
- El autor del video recibe una notificación con el texto.

### 3.6. Visualizaciones

- Cada video suma una vista a los 3 segundos de reproducción.
- El contador se actualiza en la base de datos mediante una función atómica.

---

## 4. Explorar (`/explore`)

### 4.1. Buscar

- Escribe en la barra superior. La búsqueda se ejecuta automáticamente tras 300 ms.
- Resultados en dos pestañas:
  - **Videos:** coincidencias en la descripción.
  - **Usuarios:** coincidencias en `username` o `full_name`.
- Cada pestaña muestra el número de resultados.
- Pulsa la **X** para limpiar la búsqueda.

### 4.2. Tendencias

- Muestra hasta 12 videos ordenados por número de visualizaciones.
- Cada tarjeta muestra el autor, la descripción y las vistas.
- Al pulsar, se abre el reproductor individual.

### 4.3. Categorías

- Pills con emoji y nombre.
- Al pulsar una, se cargan sus videos debajo.
- Al llegar al final, se cargan más automáticamente (*scroll* infinito).
- Vuelve a pulsar la misma pill o la **X** para cerrar.

### 4.4. Usuarios nuevos

- Lista de hasta 15 perfiles.
- Pulsa uno para abrir su perfil.

---

## 5. Reproductor individual (`/video/[id]`)

- Muestra el video seleccionado y permite navegar al anterior/siguiente con flechas, rueda o gestos.
- La URL cambia al video actual.
- Incluye las mismas acciones sociales que el feed.
- El botón **←** vuelve a la pantalla anterior.

---

## 6. Perfil (`/profile/me` y `/profile/[username]`)

### 6.1. Cabecera

- Avatar (pulsa para verlo en grande).
- `@username`.
- Nombre completo si existe.
- Biografía.
- Estadísticas:
  - **Siguiendo:** cuentas que sigues.
  - **Seguidores:** cuentas que te siguen.
  - **Me gusta:** total de likes recibidos en tus videos.

### 6.2. Editar perfil (solo dueño)

1. Pulsa el botón **Editar perfil** o el lápiz sobre el avatar.
2. Cambia:
   - **Foto:** pulsa el avatar y elige una imagen.
   - **Nombre de usuario.**
   - **Biografía.**
   - **Cumpleaños:** la edad se calcula automáticamente.
   - **Género.**
3. Pulsa **Guardar**.

La foto se sube al bucket `avatars` y se guarda la URL pública.

### 6.3. Pestañas

- **Videos:** tus videos o los del usuario visitado.
- **Favoritos:** solo visible para el dueño; muestra los videos que guardaste.

### 6.4. Seguidores y seguidos

- Pulsa las estadísticas para abrir las listas.
- Cada lista tiene un buscador por nombre de usuario.
- Puedes seguir o dejar de seguir desde la lista.

### 6.5. Bloquear a alguien

1. Abre su perfil.
2. Pulsa **⋯** arriba a la derecha.
3. Elige **Bloquear**.

Efectos:
- Dejas de seguirlo.
- Su contenido se oculta para ti.
- Si esa persona te ha bloqueado, verás "Usuario no disponible".

### 6.6. Menú del dueño

Pulsa **☰**:

- **Modo claro/oscuro.**
- **Cerrar sesión.**
- **Borrar cuenta:** pide confirmación y elimina el perfil. **Advertencia:** el usuario de Auth puede permanecer; ver [limitaciones](09-limitaciones-y-roadmap.md).

### 6.7. Favoritos

- Se cargan de `saves`.
- Cada tarjeta abre el video.
- Solo el dueño puede ver esta pestaña.

---

## 7. Subir un video (`/upload`)

1. Pulsa **Subir** en la sidebar o el botón central **+** en móvil.
2. Si no tienes sesión, te redirige a login.
3. Selecciona un archivo **MP4** o **WebM**.
4. Verás una vista previa.
5. Escribe una **descripción** (obligatoria).
6. Elige una **categoría** (opcional).
7. Pulsa **Publicar**.

El video se sube al bucket `videos` y se crea la fila en la tabla. Al terminar, te lleva a tu perfil.

> La interfaz recomienda menos de 50 MB, pero **no valida el tamaño real**. Si el archivo es muy grande, la subida puede fallar o tardar mucho.

---

## 8. Mensajes (`/chat`)

### 8.1. Lista de conversaciones

- Muestra grupos primero y luego mensajes directos.
- Cada conversación muestra avatar, nombre, último mensaje, fecha y no leídos.
- Se actualiza en tiempo real cuando llega un mensaje.

### 8.2. Buscar usuarios

- Escribe al menos 2 caracteres.
- Se buscan coincidencias en `username`.
- Pulsa un resultado para abrir el chat.

### 8.3. Mensaje directo (`/chat/[userId]`)

- Cabecera con avatar, `@username` y nombre.
- Historial ordenado por fecha.
- Los mensajes propios van a la derecha (rojo); los ajenos a la izquierda.
- **Enter** envía; **Shift + Enter** hace salto de línea.
- Al pasar el ratón por un mensaje propio aparece **⋯**:
  - **Editar:** cambia el texto y marca "editado".
  - **Eliminar:** borrado lógico; se muestra "Este mensaje fue eliminado".
- Los mensajes se marcan como leídos al abrirlos.

### 8.4. Grupos (`/chat/group/[groupId]`)

**Crear un grupo:**
1. En `/chat`, pulsa **Grupo**.
2. Escribe nombre (obligatorio) y descripción (opcional).
3. Pulsa **Crear y continuar**.
4. Serás el administrador.

**Dentro del grupo:**
- **Cabecera:** avatar, nombre y número de miembros.
- **⚙️:** abre el panel de información.
- **Editar nombre/descripción:** solo el dueño, al perder el foco del campo.
- **Cambiar avatar:** solo el dueño.
- **Añadir miembros:** busca por username y pulsa **Añadir**.
- **Salir del grupo:** botón inferior.
- **Eliminar grupo:** solo el dueño; borra el grupo para todos.

> El botón de añadir miembros puede fallar por la política RLS actual. Está documentado en [09 · Limitaciones](09-limitaciones-y-roadmap.md).

---

## 9. Notificaciones (`/notifications`)

- Muestra las notificaciones de likes, comentarios, seguidores y mensajes.
- Cada una incluye avatar, actor, acción, tiempo relativo y miniatura del video si aplica.
- Las no leídas se resaltan.
- Al abrir la página se marcan todas como leídas.
- El badge de la sidebar y de la barra inferior se actualiza en tiempo real.

### Tipos

| Tipo | Icono | Texto |
| --- | --- | --- |
| `like` | ❤️ rojo | "le ha gustado tu video." |
| `comment` | 💬 cian | "ha comentado: ..." |
| `follow` | 👤 azul | "ha empezado a seguirte." |
| `message` | 💬 verde | "te ha enviado un mensaje: ..." |

---

## 10. Tema claro/oscuro

- Por defecto: **oscuro**.
- Cambia desde el menú **☰** de tu perfil.
- La preferencia se guarda en `localStorage['theme']`.
- Afecta a fondos, textos y bordes; el rojo de marca se mantiene.

---

## 11. Gestos y atajos

| Acción | Dónde | Resultado |
| --- | --- | --- |
| Rueda arriba/abajo | Feed, video | Video anterior/siguiente. |
| Deslizar vertical | Feed, video (móvil) | Video anterior/siguiente. |
| Doble clic/tap | Video | Like + corazón. |
| Clic/tap | Video | Pausa/reanuda. |
| Enter | Chat | Enviar mensaje. |
| Shift + Enter | Chat | Salto de línea. |
| Clic fuera | Modales | Cerrar (en la mayoría). |

---

## 12. Estados vacíos

| Pantalla | Mensaje |
| --- | --- |
| Feed sin videos | "Aún no hay videos publicados" |
| Siguiendo sin videos | "Sin videos de seguidos" + botón para explorar |
| Comentarios | "Sé el primero en comentar." |
| Perfil sin videos | "No hay videos todavía" |
| Búsqueda sin resultados | "Sin resultados para ..." |
| Notificaciones | "No hay notificaciones" |
| Chat sin conversaciones | "Busca a un usuario arriba para empezar a chatear" |
| Chat vacío | "Empieza la conversación" + "Di hola a @usuario" |
| Seguidores | "Sin seguidores todavía" |
| Seguidos | "No sigue a nadie todavía" |

---

## 13. Preguntas frecuentes

**¿Puedo usar la app sin registrarme?**
Sí, puedes ver el feed y explorar. Para dar like, comentar, guardar, seguir, subir videos y chatear necesitas una cuenta.

**¿Dónde se guardan mis videos?**
En Supabase Storage, bucket `videos`. La base de datos guarda la URL pública y los metadatos.

**¿Puedo borrar un video?**
Sí, si eres el dueño. Desde el feed (papelera) o desde tu perfil (X sobre la miniatura).

**¿Puedo recuperar un mensaje eliminado?**
No. El borrado es lógico: el texto se reemplaza y el mensaje queda marcado como eliminado.

**¿Por qué no veo las notificaciones en vivo?**
Comprueba que la tabla `notifications` esté en la publicación `supabase_realtime` y que el navegador tenga conexión.

**¿Por qué el video se reproduce sin sonido?**
Los navegadores bloquean el autoplay con audio. Pulsa el icono de volumen o interactúa con la página.

**¿Por qué no puedo añadir miembros a mi grupo?**
Es un bug de RLS documentado. La política actual solo permite que un usuario se añada a sí mismo.

**¿Por qué la demo de GitHub Pages no me deja iniciar sesión?**
Porque es un build estático antiguo con una URL de Supabase de marcador. Necesitas ejecutar la app con tu propio proyecto.

**¿Puedo cambiar el nombre de usuario?**
Sí, desde **Editar perfil**. Debe ser único.

**¿Cómo reporto un bug?**
Abre un issue en [GitHub](https://github.com/JonathanDevHurtado/TIKTOKJonathan/issues) con pasos para reproducirlo y sin incluir claves.

---

Siguiente: [08 · Despliegue](08-despliegue.md) · Volver al [índice](README.md).
