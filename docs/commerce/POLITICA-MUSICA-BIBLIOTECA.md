# Política — Biblioteca de música (preview, entrega, pago)

**SSoT del modelo actual** (web + R2 + Stripe).  
**Última revisión:** 2026-07-31  
**Estado código:** implementado · **Ops:** smoke pago + publicar software (ver TAREAS-VENTAS)

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

### Precios Stripe (catálogo de **licencias**, no por obra)

| Pieza | Uso |
|-------|-----|
| `functions/lib/stripe-license-prices.json` | Mapa `código cotizador` → `price_…` (live) |
| Products Stripe | Una licencia o extra = un Product + Price one-time EUR |
| `special_quote` | Producto sin Price fijo → cobro **Invoice / Payment Link** a mano |
| Ficha obra `stripePriceId` | **Legacy** (ya no hace falta para Pagar) |
| `licenseEnabled` | Si false, no cotización ni checkout |

`checkoutReady` (API) = hay **master en R2** + licencia habilitada.  
Checkout = line items del baremo (uso + extras) + metadata `workSlug`.

---

## 3. Visitante (biblioteca)

| Acción | Comportamiento |
|--------|----------------|
| ▶ Play | Solo **preview** (1 archivo) · barra al tiempo real del audio |
| Ficha / licencia | Cotizador + **Total** + **Pagar** (baremo global Stripe) si hay master |
| **Pagar** | Visible si `checkoutReady` = master HQ + licencia on |
| Presupuesto especial | Formulario (no Checkout); cobro Invoice/Link a mano |

No hay mixer de capas en público. El texto de stems es **beneficio de licencia**, no player.

---

## 4. Pago online (música)

### Flujo

```
Biblioteca → uso + extras → Total → Pagar
  → POST /api/checkout { kind: "music", workSlug, email, usage, term, extras… }
  → servidor: calculateLicenseQuote + stripe-license-prices.json
  → Stripe Checkout (N line items: licencia + extras)
  → webhook → order + key + customer + mail
  → /es/cuenta/ re-descarga

Presupuesto especial → form quote (no Checkout)
  → estudio → Invoice/Link sobre Product «Presupuesto especial»
```

### Entrega HQ

| Extra stems pagado | Entrega |
|--------------------|----------|
| Sí | Master + stems HQ (si hay en R2) |
| No | Solo master HQ |

### Descarga

- Token firmado: `GET /api/download?token=…`  
- Keys permitidas: `library/…/full/…` (software `library/products/…/full/` o música `library/{slug}/full/…`)  
- Re-emisión: `POST /api/download` con sesión de cuenta + `licenseKey`  
  - Música: `{ files: [{ name, url, role }] }` (master + N stems)

### Cotización vs pago

| Canal | Cuándo |
|-------|--------|
| **Checkout** | Baremo cerrado (todas las licencias/extras con €) + obra con master |
| **Quote** | Solo flag «presupuesto especial» → Invoice a mano |

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

**Lista prioritaria (tú), música + software:**  
→ **`docs/commerce/TAREAS-VENTAS-PRIORIDAD.md`**

Solo música (extracto):

- [x] Catálogo Stripe licencias + extras + mapa `stripe-license-prices.json`  
- [x] Banco / verificación Stripe live  
- [ ] Smoke: Pagar → mail → cuenta → descarga (obra con master en `full/`)  
- [ ] Especial: Invoice/Link a mano cuando toque  

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
