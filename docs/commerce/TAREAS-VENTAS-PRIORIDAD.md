# Tareas — Ventas (prioridad tuya)

**Prioridad #1 del proyecto (ops):** cerrar lo que falta para **cobrar de verdad** (música y software).  
**Código:** listo · **Dinero real:** depende de estos puntos.

**Última actualización:** 2026-07-31

| Doc | Rol |
|-----|-----|
| **Este archivo** | **Tu lista de tareas** (prioridad) |
| `POLITICA-MUSICA-BIBLIOTECA.md` | Cómo funciona música |
| `MAPA-VENTA-CLIENTES-SOPORTE.md` | Software + Stripe/clientes |
| `docs/estado.md` | Checklist general del sitio |

---

## Prioridad 0 — Compartido (bloquea ambos canales)

Sin esto, ni música ni software te dejan dinero en el banco.

| # | Tarea | Hecho |
|---|--------|-------|
| 0.1 | Stripe: **verificación de negocio** + **cuenta bancaria** (payouts) | [ ] |
| 0.2 | Confirmar `STRIPE_SECRET_KEY` en Pages = key **real** (test o live, alineada con el Dashboard que usas) | [ ] |
| 0.3 | Confirmar webhook live/test apunta a `https://nimpo3dstudio.com/api/webhooks/stripe` y evento `checkout.session.completed` | [ ] |
| 0.4 | Tras cambiar secrets: **redeploy** Pages si hace falta | [ ] |
| 0.5 | (Rec.) Cloudflare Access en `/admin*` | [ ] |
| 0.6 | (Rec.) Criterio **IVA / facturas** cuando cobres en serio (mapa § dinero) | [ ] |

Probe rápido: `GET https://www.nimpo3dstudio.com/api/checkout` → debe devolver `stripeConfigured: true`.

---

## Prioridad 1 — Música (biblioteca)

Política: `POLITICA-MUSICA-BIBLIOTECA.md`.  
**Modelo:** Productos Stripe = **licencias + extras** (baremo). Obra = metadata/entrega.  
Mapa: `functions/lib/stripe-license-prices.json` (live, 2026-08).

| # | Tarea | Hecho |
|---|--------|-------|
| 1.1 | Catálogo Stripe licencias + extras (Products/Prices) | [x] |
| 1.2 | Mapa código → `price_…` en repo + checkout multi-línea | [x] |
| 1.3 | Producto «Presupuesto especial» (Invoice a mano, sin Checkout auto) | [x] |
| 1.4 | Obra con **master HQ** en R2 → botón **Pagar** (sin price por ficha) | [ ] smoke |
| 1.5 | **Smoke:** uso + extras → Pagar → mail → `/es/cuenta/` → descarga | [ ] |
| 1.6 | Especial: quote form → tú Invoice/Link Stripe con importe pactado | [ ] proceso |

Sin master en R2: no Checkout de descarga; cotización especial sigue.

---

## Prioridad 2 — Software (catálogo productos)

Mapa: `MAPA-VENTA-CLIENTES-SOPORTE.md`.  
Infra Stripe ejemplo ya existe (`price_1TyzK89hkzoHpGr7QKVv2SgV` · 29 €) — hay que **publicar el producto en la web**.

| # | Tarea | Hecho |
|---|--------|-------|
| 2.1 | Admin `/admin/productos/` → crear/publicar producto | [ ] |
| 2.2 | Plan con **`stripePriceId`** = `price_1TyzK89hkzoHpGr7QKVv2SgV` (u otro `price_…`) | [ ] |
| 2.3 | Subir **full build** a R2 (`full/`) | [ ] |
| 2.4 | Demo si aplica | [ ] |
| 2.5 | Status **`published`** (si no, checkout → `product_not_found`) | [ ] |
| 2.6 | **Smoke:** Comprar → mail con key → `/admin/pedidos/` → cuenta → re-descarga | [ ] |

---

## Prioridad 3 — Después de la 1.ª venta

| # | Tarea | Hecho |
|---|--------|-------|
| 3.1 | Revisar mails de venta / tickets en `/admin/tickets/` | [ ] |
| 3.2 | Software: recovery / rotate key / reset seats cuando toque | [ ] |
| 3.3 | Pedido sin mail → **Reenviar** en `/admin/pedidos/` | [ ] |
| 3.4 | Archivar PDF de licencia musical si usas plantillas de `docs/licencias/` | [ ] |

---

## Orden recomendado (hoy)

1. **0.1–0.3** Stripe usable (banco + keys alineadas).  
2. **1.1–1.6** Una obra musical (Casa de campo) de punta a punta.  
3. **2.1–2.6** Un producto software publicado y smoke.  
4. Resto de obras/productos + legal.

---

## Hecho en código (no es tu tarea)

- Preview único + stems/master privados  
- Checkout música + software, webhook, descarga token, cuenta  
- Admin precios en ficha biblioteca  
- Clientes / tickets / recovery software  

Si algo de la lista falla en smoke, anota el error y se depura en código; si es “no hay price / no hay producto published”, es ops de esta lista.
