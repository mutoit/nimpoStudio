# Estado del proyecto — Nimpo 3D Studio

Última actualización: 2026-08-04 (Stripe live + tax_code + checkout OK)  
Documento de handoff: **qué está hecho**, **qué falta** y **qué depende de ti**.

---

## Resumen en una línea

**Biblioteca + catálogo software en producción** (R2, admin, cotizador, checkout Stripe **live**).  
**Cobro API listo:** secret live + tax_code productos; falta **smoke humano** (pago real → mail → cuenta) — `docs/commerce/TAREAS-VENTAS-PRIORIDAD.md`.

---

## Hecho ✅

### Infra y deploy
- [x] Dominio `nimpo3dstudio.com` en Cloudflare (DNS)
- [x] Pages `nimpo-studio` — `www` + apex; deploy Git / `npm run deploy`
- [x] Email Routing: `contacto@` → Gmail
- [x] Worker mail `nimpo-mail` (presupuesto licencias → email estudio)
- [x] Repo: https://github.com/mutoit/nimpoStudio.git
- [x] **R2** bucket `nimpo-library` + binding `LIBRARY_BUCKET`
- [x] Público media: `LIBRARY_PUBLIC_BASE` = `https://pub-c5f9444f68c84064be0b94ebfd66c91c.r2.dev`
- [x] Secret `ADMIN_LIBRARY_SECRET` (login) + opcional `ADMIN_SESSION_SECRET` (firma cookie)
- [x] Hardening: allowlist MIME/ext, cuotas publish, XSS catálogo, quote sin auto-mail cliente, Turnstile opcional, rate limit KV-ready

### Producto principal — Biblioteca + licencias
- [x] Nav pública: **Biblioteca · Sobre · Contacto** (música/catálogo fuera del menú principal)
- [x] `/es/biblioteca/` — grid, miniaturas, play, stems (mute sin reiniciar), seek vía `StemTransport` (Web Audio; Pages no hace Range seek fiable en WAV)
- [x] Modal detalle + formulario de licencia (usage, plazos, extras, precio)
- [x] **UX formulario (desktop + móvil):** tipo de uso y plazo como desplegables densos (filas + **etiqueta dorada** de precio); extras en lista compacta título|precio; móvil con densidades y menú hamburguesa
- [x] **Mixer stems:** clic normal = on/off capa; **Ctrl+clic** (Mac: ⌘+clic) = solo esa capa / otra vez = todas; nota bajo el mixer. Mismo patrón en `StemPlayer` (páginas música)
- [x] Precios conservadores en `src/lib/license-quote.ts` + mirror `functions/lib/license-quote.ts`
- [x] `POST /api/quote` — cotización + email estudio (rate limit, CORS restringido)
- [x] Catálogo **vivo** en R2: `catalog/library.json`
- [x] `GET /api/library` — list **card paginado** (`limit`/`cursor`/`mood`/`type`) + detail `?slug=`; stems solo en detail; grid sin N× vídeo preload
- [x] `catalog/moods.json` — vocabulario global de moods (admin + filtros biblioteca)
- [x] Admin **un clic**: `/admin/biblioteca/` → **Publicar en la web** → `POST /admin/publish`  
  (media R2 + catálogo; re-bake ruido desde cleanSrc al cambiar slider; semáforos subida)
- [x] Login admin cookie httpOnly; rate limit login/publish
- [x] Precios canon 2026 + founder plan: `docs/licencias/` (TABLA-RAPIDA, ESTRATEGIA-LANZAMIENTO, etc.)
- [x] Admin: `docs/admin-acceso.md`
- [x] Opt-out stats estudio: `?nimpo_no_stats=1` — ver `docs/analytics-publi.md`

### Web base (fase 1, sigue viva)
- [x] Home, Sobre, Contacto, Privacidad, Términos
- [x] Música y catálogo digital (rutas existen; no son el foco del nav)
- [x] Feed Novedades (`updates.json` / R2) — home · admin biblioteca
- [x] Feed productos (`catalog/product-updates.json` / R2) — admin productos + rail **derecha** en catálogo (alineado con ficha, no con hero) · scope estricto por producto (`?p=` / `?slug=`) · texto 2500 + listas lite
- [x] Newsletter novedades: abono + confirm email + aviso al publicar feed home (opt-in)
- [x] Admin `/admin/abonados/` — lista abonados (filtro/baja/borrar/CSV) + clientes compra (CSV)
- [x] Diseño carbon + dorado
- [x] Analíticas first-party + banner cookies; CF Web Analytics; SEO (sitemap, robots, JSON-LD)

### Datos / código de apoyo
- [x] `src/data/library.json` — semilla de build (no se embebe en payload público; catálogo = R2 vía API)
- [x] `src/data/music.json`, `products.json`, `updates.json`
- [x] Previews en `public/previews/music/` (MP3 demo Deep in the forest, etc.)
- [x] `functions/`: middleware, session, publish, upload, library, quote, track

