# Cloudflare Pages Functions

API desplegada junto al sitio estático en el proyecto Pages `nimpo-studio`.

## Activo (fase 1)

| Ruta | Archivo | Qué hace |
|------|---------|----------|
| `POST /api/track` | `api/track.ts` | Analíticas first-party (eventos música, etc.) |
| `GET /api/track` | `api/track.ts` | Health check |

Logs visibles en Cloudflare → Pages → `nimpo-studio` → **Logs**.

## Reservado (fase 2+)

- `/api/checkout` — Stripe
- `/api/webhooks/stripe` — confirmación de pedidos
- `/api/download` — enlaces firmados a R2
- `/api/auth` — magic link área de cliente

En fase 1 el sitio es mayormente estático; solo `/api/track` está implementada.