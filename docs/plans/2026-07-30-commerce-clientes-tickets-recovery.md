---
status: done
source: direct
tier: L
date: 2026-07-30
slug: commerce-clientes-tickets-recovery
repro: "Canon: docs/commerce/MAPA-VENTA-CLIENTES-SOPORTE.md — venta → customer → ticket CLIENT/PROSPECT → cuenta/recovery"
verify: "npm run build; rutas nuevas en functions; feedback/session/profile/recovery/admin tickets"
---

# Plan L — Clientes, tickets, nick y recuperación (software)

**Canon:** [`docs/commerce/MAPA-VENTA-CLIENTES-SOPORTE.md`](../commerce/MAPA-VENTA-CLIENTES-SOPORTE.md)  
**Base hecha:** hub commerce olas 1–3 (`docs/plans/2026-07-28-product-commerce-hub.md`)  
**Stack:** Pages Functions + R2 monofile (mismo patrón que orders/licenses). **D1 fuera de este plan** (solo nota de migración).

---

## 0. Calibración

| | |
|--|--|
| **Tier** | **L** — multi-módulo (commerce store, APIs, cuenta, ProductsBrowser, admin, i18n) |
| **Scope** | Cerrar el hueco mapa↔código: `customers`, tickets enums + buyer, nick, recovery, admin |
| **Out of scope** | Música/`license-quote`, DRM/Keygen, SaaS suscripción, D1 dual-write, social/perfil completo, Stripe Connect |
| **Reuse** | `commerce.ts` (orders/licenses/magic), `sendStudioMail`, `requireAdmin` / admin pedidos, `feedback.ts`, `ProductsBrowser`, `/cuenta/` |
| **Industry** | Magic-link account (Stripe-style email identity); ticket triage con enums; recovery assisted (no self-serve email hijack) — alineado al mapa §5–6 |

**Ops humanas (no código):** secrets Stripe + webhook + full build — prerequisito de *venta real*, no bloquean WPs 1–5 en staging.

---

## 1. Arquitectura objetivo (slice de este plan)

```
Stripe webhook
  → upsertOrder + upsertLicense + upsertCustomer
  → mails (igual)

POST /api/feedback  (ampliado = tickets)
  → resuelve buyer vía sesión O email con order paid
  → upsertTicket (enums) + mail prefijado
  → { ok, buyer, ticketId }

GET /api/account/session
  → + customer.nick, productSlugs buyer

Cuenta UI
  → nick edit, link tickets/recovery

Admin
  → /admin/tickets/ + transfer email + fulfill (si falta) en pedidos
```

**Store R2 (nuevas keys):**

| Key | Contenido |
|-----|-----------|
| `catalog/commerce/customers.json` | `CommerceCustomer[]` |
| `catalog/commerce/tickets.json` | `CommerceTicket[]` |

---

## 2. Contratos de datos (nuevos)

```ts
// commerce.ts
export type CommerceCustomer = {
  email: string;           // lower
  nick: string | null;
  productSlugs: string[];
  createdAt: string;
  lastPurchaseAt?: string;
  lastSeenAt?: string;
  emailHistory?: string[];
};

export type TicketChannel = "bug" | "suggestion" | "support" | "other";
// subtypes: ver mapa §5 (listas fijas en const)

export type CommerceTicket = {
  id: string;              // tkt_…
  email: string;
  buyer: boolean;
  productSlug: string | null;
  channel: TicketChannel;
  subtype: string;
  message: string;
  nick: string | null;
  name: string | null;     // display opcional form
  status: "new" | "triaged" | "waiting" | "done" | "wontfix";
  createdAt: string;
  orderIds?: string[];
  ip?: string;
};
```

**Buyer rule (servidor, única):**  
`buyer === true` solo si existe order `status===paid` para `email` (y opcionalmente `productSlug` si se envía). Sesión magic ⇒ email confiable; sin sesión ⇒ email del body y buyer solo si hay pedido (no confiar en flags del cliente).

---

## 3. Touch map (símbolos verificados)

### Punto 1 — Store customers + tickets
| Archivo | Símbolo | Rol |
|---------|---------|-----|
| `functions/lib/commerce.ts` | `ORDERS_KEY`, `LICENSES_KEY` | patrón monofile a clonar |
| `functions/lib/commerce.ts` | `upsertOrder`, `listOrders`, `ordersForEmail` | mirror customers/tickets |
| `functions/lib/commerce.ts` | `CommerceOrder`, `CommerceLicense` | tipos vecinos |
| `functions/lib/commerce.ts` | `(nuevo)` `CUSTOMERS_KEY`, `TICKETS_KEY`, tipos, list/upsert/find/isBuyer | núcleo |

### Punto 2 — Webhook crea cliente
| Archivo | Símbolo | Rol |
|---------|---------|-----|
| `functions/api/webhooks/stripe.ts` | handler `checkout.session.completed` | tras `upsertOrder`/`upsertLicense` → `upsertCustomer` |
| `functions/lib/commerce.ts` | `generateLicenseKey`, `newId` | sin cambio de contrato order |

