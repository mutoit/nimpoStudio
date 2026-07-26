---
status: done
source: direct
tier: L
date: 2026-07-26
slug: biblioteca-catalog-scale
repro: "Entrar a /es/biblioteca/ no debe pedir stems ni pintar N vídeos con preload; lista paginada + detalle por slug"
---

# Plan industrial — Biblioteca: catálogo escalable

## Goal

Que la biblioteca pública se comporte como un browse de stock/media industrial:

1. **Lista ligera paginada** (solo lo necesario para cards).
2. **Detalle + stems on demand** (al abrir ficha / play).
3. **Media controlada** (poster en grid; vídeo y audio bajo demanda).
4. **Filtros en servidor**; deep-link `?p=slug` sin cargar el catálogo entero.
5. **Admin sin regresión** (sigue viendo catálogo completo).

**Done when:** verify checklist al final en verde; player de stems y licencias se mantienen.

---

## Tier + scope

| | |
|--|--|
| **Tier** | **L** (API pública + cliente + contratos + rollout) |
| **In** | `GET /api/library` list/detail, paginación cursor, cliente `bind.ts` + payload, grid media policy, deep-link, QA |
| **Out** | Admin full-list, precios/licencias, stem transport (salvo consumir detail), D1/migración de storage, ProductsBrowser, virtualización DOM (>~200 obras: ola 2), optimización de imágenes CDN avanzada |

### Layers

```
UI (LibraryBrowser + bind)
  → API pública (list / detail)
    → domain sanitize + filter + page
      → R2 catalog JSON (readCatalog)  [storage SSoT sin cambiar formato]
```

Admin (`/admin/items`) **no** cambia contrato de lista completa.

---

## Industry (decisiones)

| Práctica | Fuente de dominio | Adopción aquí |
|----------|-------------------|---------------|
| Índice ligero vs detalle | Epidemic / Artlist / Unsplash-style browse | list card vs detail con stems |
| Cursor + `limit` | APIs de feed/catalog modernas | `cursor` + `limit` (default 24) |
| Filtros en servidor | stock/search APIs | `mood`, `type` en query |
| Lazy media | grids de media | cover lazy; no `preload=metadata` masivo |
| Stream/audio al play | players web | stems solo en detail + play (ya casi) |
| Storage monofile OK hasta cientos | catálogos CMS/R2 | paginar **respuesta**; leer JSON en edge (ola 2: D1 si crece) |

No inventar citas de docs concretas; patrón de producto verificado en conversación previa + arquitectura stock.

---

## Contratos API (públicos)

### A) Lista — `GET /api/library`

**Query**

| Param | Default | Notas |
|-------|---------|--------|
| `limit` | `24` | clamp 1–48 |
| `cursor` | omit | opaco base64url de `{ offset }` o slug del último ítem; v1 = offset estable sobre lista filtrada ordenada |
| `mood` | — | match en moods∪tags (case-insensitive) |
| `type` | `all` | `all` \| `stems` (misma semántica que UI actual) |
| `view` | `card` | solo `card` en list |

**Response 200**

```json
{
  "ok": true,
  "source": "r2",
  "view": "card",
  "items": [ /* LibraryCard */ ],
  "moods": ["…"],
  "count": 123,
  "nextCursor": "…|null",
  "hasMore": true
}
```

**LibraryCard** (sin stems, sin notes, sin description larga):

```ts
{
  id, slug, title, kind, aspect,
  cover: string | null,
  hasVideo: boolean,   // no URL de vídeo en list (o videoUrl opcional solo si se fuerza hover; default false URL)
  hasStems: boolean,
  moods: string[],     // cap ~8
  tags: string[],      // cap ~8 o vacío si se unifica en moods en UI
  availability, licenseEnabled, updatedAt?, publishedAt?
}
```

**Regla media list:** no incluir `video` ni `stems[]` en card. Grid usa `cover` + placeholder. Play en thumb: si `hasStems` → fetch detail primero; si solo vídeo → detail o endpoint mínimo con `video`.

### B) Detalle — `GET /api/library?slug=<slug>` **o** path sibling

Preferido (menos archivos Pages): **mismo handler**

`GET /api/library?slug=despertar`

**Response**

```json
{
  "ok": true,
  "source": "r2",
  "view": "detail",
  "item": { /* full sanitize + stripCleanSrc — actual shape */ },
  "moods": []  // opcional omit
}
```

