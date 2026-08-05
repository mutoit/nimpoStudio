# Cloudflare Pages Functions

API + middleware desplegados con el sitio en el proyecto Pages `nimpo-studio`.

**Base API canónica:** `https://nimpo3dstudio.com` (**sin www**).  
`public/_redirects`: `www` → apex en `/api/*` y `/admin/*` con **308** (conserva POST). HTML www → apex **301**.  
Si un cliente ve **405** en `POST /api/license/activate`, casi seguro usó `www` y el redirect se reescribió a GET.

## Rutas

| Ruta | Archivo | Qué hace |
|------|---------|----------|
| `*` (middleware) | `_middleware.ts` | Protege `/admin/*` (cookie firmada) |
| `POST /admin/session` | `admin/session.ts` | Login / logout admin |
| `GET /admin/session` | `admin/session.ts` | Estado de sesión |
| `POST /admin/publish` | `admin/publish.ts` | Preview público + stems/master bajo `full/` (HQ intactos) |
| `GET /admin/master` | `admin/master.ts` | Head R2 del master HQ (auth admin) |
| `GET /admin/media` | `admin/media.ts` | Stream R2 privado (stems/master; auth admin) |
| `POST /admin/upload` | `admin/upload.ts` | **410 Gone** — usar publish |
| `GET /api/library` | `api/library.ts` | Catálogo R2 sanitizado |
| `GET /api/updates` | `api/updates.ts` | Feed Novedades R2 |
| `GET /api/product-updates` | `api/product-updates.ts` | Feed productos R2; catálogo/apps: `?slug=` / `?product=` (scope por producto) |
| `POST /api/newsletter` | `api/newsletter.ts` | Abono novedades (doble opt-in) |
| `GET /api/newsletter` | `api/newsletter.ts` | confirm / unsubscribe |
| `GET/POST /admin/newsletter` | `admin/newsletter.ts` | Lista abonados, baja, borrar |
| `POST /admin/feed` | `admin/feed.ts` | Publicar feed home (+ avisar abonados opcional) |
| `GET|POST|DELETE /admin/product-feed` | `admin/product-feed.ts` | CRUD feed productos (cabecera = producto, img|vídeo) |
| `GET /api/products` | `api/products.ts` | Catálogo productos software (R2) |
| `GET|POST|DELETE /admin/products` | `admin/products.ts` | CRUD productos software (+ `downloadStats` en GET) |
| `POST /api/track` | `api/track.ts` | Analíticas first-party; `product_demo_click` → contadores R2 |
| `POST /api/quote` | `api/quote.ts` | Presupuesto licencia → email estudio |
| `GET /api/quote` | `api/quote.ts` | Health mínimo |
| `POST /api/feedback` | `api/feedback.ts` | Ticket bug/sug/support → R2 + mail |
| `POST /api/account/magic` | `api/account/magic.ts` | Magic link cuenta |
| `GET/DELETE /api/account/session` | `api/account/session.ts` | Sesión cuenta + orders |
| `POST /api/account/profile` | `api/account/profile.ts` | Nick cliente |
| `POST /api/account/recovery` | `api/account/recovery.ts` | Recuperación (genérico) |
| `GET/POST /admin/orders` | `admin/orders.ts` | Pedidos, **issue Founder**, transfer, rotate, revoke |
| `POST /api/license/activate` | `api/license/activate.ts` | App: key + machineId → seats (Founder = pago) |
| `POST /api/checkout` | `api/checkout.ts` | Stripe Checkout software/música |
| `POST /api/webhooks/stripe` | `api/webhooks/stripe.ts` | order paid + key + mail |
| `GET/POST /api/download` | `api/download.ts` | Token / re-descarga full (cuenta) |
| `GET/POST /admin/tickets` | `admin/tickets.ts` | Bandeja tickets |

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

- Extensiones allowlist (vídeo/audio/imagen/master)
- MIME canónico por extensión
- 100 MB/archivo, 250 MB/publish, 24 stems
- **Stems/Master HQ:** `library/{slug}/full/…`, sin bake; bloqueado en `/api/media`
- **Preview web:** un solo mix público (generado en admin; no se tocan los HQ)
- Catálogo público: flags `hasStems`/`hasMaster` + `preview`; sin keys de entrega
- Front: `escapeHtml` + `safeDomId` / `safeAspectLabel` / `safeMediaUrl`

## CORS (`/api/quote`)

Orígenes: dominio prod, `*.nimpo-studio.pages.dev`, localhost.

## Docs

- Admin: `docs/admin-acceso.md`
- Estado: `docs/estado.md`
