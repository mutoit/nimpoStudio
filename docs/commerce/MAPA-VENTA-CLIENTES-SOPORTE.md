# Mapa — Venta de software, clientes, tickets y soporte

**Estado:** canon de producto (diseño + lo implementado).  
**Última revisión:** 2026-07-30  
**Ámbito:** **productos software** (hub `/productos`, commerce Stripe).  
**No confundir** con licencias de **música** (`docs/licencias/` — cotizador sync, otro flujo).

| Relacionado | Ruta |
|-------------|------|
| Hub commerce implementado | `docs/plans/2026-07-28-product-commerce-hub.md` |
| **Plan implementación** (clientes/tickets/recovery) | `docs/plans/2026-07-30-commerce-clientes-tickets-recovery.md` |
| Estado / ops pendientes | `docs/estado.md` § hub productos |
| Admin | `docs/admin-acceso.md` |
| Código commerce | `functions/lib/commerce.ts`, `functions/api/checkout.ts`, `webhooks/stripe.ts`, `api/feedback.ts`, `api/account/*` |

---

## 1. Modelo de venta (software)

| Pieza | Decisión |
|-------|----------|
| **Modelo** | Pago **único** (paid download), no suscripción SaaS como default |
| **Checkout** | Stripe Checkout `mode: payment` + `stripePriceId` por plan |
| **Demo** | Gratis (`download` / `web` / `request`) |
| **Full** | Binario en R2 bajo `full/` — **nunca** en API pública |
| **Tras pagar** | Order `paid` + **license key** + mail + re-descarga desde cuenta |
| **Activación** | `POST /api/license/activate` — `machineId` + **seats** (default 1) |
| **Planes** | `pricing[]` por producto (nombre, `priceEur`, `stripePriceId`, `buyUrl` fallback) |

**Flujo venta (feliz):**  
Demo → Checkout Stripe → webhook `checkout.session.completed` → order + license → email comprador (key, descarga, enlace a `/cuenta/`) + email estudio `[Venta]`.

**Identidad de cliente:** email de compra (Stripe). No password; acceso web con **magic link**.

---

## 2. Qué hay implementado vs diseño

### Ya en código (ola A–C hub)

- Schema producto: `demo`, `pricing[]`, `version`, `fullKey`, `stripePriceId`
- `POST /api/checkout`, webhook Stripe → order + license + mails
- Download con token firmado; `/full/` bloqueado en media
- `/[lang]/cuenta/` magic link + listado pedidos del email
- `POST /api/license/activate` (seats + machineId)
- Admin `/admin/pedidos/` — listar / revocar / reenviar
- Store R2: `catalog/commerce/orders.json`, `licenses.json`
- `POST /api/feedback` — form abierto (tipo, nombre, email, mensaje) → mail estudio

### Implementado Fase D (2026-07-30)

- Entidad **`customers`** (upsert al pagar) — R2 `customers.json`
- Tickets estructurados + enums + badge **CLIENT / PROSPECT**
- Nick público (`/api/account/profile` + activate devuelve nick)
- Form feedback con sesión / verificar cliente
- Form **recuperación** en `/cuenta/` + ticket `account_recovery`
- Admin `/admin/tickets/` + transfer email / rotate key / reset seats en pedidos
- D1 schema stub en `migrations/0001_commerce.sql` (runtime sigue R2)

### Aún ops / futuro

- D1 dual-write runtime cuando haya volumen
- fulfill_session Stripe (re-run webhook) si order missing — reenviar download ya existe

### Ops (tú) antes de venta real

- Secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `DOWNLOAD_SECRET`
- Webhook → `https://nimpo3dstudio.com/api/webhooks/stripe`
- Price IDs y full builds en admin productos

### No hacer aún (estado.md)

- DRM / Keygen pesado sin binario activable
- Cuentas “completas” tipo SaaS antes de la 1ª venta real (perfil social, etc.)
- Pedir **license key** en el formulario normal de bugs/sugerencias

---

## 3. Dónde viven los datos (seguridad)

| Dato | Almacenamiento | Exposición |
|------|----------------|-----------|
| Catálogo / demos / precios públicos | R2 + API products (sin `fullKey`) | Público |
| Orders, licenses, customers, tickets | R2 privado y/o **D1** | Solo admin + APIs con sesión |
| Sesión cuenta | Cookie httpOnly `nimpo_account_session` (email firmado, ~30 d) | No PII de terceros |
| PII en front estático | **Prohibido** | — |

