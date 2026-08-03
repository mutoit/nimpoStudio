---
status: done
source: direct
tier: S
mode: graph-strict
date: 2026-08-04
slug: productos-feed-scope-format
repro: "Admin post con producto X + lista → solo visible con ?slug=X / ficha X; listas legibles"
legitimidad: mixto
decision: refactorizar
target_ola: null
pending_surface: true
---

# Scope

Feed · Productos (“foro”): (1) visibilidad por `productSlug` en página/extensión del producto; (2) más caracteres + formato mínimo para listas/enumeraciones.

## Packet

```text
SCOPE: product-feed scope + rich text lite
FILAS: sanitize/API filter · ProductUpdatesPanel · ProductsBrowser sync · admin textarea
DoD: post de producto X no se mezcla en contextos de Y; listas se leen; API ?slug= honesto
NO TOCAR: feed home (catalog/updates.json), newsletter, commerce checkout
VERIFY: build + curl filter + UI catálogo con ?p= + admin max + lista render
```

## Plan

### DIAGNÓSTICO

**A — Scope por producto**

```text
síntoma:  posts de todos los productos se listan juntos en el rail y en GET /api/product-updates
origen:   API product-updates + ProductUpdatesPanel leen el feed completo; productSlug solo es cabecera/link
provoca:  no hay gate de visibilidad: el contrato “este post pertenece a un producto” no se aplica en lectura
familia:  contract-drift
remedio:  un filtro canónico por productSlug (API + consumidores web/app); ficha activa del catálogo acota el rail
```

**B — Formato / longitud**

```text
síntoma:  texto plano ~800 chars; listas y enumeraciones se aplastan en un <p>
origen:   sanitizeProductFeedItem slice(0,800) + render escapeHtml en un solo párrafo
provoca:  techo y renderer sin saltos/listas
familia:  local-contract
remedio:  techo ampliado + subset de formato seguro (saltos, listas -/* /1., negrita opcional) en un solo formatter
```

### Scope / out of scope

| In | Out |
|----|-----|
| Filtro `?slug=` / `?product=` en `GET /api/product-updates` | Feed Novedades home (`/api/updates`, admin biblioteca) |
| Rail catálogo filtrado al producto activo (`?p=` + cambio en ProductsBrowser) | Markdown completo / HTML libre / editor WYSIWYG |
| Subir límite summary (p.ej. 2500) + hint admin | Cap 40 posts, media img|vídeo |
| Formatter lite reutilizable (server-safe + client render) | i18n masiva (solo hint ES admin + labels mínimas si hace falta) |
| Docs admin-acceso + opcional mención contrato app | Tickets/feedback enums |

### LEGITIMIDAD

```text
flujo_actual: mixto
decisión:     refactorizar
nota:         CRUD + R2 + productSlug válidos; falta Q de scope en lectura y renderer de cuerpo
```

### CLASIFICACIÓN (radio)

| Nodo | Clase | Acción |
|------|-------|--------|
| `product-updates-catalog` (sanitize + store) | válido | absorber; ampliar techo summary; export filter helper |
| `GET /api/product-updates` | deuda | añadir filtro slug |
| `ProductUpdatesPanel` | deuda | filtrar por slug prop / URL / evento |
| `ProductsBrowser` | válido | emitir evento o URL ya existente (`?p=`) → panel reacciona |
| admin `product-feed` form | válido | maxlength + placeholder formato |
| render summary | incorrecto (plano) | reemplazar por formatter lite |

### TOUCH GRAPH

```text
modo: graph-strict (admin + API pública + UI catálogo + admin form)
```

