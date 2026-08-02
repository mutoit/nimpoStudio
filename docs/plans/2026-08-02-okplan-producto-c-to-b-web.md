---
status: blocked
source: producto
tier: L
mode: graph-strict
date: 2026-08-02
slug: okplan-producto-c-to-b-web
repro: "Scorecard producto web: suelo C → B en happy path cobro + ops; filas D residuales Access/Tax aplazables"
legitimidad: mixto
decision: refactorizar
target_ola: B
---

# okplan — mejorar cada aspecto del reporte producto (C→B)

## Packet producto (consumido)

```text
OLA: C→B
FILAS: smoke música · smoke software · ficha Glass honesta · deploy bin-status · (rec.) Access
DoD: ninguna fila < B (happy path cobro + path infra del scorecard)
NO TOCAR: strip fullKey · mapa Stripe live ids · contract R2 full/ privado
VERIFY: 1 pago música + 1 software · mail · /cuenta/ · admin pedidos · feeling≥3
```

**Nota:** “cada aspecto” del scorecard (18×C + 2×D). Subida a **B** = path real **+** smoke superficie. IVA/Tax y Access no bloquean B del cobro si se marcan residuales.

## P0 — Calibrar

| Campo | Valor |
|-------|--------|
| Tier | **L** (cross: admin, checkout, cuenta, docs, ops Stripe/CF) |
| Modo | **graph-strict** |
| Scope | Happy path comprador + ops cobro + ficha Glass + deploy local + docs handoff |
| Out of scope | Rediseño i18n total · GA4/Meta · PDF licencias · D1 migration · rediseño visual marca |
| Industry | N/A — ops venta digital propio (Stripe Checkout hosted one-time) |

### LEGITIMIDAD

```text
LEGITIMIDAD:
  flujo_actual: mixto
  decisión:     refactorizar
  nota:         código cobro/R2 válido; Glass meta engañosa (beta+price 0); smokes ops abiertos; docs estado desfasado
```

### CLASIFICACIÓN (radio)

| Nodo | Clase | Acción |
|------|-------|--------|
| Checkout + webhook + download | válido | absorber; solo VERIFY smoke |
| ProductsBrowser precio/beta | deuda | honestidad precio si checkoutReady |
| R2 nimpo-glass meta | deuda | priceEur 9.90 + status coherente |
| Commit `estable` sin push | deuda | push Pages |
| CF Access / Tax | aplazada | residual D; no bloquea ola cobro |
| docs/estado.md “sin checkout” | incorrecto | actualizar o no citar |

---

## Touch graph (por Punto = block)

### Punto 1: Deploy bin-status (ya en main local)

| Nodo | path · Symbol | Rol |
|------|---------------|-----|
| A | `src/pages/admin/productos.astro` · `setBinStatus` / `postFormWithProgress` | status bins + % |
| B | `functions/admin/products.ts` · `fullNote`/`bins` | mensaje save |

| Edge | Desde → Hasta | Tipo | ¿Propagar? |
|------|---------------|------|------------|
| e1 | A → Pages runtime | deploy | **sí** — `git push origin main` |
| e2 | B → A `data.message` | contrato | ya propagado en commit |

**Superficie:** `/admin/productos/` post-deploy  
**Efectos:** solo ops estudio

### Punto 2: Ficha Glass honesta (meta R2 + UI)

| Nodo | path · Symbol | Rol |
|------|---------------|-----|
| C | R2 `catalog/products.json` · `nimpo-glass` | status/priceEur (admin o POST) |
| D | `ProductsBrowser.astro` · `skipPrice` / price display | no mentir “gratis/beta” si hay cobro listo |

| Edge | Desde → Hasta | Tipo | ¿Propagar? |
|------|---------------|------|------------|
| e3 | C → `/api/products` · `publicProduct` | estado | sí — re-probe slug |
| e4 | D → CTA checkout | feeling | sí — precio visible o chip Beta **con** precio si `priceEur>0` |

**DoD fila:** `priceEur=9.9` · `stripePriceId` Glass · `hasFullBuild` · display no confunde  
**Evidencia live pre:** `status=beta price=0 stripe=price_1TzjiE… full=true`

### Punto 3: Smoke música E2E (ops + fallos código)

| Nodo | path · Symbol | Rol |
|------|---------------|-----|
| E | `LibraryBrowser.astro` · checkout UI | Pagar |
| F | `functions/api/checkout.ts` · kind=music | Session Stripe |
| G | `functions/api/webhooks/stripe.ts` · `checkout.session.completed` | order+mail |
| H | `functions/api/download.ts` · token master | entrega |
| I | `cuenta.astro` / magic | re-descarga |

| Edge | Desde → Hasta | Tipo | ¿Propagar? |
|------|---------------|------|------------|
| e5 | E→F→G→H→I | path cobro | sí — si falla, failhunter en edge roto |

**Repro (TAREAS 1.1):** casa-de-campo → uso+extras → Pagar → mail → `/es/cuenta/` → master (+stems si aplica)  
**Actor:** usuario (Stripe live); agente documenta gaps / cura bugs encontrados

### Punto 4: Smoke software E2E (ops + fallos código)

