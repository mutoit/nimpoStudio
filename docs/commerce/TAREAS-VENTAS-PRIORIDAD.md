# Tareas — Ventas (prioridad tuya)

**Prioridad #1 del proyecto (ops):** smokes de venta real (música y software).  
**Última actualización:** 2026-08-04

| Doc | Rol |
|-----|-----|
| **Este archivo** | **Tu lista de tareas** (solo pendientes) |
| `POLITICA-MUSICA-BIBLIOTECA.md` | Música: preview, HQ, baremo, pago |
| `MAPA-VENTA-CLIENTES-SOPORTE.md` | Software + clientes/tickets |
| `docs/estado.md` | Checklist general del sitio |

---

## Infra cobro (cerrado 2026-08-04)

| Ítem | Estado |
|------|--------|
| `STRIPE_SECRET_KEY` **live** en Pages `nimpo-studio` | **Hecho** (`sk_live_…` acct_1Tyyww9hkzoHpGr7) |
| `tax_code` = `txcd_10000000` en **30 productos** Stripe (Glass + baremo licencias/extras) | **Hecho** (Managed Payments lo exige) |
| Errores checkout al cliente genéricos (sin filtrar ops/env) | **Hecho** (`checkout.ts` + UI) |
| Probe `POST /api/checkout` Glass | **OK** → `url` `checkout.stripe.com` sesión **live** |

```text
POST https://nimpo3dstudio.com/api/checkout
{ "kind": "software", "productSlug": "nimpo-glass" }
→ { ok: true, mode: "checkout", url: "https://checkout.stripe.com/…" }
```

**Rec. seguridad:** la live key pasó por chat una vez → rotar en Dashboard Stripe cuando puedas y `wrangler pages secret put STRIPE_SECRET_KEY --project-name=nimpo-studio`.

**Otros productos software:** solo Glass en catálogo público. Música = baremo compartido (ya con tax_code). Nuevo software = Price Stripe + `stripePriceId` en admin + full en R2.

---

## Pendiente ahora

### 1 — Música (smoke humano)

Código + secret live + tax_code **listos**.

| # | Tarea |
|---|--------|
| 1.1 | **Smoke:** obra con master (ej. Casa de campo) → uso + extras → **Pagar** → mail → `/es/cuenta/` → descarga master (+ stems si pagaste stems) |
| 1.2 | **Especial:** quote form → tú Invoice/Link Stripe (producto *Presupuesto especial*) con importe pactado |

### 2 — Software · Nimpo Glass

| Stripe | ID |
|--------|-----|
| Product live | `prod_UzjAtCwWMDtD6Q` — **Nimpo Glass** |
| Price one-time | **`price_1TzjiE9hkzoHpGr7BWNn2qNH`** — **9,90 EUR** |
| (legacy 29 €) | `price_1TyzK89hkzoHpGr7QKVv2SgV` — no usar para Glass |

| # | Tarea | Estado |
|---|--------|--------|
| 2.1 | status **published** · `priceEur` **9.90** en R2 | **Hecho** |
| 2.2 | `stripePriceId` = `price_1TzjiE9hkzoHpGr7BWNn2qNH` | **Hecho** |
| 2.3 | full + demo en R2 | **Hecho** |
| 2.4 | **Smoke:** Comprar → mail key → `/admin/pedidos/` → cuenta → re-descarga | **Pendiente humano** (API checkout OK) |
| 2.5 | **Founder:** admin Emitir → mail cliente → app `POST https://nimpo3dstudio.com/api/license/activate` (**sin www**) | **Código hecho**; smoke app con key real |
| 2.6 | App Glass: base URL API **sin www** (evitar 405 por redirect) | **Doc actualizada** · dev app |

### 3 — Después de la 1.ª venta real

| # | Tarea |
|---|--------|
| 3.1 | Revisar mails / `/admin/tickets/` |
| 3.2 | Pedido sin mail → **Reenviar** en `/admin/pedidos/` |
| 3.3 | Software: recovery / rotate key / reset seats cuando toque |
| 3.4 | (Rec.) PDF licencia musical si usas plantillas `docs/licencias/` |

### 4 — Opcional / no bloquea cobrar

| # | Tarea |
|---|--------|
| 4.1 | Cloudflare Access en `/admin*` |
| 4.2 | Criterio IVA / facturas / Stripe Tax (mapa § dinero) |

---

## Orden recomendado

1. Smoke software 2.4 (tarjeta real o de prueba live según Dashboard).  
2. Smoke música 1.1.  
3. Especial / legal cuando toque.

Probe: `GET https://nimpo3dstudio.com/api/checkout` → `stripeConfigured: true`, `musicCatalogPrices: true`.

---

## Hecho (no reabrir)

- Stripe live activo: verificación, banco, descriptor `NIMPO3DSTUDIO` / `NIMPO`, payouts, no copiar test  
- Secrets Pages live + webhook `checkout.session.completed`  
- tax_code productos Stripe (Managed Payments)  
- Catálogo Stripe **licencias + extras** + mapa `stripe-license-prices.json`  
- Checkout música multi-línea (uso + extras); obra = metadata/entrega  
- UI biblioteca: Total + **Pagar** abajo; presupuesto solo en especial  
- Producto Stripe *Presupuesto especial* (Invoice a mano)  
- Commerce software en código: checkout, webhook, key, cuenta, admin pedidos/tickets  
- Mensajes de error de checkout no filtran secret/cuenta al cliente  

Si falla un smoke, anota el error; si es “no hay full / no published”, es ops de catálogo/admin.
