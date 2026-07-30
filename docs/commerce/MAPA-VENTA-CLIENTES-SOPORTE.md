# Mapa — Venta de software, clientes, tickets y soporte

**Estado del sistema:** código Fase A–D **implementado** · **venta real bloqueada por ops (tú)**  
**Última revisión:** 2026-07-30  
**Ámbito:** productos **software** (hub productos, Stripe).  
**No confundir** con licencias de **música** → `docs/licencias/`.

| Doc | Para qué |
|-----|----------|
| Este archivo | **SSoT** de qué hay, qué falta, cómo funciona |
| Plan ejecución | `docs/plans/2026-07-30-commerce-clientes-tickets-recovery.md` (`status: done`) |
| Hub commerce base | `docs/plans/2026-07-28-product-commerce-hub.md` |
| Checklist general | `docs/estado.md` |
| Admin login | `docs/admin-acceso.md` |

---

## 0. Tablero rápido (leer primero)

### Hecho en código ✅

| Área | Estado |
|------|--------|
| Checkout Stripe + webhook → order + license + mail | ✅ |
| Customer al pagar (`customers.json`) | ✅ |
| Cuenta magic link + re-descarga + ver key | ✅ |
| Activate licencia (seats + machineId + nick) | ✅ |
| Feedback enums + ticket R2 + mail prefijado | ✅ |
| Badge **CLIENT / PROSPECT** (servidor) | ✅ |
| Nick en cuenta | ✅ |
| Recovery form (sin enumerar emails) | ✅ |
| Admin pedidos (reenviar, revocar, transfer, rotate, reset) | ✅ |
| Admin tickets (filtros + estados) | ✅ |
| Full binario privado (`full/`, no API pública) | ✅ |

### Falta de tu parte (ops) — **bloquea venta real** 📝

Sin esto el código no cobra ni entrega builds de verdad:

- [ ] **Secrets Pages** (`nimpo-studio` → Environment variables / Secrets):
  - [ ] `STRIPE_SECRET_KEY`
  - [ ] `STRIPE_WEBHOOK_SECRET`
  - [ ] `DOWNLOAD_SECRET` (opcional si ya hay `ADMIN_SESSION_SECRET` ≥16 chars)
  - [ ] Mail ya existente (`MAIL_*` / worker) para que lleguen mails de venta y tickets
- [ ] **Webhook Stripe** (Dashboard → Developers → Webhooks):
  - URL: `https://nimpo3dstudio.com/api/webhooks/stripe`  
    (también vale apex/`www` según dominio canónico del sitio)
  - Evento: `checkout.session.completed`
  - Copiar signing secret → `STRIPE_WEBHOOK_SECRET`
- [ ] **Producto listo para vender** (admin `/admin/productos/`):
  - [ ] Al menos 1 plan con **`stripePriceId`** real (`price_…`)
  - [ ] **Full build** subido (ruta `full/` en R2)
  - [ ] Demo pública si aplica
  - [ ] Status `published`
- [ ] **Smoke end-to-end** (cuando lo de arriba esté):
  - [ ] Compra test (Stripe test mode) → mail con key
  - [ ] Aparece en `/admin/pedidos/` y en `customers`
  - [ ] Magic link en `/es/cuenta/` → re-descarga
  - [ ] Feedback como prospect y como cliente logueado → `/admin/tickets/`
- [ ] **Recomendado seguridad admin:** Cloudflare Access en `/admin*`  
  (`scripts/setup-access-admin.ps1` o panel CF)
- [ ] **Legal:** revisar privacidad/términos antes de cobros reales (`src/content/legal/`)

### Hecho en proceso (tú, cuando haya tickets/ventas) 🧑

No es código; es operativa diaria:

- [ ] Revisar `/admin/tickets/` (filtro CLIENT vs PROSPECT)
- [ ] Recovery: si match fuerte → **Transfer email** en pedidos; si robo → **Rotate key**
- [ ] Seats agotados → **Reset seats** (o rotate si filtraron la key)
- [ ] Pedido sin mail de descarga → **Reenviar** en pedidos

### Aplazado (no bloquear venta) ⏸️

- [ ] D1 runtime (schema stub ya en `migrations/0001_commerce.sql`; hoy todo es R2 monofile)
- [ ] Cambio de email self-service logueado (flujo E completo con magic al mail nuevo) — hoy: recovery + transfer admin
- [ ] `fulfill_session` admin (re-crear order desde Stripe session si webhook falló) — hoy: revisar Stripe + reenviar si el order ya existe
- [ ] Cupo self-service “reset devices” desde cuenta del cliente
- [ ] DRM / Keygen pesado
- [ ] Suscripción SaaS
- [ ] Pedir license key en form de bugs (a propósito **no**)

### No hacer ❌

- Subir masters de **música** a URL pública r2.dev  
- Exponer `fullKey` en API pública de productos  
- Confiar en checkbox “soy cliente” sin order `paid`  
- Mezclar flujos de **música** (`/api/quote`) con software  