404: `{ ok: false, error: "not_found" }` si slug ausente o off_catalog.

Reutilizar `findCatalogItem` + `sanitizeCatalogItem` + `stripCleanSrcFromItem`.

### C) Compat

- **No** devolver el shape antiguo “items[] full” como default.
- Si hace falta un periodo de transición: `?legacy=1` **no** se expone en prod; solo tests internos si se necesitan. Preferible: un solo contrato nuevo + cliente actualizado en el mismo deploy.

### D) Cache

| Endpoint | Cache-Control |
|----------|----------------|
| list | `private, max-age=0, must-revalidate` (igual que hoy; admin publica y debe verse ya) |
| detail | igual |

(Ola 2 opcional: ETag sobre `updatedAt` del catálogo.)

---

## Touch map (símbolos verificados)

### Punto 1: API list/detail + page

| Archivo | Símbolo | Rol |
|---------|---------|-----|
| `functions/api/library.ts` | `onRequest` · L28 | Branch list vs `slug`; query parse; page |
| `functions/lib/catalog-sanitize.ts` | `sanitizeCatalogItems` · L109 | Full items (detail / admin) |
| `functions/lib/catalog-sanitize.ts` | `sanitizeCatalogItem` · L49 | Detail single |
| `functions/lib/catalog-sanitize.ts` | `stripCleanSrcFromItem` · L122 | Público detail |
| `functions/lib/catalog-sanitize.ts` | `(nuevo) toLibraryCard` | Proyectar card sin stems/video/notes |
| `functions/lib/library-catalog.ts` | `readCatalog` · L125 | SSoT R2 |
| `functions/lib/library-catalog.ts` | `findCatalogItem` · L167 | Detail por slug |
| `functions/lib/library-catalog.ts` | `resolveMoodsVocabulary` · L91 | moods list (solo primera página o siempre) |
| `functions/lib/(nuevo) library-query.ts` | `(nuevo) filterAndPage` | mood/type + cursor + limit |

### Punto 2: Cliente — fetch por páginas + detail cache

| Archivo | Símbolo | Rol |
|---------|---------|-----|
| `src/lib/library-browser/bind.ts` | `bindLibraryBrowser` · L35 | Orquestación |
| `src/lib/library-browser/bind.ts` | `catalogReady` · L56 | Loading gate |
| `src/lib/library-browser/bind.ts` | `renderGrid` · L614 | Pintar cards; append mode |
| `src/lib/library-browser/bind.ts` | fetch `/api/library` · ~L1385 | → list con cursor/filters |
| `src/lib/library-browser/bind.ts` | `openModal` · L824 | Asegurar detail (fetch slug si falta stems) |
| `src/lib/library-browser/bind.ts` | `playStems` · L401 | Tras detail en cache |
| `src/lib/library-browser/bind.ts` | deep-link `?p=` · ~L1419 | `GET ?slug=` + openModal sin full dump |
| `src/lib/library-browser/bind.ts` | `filtered` · L525 | Deja de ser filtro total en cliente; filtro = query server (cliente solo type/mood → refetch page 0) |

### Punto 3: Payload HTML mínimo + grid media

| Archivo | Símbolo | Rol |
|---------|---------|-----|
| `src/components/LibraryBrowser.astro` | `payload` · L114 | Solo `lang`, `labels` (sin `items` full o `items: []`) |
| `src/components/LibraryBrowser.astro` | `data-payload` · L149 | No embeber catálogo build |
| `src/pages/[lang]/biblioteca/index.astro` | `getLibraryItems` · L14 | Dejar de pasar items (o props vacíos) |
| `src/lib/library.ts` | `getLibraryItems` · L38 | Seed build solo fallback docs/admin; página no lo necesita |
| `src/lib/library-browser/bind.ts` | template vídeo en `renderGrid` · ~L631 | Card: `img` cover lazy o ph; **sin** `<video preload=metadata>` en grid masivo |
| `src/lib/library-browser/bind.ts` | play thumb vídeo | Crear/cargar video solo al play o en modal |

### Punto 4: Share / deep-link (sin romper)

| Archivo | Símbolo | Rol |
|---------|---------|-----|
| `src/lib/share.ts` | `libraryItemSharePath` · L81 | Sin cambio de URL pública |
| `src/lib/library-browser/bind.ts` | `shareLibraryItem` · L793 | Sigue con slug |
| deep-link open | ver Punto 2 | detail-first |

