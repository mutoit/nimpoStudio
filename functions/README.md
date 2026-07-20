# Cloudflare Pages Functions

API + middleware desplegados con el sitio en el proyecto Pages `nimpo-studio`.

## Rutas

| Ruta | Archivo | Qué hace |
|------|---------|----------|
| `*` (middleware) | `_middleware.ts` | Protege `/admin/*` (cookie firmada) |
| `POST /admin/session` | `admin/session.ts` | Login / logout admin |
| `GET /admin/session` | `admin/session.ts` | Estado de sesión |
| `POST /api/track` | `api/track.ts` | Analíticas first-party |
| `GET /api/track` | `api/track.ts` | Health check |
| `POST /api/quote` | `api/quote.ts` | Presupuesto licencia + email |
| `GET /api/quote` | `api/quote.ts` | Health + providers de email |

## Secrets (Pages → Environment variables)

| Variable | Uso |
|----------|-----|
| `ADMIN_LIBRARY_SECRET` | Contraseña admin (nunca `PUBLIC_*`) |
| `MAIL_SECRET` | Pages ↔ Worker mail |
| `MAIL_WORKER_URL` | URL pública nimpo-mail |
| `QUOTE_TO_EMAIL` | Destino estudio |
| `MAIL` | Service binding Worker (opcional) |
| `RESEND_API_KEY` / `CLOUDFLARE_API_TOKEN` | Fallback email |

## Rate limits (en memoria del isolate)

| Endpoint | Límite |
|----------|--------|
| `POST /admin/session` | 10 / 15 min por IP |
| `POST /api/quote` | 20 / hora por IP |

Respuesta: `429` + `Retry-After`. No multi-isolate (ver WAF/KV si hace falta).

## CORS (`/api/quote`)

Orígenes permitidos: `nimpo3dstudio.com`, `www`, `*.nimpo-studio.pages.dev`, localhost.  
Same-origin del sitio no necesita CORS.

## Email de `/api/quote`

Worker `nimpo-mail` + binding `EMAIL`. Ver `workers/nimpo-mail/`.  
Sin email el cliente **igual ve el precio** en pantalla; logs `[QUOTE]`.

## Docs

- Admin: `docs/admin-acceso.md`