**“No en la web”** = no en HTML/JS público ni en `GET` de catálogo.  
**Sí en servidor** (Functions + R2/D1). Admin con secret + idealmente Cloudflare Access en `/admin*`.

**Principios:**

1. Email de compra = identidad; key = activación del binario, no login web.  
2. Nunca confiar en checkbox “soy cliente” sin pedido `paid`.  
3. Magic link: respuesta genérica (no enumerar si el email “existe”).  
4. Rate limit + Turnstile en forms públicos.  
5. Tras robo / transfer: rotar key + reset activations.

---

## 4. Cliente: creación y cuenta

### Al vender (obligatorio en diseño)

```
Stripe paid →
  upsert order + license
  upsert customer { email, productSlugs[], createdAt, lastPurchaseAt, nick? }
  mails
```

**Cliente en BD** = email con ≥1 order `paid`. No hay “registro” separado.

### Cuenta web (`/cuenta/`)

1. User introduce email de compra.  
2. `POST /api/account/magic` → enlace 30 min.  
3. Cookie sesión → ve pedidos, keys, re-descarga, (futuro) tickets y nick.

### Nick

| Campo | Uso |
|-------|-----|
| `email` | Legal, pedidos, magic, admin — **privado** |
| `nick` | Etiqueta en producto / UI (“Hola @nick”) — **público si el user acepta** |

- Se elige en cuenta o en primer ticket con sesión (único, corto, sin email).  
- Fallback: `Cliente` / `user_xxxx`.  
- El software recibe nick vía activate/API de cuenta; **nunca** el email en telemetría pública.

---

## 5. Tickets: bugs, sugerencias, soporte

### Objetivo

- Fácil para el user (enums + texto).  
- Fácil para ti: asunto/ticket clasificable + **saber si es cliente**.  
- Sin pedir la **key** en el form cotidiano.

### Identidad al enviar

| Quién | Cómo | Etiqueta |
|-------|------|----------|
| **Cliente verificado** | Form con **sesión** magic (o “verificar email” → magic → vuelve) | `buyer: true` + productos con order paid |
| **Prospecto** | Email libre, sin sesión / sin pedido | `buyer: false` |
| Checkbox “soy cliente” solo | **Ignorar** como prueba | — |

Soporte de licencia/descarga/facturación → **solo con cuenta**.  
Bug/sugerencia general → abierto, pero con badge claro.

### Enums (canon)

**Canal (`channel`):**

| Valor | Uso |
|-------|-----|
| `bug` | Fallo |
| `suggestion` | Mejora / idea |
| `support` | Ayuda, cuenta, licencia, cobro |
| `other` | Resto |

**Subtipo bug (`subtype`):**  
`crash` | `install` | `license_activate` | `performance` | `ui` | `data_loss` | `other`

**Subtipo suggestion:**  
`cosmetic` | `visual` | `feature` | `workflow` | `docs` | `other`

**Subtipo support:**  
`download` | `license` | `billing` | `how_to` | `account_recovery` | `email_change` | `lost_license` | `reset_devices` | `missing_order` | `other`

**Campos ticket:**

```
id, email, buyer, productSlug?,
channel, subtype, message,
nick?, status, createdAt, orderIds?[]
```

**Estados ticket:** `new` → `triaged` → `waiting` → `done` | `wontfix`

**Asunto mail / prefijo (ejemplo):**  
`[BUG·crash][CLIENT] product-x — user@…`  
`[SUG·feature][PROSPECT] product-y — …`

### Hoy vs objetivo

| Hoy | Objetivo |
|-----|----------|
| Form feedback: type bug/idea/complaint/other + email + mensaje | Enums de arriba + productSlug |
| Solo email a estudio | Email **+** registro en admin filtrable |
| No cruza con pedidos | `buyer` calculado en servidor si hay order paid |

---

## 6. Recuperación de cuenta (casos)

**Regla:** si controla el **email de compra** → self-service (magic).  
Si **no** → prueba de compra + **admin** (transfer).

### Matriz

