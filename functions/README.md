# Cloudflare Pages Functions

API + middleware desplegados con el sitio en el proyecto Pages `nimpo-studio`.

## Rutas

| Ruta | Archivo | Qué hace |
|------|---------|----------|
| `*` (middleware) | `_middleware.ts` | Protege `/admin/*` (cookie firmada) |
| `POST /admin/session` | `admin/session.ts` | Login / logout admin |
| `GET /admin/session` | `admin/session.ts` | Estado de sesión |
| `POST /admin/publish` | `admin/publish.ts` | Subida + catálogo (allowlist + cuotas) |
| `POST /admin/upload` | `admin/upload.ts` | **410 Gone** — usar publish |
| `GET /api/library` | `api/library.ts` | Catálogo R2 sanitizado |
| `POST /api/track` | `api/track.ts` | Analíticas first-party |
| `POST /api/quote` | `api/quote.ts` | Presupuesto licencia → email estudio |
| `GET /api/quote` | `api/quote.ts` | Health mínimo |

## Secrets / vars (Pages)

| Variable | Uso |
|----------|-----|
| `ADMIN_LIBRARY_SECRET` | Contraseña admin (nunca `PUBLIC_*`) |
| `ADMIN_SESSION_SECRET` | Firma cookie (recomendada, ≠ password) |
| `TURNSTILE_SECRET_KEY` | Si está, `/api/quote` exige Turnstile |
| `PUBLIC_TURNSTILE_SITE_KEY` | Widget en formularios (build-time / Pages env) |
| `SEND_CLIENT_QUOTE_EMAIL` | `1` = también mail al solicitante (off por defecto) |
| `MAIL_SECRET` / `MAIL_WORKER_URL` / `MAIL` | Email estudio |
| `QUOTE_TO_EMAIL` | Destino estudio |
| `LIBRARY_PUBLIC_BASE` | Base URL r2.dev |
| `RATE_LIMIT_KV` | Binding KV opcional multi-edge |

## Rate limits

| Endpoint | Límite |
|----------|--------|
| `POST /admin/session` | 8 / 15 min por IP |
| `POST /admin/publish` | 15 / hora por IP |
| `POST /api/quote` | 6 / hora por IP |

Memoria del isolate + KV si hay binding. IP solo desde `CF-Connecting-IP`.

## Seguridad subidas

- Extensiones allowlist (vídeo/audio/imagen)
- MIME canónico por extensión
- 100 MB/archivo, 250 MB/publish, 24 stems
- Catálogo sanitizado al leer (`catalog-sanitize.ts`)
- Front: `escapeHtml` + `safeDomId` / `safeAspectLabel` / `safeMediaUrl`

## CORS (`/api/quote`)

Orígenes: dominio prod, `*.nimpo-studio.pages.dev`, localhost.

## Docs

- Admin: `docs/admin-acceso.md`
- Estado: `docs/estado.md`
