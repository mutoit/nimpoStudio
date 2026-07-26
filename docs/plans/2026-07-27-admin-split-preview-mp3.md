---
status: done
source: direct
tier: L
date: 2026-07-27
slug: admin-split-preview-mp3
repro: "Admin modular <800 líneas/módulo; publish genera preview .mp3; ▶ sirve audio/mpeg"
---

# Plan L — Split monólitos + preview MP3

## Goal

1. **Split** de los monólitos que impiden mantener UX/admin sin miedo.
2. **Preview de biblioteca en MP3** (no WAV 22 kHz), coherente con que el estudio **sube MP3**.

Done when: verify checklist al final.

---

## Tier + scope

| | |
|--|--|
| **Tier** | **L** (multi-módulo, contratos media, admin) |
| **In** | Split admin biblioteca / LibraryBrowser / bind; pipeline preview → **MP3**; publish acepta/sirve `audio/mpeg`; rebuild 🎧 en MP3 |
| **Out** | Presigned R2, Queues, ffmpeg cloud, R2 custom domain, D1, split `MusicLicense.astro` (ola 2), producto admin split |

### Por qué no “servidor decodifica MP3 y mezcla” en CF Pages hoy

Cloudflare Pages Functions **no tienen Web Audio ni ffmpeg nativo**. Mezclar N MP3 en el edge implica **WASM ffmpeg (~MB de bundle)** o un servicio externo.

**Plan realista (industria + stack actual):**

| Capa | Responsabilidad |
|------|-----------------|
| **Cliente admin** | Decode MP3 (ya lo hace el browser) → ruido → **mix** → **encode MP3** (`lamejs` o similar) |
| **Servidor publish** | Recibe `preview` como **`.mp3`**, valida MIME, guarda R2, catálogo `preview: /api/media/...mp3` |
| **Servidor “hace” el preview** | En el sentido de **contrato canónico y entrega**: no re-encode a WAV; opcionalmente **si 1 solo stem ya es MP3 bakeado**, puede copiar/renombrar sin re-mix (atajo) |

El visitante oye **MP3**. Tú sigues subiendo **MP3**. El “servidor” **persiste y sirve** el preview MP3; el bake de ruido sigue en admin (como ahora) porque es donde hay `AudioContext`.

Si más adelante hay job WASM/ffmpeg: el mismo campo `preview` sigue valiendo.

---

## Industry (breve)

| Práctica | Adopción |
|----------|----------|
| Preview = 1 stream comprimido (MP3/AAC) | Sí — dejar de servir WAV de preview |
| Upload original en formato estudio (MP3) | Sí — stems limpios MP3; preview MP3 |
| Admin modular por dominio | Split por feed / publish / rail / stems |
| Player UI separado de catálogo | bind ya parcialmente; completar |

---

## Part A — Split de monólitos

### Tamaños actuales (verificados)

| Archivo | ~Líneas | Acción |
|---------|---------|--------|
| `src/pages/admin/biblioteca.astro` | **2692** | Partir en shell + módulos JS + CSS |
| `src/components/LibraryBrowser.astro` | **2110** | Shell markup + CSS; lógica fuera |
| `src/lib/library-browser/bind.ts` | **1682** | Ya tiene `catalog-client` / `preview-player`; extraer resto |
| `MusicLicense.astro` | 1521 | **Ola 2** (no este plan) |

### Target post-split

Ningún módulo de lógica admin > **~400–500 líneas**.  
Shells Astro: markup + imports de scripts, **&lt; ~300 líneas** de HTML estructura si es posible.

### Arquitectura admin post-split

```
src/pages/admin/biblioteca.astro     # shell: layout + includes
src/components/admin/
  AdminBibliotecaShell.astro         # opcional: layout 2 col
  AdminPublishForm.astro             # form obra + media lights
  AdminFeedBlock.astro               # feed novedades
  AdminPubRail.astro                 # rail publicaciones + 🎧 bar
src/lib/admin/
  admin-status.ts                    # setStatus, toast, lights
  admin-stems-ui.ts                  # stem rows, dropzone, mix
  admin-publish.ts                   # submit publish + bake + preview mp3
  admin-feed.ts                      # feed CRUD UI
  admin-pubs-rail.ts                 # loadPubs, edit, delete, rebuild previews
  admin-moods.ts                     # mood chips
styles: admin-biblioteca.css         # extraer de <style> monstruo
```

### Arquitectura biblioteca pública post-split

```
src/components/LibraryBrowser.astro  # markup + CSS only (o CSS en styles/library-browser.css)
src/lib/library-browser/
  bind.ts                            # wiring fino (~200–300 líneas)
  catalog-client.ts                  # ya existe
  preview-player.ts                  # ya existe
  grid.ts                            # renderGrid + handlers cards
  modal.ts                           # openModal/close + media modal
  license-form.ts                    # cotizador en modal
  filters.ts                         # chips mood/type
  share.ts                           # o reexport share existente
```