| # | Caso | Resolución |
|---|------|------------|
| **A** | Tiene email de compra | Magic → cuenta (keys, descargas) — **auto** |
| **B** | Perdió el email; tiene key y/o recibo Stripe | Form recovery → ticket `account_recovery` → **tú** transfer al email nuevo |
| **C** | Sin email ni key; “compré hace X” | Buscar en Stripe (fecha/importe/PI); match fuerte → como B; si no → denegar |
| **D** | Email typo / otro mail en checkout | Probar mails; si no → C |
| **E** | Quiere cambiar email (tiene acceso al viejo) | Logueado → pide nuevo → magic al **nuevo** → reescribe email en customer/orders/licenses + aviso al viejo |
| **F** | Key revocada / reembolso | No reactivar si refund; admin según política |
| **G** | Perdió key en el PC; email OK | Cuenta muestra key; opcional regenerar (invalida vieja) |
| **H** | Seats agotados | Reset activations (límite self-service / año o admin) |
| **I** | Robo de email | User recupera mail con proveedor; tú puedes rotar key + reset seats |
| **J** | Mail de empresa / salida laboral | Política manual (¿licencia personal?) + transfer o no |
| **K** | Doble compra | Dos orders/keys visibles; no fusionar a ciegas |
| **L** | Pago OK, webhook falló | Admin fulfill por `session_id` / misma lógica webhook |

### Form recovery (público, diseño)

Campos: email nuevo, email viejo (si recuerda), **key** (solo aquí), prueba Stripe (last4/fecha/importe o id), mensaje.  
Respuesta genérica. Match **fuerte** (key+order, PI, email viejo+key) antes de transfer.  
Tras transfer: magic al nuevo + opcional rotar key.

### Quién resuelve

| Automático | Admin |
|------------|--------|
| A, ver key, re-descarga, E (con sesión), parte de G | B, C, D dudoso, F, H abusivo, J, L, transfers |

---

## 7. Flujos resumidos

### Venta
```
Checkout → Stripe → webhook → customer + order + license → mails
```

### Cuenta
```
/cuenta → email → magic → sesión → pedidos / keys / (tickets)
```

### Ticket
```
¿Sesión?
  SÍ  → enums + mensaje → ticket CLIENT (+ nick si existe)
  NO  → ¿cliente?
         SÍ → magic → vuelve → envía CLIENT
         NO → enums + email → ticket PROSPECT
```

### Producto (binario)
```
Activate(key, machineId) → seats → (futuro) nick para UI local
```

---

## 8. Modelo de datos objetivo

```
customers: {
  email, nick?,
  createdAt, lastSeenAt, lastPurchaseAt,
  productSlugs[],
  emailHistory?[]   // transfers
}

orders:     // ya existe (email, productSlug, plan, stripe*, licenseKey, status…)
licenses:   // ya existe (key, email, seats, activations[], revoked)
tickets:    // diseño (ver §5)
```

Runtime actual: R2 JSON monofile. Migrar a **D1** (`migrations/0001_commerce.sql` + tablas customers/tickets) cuando haya volumen o concurrencia.

---

## 9. Superficie admin (objetivo)

| Vista | Acciones |
|-------|----------|
| `/admin/pedidos/` | Listar, revocar, reenviar, fulfill Stripe (L) — **parcialmente hecho** |
| `/admin/tickets/` (nuevo) | Filtro channel/subtype/buyer/producto/estado |
| Cliente (detalle) | Orders, licenses, nick, transfer email, reset seats, rotar key |

---

## 10. Riesgos anticipados

| Riesgo | Mitigación |
|--------|------------|
| Spam / fakes en feedback | Rate limit, Turnstile; buyer solo con pedido |
| Enumeración de emails | Copy genérico en magic y recovery |
| Key en forms cotidianos | Solo recovery B; no en bug/sug |
| PII filtrada al front | APIs admin + sesión; sin embed en build |
| R2 monofile races | D1 al crecer |
| Webhook perdido | Fulfill manual + logs |
| Cliente cambia email sin control | Flujo E o B con prueba |
| Abuso reset devices | Cupo self-service + admin |

---

## 11. Orden de implementación sugerido

1. **Ops venta:** Stripe secrets, webhook, 1 producto con full + price.  
2. **`customers` upsert** en webhook (mínimo email + productSlugs).  
3. **Tickets** (store + enums + admin lista) y feedback → ticket + mail con prefijos.  
4. **Form con sesión:** badge CLIENT/PROSPECT real.  
5. **Nick** en cuenta + respuesta activate.  
6. **Recovery form** + acción admin transfer email.  
7. **D1** si duele el monofile.

---

## 12. Diferencia música vs software (no mezclar)

| | Software (este doc) | Música (`docs/licencias/`) |
|--|---------------------|----------------------------|
| Venta | Stripe one-time + key | Cotizador por uso/plazo → PDF/manual |
| Cliente | Email + magic + seats | Presupuesto / plantillas; founder prices |
| Form público | Feedback/tickets producto | `/api/quote` licencia sync |

---

*Canon interno Nimpo 3D Studio · software commerce + soporte · 2026-07-30*
