---
status: done
source: direct
tier: XS
mode: normal
date: 2026-08-04
slug: catalogo-ficha-ancho
repro: "Desktop ≥1100px /es/catalogo/ ficha: texto en columna ancha legible; media no torre"
legitimidad: incorrecto
decision: refactorizar
target_ola: null
pending_surface: true
---

# Scope

Ficha de producto del catálogo “extra larga” (texto en hilo vertical, media dominante). Recuperar proporciones pre–feed productos en catálogo.

## Packet

```text
SCOPE: layout catálogo (page-with-feed ancho)
FILAS: layout.css modifier · catalogo/index.astro
DoD: ficha legible ~como pre-a8b2a51; rail feed intacto; home 38rem intacto
NO TOCAR: ProductsBrowser lógica/JS · API feed · admin
VERIFY: build + visual desktop catálogo vs home
```

## Plan

### DIAGNÓSTICO

```text
síntoma:  ficha producto muy alta; copy se apila palabra a palabra; media 4/5 domina
origen:   a8b2a51 — /catalogo/ metido en .page-with-feed con columna contenido 38rem (contrato home)
provoca:  ProductsBrowser (lista 15.5rem + media|info) cabe en ~38rem → info ~10rem → wrap extremo + altura de torre
familia:  regression-edge
remedio:  ancho de contenido de catálogo = modelo pre-feed (container amplio) + rail; home sigue 38rem
```

Evidencia: pre-`a8b2a51` catalogo era `<div class="container">` a `--max-width` (~72rem). Tras feed, col 2 = **38rem** (`layout.css`). CSS de `.pb__stage` 4/5 existía antes; el regreso de proporciones es **layout de página**, no reescribir la ficha.

### LEGITIMIDAD

```text
flujo_actual: incorrecto (home layout aplicado a catálogo)
decisión:     refactorizar — modifier de ancho; no quitar el rail
```

### TOUCH GRAPH (XS)

| Archivo | Símbolo | Qué cambia | Edges |
|---------|---------|------------|-------|
| `src/styles/layout.css` | `.page-with-feed--catalog` | col contenido ~54–56rem (no 38) | home sin clase → no propaga |
| `src/pages/[lang]/catalogo/index.astro` | root div | añadir clase `--catalog` | solo catálogo |

**NO TOCAR:** `ProductsBrowser.astro` (salvo si tras ancho aún hace falta `min-width` en `.pb__info` — solo entonces, 1 regla CSS). `PageFrame` home. API/admin feed.

### IMPACTO

- Sin fix: ficha ilegible en desktop con rail.
- Home Novedades: no debe cambiar.
- Móvil (&lt;1100): rail oculto; sin cambio de grid.

### PROPAGACIÓN

- [ ] Solo páginas con `page-with-feed--catalog`
- [ ] Home / PageFrame sin la clase
- [ ] Rail sticky/max-height igual

### Execution blocks

#### P1 — Modifier layout catálogo

En `layout.css` (bloque ≥1100px):

```css
.page-with-feed.page-with-feed--catalog {
  grid-template-columns:
    minmax(1rem, 1fr)
    minmax(0, 56rem)   /* recupera aire de ficha; 38rem = solo home */
    17.5rem
    minmax(1rem, 1fr);
}
```

En `catalogo/index.astro`:

```html
<div class="page-with-feed page-with-feed--catalog">
```

#### P2 — (solo si hace falta tras P1) info mínima

Si con 56rem el info aún se estrecha: `.pb__grid { grid-template-columns: minmax(0, 1fr) minmax(16rem, 1.05fr); }` — **no** bajar aspect 4/5 del mockup salvo que el usuario lo pida.

### VERIFY

```text
- /es/catalogo/ desktop: ficha no es torre de 1 palabra/línea ... sí
- Rail product feed sigue a la derecha ≥1100px ............... sí
- Home page-with-feed sigue 38rem ........................... sí
- Build OK .................................................. sí
- Superficie humano ......................................... pendiente
```

### Audit

```text
Audit passed — familia regression-edge, remedio en layout no parche en body text
```

## Status

- plan: approved + executed P1
- execute: done — `.page-with-feed--catalog` 56rem + clase en catalogo/index
- verify radio: build
- verify surface: pending (desktop catálogo)
- P2: no aplicado (no hace falta a priori)
