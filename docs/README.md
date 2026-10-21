# 📚 Documentación de TikTokJonathan

Esta carpeta reúne todo lo necesario para entender, ejecutar, mantener y ampliar el proyecto. Está escrita en español y organizada por temas, no por archivos: cada documento cuenta una parte de la historia completa.

## Índice

| # | Documento | Qué responde |
| --- | --- | --- |
| 01 | [Historia y evolución](01-historia.md) | ¿Cómo nació? ¿Cómo pasó de Vite a Next.js? ¿Qué se aprendió? |
| 02 | [Arquitectura](02-arquitectura.md) | ¿Cómo está organizada la app? ¿Cómo fluyen los datos? |
| 03 | [Estructura](03-estructura.md) | ¿Qué hace cada carpeta y cada archivo? |
| 04 | [Base de datos](04-base-de-datos.md) | Tablas, relaciones, RLS, RPC, storage y realtime. |
| 05 | [Branding](05-branding.md) | Nombre, logo, colores, tipografía, voz y componentes. |
| 06 | [Desarrollo](06-desarrollo.md) | Setup, convenciones, recetas y troubleshooting. |
| 07 | [Guía de uso](07-guia-de-uso.md) | Recorrido pantalla por pantalla para usuarios. |
| 08 | [Despliegue](08-despliegue.md) | GitHub Pages, Vercel, variables y producción. |
| 09 | [Limitaciones y roadmap](09-limitaciones-y-roadmap.md) | Bugs conocidos, seguridad, deuda técnica y próximos pasos. |

## Rutas de lectura recomendadas

**Si vienes a probar la app:**
1. [README principal](../README.md) → puesta en marcha.
2. [Guía de uso](07-guia-de-uso.md).
3. [Despliegue](08-despliegue.md) si quieres publicarla.

**Si vienes a entender el código:**
1. [Historia](01-historia.md) para el contexto.
2. [Arquitectura](02-arquitectura.md).
3. [Estructura](03-estructura.md).
4. [Base de datos](04-base-de-datos.md).

**Si vienes a mantenerla o mejorarla:**
1. [Desarrollo](06-desarrollo.md).
2. [Limitaciones y roadmap](09-limitaciones-y-roadmap.md).
3. [Base de datos](04-base-de-datos.md) antes de tocar RLS.

**Si vienes a reutilizar la identidad visual:**
1. [Branding](05-branding.md).
2. Assets en [`docs/assets/`](assets/).

## Convenciones de esta documentación

- Los enlaces a código usan rutas relativas al repositorio.
- Los diagramas están en [Mermaid](https://mermaid.js.org/), que GitHub renderiza de forma nativa.
- Las referencias a líneas de código corresponden a la versión documentada; si el archivo cambia, pueden desplazarse.
- Las afirmaciones sobre la historia del proyecto se basan en evidencia del repositorio. Lo que no se puede verificar se indica como inferencia.

## Estado de la documentación

| Documento | Estado |
| --- | --- |
| Historia | Reconstruida a partir del código; admite anécdotas personales. |
| Arquitectura | Completa para la versión actual. |
| Estructura | Completa. |
| Base de datos | Completa, con notas de seguridad. |
| Branding | Completo, con assets. |
| Desarrollo | Completo. |
| Guía de uso | Completa. |
| Despliegue | Completo, incluyendo la demo estática. |
| Roadmap | Completo y priorizado. |

---

Volver al [README principal](../README.md).
