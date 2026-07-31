# Política — Biblioteca de música (preview, entrega, pago)

**SSoT del modelo actual** (web + R2 + Stripe).  
**Última revisión:** 2026-07-31  
**Estado código:** implementado · **Ops:** falta pegar `price_…` en fichas + smoke pago

Relacionado:

| Doc | Rol |
|-----|-----|
| Este archivo | **Política técnica y de producto** biblioteca + licencia online |
| `docs/licencias/` | Precios de catálogo / cotizador / plantillas PDF |
| `docs/commerce/MAPA-VENTA-CLIENTES-SOPORTE.md` | Commerce global (software + hub Stripe) |
| `docs/estado.md` | Checklist corto |

---

## 1. Qué es cada cosa (no mezclar)

| Activo | Quién lo oye / usa | Calidad | Dónde en R2 |
|--------|--------------------|---------|-------------|
| **Preview web** | Visitante (biblioteca) | Mix ligero mono ~22 kHz ± ruido | `library/{slug}/…-preview…` **público** vía `/api/media` |
| **Stems HQ** | Solo admin + comprador (licencia) | Originales **intactos** (p.ej. WAV 24-bit / 44.1 stereo) | `library/{slug}/full/stems/…` **privado** |
| **Master HQ** | Solo admin + comprador | Original **intacto** | `library/{slug}/full/…` **privado** |

### Reglas de oro

1. **Los originales no se reescriben.** Al publicar, los stems/master se guardan tal cual.  
2. **El preview es una copia de trabajo** generada al publicar (mezcla + opcional ruido + compresión). No sustituye al master ni a los stems.  
3. **La biblioteca pública no reproduce stems por capas.** Solo el preview (1 archivo).  
4. **`/api/media` devuelve 403** si la key contiene `/full/` (masters y stems de entrega).  
5. **Nunca** subir masters/stems HQ a URL pública r2.dev ni exponer `masterKey` / keys de stems en API pública.

---

## 2. Admin (`/admin/biblioteca/`)

### Subida

| Campo | Comportamiento |
|-------|----------------|
| **Stems HQ** | Drop → R2 `full/stems/` sin bake |
| **Master HQ** | Drop → R2 `full/` sin bake |
| **Preview web** | Generado al publicar (mix desde stems locales o desde R2 privado) |
| **Slider ruido** | Solo afecta al **preview**, no a los HQ |
| **Meta-only** | Guarda tags/moods/precios sin tocar audio |

### Status (criterio UI)

Textos cortos de **estado real**, no tutoriales:

- Stems / master: **Subido** · **En PC** · **Sin …** · **Fallo**  
- Master: head R2 (`GET /admin/master?slug=`) al editar o «Comprobar R2»

### Precios Stripe en ficha

| Campo catálogo | Uso |
|----------------|-----|
| `priceEur` | Precio mostrado en UI (opcional) |
| `stripePriceId` | `price_…` de Stripe para la licencia (master; pack si no hay price de stems aparte) |
| `stemsStripePriceId` | Opcional: segundo line item si quieres cobro separado de stems |
| `licenseEnabled` | Si false, no cotización ni checkout |

`checkoutReady` (API) = hay **master en R2** + `stripePriceId` válido + licencia habilitada.

---

## 3. Visitante (biblioteca)

| Acción | Comportamiento |
|--------|----------------|
| ▶ Play | Solo **preview** (1 archivo) |
| Ficha / licencia | Cotizador (`POST /api/quote`) **siempre** disponible si `licenseEnabled` |
| **Pagar con tarjeta** | Visible solo si `checkoutReady` |
| Sin Price en Stripe | Mensaje de “configurar Price”; cotización sigue |

No hay mixer de capas en público. El texto de stems es **beneficio de licencia**, no player.

---

## 4. Pago online (música)

### Flujo

```
Biblioteca → Pagar
  → POST /api/checkout { kind: "music", workSlug, package, email? }
  → Stripe Checkout (mode: payment)
  → webhook checkout.session.completed
  → order kind=music + license key + customer
  → mail comprador (links 72 h) + mail estudio [Venta música]
  → /es/cuenta/ re-descarga (magic link)
```

### Packages

| `package` | Entrega |
|-----------|---------|
| `master` | Solo master HQ |
| `master_stems` (default si hay stems) | Master + stems HQ del catálogo |

Si existe `stemsStripePriceId` distinto del master, el Checkout puede llevar **2 line items**; si no, un solo Price se interpreta como pack.

### Descarga

- Token firmado: `GET /api/download?token=…`  
- Keys permitidas: `library/…/full/…` (software `library/products/…/full/` o música `library/{slug}/full/…`)  
- Re-emisión: `POST /api/download` con sesión de cuenta + `licenseKey`  
  - Música: `{ files: [{ name, url, role }] }` (master + N stems)

### Cotización vs pago

| Canal | Cuándo |
|-------|--------|
| **Checkout** | Tarifa estándar, obra con master + Price |
| **Quote** (`/api/quote`) | Exclusivas, usos raros, sin Price aún, negociación |

No mezclar con checkout de **software** (`productSlug` de `/admin/productos/`). Metadata Stripe: `kind=music` vs `kind=software`.

---

## 5. Seguridad

| Superficie | Política |
|------------|----------|
| API library pública | `preview`, flags `hasMaster` / `hasStems` / `checkoutReady`, `priceEur`; **sin** `masterKey` ni `stems[].key` |
| Admin items | Sí incluye keys de entrega (`includeDelivery`) |
| Admin media | `GET /admin/media?key=` solo sesión admin |
| Secrets Stripe | Solo Pages secrets; nunca en JSON público |

---

## 6. Ops (checklist)

- [ ] Stripe: Price(s) de música (`price_…`)  
- [ ] Admin: pegar en cada obra lista para vender + `priceEur`  
- [ ] Obra con **master** (y stems si el pack los incluye) en `full/`  
- [ ] Smoke test (idealmente **test mode** primero): pagar → mail → cuenta → descarga  
- [ ] Banco / verificación Stripe si live  

---

## 7. No hacer

- Bake / mono / make-up sobre stems o master de entrega  
- Multi-stem player en biblioteca pública  
- Exponer `/full/` en `/api/media`  
- Confiar solo en el catálogo sin comprobar objeto R2 (usar Comprobar R2 / head)  
- Usar el mismo `productSlug` de software para una obra de biblioteca  

---

## 8. Referencias de código

| Pieza | Archivo |
|-------|---------|
| Publish HQ + preview | `functions/admin/publish.ts` |
| Preview bake (cliente) | `src/lib/preview-noise-bake.ts` → `bakeLibraryPreview` |
| Checkout | `functions/api/checkout.ts` |
| Webhook | `functions/api/webhooks/stripe.ts` |
| Download | `functions/api/download.ts` · `functions/lib/commerce.ts` |
| Sanitize público | `functions/lib/catalog-sanitize.ts` |
| Play biblioteca | `src/lib/library-browser/play-session.ts` (solo preview) |
