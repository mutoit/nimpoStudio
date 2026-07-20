# Cloudflare Pages Functions

API desplegada junto al sitio estático en el proyecto Pages `nimpo-studio`.

## Activo (fase 1)

| Ruta | Archivo | Qué hace |
|------|---------|----------|
| `POST /api/track` | `api/track.ts` | Analíticas first-party (eventos música, etc.) |
| `GET /api/track` | `api/track.ts` | Health check |
| `POST /api/quote` | `api/quote.ts` | Presupuesto licencia + email (Resend) |
| `GET /api/quote` | `api/quote.ts` | Health + si hay RESEND_API_KEY |

### Email de `/api/quote` (Cloudflare Email Sending)

**Worker** `nimpo-mail` (binding `EMAIL`) + secrets en Pages:

| Variable | Uso |
|----------|-----|
| `MAIL_SECRET` | Compartido Pages ↔ Worker (`X-Mail-Secret`) |
| `MAIL_WORKER_URL` | `https://nimpo-mail.nosinfantasia.workers.dev/` |
| `QUOTE_TO_EMAIL` | Destino estudio (default `contacto@nimpo3dstudio.com`) |
| `MAIL` | Service binding al Worker (opcional, en `wrangler.toml`) |

Deploy mail: `cd workers/nimpo-mail && npx wrangler deploy`  
Fallbacks: `CLOUDFLARE_API_TOKEN` (REST) o `RESEND_API_KEY`.

Sin email el cliente **igual ve el precio** en pantalla; solicitud en Logs (`[QUOTE]`).

Logs visibles en Cloudflare → Pages → `nimpo-studio` → **Logs**.

## Reservado (fase 2+)

- `/api/checkout` — Stripe
- `/api/webhooks/stripe` — confirmación de pedidos
- `/api/download` — enlaces firmados a R2
- `/api/auth` — magic link área de cliente

En fase 1 el sitio es mayormente estático; solo `/api/track` está implementada.