---

## 1. Modelo de venta (software) ✅

| Pieza | Decisión | Código |
|-------|----------|--------|
| Modelo | Pago **único** (paid download) | Checkout `mode: payment` |
| Checkout | Stripe + `stripePriceId` por plan | `POST /api/checkout` |
| Demo | Gratis download/web/request | schema producto |
| Full | R2 `full/` privado | media bloquea `/full/` |
| Tras pagar | order + license + **customer** + mails | webhook Stripe |
| Activación | key + machineId + seats | `POST /api/license/activate` |
| Identidad web | email compra + magic link | `/cuenta/`, cookie sesión |

**Flujo venta:**  
Demo → Checkout → webhook `checkout.session.completed` → order + license + **customer** → mail comprador (key, descarga, cuenta) + mail estudio `[Venta]`.

---

## 2. Checklist implementación (código)

### Fase A–C — Hub commerce ✅

- [x] Schema: `demo`, `pricing[]`, `version`, `fullKey`, `stripePriceId`
- [x] Admin productos (demo + full + price id)
- [x] `GET /api/products` (sin full en público)
- [x] `POST /api/checkout` + webhook → order + license + mail
- [x] Download token firmado
- [x] `/[lang]/cuenta/` magic + pedidos
- [x] `POST /api/license/activate`
- [x] Admin `/admin/pedidos/` reenviar / revocar
- [x] Store R2 `orders.json` + `licenses.json`

### Fase D — Clientes / tickets / recovery ✅

- [x] `customers.json` + `recordCustomerPurchase` en webhook
- [x] `tickets.json` + enums + `buyer` servidor
- [x] `POST /api/feedback` → ticket + mail `[CHANNEL·subtype][CLIENT|PROSPECT]`
- [x] UI ProductsBrowser: canal/subtipo, badge, verificar cliente
- [x] i18n es/en/fr
- [x] Nick: `POST /api/account/profile` + session + activate
- [x] Recovery: `POST /api/account/recovery` + form en cuenta
- [x] Admin `/admin/tickets/`
- [x] Admin: transfer email, rotate key, reset activations, lista clientes
- [x] Docs mapa + plan `done` + `docs/estado.md`

**Commit ref:** `feat: clientes, tickets CLIENT/PROSPECT, nick y recovery software` (main).

---

## 3. Dónde viven los datos (seguridad) ✅

| Dato | Dónde | Quién ve |
|------|--------|----------|
| Catálogo / demos / precios | R2 + API products | Público |
| orders, licenses, customers, tickets | R2 `catalog/commerce/*` | Admin + APIs con sesión |
| Sesión cuenta | Cookie `nimpo_account_session` | Solo ese email |
| PII en HTML estático | — | **Prohibido** |

Runtime: **R2 monofile**. D1 = futuro (`migrations/0001_commerce.sql` tiene tablas stub).

**Reglas:**

1. Email de compra = identidad; key = solo binario / recovery.  
2. `buyer` solo con order `paid` en servidor.  
3. Magic / recovery: respuesta genérica (anti-enumeración).  
4. Rate limit (+ Turnstile si secret).  
5. Tras robo/transfer: rotate key + reset seats.

---

## 4. Cliente y cuenta ✅

### Al vender (automático)

```
Stripe paid → order + license + customer (email, productSlugs, lastPurchaseAt) → mails
```

**Cliente** = email con ≥1 order `paid`. Sin registro aparte.

### Cuenta `/es/cuenta/` (y en/fr)

| Acción | Estado |
|--------|--------|
| Magic link 30 min | ✅ |
| Ver pedidos + key + re-descarga | ✅ |
| Elegir nick (3–20, único) | ✅ |
| Form recovery | ✅ |

### Nick

| Campo | Uso |
|-------|-----|
| email | Privado (pedidos, magic, admin) |
| nick | Público en producto vía activate |

---

## 5. Tickets ✅

### Identidad

| Quién | Cómo | Etiqueta |
|-------|------|----------|
| Cliente | Sesión magic **o** email con order paid | `buyer: true` → **CLIENT** |
| Prospecto | Email libre sin pedido | `buyer: false` → **PROSPECT** |

### Enums (en código y UI)

- **channel:** `bug` | `suggestion` | `support` | `other`
- **bug:** crash, install, license_activate, performance, ui, data_loss, other  
- **suggestion:** cosmetic, visual, feature, workflow, docs, other  
- **support:** download, license, billing, how_to, account_recovery, email_change, lost_license, reset_devices, missing_order, other  

**Estados ticket (admin):** `new` → `triaged` → `waiting` → `done` | `wontfix`

**Mail:** `[BUG·crash][CLIENT] slug — email`

### URLs

| Quién | URL |
|-------|-----|
| User form | Modal feedback en ficha producto |
| Tú | https://www.nimpo3dstudio.com/admin/tickets/ |

---

## 6. Recuperación de cuenta

