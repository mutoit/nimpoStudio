# Estado del proyecto — Nimpo 3D Studio

Última actualización: 2026-07-21  
Documento de handoff: **qué está hecho**, **qué falta** y **qué depende de ti**.

---

## Resumen en una línea

**Biblioteca de licencias en producción** (preview + cotizador + admin un clic → R2).  
Catálogo vivo en R2 (no demos del build en pantalla). **Sin checkout/pago automático** aún.

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
- [x] Precios conservadores en `src/lib/license-quote.ts` + mirror `functions/lib/license-quote.ts`
- [x] `POST /api/quote` — cotización + email estudio (rate limit, CORS restringido)
- [x] Catálogo **vivo** en R2: `catalog/library.json`
- [x] `GET /api/library` — fuente de verdad en prod; **no se pinta la semilla del build** (evita flash de ítems borrados)
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
- [x] Feed Novedades (`updates.json`)
- [x] Diseño carbon + dorado
- [x] Analíticas first-party + banner cookies; CF Web Analytics; SEO (sitemap, robots, JSON-LD)

### Datos / código de apoyo
- [x] `src/data/library.json` — semilla de **build** (fallback solo si falla `/api/library`; no se muestra al cargar)
- [x] `src/data/music.json`, `products.json`, `updates.json`
- [x] Previews en `public/previews/music/` (MP3 demo Deep in the forest, etc.)
- [x] `functions/`: middleware, session, publish, upload, library, quote, track

---

## Flujo diario (publicar obra)

1. Login → https://www.nimpo3dstudio.com/admin/biblioteca/  
2. Canal vídeo o stems + título + archivos  
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
- [ ] QA visual mobile modal full-screen
- [ ] Bloque **testimonios / valoraciones** (cuando haya casos reales; ver ESTRATEGIA-LANZAMIENTO)

### Fase 2 — Venta / entrega automática
- [ ] Stripe (test → live)
- [ ] D1 pedidos (o equivalente)
- [ ] Checkout + webhook + enlace descarga **masters** (R2 privado o firmado; distinto de previews públicos)
- [ ] Email confirmación compra
- [ ] Botón “Comprar / pagar” en flujo licencia (hoy: cotizar + contacto)

### Fase 2b — Área cliente
- [ ] `/cuenta` — mis compras, magic link, re-descarga

### Limpieza infra
- [ ] Worker legacy `nimpostudioweb` — desconectar Git / borrar si ya no se usa
- [ ] Placeholders en catálogo R2 (Nocturna, Pulso, Umbral) → sustituir o `off_catalog`

---

## No hacer aún ⏸️

- Stripe live sin precios y 1 obra lista para entregar
- Subir **masters** a la URL pública r2.dev (solo previews)
- Cuentas de usuario antes de primera venta real
- DRM / Keygen sin software activable
- Volver al flujo “copiar JSON a mano” (obsoleto)

---

## URLs producción

| Qué | URL |
|-----|-----|
| Home | https://www.nimpo3dstudio.com |
| Biblioteca | https://www.nimpo3dstudio.com/es/biblioteca/ |
| Admin publicar | https://www.nimpo3dstudio.com/admin/biblioteca/ |
| API catálogo | https://www.nimpo3dstudio.com/api/library |
| Contacto | https://www.nimpo3dstudio.com/es/contacto/ |
| Música (secundaria) | https://www.nimpo3dstudio.com/es/musica/ |

---

## Archivos y docs clave

| Ruta | Para qué |
|------|----------|
| **`docs/estado.md`** | **Este handoff** |
| `docs/admin-acceso.md` | Login + publish un clic + R2 |
| `docs/PUBLICIDAD-ORGANICA-SEO.md` | Plan gratis: SEO, Search Console, keywords |
| `docs/licencias/` | Precios, plan, plantillas |
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

## Historial reciente (producto)

- Biblioteca: **live-first** (sin flash de demos borrados); moods globales R2; ratio 9:16 quitado de thumbs  
- Admin: moods UI simple (dorado = seleccionado); re-bake ruido desde cleanSrc al guardar; empresa en quote  
- Precios 2026 + exclusiva fuerte / buyout alto; doc founder/testimonios  
- Analytics: **opt-out estudio** (`?nimpo_no_stats=1`); glosario visitas vs vistas en analytics-publi  
- Hardening, stems Web Audio, admin publish R2, cotizador licencias