---

## Flujo diario (publicar obra)

1. Login → https://www.nimpo3dstudio.com/admin/biblioteca/  
2. Form unificado (vídeo y/o stems + master) + título + archivos  
3. **Publicar en la web**  
4. Abrir `/es/biblioteca/` y **recargar**  

No editar `library.json` a mano salvo semilla local o fallback.

---

## Pendiente — depende de ti 📝

| Tarea | Dónde / notas |
|-------|----------------|
| Obras reales (no solo demos/placeholders) | Admin publish o seed R2; quitar `provisional` |
| Portadas / covers buenas | Subida admin o `public/images/` |
| Logo definitivo | Header / `public/` |
| Textos legales finales | `src/content/legal/` — antes de cobros |
| Redes | `src/config/site.json` → `social` |
| Search Console / Bing | vars `PUBLIC_GSC_*` / `PUBLIC_BING_*` — `docs/analytics-publi.md` |
| GA4 / Meta (opcional) | vars `PUBLIC_GA_*` / `PUBLIC_META_*` |
| Cloudflare Access en `/admin*` | **recomendado**; `scripts/setup-access-admin.ps1 -Email "..."` |
| `ADMIN_SESSION_SECRET` largo en Pages | Si aún no; rotar tras ponerlo (re-login) |
| Turnstile (anti-bots quote) | `TURNSTILE_SECRET_KEY` + `PUBLIC_TURNSTILE_SITE_KEY` |
| KV `RATE_LIMIT_KV` multi-edge | Opcional; ver `wrangler.toml` comentado |
| Smoke: publish real → biblioteca | Confirmar end-to-end |
| **Lanzamiento** (con catálogo sólido) | `docs/licencias/ESTRATEGIA-LANZAMIENTO.md` — founder 5–10 clientes, case studies |
| **Testimonios + valoración** de obras | Pedir post-venta; UI en web cuando haya 2–3 reales |

---

## Pendiente — desarrollo 🔧

### Casi listo / pulido producto
- [ ] Estados catálogo post-exclusiva: `available` / `sold_exclusive` / `off_catalog` + badges UI
- [ ] Extra “retirar del catálogo” en formulario de exclusiva
- [ ] Plantillas legales `docs/licencias/plantilla-*.md` alineadas a precios actuales
- [ ] Email cliente con desglose (hoy prioriza email al estudio)
- [x] Ruido de preview incrustado al publicar (admin); no slider público
- [x] Proxy `/api/media/*` same-origin (CORS stems Web Audio)
- [x] Moods/tags personalizados en admin
- [x] UX móvil modal/formulario (densidad, desplegables, safe-area, hamburguesa) — re-QA en dispositivo real si hace falta
- [ ] Bloque **testimonios / valoraciones** (cuando haya casos reales; ver ESTRATEGIA-LANZAMIENTO)

### Fase A–C hub productos / commerce (2026-07-28) — hecha
- [x] Schema producto: `demo` + `pricing[]` + `version` + `fullKey` + `stripePriceId`
- [x] Admin productos: demo file, full build privado, Stripe price
- [x] GET `/api/products?slug=` (sin `full/` en público)
- [x] POST `/api/feedback`
- [x] ProductsBrowser: Demo / Checkout / Feedback
- [x] POST `/api/checkout` (Stripe Session)
- [x] POST `/api/webhooks/stripe` → order + license key + mail
- [x] GET/POST `/api/download` (token firmado; `/full/` bloqueado en media)
- [x] Commerce store R2 `catalog/commerce/*` (D1 schema opcional en migrations/)
- [x] `/es/cuenta/` magic link + re-descarga
- [x] POST `/api/license/activate` (seats + machineId) — **API apex** `https://nimpo3dstudio.com` (sin www; 405 = POST perdido)
- [x] Admin `/admin/pedidos/` listar / revocar / reenviar / **Emitir Founder** (`issue`, cualquier producto software)
- [x] Nav **Mi cuenta** + `/es/cuenta/` magic (key + re-descarga)
- [x] Admin `/admin/abonados/` abonados newsletter + vista clientes

### Admin productos — estados / precios / media (2026-08)
- [x] **Estado** (`status`): `published` | `beta` | `demo` | `coming-soon` | `draft`  
  - **No es categoría** (categoría = plugin/app/tool/pack/other).  
  - **Beta / demo:** precio **opcional**; ficha pública sin forzar compra si no hay Stripe/link.