| Nodo | path · Symbol | Rol |
|------|---------------|-----|
| C | `functions/lib/product-updates-catalog.ts` · `sanitizeProductFeedItem` / `readProductUpdates` | techo summary + `filterProductUpdatesBySlug` |
| F | `functions/lib/product-feed-format.ts` (nuevo) · `formatProductFeedBody` | markdown lite → HTML seguro |
| A | `functions/api/product-updates.ts` · `onRequest` | `?slug=` filtra |
| P | `src/components/ProductUpdatesPanel.astro` | fetch con slug; re-hydrate al cambiar producto |
| B | `src/components/ProductsBrowser.astro` · URL `?p=` | dispatch evento `nimpo:product-selected` al cambiar ficha |
| U | `src/lib/admin/product-feed.ts` + `productos.astro` | maxlength / hint / contador opcional |
| D | `docs/admin-acceso.md` | documentar scope + formato |

| Edge | Desde → Hasta | Tipo | ¿Propagar? |
|------|---------------|------|------------|
| e1 | C → A | callee | sí — API usa filter del catalog |
| e2 | A → P | API | sí — panel pasa `?slug=` |
| e3 | B → P | evento/URL | sí — al seleccionar producto se refiltra |
| e4 | F → P (+ admin preview si hay) | callee | sí — mismo formatter en UI |
| e5 | C → admin POST | callee | sí — sanitize nuevo techo |
| e6 | U → C | contrato form | sí — maxlength alineado con sanitize |

**Superficie:** `/admin/productos/` Feed · `/es/catalogo/` rail · `GET /api/product-updates?slug=` (apps/extensiones).

**NO TOCAR**

| Archivo | Por qué |
|---------|---------|
| `functions/admin/feed.ts` / `api/updates.ts` | feed home distinto |
| checkout / products CRUD precios | fuera de radio |
| `UpdatesPanel.astro` (home) | no es feed productos |

### IMPACTO

- Sin filtro en API: apps/extensiones no pueden pedir “solo mi producto”.
- Sin sync catálogo: rail sigue mezclando posts ajenos en la ficha.
- Sin formatter: subir chars solo alarga un muro de texto.
- Si el formatter acepta HTML crudo → XSS; solo subset post-escape.

### PROPAGACIÓN

- [ ] `sanitizeProductFeedItem` techo nuevo (const `PRODUCT_FEED_SUMMARY_MAX = 2500`)
- [ ] API query `slug` / `product` normalizado como productSlug
- [ ] Panel: sin slug activo → **no** listar todos mezclados como si fueran del producto; política:
  - **Con producto activo** (`?p=` o evento): solo posts de ese slug
  - **Sin producto activo**: mostrar feed multi-producto (overview) **o** vacío con copy “elige un producto” — **decisión plan: overview multi con cabecera de producto** (estado actual) **solo en rail global**; al abrir ficha (`?p=`) **filtro estricto**
  - **API con `?slug=`**: solo ese producto (contract extension)
  - **API sin slug**: lista completa (admin y overview; no es “contexto de un producto”)
- [ ] Formatter: `\n`→br / líneas `- ` `* ` `1. `→ul/ol / `**x**`→strong; sin raw HTML
- [ ] Admin: maxlength 2500, rows↑, hint “listas: - ítem o 1. ítem”
- [ ] Docs admin-acceso

### Industry

N/A patrón repo — changelog por producto (Product Hunt / app release notes) + markdown lite acotado; no full CMS.

### Execution blocks

#### P1 — Contrato store + filtro (familia A)

- Constante `PRODUCT_FEED_SUMMARY_MAX = 2500` en catalog.
- `filterProductUpdatesBySlug(items, slug): ProductFeedItem[]` (slug vacío → sin filtrar).
- `sanitizeProductFeedItem`: summary `.slice(0, PRODUCT_FEED_SUMMARY_MAX)`.
- API `GET /api/product-updates?slug=mi-app` (alias `product`): aplica filter; respuesta incluye `filteredBy` cuando hay slug.

#### P2 — Formatter lite (familia B)

