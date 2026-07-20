# Estado del proyecto — Nimpo 3D Studio

Última actualización: 2026-07-20  
Documento de handoff: **qué está hecho**, **qué falta** y **qué depende de ti**.

---

## Resumen en una línea

**Biblioteca de licencias en producción** (preview + cotizador + admin un clic → R2).  
**Aún no hay checkout/pago automático.** Contenido real y tienda (Stripe) pendientes.

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
- [x] `GET /api/library` — front hidrata desde API (fallback: `src/data/library.json` del build)
- [x] Admin **un clic**: `/admin/biblioteca/` → **Publicar en la web** → `POST /admin/publish`  
  (sube media a R2 + upsert catálogo; **sin copiar JSON ni redeploy**)
- [x] Login admin cookie httpOnly; rate limit login/publish; sin confiar JWT CF Access spoofable
- [x] Seed R2 hecho (`wrangler r2 object put … catalog/library.json --remote`)
- [x] Docs precios: `docs/licencias/TABLA-RAPIDA-PRECIOS.md`, plan `PLAN-BIBLIOTECA-Y-PRECIOS.md`
- [x] Admin: `docs/admin-acceso.md`

### Web base (fase 1, sigue viva)
- [x] Home, Sobre, Contacto, Privacidad, Términos
- [x] Música y catálogo digital (rutas existen; no son el foco del nav)
- [x] Feed Novedades (`updates.json`)
- [x] Diseño carbon + dorado
- [x] Analíticas first-party + banner cookies; CF Web Analytics; SEO (sitemap, robots, JSON-LD)

### Datos / código de apoyo
- [x] `src/data/library.json` — **semilla / fallback** (no es la fuente de verdad en prod)
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
| `docs/licencias/` | Precios, plan, plantillas |
| `docs/configuracion.md` | DNS, Cloudflare, email |
| `docs/analytics-publi.md` | SEO / analíticas |
| `DEPLOY.md` / `SETUP-PAGES.md` | Deploy y Pages |
| `functions/` | API + admin + middleware |
| `src/lib/library-browser/bind.ts` | UI biblioteca + hydrate API |
| `src/lib/license-quote.ts` | Cálculo precios (front) |
| `src/data/library.json` | Semilla / fallback (no fuente de verdad prod) |
| `wrangler.toml` | R2 binding + `LIBRARY_PUBLIC_BASE` |

---

## Próximo paso recomendado

1. **Tú:** smoke — 1 publish real desde admin → recargar biblioteca  
2. **Tú:** quitar demos / marcar provisional falso en obras reales  
3. **Tú:** Search Console + sitemap  
4. **Dev (cuando digas):** badges availability + checkout Stripe cuando haya 1 master listo para vender  

---

## Historial reciente (producto)

- **Hardening seguridad (ola 7 puntos):** XSS catálogo, allowlist subidas, sesión ≠ password, cuotas, upload 410, quote anti-spam, Access/Turnstile docs
- Biblioteca densa + stems + cotizador de licencias (precios conservadores)
- Admin cookie + rate limits; endurecimiento auth (sin JWT spoof)
- R2 `nimpo-library` + **Publicar en la web** (media + catálogo vivo)
- `GET /api/library` — front sin redeploy al publicar
- Seek stems con Web Audio (`StemTransport`); previews MP3
- Nav centrada en biblioteca (música/catálogo fuera del menú principal)
- Fase 1 web estática, analytics, SEO, email contacto (previo)