- [x] **Precio EUR** con céntimos (`9.90`, `step=0.01`); sanitize a 2 decimales.
- [x] **Media al editar:** por defecto **se conservan** imágenes/vídeo; archivos nuevos se **suman** (máx 8 imgs).  
  Solo se borra todo si marcas «Reemplazar todo el media».  
  Admin muestra miniaturas actuales al abrir la ficha.
- [x] **Dropzones** demo / full / imágenes / vídeo (arrastrar o clic); estado kept en R2 al editar.  
  Helper: `src/lib/admin/file-dropzone.ts`.
- [x] Ficha pública: botón **Probar beta** si `status=beta`, si no **Probar demo** (mismo control; hace falta demo URL).
- [x] Ficha pública: **Compartir** (Web Share / copiar deep-link `?p=slug`) — `src/lib/share.ts` `productSharePath`.
- [x] **Contadores de descargas** en `/admin/productos/`: demo / web / req (clic) + full (entrega con token). R2 `catalog/stats/downloads.json`.  
  UI: búsqueda, orden, scroll sticky, 12/página, columna Σ.  
  Código: `functions/lib/download-stats.ts`, `functions/api/track.ts`, `functions/api/download.ts`.
- [x] **Feed de productos** (aparte de Novedades home): select producto = cabecera · texto · img|vídeo · CRUD.  
  R2 `catalog/product-updates.json` · `GET|POST|DELETE /admin/product-feed` · `GET /api/product-updates[?slug=]`.  
  Público: `/es/catalogo/` — hero encima; shell `ProductsBrowser | rail` (tops alineados); feed solo del producto activo (`?p=` → `?slug=`). Layout en `catalogo/index.astro` (`.catalog-shell`), **no** `page-with-feed` 38rem.  
  Código: `functions/lib/product-updates-catalog.ts`, `functions/admin/product-feed.ts`, `src/lib/admin/product-feed.ts`, `src/lib/product-feed-format.ts`, `ProductUpdatesPanel.astro`, `ProductsBrowser.astro` (`setDeepLink`).
- Código: `functions/lib/products-catalog.ts`, `functions/admin/products.ts`, `src/pages/admin/productos.astro`, `src/components/ProductsBrowser.astro`

### Admin biblioteca — form unificado (2026-08)
- [x] **Un solo form** por obra: vídeo + stems + master (sin chips «Canal vídeo / stems»)
- [x] **Sin precios Stripe por obra** en UI (baremo global de licencias)
- [x] `kind` inferido: stems presentes → `stems`, si no → `video`
- Docs: `docs/admin-acceso.md` · `docs/commerce/POLITICA-MUSICA-BIBLIOTECA.md`

### Fase D — Clientes / tickets / recovery (plan 2026-07-30) — hecha
Canon: `docs/commerce/MAPA-VENTA-CLIENTES-SOPORTE.md`  
Plan: `docs/plans/2026-07-30-commerce-clientes-tickets-recovery.md`
- [x] WP1 `customers` + upsert en webhook Stripe
- [x] WP2 tickets store + feedback enums + badge CLIENT/PROSPECT
- [x] WP3 UI ProductsBrowser + i18n
- [x] WP4 nick en cuenta + session + activate
- [x] WP5 admin `/admin/tickets/`
- [x] WP6 recovery form + transfer email / rotate key / reset seats
- [x] WP7 docs mapa/estado

### 🔥 PRIORIDAD — Tus tareas de ventas
**Lista única (solo pendientes):** **`docs/commerce/TAREAS-VENTAS-PRIORIDAD.md`**

1. Smoke software Glass (Comprar → mail → cuenta → descarga)  
2. Smoke música (Pagar → cuenta → descarga)  

### Música biblioteca + pago (código + Stripe live listos)
**Política:** `docs/commerce/POLITICA-MUSICA-BIBLIOTECA.md`
- [x] Master/stems HQ · preview · baremo Stripe licencias/extras · checkout multi-línea · cuenta
- [x] Secret live + tax_code baremo (2026-08-04)
- [ ] → smoke humano en **TAREAS-VENTAS-PRIORIDAD.md** §1.1

### Software commerce (código + Stripe live listos)
**Mapa:** `docs/commerce/MAPA-VENTA-CLIENTES-SOPORTE.md`
- [x] Secrets Stripe live + webhook + Glass 9,90 € + cuenta live
- [x] Nimpo Glass published + `POST /api/checkout` → Checkout live OK
- [ ] → smoke humano 2.4 en **TAREAS-VENTAS-PRIORIDAD.md**

### Limpieza infra
- [ ] Worker legacy `nimpostudioweb` — desconectar Git / borrar si ya no se usa
- [ ] Placeholders en catálogo R2 (Nocturna, Pulso, Umbral) → sustituir o `off_catalog`

---

## No hacer aún ⏸️

