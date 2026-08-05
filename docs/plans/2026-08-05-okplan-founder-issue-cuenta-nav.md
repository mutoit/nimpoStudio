---
status: done
source: direct
tier: S
mode: normal
date: 2026-08-05
slug: founder-issue-cuenta-nav
repro: "Admin no puede emitir key sin Stripe; /es/cuenta/ no está en nav"
legitimidad: válido
decision: absorber
target_ola: null
---

## Scope

**Qué:** (1) Admin emite licencia **Founder** (0 €, sin Stripe) para **cualquier producto software** del catálogo. (2) Enlace **Mi cuenta** en nav pública; la cuenta ya pinta key + re-descarga tras magic link.

**In:** software (`products` R2).  
**Out:** cupones Stripe, price 0 € público, password, Founder en música/biblioteca, DRM, seats multi-device extra.

## Packet

```text
GOAL: grant Founder multi-producto + cuenta visible
FILAS:
  grant → POST /admin/orders action issue · productSlug libre
  cuenta → Header nav → /[lang]/cuenta/ (magic existente)
DoD: emitir email+producto → order paid + key + mail; nav cuenta; panel key+dl
NO TOCAR: checkout Stripe público, activate app contract, music quote
VERIFY: issue→mail path · nav href · session paints key+dl · build
```

## Plan

### DIAGNÓSTICO

```text
síntoma:    No se regala Founder sin Stripe; cliente no ve “cuenta” en la web
origen:     POST /admin/orders sin writer de license; Header.nav sin /cuenta/
provoca:    Entrega solo vía webhook Stripe; superficie /cuenta/ huérfana del menú
familia:    dead-or-unwired + missing grant path (commerce)
remedio:    Un grant admin reusando order+license+mail del webhook; nav cuenta; UI cuenta intacta
```

### LEGITIMIDAD

```text
flujo_actual: válido
decisión:     absorber
nota:         webhook stripe.ts + session/cuenta/magic ya correctos; falta grant + nav
```

### CLASIFICACIÓN (radio)

| Nodo | Estado | Acción |
|------|--------|--------|
| webhook → order+license+mail | válido | plantilla del grant |
| `POST /admin/orders` actions | deuda | + `issue` |
| `/admin/pedidos/` UI | válido | form emit |
| `/es/cuenta/` + magic + session | válido | no rediseñar |
| `Header.astro` nav | dead-or-unwired | + Mi cuenta |

### TOUCH GRAPH (1-hop)

#### Punto 1: Grant Founder (API)

| Nodo | path · Symbol | Rol |
|------|---------------|-----|
| A | `functions/admin/orders.ts` · `onRequest` action `issue` | crea order paid + license + customer + mail |
| B | `functions/lib/commerce.ts` · `generateLicenseKey`, `upsertOrder`, `upsertLicense`, `recordCustomerPurchase`, `signDownloadToken` | reuso |
| C | `functions/lib/products-catalog.ts` · `findProduct` / `readProducts` | resolver producto + fullKey |
| D | `functions/lib/send-mail.ts` · `sendStudioMail` | mail usuario (+ opcional estudio) |

| Edge | Desde → Hasta | ¿Propagar? |
|------|---------------|------------|
| e1 | issue → findProduct | sí — 404 si no hay producto |
| e2 | issue → commerce writers | sí — mismo shape que webhook |
| e3 | issue → mail | sí — key + cuenta + token descarga si fullKey |

**Contrato `issue`:**

```text
POST /admin/orders
{ action: "issue", email, productSlug, planId?: "founder", planName?: "Founder", seats?: 1 }
→ order status=paid, amountEur=0, planId=founder (default), licenseKey, sin stripeSessionId
→ license + customer
→ mail con key + /es/cuenta/ + download token 72h si full/
```

- **Cualquier** producto del catálogo software (no draft preferible; permitir beta/demo/published si tiene slug).  
- Si no hay `fullKey` válido: order+key+mail igual; sin botón descarga hasta suban full (como paid sin binario).  
- No Stripe. No checkout 0 €.

#### Punto 2: Admin UI emitir

| Nodo | path · Symbol | Rol |
|------|---------------|-----|
| E | `src/pages/admin/pedidos.astro` | form: email + select producto + Emitir Founder |

