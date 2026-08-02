---
status: done
source: direct
tier: XS
mode: normal
date: 2026-08-02
slug: admin-product-bin-status
repro: "Editar producto → ver status full/demo (en R2 / listo / sin cambios); guardar sin re-subir → mensaje confirma bins conservados"
legitimidad: válido
decision: absorber
target_ola: null
---

# Plan: status visual full/demo al editar productos

## Scope
- Admin productos: feedback de estado de binarios (full + demo) al **editar**, al **elegir archivo** y al **guardar**.
- Out of scope: auto-detección de versión (usuario la hará a mano).

## Legitimidad
- **flujo_actual:** válido — ya conserva `fullKey`/`demo` sin re-subir; solo falta feedback.
- **decisión:** absorber `data-full-status` + ampliar demo + mensaje API.

## Touch graph (XS)

### TOCAR
| Archivo | Símbolo | Qué cambia | Callers/edges a propagar |
|---------|---------|------------|--------------------------|
| `src/pages/admin/productos.astro` | markup + `fillForm` / file change / `resetForm` / submit | líneas status color full+demo | local only |
| `functions/admin/products.ts` | POST handler `mediaNote` | full/demo kept vs subido en `message` | cliente lee `data.message` |

### NO TOCAR
| Archivo | Por qué |
|---------|---------|
| catálogo público / `ProductsBrowser` | no es admin upload |
| `version` field / PE parse | usuario lo hace aparte |
| biblioteca setLight system | no copiar stack; status simple |

### Legitimidad: válido · absorber | Modo: normal

## Clasificación
- `data-full-status` → **válido** (ampliar)
- message API sin bins → **deuda** en radio → **corregir en esta ola**

## Impacto
- Si no propago API message: UI de edit OK pero save ambiguo.
- Si no limpio en reset: status fantasma en “Nuevo”.

## Propagación
- [x] e1 fillForm → set status kept/none
- [x] e2 change file → pending
- [x] e3 resetForm → clear
- [x] e4 POST message → full/demo en nota

## Execution blocks
### P1 — UI status
Líneas bajo inputs demo/full; estados: none | kept | pending | err; CSS `data-state`.

### P2 — API note
Al guardar: `full subido` / `full sin cambios` / sin full; igual demo.

## VERIFY
- Repro: editar producto con full → línea “en R2 · se mantiene”
- Elegir exe nuevo → pending con nombre+tamaño
- Guardar sin archivo → message incluye full/demo sin cambios
- Nuevo producto / cancelar → status limpio
- No tests de suite
