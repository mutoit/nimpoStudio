---
status: done
source: direct
tier: L
date: 2026-07-28
slug: product-commerce-hub
repro: "Hub producto: demo + compra + feedback centralizados y escalables"
---

# Plan L — Hub de productos (Ola 1 done)

## Ola 1 implementada

- Schema `SoftwareProduct`: `demo`, `pricing`, `version`
- Admin `/admin/productos/`: campos demo/precio/buyUrl
- `GET /api/products` + `?slug=` (sin paths `full/`)
- `POST /api/feedback` → mail estudio
- ProductsBrowser: CTAs Demo / Comprar / Feedback + form

## Ola 2/3 (pendiente)

- Stripe Checkout + webhook · D1 orders/licenses · download firmado · `/cuenta` · activate API

## Verify Ola 1

1. Admin guarda demo/pricing → GET `/api/products` lo devuelve  
2. Catálogo: CTAs en ficha  
3. Feedback → 200 + mail/log  
4. Rate limit feedback  
5. `npm run build` OK  
6. Sin `full/` en API pública  