| Edge | ¿Propagar? |
|------|------------|
| form → POST issue | sí |
| load productos → `GET /admin/products` o products list admin | sí — opciones del select |

Mostrar plan/key en tabla pedidos (ya lista orders; planName Founder se verá).

#### Punto 3: Nav cuenta pública

| Nodo | path · Symbol | Rol |
|------|---------------|-----|
| F | `src/components/Header.astro` · `nav` | item Mi cuenta → `/${lang}/cuenta/` |
| G | `src/i18n/translations.ts` · `navAccount` | es/en/fr |

| Edge | ¿Propagar? |
|------|------------|
| nav → cuenta.astro | sí — path estático ya existe |
| cuenta UI | no — key+download ya en `paintSession` |

**No** inventar password. Flujo: email → magic mail → cookie → pedidos con key + botón descarga.

#### Punto 4: Docs ops (mínimo)

| Nodo | path | Rol |
|------|------|-----|
| H | `docs/admin-acceso.md` o `docs/commerce/MAPA-VENTA-CLIENTES-SOPORTE.md` | 5–10 líneas: emitir Founder + Mi cuenta |

### IMPACTO

- Sin grant: Founder sigue imposible sin hack.  
- Sin nav: cuenta sigue “secreta”.  
- Grant mal validado: keys a emails basura → rate limit admin + requireAdmin ya protegen.  
- No rompe checkout ni activate.

### PROPAGACIÓN

- [ ] `issue` escribe mismos monofiles que webhook (`orders`, `licenses`, `customers`)  
- [ ] Mail Founder: copy “licencia Founder” (no “gracias por tu compra” genérico confuso)  
- [ ] Tabla admin muestra pedidos `amountEur: 0` / plan Founder  
- [ ] Header i18n es/en/fr  
- [ ] Docs 1 párrafo  

### OUT OF SCOPE

- Stripe coupon / Price 0 €  
- Password en cuenta  
- Emitir Founder música  
- Cambiar `activate` del binario  
- Footer duplicado (nav basta; footer solo si ya hay links y es trivial)

### Execution blocks

#### Block 1 — API `issue` (P1)
1. En `orders.ts`: `action === "issue"`: validar email + productSlug; `findProduct`; generar key; `upsertOrder` paid 0 € plan founder; `upsertLicense`; `recordCustomerPurchase`; mail (mirror webhook software, copy Founder).  
2. GET orders sin cambio de shape (orders ya devuelve campos necesarios).  
3. Opcional helper `issueManualLicense` en `commerce.ts` si el body de orders se hincha >~40 líneas de lógica.

#### Block 2 — UI admin (P2)
1. Card **Emitir Founder** arriba en `pedidos.astro`: email, select productos (fetch admin products), botón.  
2. Confirm + status toast; refresh tablas.

#### Block 3 — Nav (P3)
1. `navAccount` en translations es/en/fr.  
2. Header: último o penúltimo item “Mi cuenta” → `/${lang}/cuenta/`.

#### Block 4 — Docs (P4)
1. Nota en admin-acceso o mapa commerce: emit multi-producto; cliente entra por Mi cuenta + magic.

### VERIFY

```text
- Admin issue (email real o test + slug glass) → order paid + license en GET /admin/orders
- Mail (si MAIL_*): key + link cuenta
- /es/cuenta/ en Header (es/en/fr)
- Magic flow sin password (smoke UI: form email visible)
- Session autenticada: key en UI + botón descarga si fullKey
- npm run build
- NO TOCAR: checkout público Glass sigue 9,90
```

### accepted_risks

- Mail depende de `MAIL_*` en Pages (ya commerce); si mail falla, key sigue en admin + cuenta tras magic.  
- Productos sin full: Founder activa app con key; descarga cuando haya full.

### Audit

`Audit passed (0 CRITICAL)` — familia dead-or-unwired + grant path; reuso webhook; blocks 1:1 Puntos; propagación listada.

## Status

- plan: **done**
- execute: P1 issue API · P2 form admin · P3 nav i18n · P4 docs
- verify:
  - `npm run build` OK (44 pages)
  - `action: issue` en `functions/admin/orders.ts`
  - nav `navAccount` → `/cuenta` en Header
  - superficie live Founder: tras deploy (pending_surface hasta emit real en prod)
  - checkout público no tocado