### Punto 1: Split admin — HTML/CSS

| Archivo | Símbolo | Rol |
|---------|---------|-----|
| `src/pages/admin/biblioteca.astro` | layout actual | Queda shell que importa componentes |
| `src/components/admin/AdminPublishForm.astro` | `(nuevo)` | Form publish + media |
| `src/components/admin/AdminFeedBlock.astro` | `(nuevo)` | Feed block |
| `src/components/admin/AdminPubRail.astro` | `(nuevo)` | Rail + preview job bar |
| `src/styles/admin-biblioteca.css` | `(nuevo)` | CSS sacado del monstruo |

### Punto 2: Split admin — JS

| Archivo | Símbolo | Rol |
|---------|---------|-----|
| `src/lib/admin/admin-status.ts` | `(nuevo) setStatus, showToast, setLight` | Feedback |
| `src/lib/admin/admin-stems-ui.ts` | `(nuevo) stemRows, renderStems, dropzone` | Stems UI |
| `src/lib/admin/admin-publish.ts` | `(nuevo) bindPublishForm` | Publish + bake + **preview MP3** |
| `src/lib/admin/admin-feed.ts` | `(nuevo) bindFeed` | Feed |
| `src/lib/admin/admin-pubs-rail.ts` | `(nuevo) loadPubs, rebuildPreviews` | Rail |
| `src/lib/admin/admin-moods.ts` | `(nuevo)` | Moods |
| `src/pages/admin/biblioteca.astro` `<script>` | entry | Solo `import` + `init()` |

### Punto 3: Split LibraryBrowser / bind

| Archivo | Símbolo | Rol |
|---------|---------|-----|
| `src/lib/library-browser/grid.ts` | `(nuevo) renderGrid` | Cards |
| `src/lib/library-browser/modal.ts` | `(nuevo) openModal` | Modal |
| `src/lib/library-browser/license-form.ts` | `(nuevo)` | Quote form |
| `src/lib/library-browser/filters.ts` | `(nuevo)` | Filtros |
| `src/lib/library-browser/bind.ts` | `bindLibraryBrowser` | Orquesta ~300 líneas |
| `src/styles/library-browser.css` | `(nuevo)` | CSS is:global actual |

### NO TOCAR (este plan)

| Archivo | Por qué |
|---------|---------|
| `functions/lib/library-catalog.ts` | Índice ya dual-write |
| `src/lib/stem-transport.ts` | Mixer OK |
| `MusicLicense.astro` | Ola 2 |
| Checkout / Stripe | Fuera de scope |

---

## Part B — Preview MP3

### Contrato

```ts
// LibraryItem
preview: string | null  // /api/media/library/{slug}/{slug}-preview-xxx.mp3
// Content-Type: audio/mpeg
```

### Flujo publish (post-split en `admin-publish.ts`)

```
stems MP3/WAV subidos
  → bakePreviewNoise (sigue client; output interno puede ser WAV corto o buffer)
  → bakeMixPreview (buffers → AudioBuffer mix)
  → encodeMp3Mono(buffer, ~128 kbps)  // NUEVO
  → body.set("preview", file, `${slug}-preview.mp3`)
  → POST /admin/publish
  → R2 put audio/mpeg
```

### Punto 4: Encode MP3

| Archivo | Símbolo | Rol |
|---------|---------|-----|
| `src/lib/preview-mp3-encode.ts` | `(nuevo) encodeMp3FromAudioBuffer` | lamejs o `@breezystack/lamejs` |
| `src/lib/preview-noise-bake.ts` | `bakeMixPreview` | Devuelve `AudioBuffer` o acepta encoder |
| `package.json` | dep `lamejs` | Encode browser |

**API encode:**

```ts
// P: AudioBuffer mono/stereo. Q: File audio/mpeg ~22–48 kHz, CBR 128 (o 96).
export async function encodeMp3FromAudioBuffer(
  buffer: AudioBuffer,
  opts?: { kbps?: number; sampleRate?: number }
): Promise<File>
```

**Calidad default:** 128 kbps, mono, 22050 o 44100 (si 22050 no suena bien en lame, 44100 mono 96–128 kbps).

### Punto 5: Publish server

| Archivo | Símbolo | Rol |
|---------|---------|-----|
| `functions/admin/publish.ts` | `putFile` preview | Aceptar `audio/mpeg` / ext `mp3` |
| `functions/lib/media-upload.ts` | `AUDIO_EXT` | ya tiene `mp3` |
| `functions/lib/catalog-sanitize.ts` | `preview` field | ya existe; validar `.mp3` |

### Punto 6: Rebuild 🎧 + play

