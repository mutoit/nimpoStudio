# Tareas — Ventas (prioridad tuya)

**Prioridad #1 del proyecto (ops):** cobrar de verdad (música y software).  
**Última actualización:** 2026-08-03

| Doc | Rol |
|-----|-----|
| **Este archivo** | **Tu lista de tareas** (solo pendientes) |
| `POLITICA-MUSICA-BIBLIOTECA.md` | Música: preview, HQ, baremo, pago |
| `MAPA-VENTA-CLIENTES-SOPORTE.md` | Software + clientes/tickets |
| `docs/estado.md` | Checklist general del sitio |

---

## Bloqueador cobro (2026-08-03)

`POST /api/checkout` con prices live devuelve **`No such price: price_1TzjiE…`**.  
Stripe MCP (acct live) **sí** ve ese price → la **`STRIPE_SECRET_KEY` en Pages** es casi seguro **test** u otra cuenta.

**Acción tuya (5 min):** Cloudflare Pages → `nimpo-studio` → Settings → Environment variables →  
`STRIPE_SECRET_KEY` = **secret key live** `sk_live_…` de `acct_1Tyyww9hkzoHpGr7` (no `sk_test_`).  
Redeploy o empty commit. Verificar:

```text
POST /api/checkout { kind: software, productSlug: nimpo-glass }
→ { ok: true, url: "https://checkout.stripe.com/…" }
```

---

## Pendiente ahora

### 1 — Música (smoke)

Código + catálogo Stripe licencias/extras **listos**. Path checkout falla hasta arreglar secret live (arriba).

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
| 2.1 | status **published** · `priceEur` **9.90** en R2 | **Hecho** 2026-08-03 |
| 2.2 | `stripePriceId` = `price_1TzjiE9hkzoHpGr7BWNn2qNH` | **Hecho** (R2) |
| 2.3 | full + demo en R2 | **Hecho** (`hasFullBuild` + demo) |
| 2.4 | **Smoke:** Comprar → mail key → `/admin/pedidos/` → cuenta → re-descarga | **Bloqueado** por secret live |

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

## Orden recomendado (hoy)

1. Smoke música (1.1).  
2. Publicar Nimpo Glass + smoke (2.1–2.4).  
3. Especial / legal cuando toque.

Probe: `GET https://www.nimpo3dstudio.com/api/checkout` → `stripeConfigured: true`, `musicCatalogPrices: true`.

---

## Hecho (no reabrir)

- Stripe live activo: verificación, banco, descriptor `NIMPO3DSTUDIO` / `NIMPO`, payouts, no copiar test  
- Secrets Pages + webhook `checkout.session.completed`  
- Catálogo Stripe **licencias + extras** + mapa `stripe-license-prices.json`  
- Checkout música multi-línea (uso + extras); obra = metadata/entrega  
- UI biblioteca: Total + **Pagar** abajo; presupuesto solo en especial  
- Producto Stripe *Presupuesto especial* (Invoice a mano)  
- Commerce software en código: checkout, webhook, key, cuenta, admin pedidos/tickets  
- Price ejemplo software 29 € live  

Si falla un smoke, anota el error; si es “no hay full / no published”, es ops de §2.
