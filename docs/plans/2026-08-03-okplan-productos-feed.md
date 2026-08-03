---
status: done
source: direct
tier: M
mode: graph-strict
date: 2026-08-03
slug: productos-feed
repro: "Admin /admin/productos → elegir producto → texto + img|vídeo → publicar; /es/catalogo/ rail con cabecera producto"
legitimidad: válido
decision: absorber
target_ola: null
pending_surface: true
---

# Scope

Feed propio de productos (admin + rail catálogo + cabecera = producto).

## Status

- execute: done P1–P5
- verify radio: build OK
- verify surface: pending (admin real + catálogo desktop ≥1100px)

## Hecho

- `functions/lib/product-updates-catalog.ts`
- `functions/admin/product-feed.ts` · `functions/api/product-updates.ts`
- `src/lib/admin/product-feed.ts` + sección en `productos.astro`
- `ProductUpdatesPanel.astro` + `catalogo/index.astro` page-with-feed
- i18n es/en/fr · README rutas

## VERIFY

```text
- Build ................................ sí
- Store separado updates.json .......... sí
- Edges admin/public ................... sí
- Superficie humano .................... pendiente
```
