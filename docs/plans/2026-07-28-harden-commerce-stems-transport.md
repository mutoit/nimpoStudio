---
status: done
source: code-review + direct
tier: L
date: 2026-07-28
slug: harden-commerce-stems-transport
repro: "Modal: desmarcar stem → se oye/deja de oír esa capa; grid sigue con preview 1 archivo"
---

# Plan L — Harden review + stems mute + clasificación

## Fallo stems (sitio exacto)

| Hecho | Evidencia |
|-------|-----------|
| Datos OK | API detail: `kind:stems`, N stems, `preview` 1 archivo |
| Mixer visible | Tras `isHydratedDetail` se pintan checkboxes |
| Mute NO | Modal play usa **preview mono** si hay `preview` |
| | `preferStems = !preview && stems` → siempre false con preview |
| | Checkboxes → `applyStemMixFromUi` exige `stemsTx.loadedItemId` |
| | Preview mode: stemsTx vacío → mute no-op |
| Bug extra | `applyMix(on.size ? on : null)` — all off pasa `null` = **todas ON** |

**Contrato correcto:**
- Grid ▶ → preview 1 archivo (ligero)
- Modal con stems → **StemTransport multi-capa** (checkboxes reales)
- Toggle checkbox → `applyMix(Set)`; empty Set = mute all

## Scope (puntos review + stems)

### P1 Stems transport (user-facing FAIL)
### P2 Webhook Stripe firma obligatoria
### P3 commerceSecret obligatorio en download/magic/checkout tokens
### P4 Mail único (feedback → sendStudioMail)
### P5 Catalog hasStems en sanitize detail
### P6 Form product parse fuera de sanitize (admin products)
### P7 Types LibraryCard vs Detail (catalog-client)
### P8 (parcial) Extract products-browser hub client module
### Out esta PR: split total bind.ts 1500→N (siguiente PR); D1 full migrate (store R2 honest + note)

## Touch map

### Punto 1: Modal stems mode + mute
| Archivo | Símbolo | Rol |
|---------|---------|-----|
| `src/lib/library-browser/play-session.ts` | `playPreviewOrStems` | mode explícito |
| `src/lib/library-browser/bind.ts` | modal play handler | preferStems si modal+stems |
| `src/lib/library-browser/bind.ts` | `applyStemMixFromUi` | empty Set mute all; id match |
| `src/lib/library-browser/bind.ts` | checkbox change | si no loaded → playStems then mix |

### Punto 2–3: Commerce harden
| Archivo | Símbolo | Rol |
|---------|---------|-----|
| `functions/api/webhooks/stripe.ts` | signature gate | 503 sin secret |
| `functions/lib/commerce.ts` | `commerceSecret` | no fallback password login |
| `functions/api/download.ts` | secret gate | 503 |
| `functions/api/account/magic.ts` | secret gate | 503 |
| `functions/api/checkout.ts` | ok | ya stripe key |

### Punto 4: Mail
| Archivo | Símbolo | Rol |
|---------|---------|-----|
| `functions/api/feedback.ts` | onRequest | usar sendStudioMail |
| `functions/lib/send-mail.ts` | sendStudioMail | reuso |

### Punto 5–7: Catalog contracts
| Archivo | Símbolo | Rol |
|---------|---------|-----|
| `functions/lib/catalog-sanitize.ts` | sanitizeCatalogItem | hasStems explícito |
| `src/lib/library-browser/catalog-client.ts` | types Card/Detail | needs verification parcial |
| `functions/admin/publish.ts` | kind stems | forzar si stems.length |

### Punto 8: ProductsBrowser extract (si tiempo)
| Archivo | Símbolo | Rol |
|---------|---------|-----|
| `src/lib/products-browser/bind.ts` | (nuevo) | sacar script |
| `src/components/ProductsBrowser.astro` | shell | import bind |

## Verify
1. Playwright: open nanorobots → play modal → uncheck stem → applyMix loaded  
2. Webhook without secret → 503  
3. download without DOWNLOAD/SESSION secret → 503  
4. build OK  
5. publish stems → kind stems + hasStems on detail  

## STOP omitido: user dijo “ataca / dejarlo optimizado”