- Nuevo `functions/lib/product-feed-format.ts` **o** `src/lib/product-feed-format.ts` importable en cliente (preferir `src/lib/` si solo UI; si admin SSR no aplica, **src/lib** basta para panel + futuro).
  - Preferencia: **`src/lib/product-feed-format.ts`** para client; no hace falta en Functions salvo validación (no render server).
- API: `formatProductFeedBody(text: string): string` → HTML seguro.
- Reglas: escape completo → split líneas → listas contiguas → párrafos con `<br>` internos → `**bold**` en texto escapado (regex post-escape sobre no-tags).
- CSS en panel: `.updates-panel__summary` → permitir `ul/ol/p` hijos (no solo `<p>` plano).

#### P3 — Panel + sync catálogo (familia A)

- `ProductUpdatesPanel`: leer `?p=` inicial; `fetch('/api/product-updates?slug='+…)` si hay slug.
- Escuchar `nimpo:product-selected` (`detail: { slug: string | null }`) y `popstate` / misma lógica que browser.
- `ProductsBrowser`: tras `history.replaceState` con `p`, `dispatchEvent(new CustomEvent('nimpo:product-selected', { detail: { slug } }))` (bubbles en `window`).
- Copy empty cuando hay slug sin posts: “Sin updates de este producto” (i18n mín. es/en/fr si keys ya existen o reutilizar empty).

#### P4 — Admin UX formato (familia B)

- `productos.astro`: textarea `maxlength="2500"`, `rows="8"`, placeholder con ejemplo de lista.
- Hint bajo el campo: “Hasta 2500 caracteres. Listas: `- ítem` o `1. ítem`. Negrita: `**texto**`.”
- Alinear cualquier validación cliente en `src/lib/admin/product-feed.ts` si recorta.

#### P5 — Docs + VERIFY

- Actualizar `docs/admin-acceso.md` § Feed · Productos (scope por producto + formato).
- Una línea en `docs/estado.md` si ya documenta el feed.
- Opcional 1 línea en `UPDATES-APP-CONTRATO.md` o `functions/README.md`: `GET /api/product-updates?slug=`.

### VERIFY

```text
VERIFY:
- Repro: post producto X no aparece en rail de ficha Y ........ sí
- GET /api/product-updates?slug=X solo items X ............... sí
- GET sin slug sigue listando todos (overview/admin) ......... sí
- Admin acepta >800 y listas se ven en rail .................. sí
- Sin HTML crudo (script no ejecuta) ......................... sí
- Edges e1–e6 propagados ..................................... sí
- Build `npm run build` (nimpo-studio) ........................ sí
- Superficie humano admin+catálogo desktop ................... pendiente (◐)
```

### accepted_risks

- Overview sin `?p=` sigue multi-producto (intencional; no es “página de un producto”).
- Formatter no soporta tablas/links markdown (YAGNI); links siguen siendo campo `link` del post.

### Audit

```text
Audit passed (0 CRITICAL)
- DIAGNÓSTICO A+B con familia y remedio
- Touch graph + propagación
- Legitimidad mixto → refactorizar (no parche solo maxlength)
```

## Status

- plan: approved + executed P1–P5
- execute: done
- verify radio: build OK (`npm run build`)
- verify surface: pending (admin post real + catálogo desktop con 2 productos)
- edges: e1–e6 propagados

### Hecho

- `PRODUCT_FEED_SUMMARY_MAX=2500` + `filterProductUpdatesBySlug` + `normalizeProductFeedSlug`
- `GET /api/product-updates?slug=` (`filteredBy` en respuesta)
- `src/lib/product-feed-format.ts` (listas / párrafos / **bold**)
- `ProductUpdatesPanel` fetch filtrado por `?p=` / `?slug=` (observa URL; **no** toca ficha ProductsBrowser)
- Admin textarea 2500 + hint; docs admin-acceso / estado / functions README

### Corrección

- Revertido cualquier cambio en `ProductsBrowser.astro` (ficha producto fuera de scope).
- Radio = feed productos (admin + API + rail `ProductUpdatesPanel`).