| # | Caso | Quién | Estado código |
|---|------|--------|----------------|
| **A** | Tiene email compra | Auto magic | ✅ |
| **B** | Perdió email; tiene key/prueba | Form recovery → tú **transfer** | ✅ form + admin transfer |
| **C** | Sin email ni key | Tú en Stripe + transfer/deny | Proceso manual |
| **D** | Typo de mail en compra | Probar mails / Stripe | Proceso |
| **E** | Cambio email con acceso al viejo | Ideal self-service | ⏸️ usar recovery + transfer |
| **F** | Refund / revocada | Admin revocar | ✅ revoke |
| **G** | Perdió key; email OK | Cuenta muestra key; rotate opcional | ✅ |
| **H** | Seats agotados | Admin reset seats | ✅ admin; ⏸️ self-service |
| **I** | Robo email | Rotate key + reset | ✅ admin |
| **J** | Mail empresa | Política + transfer | Proceso |
| **K** | Doble compra | Dos keys en cuenta | ✅ (no merge auto) |
| **L** | Webhook falló, Stripe paid | Fulfill session | ⏸️ reenviar si order existe; si no, recrear a mano / fix webhook |

**Form recovery** (en `/cuenta/`): email nuevo, viejo, key opcional, prueba, mensaje → ticket `account_recovery` + mail estudio. Respuesta siempre genérica.

---

## 7. Flujos (como está hoy)

### Venta ✅ (tras ops Stripe)
```
Checkout → Stripe → webhook → customer + order + license → mails
```

### Cuenta ✅
```
/cuenta → email → magic → nick / pedidos / keys / re-descarga / recovery
```

### Ticket ✅
```
Sesión? → CLIENT si hay pedido
Sin sesión + email con pedido → CLIENT
Si no → PROSPECT
→ enums → ticket R2 + mail
```

### Binario ✅
```
activate(key, machineId) → seats → { nick }
```

---

## 8. Modelo de datos (R2)

```
catalog/commerce/orders.json
catalog/commerce/licenses.json
catalog/commerce/customers.json   ✅
catalog/commerce/tickets.json     ✅
```

```
customer:  email, nick?, productSlugs[], createdAt, lastPurchaseAt?, lastSeenAt?, emailHistory?[]
ticket:    id, email, buyer, productSlug?, channel, subtype, message, nick?, status, recovery?, …
```

---

## 9. Superficie admin

| Vista | Estado | Qué haces ahí |
|-------|--------|----------------|
| `/admin/productos/` | ✅ | Demo, full, stripePriceId |
| `/admin/pedidos/` | ✅ | Pedidos, clientes, reenviar, revocar, **transfer**, **rotate**, **reset seats** |
| `/admin/tickets/` | ✅ | Bandeja feedback/recovery, cambiar status |
| `/admin/biblioteca/` | ✅ | Música (otro flujo) |

---

## 10. Qué hacer tú — orden recomendado

1. [ ] Poner secrets Stripe + webhook en Pages  
2. [ ] Crear Price en Stripe Dashboard y pegar `price_…` en admin producto  
3. [ ] Subir **full** del software en admin  
4. [ ] Compra de prueba (test mode)  
5. [ ] Verificar: mail key, pedidos, cuenta, un ticket de prueba  
6. [ ] (Opcional) Cloudflare Access en `/admin*`  
7. [ ] Textos legales OK → live mode cuando quieras cobros reales  

**Cuando algo falle en producción:**

| Síntoma | Dónde mirar |
|---------|-------------|
| Checkout no abre | `STRIPE_SECRET_KEY`, `stripePriceId` en plan |
| Pago OK pero no order | Webhook secret + URL + event; logs Pages Functions |
| No mail | MAIL worker / `QUOTE_TO_EMAIL` / Resend |
| No descarga | Full subido; `DOWNLOAD_SECRET` / session secret |
| Ticket no llega | `/admin/tickets/` + mail estudio; rate limit / Turnstile |

---

## 11. Diferencia música vs software

| | Software (este doc) | Música (`docs/licencias/`) |
|--|---------------------|----------------------------|
| Venta | Stripe one-time + key | Cotizador uso/plazo → PDF |
| Cliente | customers + magic | Presupuesto / plantillas |
| Form | Feedback / recovery | `/api/quote` |

---

## 12. Archivos clave (código)

| Pieza | Path |
|-------|------|
| Store commerce | `functions/lib/commerce.ts` |
| Webhook | `functions/api/webhooks/stripe.ts` |
| Feedback / tickets | `functions/api/feedback.ts` |
| Cuenta | `functions/api/account/{magic,session,profile,recovery}.ts` |
| Admin pedidos / tickets | `functions/admin/orders.ts`, `tickets.ts` |
| UI productos | `src/components/ProductsBrowser.astro` |
| UI cuenta | `src/pages/[lang]/cuenta.astro` |
| Admin UI | `src/pages/admin/{pedidos,tickets,productos}.astro` |

---

*Canon operativo Nimpo 3D Studio · software · actualizar checks de la §0 cuando completes ops.*
