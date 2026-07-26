---
status: done
source: direct
tier: L
date: 2026-07-26
slug: library-top-tier-ux
repro: "Play grid <3s con 1 preview; stems solo en mixer; no 5×WAV al ▶"
---

# Plan L — Biblioteca top-tier UX (preview + thumbs + modular)

## Scope (del code-review)

| Prio | Mejora |
|------|--------|
| P0 | `preview` mix mono (1 archivo) al publish; play grid = HTMLAudio |
| P0 | Stems Web Audio solo en mixer; abort al cambiar de obra |
| P1 | Thumbs más agresivos (360px / q0.72) |
| P1 | Extraer player + list/detail de `bind.ts` |
| P2 deferred | R2 custom domain edge (no en este slice) |

## Blocks

1. bakeMixPreview + publish field `preview`
2. API sanitize/card exposes `preview`
3. library-preview-player + play path
4. Abort + stems only mixer
5. Thumbs compress defaults
6. Split modules list/detail/player from bind
7. Admin: generate preview on publish + rebuild button for existing

## Verify

- Detail API has `preview` after re-publish
- Grid ▶ loads 1 media URL not N stems
- Mixer still loads stems
- npm run build OK