- Stripe live sin precios y 1 obra lista para entregar
- Subir **masters/stems HQ** a URL pública (solo preview web) — ver política música
- Bake / re-masterizar stems de entrega
- Multi-stem player en biblioteca pública
- DRM / Keygen sin software activable
- Volver al flujo “copiar JSON a mano” (obsoleto)

---

## URLs producción

| Qué | URL |
|-----|-----|
| Home | https://www.nimpo3dstudio.com |
| Biblioteca | https://www.nimpo3dstudio.com/es/biblioteca/ |
| Admin publicar | https://www.nimpo3dstudio.com/admin/biblioteca/ |
| API catálogo | https://nimpo3dstudio.com/api/library (preferir sin www) |
| Activate app | `POST https://nimpo3dstudio.com/api/license/activate` |
| Contacto | https://www.nimpo3dstudio.com/es/contacto/ |
| Música (secundaria) | https://www.nimpo3dstudio.com/es/musica/ |

---

## Archivos y docs clave

| Ruta | Para qué |
|------|----------|
| **`docs/estado.md`** | **Este handoff** |
| `docs/admin-acceso.md` | Login + publish un clic + R2 |
| `docs/PUBLICIDAD-ORGANICA-SEO.md` | Plan gratis: SEO, Search Console, keywords |
| `docs/licencias/` | Precios, plan, plantillas (música) |
| `docs/commerce/MAPA-VENTA-CLIENTES-SOPORTE.md` | Canon software: venta, clientes, tickets, recovery |
| `docs/configuracion.md` | DNS, Cloudflare, email |
| `docs/analytics-publi.md` | SEO / analíticas |
| `DEPLOY.md` / `SETUP-PAGES.md` | Deploy y Pages |
| `functions/` | API + admin + middleware |
| `src/lib/library-browser/bind.ts` | UI biblioteca + hydrate API |
| `src/lib/license-quote.ts` | Cálculo precios (front) |
| `src/data/library.json` | Semilla build (fallback API down; no se pinta al inicio) |
| `catalog/moods.json` (R2) | Vocabulario global moods |
| `wrangler.toml` | R2 binding + `LIBRARY_PUBLIC_BASE` |
| `docs/analytics-publi.md` | Stats, opt-out, glosario visitas/vistas |

---

## Próximo paso recomendado

1. **Tú:** una vez por navegador de trabajo: `/?nimpo_no_stats=1` (no contarte en stats propias)  
2. **Tú:** Search Console + sitemap si aún no  
3. **Tú:** catálogo real + cuando haya masa, founder prices (`docs/licencias/ESTRATEGIA-LANZAMIENTO.md`)  
4. **Dev (cuando digas):** badges availability + checkout Stripe  

---

## UX biblioteca — stems y cotizador (referencia)

| Acción | Comportamiento |
|--------|----------------|
| Clic en checkbox de capa | Activa / silencia **esa** capa |
| **Ctrl+clic** (⌘+clic en Mac) en una capa | **Solo esa** capa (oculta las demás). Si todas estaban off, enciende solo esa |
| **Ctrl+clic** otra vez en la **misma** capa (estando en solo) | Vuelve a activar **todas** |
| Clic derecho | **No** se usa (menú contextual del SO) |
| Tipo de uso / plazo | Desplegable plegable; filas densas + badge dorado de precio (desktop y móvil) |
| Extras | Lista compacta título + precio dorado |

Código: `src/lib/library-browser/bind.ts` (mixer), `LibraryBrowser.astro` / `MusicLicense.astro` (form), `StemPlayer.astro`.

---

## Historial reciente (producto)

- Admin `/admin/abonados/` + newsletter (abono en **home** bajo hero; rail = solo feed; confirm + avisar al publicar)
- Catálogo ficha: **Compartir** + etiqueta **Probar beta** / **Probar demo** según status
- Admin productos: estados **beta/demo**, precios decimales, media append al editar (no wipe)
- Escala catálogo: dual-write monofile + `catalog/items/{slug}.json` + índice ligero; productos API paginada; media Range; requireAdmin compartido; precios SSoT JSON
- Biblioteca **escala industrial:** list card paginado + detail `?slug=` + load more; grid sin vídeo masivo; stems on demand  
- **UX:** móvil (nav hamburguesa, form denso); uso/plazo con badge dorado en desktop; **Ctrl+clic stems** + nota de ayuda  
- Biblioteca: **live-first** (sin flash de demos borrados); moods globales R2; ratio 9:16 quitado de thumbs  
- Admin: moods UI simple (dorado = seleccionado); re-bake ruido desde cleanSrc al guardar; empresa en quote  
- Precios 2026 + exclusiva fuerte / buyout alto; doc founder/testimonios  
- Analytics: **opt-out estudio** (`?nimpo_no_stats=1`); glosario visitas vs vistas en analytics-publi  
- Hardening, stems Web Audio, admin publish R2, cotizador licencias