### Punto 3 — Feedback → tickets
| Archivo | Símbolo | Rol |
|---------|---------|-----|
| `functions/api/feedback.ts` | `onRequest`, `FEEDBACK_TYPES` | ampliar body + enums + ticket + buyer |
| `functions/lib/commerce.ts` | `verifyAccountSession`, `getAccountTokenFromRequest` | email sesión |
| `functions/lib/send-mail.ts` | `sendStudioMail` | mail prefijado |

### Punto 4 — UI form producto
| Archivo | Símbolo | Rol |
|---------|---------|-----|
| `src/components/ProductsBrowser.astro` | form `data-pb-feedback-form`, submit `/api/feedback` | enums + verify CTA |
| `src/i18n/translations.ts` | `productFeedback*` | textos ES/EN/FR |

### Punto 5 — Cuenta: nick + session
| Archivo | Símbolo | Rol |
|---------|---------|-----|
| `functions/api/account/session.ts` | `GET` payload | + nick, isBuyer products |
| `functions/api/account/(nuevo) profile.ts` o PATCH session | set nick | validación nick |
| `src/pages/[lang]/cuenta.astro` | panel orders | UI nick + link recovery |

### Punto 6 — Activate devuelve nick
| Archivo | Símbolo | Rol |
|---------|---------|-----|
| `functions/api/license/activate.ts` | `onRequest` | si key ok → `{ nick }` del customer del email de la license |
| `functions/lib/commerce.ts` | `activateLicense`, `findLicense` | leer email → customer |

### Punto 7 — Admin tickets
| Archivo | Símbolo | Rol |
|---------|---------|-----|
| `functions/admin/(nuevo) tickets.ts` | list + set status | requireAdmin |
| `src/pages/admin/(nuevo) tickets.astro` | tabla filtros | como `pedidos.astro` |
| `src/pages/admin/pedidos.astro` | nav | link tickets |

### Punto 8 — Recovery + transfer email
| Archivo | Símbolo | Rol |
|---------|---------|-----|
| `functions/api/(nuevo) account/recovery.ts` | POST form → ticket `account_recovery` | genérico, rate limit |
| `functions/admin/orders.ts` | actions | `transfer_email`, `fulfill_session` (si falta), `reset_activations`, `rotate_key` |
| `src/pages/[lang]/(nuevo) o sección cuenta` | form recovery | copy genérico |
| `src/pages/admin/pedidos.astro` | botones admin | transfer / reset / rotate |

### Punto 9 — Docs
| Archivo | Símbolo | Rol |
|---------|---------|-----|
| `docs/commerce/MAPA-…` | § implementado | marcar done parcial |
| `docs/estado.md` | hub productos | checklist WPs |
| `migrations/0001_commerce.sql` | nota | customers/tickets para futuro D1 (opcional SQL stub) |

---

## 4. Work packages (orden de ejecución)

### WP1 — Customers en commerce + webhook  
**Puntos:** 1 (customers), 2  

- Tipos + `listCustomers` / `upsertCustomer` / `findCustomer` / `isPaidBuyer(email, productSlug?)`  
- Webhook: tras order paid → upsert customer (merge `productSlugs`, `lastPurchaseAt`)  
- **Verify:** simular payload webhook o unitario de merge; order sin customer imposible en path paid  

### WP2 — Tickets store + feedback API  
**Puntos:** 1 (tickets), 3  

- Enums como `const` exportados (single source)  
- `POST /api/feedback`: body `{ channel, subtype, productSlug, name?, email?, message, turnstile? }`  
  - Compat: mapear legacy `type: bug|idea|complaint|other` → channel/subtype  
- Resolver email: sesión > body  
- `buyer` server-side; `orderIds` si buyer  
- Mail: `[CHANNEL·subtype][CLIENT|PROSPECT] slug — email`  
- Rate limit existente; Turnstile si secret  
- **Verify:** POST sin sesión sin order → PROSPECT; con order paid email → CLIENT; sesión sin body email → CLIENT  

### WP3 — ProductsBrowser + i18n  
**Punto:** 4  

- Selects canal + subtipo (subtipos dependen de canal)  
- Si `GET /api/account/session` authenticated: badge “Cliente verificado”, no pedir email  
- Si no: email required + botón “Verificar como cliente” → redirige `/cuenta/?return=…` o magic  
- **Verify:** UI envía enums; mensaje éxito; no key en form  

### WP4 — Nick en cuenta + session + activate  
**Puntos:** 5, 6  

- Nick: `^[a-zA-Z0-9_]{3,20}$`, único case-insensitive entre customers  
- `PATCH` o `POST /api/account/profile` `{ nick }` con sesión  
- Session GET incluye `nick`  
- Activate response incluye `nick` (null ok)  
- Cuenta UI: input nick + guardar  
- **Verify:** set nick → session y activate lo devuelven; nick inválido 400  

