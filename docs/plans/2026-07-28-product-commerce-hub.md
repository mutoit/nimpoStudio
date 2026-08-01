---
status: done
source: direct
tier: L
date: 2026-07-28
slug: product-commerce-hub
repro: "Hub producto: demo + compra + feedback + checkout + cuenta"
---

# Plan L — Hub de productos (Olas 1–3 done)

## Implementado

### Ola 1
- Schema demo + pricing + version
- Feedback API + hub CTAs

### Post-hub (2026-08) — admin productos
- `status`: `published` | `beta` | `demo` | `coming-soon` | `draft` (beta/demo sin precio obligatorio)
- `priceEur` con céntimos (9.90)
- Edit: media se conserva; nuevas imágenes se suman (máx 8); vídeo nuevo solo reemplaza vídeo
- Docs: `docs/admin-acceso.md`, `docs/estado.md` § admin productos

### Ola 2
- POST `/api/checkout` (Stripe Session)
- POST `/api/webhooks/stripe` → order paid + license key + email
- GET/POST `/api/download` token firmado
- Media `/full/` → 403
- Admin full/demo upload + stripePriceId
- Store R2 `catalog/commerce/orders.json` + `licenses.json`

### Ola 3
- `/[lang]/cuenta/` magic link
- POST `/api/license/activate`
- Admin `/admin/pedidos/` revocar / reenviar

## Secrets Pages

`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `DOWNLOAD_SECRET` (opcional), mail secrets ya existentes.

Webhook URL: `https://nimpo3dstudio.com/api/webhooks/stripe`  
Event: `checkout.session.completed`
