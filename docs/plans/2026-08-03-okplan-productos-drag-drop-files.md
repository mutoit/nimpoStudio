---
status: done
source: direct
tier: S
mode: normal
date: 2026-08-03
slug: productos-drag-drop-files
repro: "Admin /admin/productos → arrastrar zip/img/vídeo a zonas demo/full/imágenes/vídeo → status/preview se actualiza; guardar sube igual que con clic"
legitimidad: válido
decision: absorber
target_ola: null
pending_surface: true
---

# Scope

Habilitar **arrastrar y soltar archivos** en el admin de productos (demo, full, imágenes, vídeo), con la misma UX de dropzone que biblioteca (arrastrar o clic).

**Out of scope:** API `functions/admin/products.ts`, catálogo público, biblioteca, reorder de imágenes en rail, drop en toda la página (solo zonas).

## Packet

```text
SCOPE: drag-drop files en admin productos (4 slots)
ABSORB: patrón dropzone biblioteca (master/stems) → helper + UI productos
DoD: drop o clic asigna input.files; bin-status + preview reaccionan; submit sin cambio de contrato
NO TOCAR: products API, ProductsBrowser, stems-ui domain
VERIFY: manual 4 zonas + reject tipo incorrecto + clear/reset limpia
```

## Plan

### DIAGNÓSTICO

```text
DIAGNÓSTICO:
  síntoma:     en admin productos solo se elige archivo con input nativo (clic); no se puede arrastrar
  origen:      UI — `src/pages/admin/productos.astro` · inputs sin dropzone
  provoca:     patrón dropzone ya existe en biblioteca pero no se cableó en productos
  familia:     dead-or-unwired
  remedio:     zonas drop que escriben en los mismos input[type=file] + change
```

### LEGITIMIDAD

```text
LEGITIMIDAD:
  flujo_actual: válido
  decisión:     absorber
  nota:         submit lee input.files; drop alimenta ese path
```

### Execution blocks (hechos)

#### P1 — `bindFileDropzone` ✅
- `src/lib/admin/file-dropzone.ts` — `bindFileDropzone` + `fileMatchesAccept`
- DataTransfer → files → `change` bubbles

#### P2 — Markup dropzones ×4 ✅
- demo / full / images / video con `.dropzone`, input hidden, titles + fname

#### P3 — Wire + CSS + reset ✅
- `wireProductDrop` ×4; reject → setStatus; fname labels; clearFileInputs restaura defaults
- CSS dropzone en style de productos (sin import admin-biblioteca)

### PROPAGACIÓN

- [x] e1: productos importa y llama `bindFileDropzone` ×4
- [x] e3: drop demo/full → change → sync bin
- [x] e4: drop images/video → change → preview
- [x] e5: submit sin tocar API
- [x] e6: reset limpia inputs + labels

### VERIFY

```text
VERIFY:
- Build astro .............................. sí (npm run build OK)
- Un solo path input.files + change ...... sí
- Edges e1–e6 en código .................. sí
- Superficie humano admin .................. pendiente
- Tests .................................. no
```

## Status

- plan: approved + executed
- execute: done (P1–P3)
- verify radio: OK (build + code path)
- verify surface: pending_surface