### Punto 5: QA + ops

| Archivo | Símbolo | Rol |
|---------|---------|-----|
| `scripts/qa-library.mjs` | `main` | Esperar list page; assert no dump stems en primera respuesta list; play sigue OK |
| `docs/estado.md` | § UX biblioteca | Nota contrato list/detail |
| `AGENTS.md` | tabla archivos | Fila API biblioteca list/detail |

### NO TOCAR (explícito)

| Archivo | Por qué |
|---------|---------|
| `functions/admin/items.ts` | Lista admin completa OK |
| `src/lib/stem-transport.ts` | Contrato de play intacto |
| `src/lib/license-quote.ts` + quote API | Licencias |
| `functions/api/media/[[path]].ts` | Serving media |
| `functions/lib/admin-auth.ts` | Auth |
| Form modal HTML de licencias en `LibraryBrowser.astro` | Solo datos del item |

---

## Arquitectura de cliente (estado)

```
items: LibraryCard[]          // acumulado de páginas
detailCache: Map<slug, Item>  // full
nextCursor: string | null
moodFilter / typeFilter → al cambiar: reset items + cursor + fetch page 0
loadMore() → append si hasMore
openModal / playStems → ensureDetail(slug)
```

**UX load more:** botón “Cargar más” (más predecible y barato de a11y que infinite scroll puro). Opcional: IntersectionObserver en el botón (ola 2).

**Concurrencia:** `listFetchGen` (igual que `filtersPaintGen`) para no pisar respuestas viejas al cambiar filtro rápido.

**Fallback red:** si list falla, grid vacío + mensaje (no rescatar demos del build con stems). Semilla `library.json` del build **fuera** del payload público.

---

## Storage realism (industrial honesto)

| Escala | Estrategia |
|--------|------------|
| **Ahora–cientos** | Un `catalog/library.json` en R2; **paginar en Function** tras `readCatalog` + filter. Suficiente y simple. |
| **Miles+** (ola 2) | Índice D1 o JSON shard por mood; media R2 igual. **No** en este plan. |

No fingir D1 sin necesidad.

---

## Failure modes

| Fallo | Comportamiento |
|-------|----------------|
| R2 vacío / sin bucket | list `items:[]`, `hasMore:false` (como hoy) |
| slug not found | detail 404; deep-link no abre modal |
| list mid-scroll error | toast/status; no borrar items ya cargados |
| detail falla al play | mensaje stems; no crash |
| Admin publica | list `no-store` → siguiente refresh ve cambio |
| Race filtro A→B | gen descarta respuesta A |

---

## Decision log

| Decisión | Elegido | Alternativa rechazada |
|----------|---------|------------------------|
| Paginación | cursor + limit 24 | offset público frágil; full dump |
| Shape list | cards sin stems/video | list full + virtualize only (media sigue pesada) |
| Detail route | `?slug=` en mismo file | nuevo `functions/api/library/[slug].ts` (más routing CF) |
| Grid video | poster only | preload metadata N (actual, no escala) |
| Filtros | server | client full array |
| Load more | botón | infinite only (a11y/harder) |
| Storage | R2 JSON + page en edge | D1 ahora (overkill) |

---

## Execution blocks (orden)

### Block 1 — Server: proyectar + filtrar + paginar  
**Punto 1**

1. Añadir `toLibraryCard(item)` en `catalog-sanitize.ts` (o módulo query).
2. Añadir `filterAndPage(items, { mood, type, limit, cursor })` en `functions/lib/library-query.ts`.
3. Reescribir `functions/api/library.ts`:
   - `slug` → detail
   - else → list card + moods + nextCursor
4. Clamp limit; invalid cursor → page 0.

**Verify parcial:** curl list sin `stems` en items; curl `?slug=` con stems; mood filtra.

### Block 2 — Cliente list + load more + filtros server  
**Punto 2 (parcial)**

1. Estado `items`, `nextCursor`, `hasMore`, `listFetchGen`.
2. `fetchList({ reset })` → `/api/library?limit=24&cursor=&mood=&type=`.
3. Chips mood/type: reset + refetch (no `filtered()` local sobre full).
4. Botón load more en DOM (i18n es/en/fr labels).
5. `renderGrid`: repaint full del acumulado (v1 OK hasta cientos) **o** append-only si más simple sin re-bind bugs — preferir **repaint acumulado** con re-bind handlers (hoy ya re-render completo).

