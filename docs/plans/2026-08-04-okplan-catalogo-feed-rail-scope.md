---
status: done
source: direct
tier: S
mode: normal
date: 2026-08-04
slug: catalogo-feed-rail-scope
repro: "Desktop: feed sticky a la derecha; elegir producto X en lista → rail solo posts de X; sin X → vacío scope"
legitimidad: mixto
decision: refactorizar
target_ola: null
pending_surface: true
---

# Scope

1. Feed de productos a la **derecha** del catálogo (como imagen).  
2. Al elegir producto en la lista, el feed **solo** muestra posts de ese producto (extensión web = ficha `?p=slug`).

## Packet

```text
SCOPE: rail derecho catálogo + scope feed por producto activo
FILAS: catalogo/index layout · ProductUpdatesPanel scope · setDeepLink sync (mínimo)
DoD: rail derecha ≥1100px; ficha no aplastada (no 38rem home); feed 1:1 con producto lista
NO TOCAR: home page-with-feed 38rem · admin product-feed CRUD · lógica compra/demo ficha
VERIFY: build + desktop 3 columnas + cambio producto filtra rail
```

## Plan

### DIAGNÓSTICO

```text
síntoma:  feed debajo (no a la derecha); al cambiar producto el rail no es “solo ese producto” de forma clara
origen:   ac779e5 puso feed bajo container; panel filtra por ?p= pero sin ?p= carga feed multi; layout home 38rem ya se descartó
provoca:  layout sin rail; sincronía URL/producto incompleta en primer paint
familia:  contract-drift + missing-propagation (productSlug → superficie feed)
remedio:  layout catálogo propio (main 1fr + rail 17.5rem, sin 38rem) + feed always scoped a producto activo
```

### LEGITIMIDAD

```text
flujo_actual: mixto (API ?slug= y panel OK; layout y primer sync no)
decisión:     refactorizar layout catálogo; absorber filter API; 1 edge en ProductsBrowser
```

### TOUCH GRAPH

| Nodo | path · Symbol | Rol |
|------|---------------|-----|
| L | `src/pages/[lang]/catalogo/index.astro` | shell main + rail derecha |
| C | estilos en index (o layout.css `.catalog-shell`) | grid sticky rail; NO `.page-with-feed` 38rem |
| F | `ProductUpdatesPanel.astro` | scope estricto: sin slug → empty product; con slug → `?slug=` |
| B | `ProductsBrowser` · `setDeepLink` | al tener `activeSlug`, escribir `?p=` (primer paint + apply) |

| Edge | ¿Propagar? |
|------|------------|
| B → F vía `?p=` + parche replaceState | sí |
| F → API `?slug=` | sí (ya) |
| L → home PageFrame | no |

**NO TOCAR:** `page-with-feed` home; admin; `product-updates-catalog` sanitize.

### IMPACTO

- Sin rail derecho: no match imagen.
- Sin sync `?p=`: feed multi o vacío al elegir producto.
- Si reusamos `page-with-feed` 38rem: ficha otra vez estrecha (regresión).

### PROPAGACIÓN

- [ ] catalog shell desktop only; &lt;1100 feed debajo o colapsado
- [ ] setDeepLink en apply/load si hay activeSlug
- [ ] panel no lista “todos” en contexto catálogo
- [ ] docs admin-acceso una línea

### Execution blocks

#### P1 — Layout rail derecha (sin aplastar ficha)

`catalogo/index.astro`:

```html
<div class="catalog-shell">
  <div class="catalog-shell__main">
    <div class="container">
      hero + ProductsBrowser
    </div>
  </div>
  <aside class="catalog-shell__rail" aria-label={productFeedTitle}>
    <ProductUpdatesPanel lang={lang} />
  </aside>
</div>
```

CSS (scoped page o `layout.css` prefijo `.catalog-shell`):

```css
.catalog-shell { width: 100%; }
.catalog-shell__rail { /* mobile: debajo, max-width 28rem */ }

@media (min-width: 1100px) {
  .catalog-shell {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 17.5rem;
    column-gap: 1.75rem;
    align-items: start;
    width: min(100% - 2rem, calc(var(--max-width) + 17.5rem + 1.75rem));
    margin-inline: auto;
  }
  .catalog-shell__main .container {
    max-width: none; /* el ancho lo da la col 1fr dentro del cap del shell */
    padding-inline: 0;
  }
  .catalog-shell__main {
    min-width: 0;
    padding-inline: 0; /* o padding solo izq si hace falta */
  }
  .catalog-shell__rail {
    position: sticky;
    top: 5.5rem;
    max-height: calc(100dvh - 7rem);
    overflow: hidden;
    padding-block: 0.25rem 2rem;
  }
  .catalog-shell__rail > * {
    max-height: 100%;
    min-height: 0;
  }
}
```

**Prohibido:** reintroducir `page-with-feed` con col 38rem en catálogo.

#### P2 — Feed solo del producto activo (extensión web)

`ProductUpdatesPanel`:

- Si **no** hay `?p=` / slug: mostrar empty `productFeedEmptyForProduct` (o copy “Elige un producto”) — **no** listar posts de todos.
- Si hay slug: `GET /api/product-updates?slug=…` (ya).
- Mantener listener `replaceState` / popstate (ya).
- Opcional: en título del panel, no hace falta nombre de producto.

API extensions apps: sin cambio (`?slug=` ya).

#### P3 — Sync lista → URL (mínimo en ProductsBrowser)

Tras `apply()` y tras hidratar lista live, si `activeSlug`:

```ts
setDeepLink(activeSlug);
```

Solo eso: no reescribir ficha ni eventos custom. El panel reacciona al `?p=`.

#### P4 — Docs

`docs/admin-acceso.md`: feed a la derecha en catálogo desktop; scope por `?p=` / `?slug=`.

### VERIFY

```text
- Desktop ≥1100: feed sticky derecha ......................... sí
- Ficha legible (no torre 1-palabra; main no 38rem) .......... sí
- Click producto Y: rail solo posts productSlug=Y ............. sí
- Sin ?p= / antes de select: rail vacío scope ................. sí
- API ?slug= sigue para apps .................................. sí
- Home page-with-feed intacto ................................. sí
- Build ....................................................... sí
- Superficie humano ........................................... pendiente
```

### Audit

```text
Audit passed — no reusa 38rem home; scope en feed no en lógica de compra; touch ProductsBrowser = 1 edge URL
```

## Status

- plan: approved + executed P1–P4
- execute: done
  - catalog-shell main+rail derecha
  - panel scope estricto ?slug=
  - setDeepLink en apply()
  - docs admin-acceso
- verify radio: build
- verify surface: pending
