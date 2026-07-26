---
status: done
source: direct
tier: L
date: 2026-07-26
slug: scale-ux-review-fixes
repro: "Publish/list/detail library+products OK; index items; products paginated; Range media"
---

# Plan L — Corregir puntos code-review (UX + escala)

## Scope (puntos del review)

| # | Punto | Fix en este plan |
|---|--------|------------------|
| 1 | JSON monofile | Dual-write: monofile + `catalog/items/{slug}.json` + index ligero |
| 2 | Upload browser bake | Status processing honesto + no bloquear (mejora UX; full presign = ola 2) |
| 3 | Media proxy | Range requests reales en `/api/media` |
| 4 | Productos dump | Paginación API + cliente |
| 5 | requireAdmin copiado | Helper compartido |
| 6 | license-quote dual | SSoT JSON + sync check |
| 7 | Monolitos UI | Extraer módulo admin-preview-job (parcial; split total = deuda aceptada) |
| 8 | Atomic async | Documentado + flags en ítem `mediaStatus` (ready/processing) |

## Out (infra real)

- D1 / Cloudflare Queues / ffmpeg server
- R2 custom domain DNS
- Split completo 2.6k admin.astro

## Blocks

1. library-catalog index + per-item
2. library API list from index when possible
3. products index + paginate API
4. ProductsBrowser page
5. requireAdmin shared
6. media Range
7. license prices JSON SSoT
8. mediaStatus on publish