### Block 3 — Detail cache + openModal + play  
**Punto 2**

1. `ensureDetail(slug): Promise<Item | null>` → cache o `GET ?slug=`.
2. `openModal`: await ensureDetail antes de mixer/stems.
3. Thumb play stems: ensureDetail → playStems.
4. Deep-link `?p=`: ensureDetail + openModal; **no** esperar full catalog.

### Block 4 — Payload + grid media policy  
**Punto 3**

1. `LibraryBrowser.astro`: payload sin items del build.
2. `biblioteca/index.astro`: no pasar catálogo build (props mínimas).
3. Cards: cover `loading=lazy`; sin video masivo; play vídeo crea elemento o usa modal.

### Block 5 — QA + docs  
**Punto 5**

1. Actualizar `qa-library.mjs` a contrato nuevo.
2. Notas en `docs/estado.md` + fila AGENTS.
3. `npm run build` en `nimpo-studio/`.

### Block 6 — Deploy + smoke prod (post-aprobación)

1. commit + push main (Pages).
2. Smoke: Network en /es/biblioteca/ — 1 list page; abrir obra — 1 detail; play stems OK; load more si count>24.

---

## Integration map

```
Admin publish → R2 catalog/library.json
                     ↓
         GET /api/library (list cards)
                     ↓
              bind items[] + UI grid
                     ↓
         open / play → GET ?slug= → detailCache
                     ↓
              StemTransport.load(stems)
                     ↓
         license form → POST /api/quote (sin cambio)
```

Share URL `/[lang]/biblioteca/?p=slug` **estable**.

---

## Risks

| Risk | Mitigación |
|------|------------|
| Regresión play stems | ensureDetail antes de play; QA script |
| Flash empty | loading `…` ya existe (`catalogReady`) |
| Filtro server ≠ client viejo | misma regla moods∪tags |
| Cursor inestable si reordenan catálogo | orden SSoT = array R2; cursor offset en lista **filtrada**; acceptable v1 |
| Admin vs public shape confusión | admin sigue full; public solo card/detail |
| i18n “Cargar más” | 3 keys nuevas en translations |

---

## Verify checklist (DoD)

No “tests verdes” como cierre. Checks:

1. **List:** `GET /api/library?limit=2` → `items.length≤2`, **ningún** item con `stems` array, sin campo `video` (o null ausente), `hasMore` coherente con `count`.
2. **Detail:** `GET /api/library?slug=<existente>` → `item.stems` si aplica; strip cleanSrc.
3. **404:** slug inventado → not_found.
4. **UI:** al entrar, Network = list (no N× mp4 metadata de todas las obras).
5. **Play:** thumb ▶ stems sigue cargando y suena.
6. **Modal licencia:** form y cotizador OK.
7. **Deep-link:** `/es/biblioteca/?p=<slug>` abre modal con datos.
8. **Filtro mood:** cambia list; count acorde.
9. **Load more:** si hay >limit obras (o limit=1 en dev), append sin duplicar ids.
10. **Build:** `npm run build` OK.
11. **Prod smoke** tras push.

---

## Ola 2 (aplazada, explícita)

- Virtualización DOM si >150–200 cards.
- Infinite scroll + sentinel.
- D1 / índice para miles de obras.
- ETag / CDN cache list con purge en publish.
- ProductsBrowser mismo patrón.
- Thumbnails derivados (no master frame).

---

## Audit (P2 embebido)

| Sev | Finding | Acción |
|-----|---------|--------|
| — | Touch map anclado en archivos leídos | OK |
| HIGH | `getLibraryItems` seed en build: si se deja en payload, se reintroduce dump | Block 4 obligatorio |
| MED | Orden catálogo = unshift admin; cursor offset se desplaza si publican mid-scroll | documentado; aceptar v1 |
| — | Industry genérica sin URL de paper | accepted: patrón stock, no paper |

**Audit passed (1 accepted risk: cursor/offset mid-publish).**

---

## STOP

Plan listo en `docs/plans/2026-07-26-biblioteca-catalog-scale.md`.

**¿Aplico el plan?** (Block 1→5 en orden; deploy al cerrar si confirmas push.)
