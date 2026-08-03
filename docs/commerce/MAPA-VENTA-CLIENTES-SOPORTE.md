# Mapa — Venta, clientes, tickets y soporte

**Estado del sistema:** software A–D **implementado** · música preview/HQ/checkout baremo **implementado** · Stripe **live activo** (banco + catálogo licencias) · falta **ops** (smoke + publicar Nimpo Glass)  
**Última revisión:** 2026-08-01  
**Ámbito:** software **y** música (checkout compartido, datos en `catalog/commerce/*`).

| Doc | Para qué |
|-----|----------|
| Este archivo | **SSoT** software + hub Stripe/clientes/tickets |
| **Tareas ventas (tú)** | **`docs/commerce/TAREAS-VENTAS-PRIORIDAD.md`** — **prioridad #1 ops** |
| **Política música** | **`docs/commerce/POLITICA-MUSICA-BIBLIOTECA.md`** — preview, HQ, pago, descarga |
| Precios / plantillas música | `docs/licencias/` |
| Updates app (contrato dev) | `docs/commerce/UPDATES-APP-CONTRATO.md` |
| Checklist general | `docs/estado.md` |
| Admin login | `docs/admin-acceso.md` |

---

## Cómo funciona (compacto)

**Qué vendemos:** software digital, **pago único** (Stripe), no suscripción. Demo pública; full en R2 privado.

**Estados de ficha (admin → `status`, no categoría):**

| status | Público | Precio |
|--------|---------|--------|
| `published` | sí | habitual |
| `beta` | sí (chip Beta) | **opcional** |
| `demo` | sí (chip Demo) | **opcional** |
| `coming-soon` | sí | opcional |
| `draft` | no | — |

Precio display: EUR con céntimos (`9.90`). Media al editar: **append** por defecto (no wipe).  
Ficha pública: CTA probar = **Probar beta** si `status=beta`, si no **Probar demo** (requiere demo URL); **Compartir** deep-link `?p=slug`.  
Admin: `/admin/productos/` — ver también `docs/admin-acceso.md`.

**Identidad:** el **email de compra**. Sin password. Web = **magic link** → cookie 30 d. La **license key** es del binario (activate + seats), no del login web.

```
COMPRA
  Producto → Checkout Stripe → webhook
    → order paid + license key + customer (R2)
    → mail user (key, descarga, /cuenta/) + mail tú [Venta]

CUENTA  /es/cuenta/
  email → magic link → ver pedidos, key, re-descarga, nick
  recovery (email perdido) → ticket para ti (sin decir si el mail existe)

TICKET  (form producto)
  canal + subtipo (enums) + mensaje
  servidor marca CLIENT si hay pedido paid (o sesión), si no PROSPECT
  → tickets.json + mail [BUG·crash][CLIENT] …

BINARIO
  activate(key, machineId) → seats; devuelve nick si lo tiene

TÚ
  /admin/pedidos/  → clientes, reenviar, revocar, transfer email, rotate key, reset seats
  /admin/abonados/ → abonados newsletter (lista/export/baja) + clientes compra (lista/export)
  /admin/tickets/  → bandeja filtrable, estados
```

**Datos:** solo en R2 `catalog/commerce/{orders,licenses,customers,tickets}.json` — no en la web pública.  
**Dinero / precios / IVA:** § **Dinero, precios y legal** más abajo.  
**Ops restante:** producto publicado en admin + cuenta bancaria Stripe → §0.

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

### Hecho en infra / ops (sesión 2026-07-30) ✅

| Pieza | Detalle |
|-------|---------|
| Cuenta Stripe | **nimpo3dStudio** (`acct_1Tyyww9hkzoHpGr7`) · pagos **no recurrentes** |
| MCP Stripe + skills | Configurados en Grok; planner: Checkout hosted one-time |
| Producto Stripe (live) | `prod_UyxEX5Z08ZnyNM` — *Nimpo Software — Standard* |
| Price software Nimpo Glass (live) | `price_1TzjiE9hkzoHpGr7BWNn2qNH` — **9,90 EUR** (`prod_UzjAtCwWMDtD6Q`) |
| Price software legacy ejemplo | `price_1TyzK89hkzoHpGr7QKVv2SgV` — 29 € (no Glass) |
| Webhook live | `we_1TyzKG9hkzoHpGr7l7LV1ovM` → `https://nimpo3dstudio.com/api/webhooks/stripe` · `checkout.session.completed` |
| Pages secrets | `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` en proyecto **nimpo-studio** |
| Redeploy | Commit vacío `2150885` para que el runtime cargue secrets |
| Probe producción | `GET /api/checkout` → **`stripeConfigured: true`** |
| Mail Pages | `MAIL_*` / `QUOTE_TO_EMAIL` ya estaban |

**Dónde se editan secrets (Cloudflare):**  
**Workers & Pages** → proyecto **`nimpo-studio`** (no el dominio DNS) → pestaña **Settings** → **Variables and secrets** (Production).  
Enlace:  
`https://dash.cloudflare.com/<account>/pages/view/nimpo-studio/settings`  
Tras cambiar un secret: **nuevo deploy** (retry o push) si el runtime no lo ve.

### Falta de tu parte (ops) — **PRIORIDAD** 📝

**Lista canónica (solo pendientes):**  
→ **`docs/commerce/TAREAS-VENTAS-PRIORIDAD.md`**

Resumen:

- [x] Secrets Pages + webhook + Price software 29 € + **banco/verificación Stripe**
- [x] Catálogo Stripe licencias/extras + checkout multi-línea música
- [ ] Smoke música + publicar **Nimpo Glass** (full + published) + smoke software
- [ ] (Rec.) Access `/admin*` · IVA/legal (ver § dinero)