### WP5 — Admin tickets  
**Punto:** 7  

- `GET/POST /admin/tickets` list + `{ action: set_status, id, status }`  
- Página admin tabla + filtros channel/buyer/status  
- Link desde pedidos/productos  
- **Verify:** ticket creado por feedback aparece; cambio status persiste  

### WP6 — Recovery + admin transfer / rotate / reset  
**Punto:** 8  

- `POST /api/account/recovery` → ticket support/`account_recovery` con campos opcionales (no validar key en público más allá de guardar para admin)  
- Admin:  
  - `transfer_email` { fromEmail, toEmail } → rewrite customer, orders, licenses + emailHistory  
  - `rotate_key` { licenseKey } → nueva key, clear activations  
  - `reset_activations` { licenseKey }  
  - `fulfill_session` { stripeSessionId } re-run lógica webhook si order missing (extraer helper de webhook)  
- UI recovery en cuenta o `/recuperar/`  
- **Verify:** transfer mueve ordersForEmail; rotate invalida key vieja en findLicense; recovery no revela existencia  

### WP7 — Docs + estado  
**Punto:** 9  

- Actualizar mapa §2 “implementado”  
- `docs/estado.md` checks  
- Plan `status: done` al cerrar  

---

## 5. Failure modes

| Fallo | Mitigación |
|-------|------------|
| Feedback sin bucket | 503 como hoy |
| Nick colisión | 409 `nick_taken` |
| Transfer a email que ya tiene orders | merge productSlugs; no borrar orders destino; documentar |
| Webhook duplicado | idempotencia session ya en `findOrderBySession` |
| Cliente manda `buyer: true` en JSON | ignorar; solo server |
| Recovery con key ajena | admin valida; no auto-transfer |

---

## 6. Decision log

| Decisión | Elección | Por qué |
|----------|----------|---------|
| Store | R2 monofile (como orders) | Consistente; D1 después |
| Endpoint tickets públicos | Ampliar `/api/feedback` | Ya enlazado UI; menos rutas |
| Buyer sin sesión con email de pedido | Sí CLIENT | Menos fricción; riesgo bajo (email adivinado + pedido) aceptable con rate limit; sesión preferida en copy |
| Key en form bug | No | Solo recovery |
| Fulfill helper | Extraer de webhook a `commerce` o `fulfill-order.ts` | DRY para L + admin |

---

## 7. NO TOCAR

| Área | Por qué |
|------|---------|
| `license-quote.ts` / música | Otro producto |
| DRM / offline license server | Fuera de mapa v1 |
| D1 dual-write runtime | Aplazado |
| Cambiar Stripe `mode: payment` | Modelo fijado |
| Exponer `fullKey` en products API | Seguridad |

---

## 8. Verify checklist (cierre global)

- [ ] Tras “pago” (webhook test o fixture): existe customer con email + productSlug  
- [ ] Feedback prospect → ticket `buyer:false` + mail `[PROSPECT]`  
- [ ] Feedback email con order paid → `buyer:true`  
- [ ] Feedback con cookie sesión → usa email sesión  
- [ ] Enums inválidos → 400 o coerce a `other`  
- [ ] Nick set + unique; activate devuelve nick  
- [ ] Admin lista tickets y cambia status  
- [ ] Transfer email: orders/licenses siguen al nuevo mail  
- [ ] Rotate key: activate con key vieja falla  
- [ ] Recovery POST 200 genérico  
- [ ] `npm run build` OK  
- [ ] Ningún `fullKey` / lista customers en API pública products  

**No** suite de tests obligatoria salvo que se pida.

---

## 9. Estimación de bloques

| WP | Esfuerzo relativo | Dependencia |
|----|-------------------|-------------|
| WP1 | S | — |
| WP2 | M | WP1 (`isPaidBuyer`) |
| WP3 | S–M | WP2 |
| WP4 | S | WP1 |
| WP5 | S–M | WP2 |
| WP6 | M–L | WP1 + WP2 + admin orders |
| WP7 | XS | resto |

Ejecución recomendada: **WP1 → WP2 → WP3 ∥ WP4 → WP5 → WP6 → WP7**  
(∥ = nick puede ir en paralelo a UI feedback tras WP1).

---

## 10. Cierre ejecución

| WP | Estado |
|----|--------|
| WP1 customers + webhook | ✅ done |
| WP2 tickets + feedback | ✅ done |
| WP3 ProductsBrowser + i18n | ✅ done |
| WP4 nick session/activate | ✅ done |
| WP5 admin tickets | ✅ done |
| WP6 recovery + transfer/rotate/reset | ✅ done |
| WP7 docs | ✅ done |

**Verify:** `npm run build` OK · push main.

**Siguiente (humano):** ops en  
`docs/commerce/MAPA-VENTA-CLIENTES-SOPORTE.md` §0 (checks sin marcar) y §10.