| Archivo | Símbolo | Rol |
|---------|---------|-----|
| `admin-pubs-rail.ts` | rebuild | Genera `.mp3` no `.wav` |
| `preview-player.ts` | `play` | Ya HTMLAudio — MP3 nativo |
| `library-browser/*` | sin cambio de UX | salvo content-type |

### Atajo servidor (opcional en mismo bloque)

Si **un solo stem** y el bake produce buffer: encode MP3 igual.  
No copiar el MP3 original sin ruido (rompería preview protegido).

---

## Execution blocks (orden)

### Block 1 — Encode MP3 + bakeMix devuelve buffer/File mp3  
**Puntos 4–5**

1. Añadir dep encode MP3 (lamejs).  
2. `encodeMp3FromAudioBuffer`.  
3. `bakeMixPreview` → File **`.mp3`**.  
4. Publish admin + rebuild: nombre `*-preview.mp3`.  
5. Verificar `Content-Type` en R2.

**Verify:** publicar 1 obra de prueba; `GET preview` → `audio/mpeg`; ▶ funciona.

### Block 2 — Split `bind.ts` → grid/modal/filters/license  
**Punto 3**

1. Extraer sin cambiar comportamiento.  
2. `bind.ts` solo init + wiring.  
3. Build + smoke biblioteca.

### Block 3 — Split CSS/markup LibraryBrowser  
**Punto 3**

1. CSS a `src/styles/library-browser.css`.  
2. Astro solo estructura + script import.

### Block 4 — Split admin JS (publish, feed, rail, stems, moods, status)  
**Punto 2**

1. Extraer módulos uno a uno (rail + publish primero = más riesgo).  
2. Entry script thin.  
3. Smoke: publish, edit, 🎧 Previews, feed.

### Block 5 — Split admin Astro components + CSS  
**Punto 1**

1. Feed / form / rail a componentes.  
2. CSS admin extraído.  
3. Smoke visual admin.

### Block 6 — Docs + verify checklist  
AGENTS.md, estado.md, plan `status: done`.

---

## Riesgos

| Risk | Mitigación |
|------|------------|
| lamejs calidad/artefactos | A/B 96 vs 128 kbps; mono |
| Bundle admin crece | lamejs solo en admin publish chunk |
| Split rompe selectores | No renombrar `data-*` en el mismo PR que lógica |
| Obras con preview .wav viejo | 🎧 Previews regenera MP3; play sigue OK con wav hasta entonces |
| Encode lento en 8 stems | Progress bar 🎧 ya existe; mensaje “encode MP3…” |

---

## Failure modes

| Fallo | Comportamiento |
|-------|----------------|
| Encode MP3 falla | Fallback WAV (log); o error visible y no bloquear stems |
| Publish sin preview | Catálogo sin `preview` → play fallback stems (como hoy) |
| Módulo split mal cableado | Build fail o botón no-op → smoke checklist |

---

## Decision log

| Decisión | Elegido | Alternativa rechazada |
|----------|---------|------------------------|
| Dónde se mezcla | Browser admin (AudioContext) | Worker ffmpeg WASM ahora (peso/complejidad) |
| Formato preview | **MP3** | WAV 22k; WebM-only (Safari uneven) |
| Split strategy | Por dominio (feed/publish/rail) | Por capa técnica solo (peor UX de ownership) |
| MusicLicense split | Ola 2 | Incluir todo en un PR (demasiado) |

---

## Verify checklist (DoD)

1. `npm run build` OK.  
2. Admin: publicar obra **MP3 stems** → en R2 `*-preview-*.mp3` y `Content-Type: audio/mpeg`.  
3. Catálogo `preview` apunta a ese path; list card `hasPreview: true`.  
4. `/es/biblioteca/` ▶ reproduce sin bajar N stems.  
5. 🎧 Previews genera **mp3**, barra admin visible.  
6. Edit + re-bake regenera preview mp3.  
7. `bind.ts` &lt; ~400 líneas; admin entry &lt; ~150; ningún nuevo monstruo &gt;800 sin justificación.  
8. Selectores `data-*` públicos de biblioteca **sin cambio** (no romper bookmarks).  
9. Push main + smoke prod.

---

## Audit embebido

| Sev | Finding | Acción |
|-----|---------|--------|
| — | Touch map anclado a archivos reales | OK |
| HIGH | “Servidor hace MP3” malinterpretado como decode en CF | Aclarado: encode client + servidor almacena/sirve; atajo 1-stem documentado |
| MED | Split y MP3 en un solo PR largo | Blocks ordenados; se puede mergear por block si hace falta |
| accepted | MusicLicense 1521 y presign fuera | Explícito out |

**Audit passed (1 accepted: MusicLicense/presign fuera).**

---

## STOP

Plan en `docs/plans/2026-07-27-admin-split-preview-mp3.md`.

**¿Aplico el plan?** (Block 1 MP3 primero → splits; o todo en serie.)
