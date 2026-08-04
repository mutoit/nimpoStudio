---
status: done
source: direct
tier: XS
mode: normal
date: 2026-08-04
slug: catalogo-feed-align-ficha
repro: "Desktop: top del rail feed = top de la ficha ProductsBrowser (no del hero)"
legitimidad: mixto
decision: refactorizar
target_ola: null
pending_surface: true
---

# Scope

Alinear verticalmente el rail del feed con la **ficha** (no con el título “Productos”).

## Packet

```text
SCOPE: alinear feed con ficha
FILAS: catalogo/index.astro DOM + CSS shell
DoD: top(feed) ≈ top(pb__shop / ficha); hero encima a ancho main
NO TOCAR: ProductsBrowser lógica · API feed · home
VERIFY: desktop visual + build
```

## Plan

### DIAGNÓSTICO

```text
síntoma:  feed a la derecha arranca a la altura del H1; ficha más abajo
origen:   catalog-shell grid incluye hero + ProductsBrowser en la col main
provoca:  align-items:start alinea rail con el top del main (= hero), no con .pb__shop
familia:  local-contract (layout)
remedio:  hero fuera del grid; grid solo ProductsBrowser | rail
```

### LEGITIMIDAD

```text
flujo_actual: mixto
decisión:     refactorizar markup página (1 archivo)
```

### TOUCH GRAPH (XS)

| Archivo | Qué | Edges |
|---------|-----|-------|
| `src/pages/[lang]/catalogo/index.astro` | hero encima; shell = browser + rail | none |
| NO TOCAR | ProductsBrowser, ProductUpdatesPanel JS | — |

### Execution

#### P1 — Markup + CSS

```html
<div class="catalog-page">
  <div class="catalog-page__intro">
    <header class="hero">…</header>
  </div>
  <div class="catalog-shell">
    <div class="catalog-shell__main">
      <ProductsBrowser />
    </div>
    <aside class="catalog-shell__rail">
      <ProductUpdatesPanel />
    </aside>
  </div>
</div>
```

Desktop: `.catalog-page` width cap igual que shell actual; intro y shell misma anchura de columna main (intro no se mete bajo el rail o sí a full width del page — **intro solo sobre main**, o full shell width).

Opción limpia (match imagen: hero a la izquierda, feed al nivel ficha):

- `catalog-page` grid desktop: `1fr 17.5rem`
- intro: `grid-column: 1` (solo sobre main)
- shell main + rail en segunda fila… más complejo.

**Más simple y correcto:**

```text
[ hero full width del bloque page (main+rail) ]
[ ProductsBrowser | feed ]  ← mismos tops
```

Hero span full `catalog-page` width (incluye zona rail arriba vacía o hero full).  
Usuario pidió alinear feed con **ficha**, no con hero — ok que hero sea full width encima.

```html
<div class="catalog-page">
  <header class="hero">…</header>
  <div class="catalog-shell">
    <div class="catalog-shell__main"><ProductsBrowser /></div>
    <aside class="catalog-shell__rail">…</aside>
  </div>
</div>
```

CSS: width/margins en `.catalog-page`; shell grid como ahora; rail sticky top header.

### VERIFY

```text
- Top feed = top ficha (lista+detail) desktop ..... sí
- Scope feed por producto intacto ............... sí
- Build ......................................... sí
```

## Status

- plan: approved + executed P1
- execute: done — hero fuera del grid; shell = browser | rail
- verify radio: build
- verify surface: pending
