---
status: done
source: producto
tier: XS
mode: normal
date: 2026-08-02
slug: producto-ola-b-admin-productos
repro: "Rail muestra cover + chips full/demo; al guardar con exe → % upload; editar sin file → bins sin cambios"
legitimidad: válido
decision: absorber
target_ola: B
---

# Ola C→B — admin productos (bins + rail + progress)

Packet producto:
OLA: C→B
FILAS: status bins · mensaje save · rail thumb · upload %
DoD: ninguna fila < B (código; claim B con superficie usuario)
NO TOCAR: versión auto-exe; catálogo público
VERIFY: citas + path; superficie = smoke admin del usuario

## Hecho
1. Rail: `safeThumbUrl` + chips full/demo/sin bin
2. Save: `postFormWithProgress` (XHR %) en status + líneas bin
3. (prev) setBinStatus kept/pending/err + API full/demo notes