| Nodo | path · Symbol | Rol |
|------|---------------|-----|
| J | `ProductsBrowser.astro` · `data-pb-checkout` | compra Glass |
| K | checkout software branch | Session |
| L | webhook software · license key | mail key |
| M | download full · `fullKey` | binario |

| Edge | Desde → Hasta | Tipo | ¿Propagar? |
|------|---------------|------|------------|
| e6 | J→K→L→M + admin pedidos | path | sí |

**Repro (TAREAS 2.4):** Comprar Glass → mail key → `/admin/pedidos/` → cuenta → re-descarga full

### Punto 5: Filas soporte del scorecard (sub-B sin rediseño)

| Fila scorecard | Acción a B | Actor |
|----------------|------------|-------|
| Web Pages/DNS | home 200 post-push | auto |
| Biblioteca preview | repro play 1 obra | humano 2 min |
| Mail Worker | mail de smoke llega | smoke P3/P4 |
| Cuenta magic | link del mail | smoke |
| Admin pedidos/tickets | ver order post-smoke | smoke |
| Admin biblioteca | sin cambio código; Access opcional | residual |
| Quote/contacto | 1 quote o skip si no bloquea cobro | ops |
| Newsletter | 1 alta test o residual | ops |
| Analytics/SEO | check vars o residual “ops marketing” | ops |
| Legal | checklist lectura + residual content | ops |
| i18n | spot-check es ficha Glass | humano |
| Stripe map | probe GET checkout (ya true) | auto |
| CF Access | script `setup-access-admin.ps1` **o** residual D | ops |
| IVA/Tax | **NO TOCAR** ola · residual D | aplazada |

### Punto 6: Docs handoff (post-smokes)

| Nodo | path | Rol |
|------|------|-----|
| N | `docs/commerce/TAREAS-VENTAS-PRIORIDAD.md` | marcar 1.1/2.x hechos o fallos |
| O | `docs/estado.md` | quitar “sin checkout” si aún dice eso |
| P | post-impl producto | re-score delta filas |

---

## IMPACTO

- Si no push: admin productos sin status bins en prod.  
- Si Glass price 0 + beta: cliente no ve 9,90 aunque Stripe cobre (feeling/mentira).  
- Si no smoke: **claim B ilegal** (techo C).  
- Si se toca Tax/Access sin necesidad: scope creep; no sube suelo cobro.

## PROPAGACIÓN (checklist)

- [ ] e1 push → Pages build verde  
- [ ] e3 re-probe `/api/products?slug=nimpo-glass`  
- [ ] e4 UI precio/CTA coherente  
- [ ] e5 smoke música documentado (pass/fail + edge)  
- [ ] e6 smoke software documentado  
- [ ] docs N/O actualizados  
- [ ] post-impl producto

## Execution blocks (orden)

| # | Block | Tipo | Dep |
|---|-------|------|-----|
| P1 | `git push origin main` (commit `estable`) | ops/agent | — |
| P2 | Glass meta: priceEur **9.90** + status (`published` o beta con precio visible) vía admin o PATCH/POST admin | ops/agent | P1 |
| P2b | UI: si `checkoutReady` y `priceEur>0`, no esconder precio solo por beta | code | P2 |
| P3 | Smoke música 1.1 + curar bugs | ops+code | P1 |
| P4 | Smoke software 2.4 + curar bugs | ops+code | P2 |
| P5 | Filas soporte: probes auto + checklist residual (Access/Tax/legal/analytics) | mixed | P3–P4 |
| P6 | Docs TAREAS/estado + post-impl producto re-score | docs | P3–P5 |

## VERIFY (radio)

```text
VERIFY:
- Repro smokes 1.1 + 2.4 ..................... sí (pass)
- Probe GET /api/checkout stripe+music ........ sí
- Probe Glass priceEur+checkoutReady .......... sí
- Push deploy admin bin-status ............... sí (Pages)
- Edges e1–e6 propagados o justificados ...... sí
- Superficie cobro feeling ≥3 ................ sí (humano)
- Tests ...................................... no (salvo pedido)
- post-impl producto ......................... sí
```

## accepted_risks

| Risk | Por qué |
|------|---------|
| Smokes = Stripe live (dinero real o refund) | No hay test mode documentado en path actual |
| Access/Tax quedan D | Packet: no bloquean cobro; ola B cobro |
| Actor humano en smokes | Agente no puede completar 1.1/2.4 solo |

## Audit (P2)

- Touch graph: sí (Puntos 1–6)  
- Legitimidad: sí mixto/refactorizar  
- Propagación: sí edges e1–e6  
- Símbolos inventados: no (citas probe + paths repo)  
- Packet no reabierto A–F  
**Audit passed (2 accepted risks: smokes live; residual D Access/Tax)**

---

## Out of scope explícito

- Auto-versión exe  
- Nuevo catálogo de productos  
- Migración D1 commerce  
- Cambiar modelo suscripción  
- “Mejorar” filas A inexistentes  

## Post-impl (al complete)

Plantilla `producto/references/reporte-post-impl.md` — pre C → post B en filas cobro; residual D listadas.