### Hecho en proceso (tú, cuando haya tickets/ventas) 🧑

- [ ] Revisar `/admin/tickets/` (CLIENT vs PROSPECT)
- [ ] Recovery: match fuerte → **Transfer email**; robo → **Rotate key**
- [ ] Seats agotados → **Reset seats**
- [ ] Pedido sin mail de descarga → **Reenviar**

### Aplazado ⏸️

- [ ] D1 runtime (stub en `migrations/0001_commerce.sql`)
- [ ] Cambio email self-service (hoy: recovery + transfer admin)
- [ ] `fulfill_session` si webhook falló y no hay order
- [ ] Stripe Tax / `automatic_tax` en Checkout (IVA automático)
- [ ] Cupo self-service reset devices
- [ ] DRM / Keygen · Suscripción SaaS
- [ ] Pedir license key en form de bugs (**no**)

### No hacer ❌

- Subir masters de **música** a URL pública r2.dev  
- Exponer `fullKey` en API pública de productos  
- Confiar en checkbox “soy cliente” sin order `paid`  
- Mezclar flujos de **música** (`/api/quote`) con software  
- Buscar secrets en **Domains → nimpo3dstudio.com** (no están; están en el **proyecto Pages**)

---

## Dinero, precios y legal (resumen operativo)

*No es asesoría legal ni fiscal. Modelo práctico con Stripe + esta web.*

### Cómo te llega el dinero

1. Cliente paga en **Checkout** (tarjeta, etc.).  
2. El importe entra en el **saldo de Stripe** (cuenta nimpo3dStudio).  
3. Stripe te hace **payouts** a la **cuenta bancaria** que configures en el Dashboard.

**Tú debes** (Dashboard Stripe):

- Completar **verificación** de identidad / negocio (onboarding).  
- Añadir **cuenta bancaria** (Settings → Bank accounts / Cuentas bancarias y monedas).  

Sin verificación + banco: en live a menudo **no cobras** o **no te transfieren**.  
Stripe cobra su **comisión** por pago; el resto va a payouts (menos impuestos si usas Stripe Tax).

| Modo | Efecto |
|------|--------|
| **Test** | No es dinero real |
| **Live** | Cobros reales → payouts a tu banco (plazo según país) |

### Dónde se pone el precio

Hay **dos capas** y deben coincidir:

| Dónde | Qué es |
|--------|--------|
| **Stripe** | Product + **Price** (`price_…`). Ahí se **cobra** de verdad. **Nimpo Glass:** **9,90 €** → `price_1TzjiE9hkzoHpGr7BWNn2qNH` |
| **Web admin** `/admin/productos/` | En el plan: **`stripePriceId`** = ese `price_…`. Opcional `priceEur` solo para **mostrar** en la ficha |

Flujo: catálogo → Comprar → API crea Checkout con el Price de Stripe → el cliente ve el precio de Stripe.

**Cambiar precio:** crear (o usar otro) Price en Stripe → actualizar `stripePriceId` en el admin del producto.  
Un número solo en la web **sin** `price_…` **no cobra**.

### Facturas e IVA

| Tema | Realidad con este stack |
|------|-------------------------|
| **Recibos Stripe** | Stripe puede enviar recibo/factura de cobro al cliente (emails/Checkout). |
| **Facturación fiscal tuya** | Sigues siendo el comercio: obligaciones en tu país (p. ej. Francia en onboarding) — contabilidad, declaraciones. Stripe **no sustituye** a un asesor. |
| **IVA por defecto** | El Checkout actual **no** activa `automatic_tax`. El Price (p. ej. 29 €) es lo que cobras “tal cual” salvo que tú metas IVA en el importe o actives Stripe Tax después. |
| **Stripe Tax** | Opcional: registros fiscales en Stripe + cambios de código (`automatic_tax`). **Aplazado** hasta que decidas política de IVA. |

### Software vs música

| Canal | Dinero | Doc de política |
|-------|--------|-----------------|
| **Software** | Stripe Checkout → key + full build | Este mapa §1 |
| **Música** | Checkout online **o** cotización; entrega master/stems HQ | **`POLITICA-MUSICA-BIBLIOTECA.md`** |

### Música (resumen; detalle en política)

| Pieza | Detalle |
|-------|---------|
| Preview web | **1 mix** ligero → play biblioteca |
| Stems / master | `library/{slug}/full/…` **intactos**, 403 en `/api/media` |
| Checkout | `POST /api/checkout` `{ kind:"music", workSlug, … }` |
| Cotización | `/api/quote` + `docs/licencias/` (exclusivas / sin Price) |
| Ops | Pegar `price_…` en admin ficha + smoke |

### Orden práctico (dinero + 1.ª venta)

1. Stripe live: verificación + **cuenta bancaria**.  
2. Confirmar Price (29 € u otro).  
3. Admin: producto + `stripePriceId` + full + published.  
4. Smoke compra (ojo: live = dinero real).  
5. Contable / IVA cuando factures en serio.

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
| `/admin/productos/` | ✅ | Demo, full, stripePriceId, **contadores Descargas** (búsqueda/orden/paginación), **feed productos** (rail catálogo) |
| `/admin/pedidos/` | ✅ | Pedidos, clientes, reenviar, revocar, **transfer**, **rotate**, **reset seats** |
| `/admin/abonados/` | ✅ | Abonados novedades (filtro, baja, borrar, CSV) + clientes compra (CSV) |
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
| Admin UI | `src/pages/admin/{pedidos,tickets,productos,abonados}.astro` |
| Newsletter | `functions/lib/newsletter.ts`, `api/newsletter.ts`, `admin/newsletter.ts` · R2 `catalog/newsletter.json` |

---

*Canon operativo Nimpo 3D Studio · software · actualizar checks de la §0 cuando completes ops.*
