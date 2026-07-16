# Estado del proyecto — Nimpo 3D Studio

Última actualización: julio 2026  
Documento de referencia para saber **qué está hecho**, **qué falta** y **qué depende de ti**.

---

## Resumen en una línea

**Fase 1 en producción** (web estática + música + catálogo). **Contenido real y tienda pendientes.**

---

## Hecho ✅

### Infra y deploy
- [x] Dominio `nimpo3dstudio.com` en Cloudflare (DNS)
- [ ] **Migración Pages** — checklist en `SETUP-PAGES.md` (usuario, una vez)
- [x] Deploy automático (objetivo): push a `main` → Cloudflare Pages build
- [x] Email Routing: `contacto@nimpo3dstudio.com` → Gmail personal
- [x] Repo: https://github.com/mutoit/nimpoStudio.git

### Web (fase 1)
- [x] Home — landing con destacados y CTAs
- [x] **Música** — `/musica` + ficha `/musica/[slug]` (presentación + tracklist + preview player)
- [x] Badge destacado **«Composiciones originales MIDI»** en `/musica` y fichas (`MusicMidiBadge.astro`)
- [x] **Catálogo** — `/catalogo` + ficha producto (software, packs, presets, licencias)
- [x] **Feed Novedades** — panel lateral derecho (home, pantalla ≥1500px); datos en `updates.json`
- [x] Cabecera — badge «en construcción» con brillo
- [x] Sobre, Contacto, Privacidad, Términos (esqueleto legal)
- [x] Diseño carbon + dorado, nav, footer
- [x] Utilidades layout — `prose`, `section--full` (`src/styles/layout.css`)
- [x] Portadas SVG de ejemplo (productos y música)
- [x] Email contacto activo (`emailStatus: "active"`)

### Código preparado para crecer
- [x] `src/data/products.json` — catálogo digital
- [x] `src/data/music.json` — lanzamientos musicales
- [x] `src/data/updates.json` — feed de novedades (editar para publicar avisos)
- [x] `public/previews/music/` — carpeta para MP3 de preview
- [x] `public/images/products/` y `public/images/music/` — portadas
- [x] `functions/README.md` — rutas API futuras documentadas
- [x] `docs/configuracion.md` — DNS, Cloudflare, deploy
- [x] `docs/analytics-publi.md` — estrategia analíticas, SEO, buscadores

---

## Pendiente — depende de ti (contenido) 📝

| Tarea | Archivo / carpeta | Notas |
|-------|-------------------|--------|
| Tus composiciones reales | `src/data/music.json` | Sustituir ejemplos (Nocturna, Pulso…) |
| MP3 de preview | `public/previews/music/*.mp3` | 60–90 s por tema |
| Portadas música | `public/images/music/` | JPG/PNG o SVG |
| Productos reales (software, packs) | `src/data/products.json` | Precios, descripciones, licencias |
| Portadas productos | `public/images/products/` | |
| Logo definitivo | `public/` + Header | Hoy solo texto + punto dorado |
| Textos legales finales | `src/content/legal/` | Antes de activar ventas |
| Redes sociales | `src/config/site.json` → `social` | Instagram vacío |
| Marcar ejemplos como borrador | `status: "draft"` en JSON | Opcional hasta tener contenido |
| Novedades / avisos | `src/data/updates.json` | Una entrada real publicada (web en construcción) |

---

## Pendiente — desarrollo (cuando tengas 1 producto listo) 🔧

### Fase 2 — Venta simple (sin cuentas)
- [ ] Stripe (modo test → live)
- [ ] Cloudflare R2 (archivos digitales)
- [ ] Cloudflare D1 (pedidos)
- [ ] `functions/`: checkout, webhook Stripe, enlace descarga firmado
- [ ] Email de confirmación de compra
- [ ] Botón "Comprar" en fichas

### Fase 2b — Área de cliente
- [ ] `/cuenta` — "Mis compras"
- [ ] Magic link por email (sin contraseña)
- [ ] Re-descarga de compras

### Fase 3 — Licencias avanzadas
- [ ] Licencias software con clave/activación (si aplica)
- [ ] Licencias exclusivas → flujo manual (contacto + contrato)
- [ ] Integración Keygen u otro (solo si hace falta DRM)

### Fase 4 — Admin (opcional)
- [ ] Panel o CMS para productos sin tocar JSON

### Opcional — feed
- [ ] Mini reproductor de preview en el panel Novedades (cuando haya MP3)

### Analíticas, publicidad y SEO
- [x] Módulo `src/lib/analytics/` + banner cookies RGPD
- [x] Sitemap, robots.txt, JSON-LD, OG/Twitter
- [x] **Cloudflare Web Analytics** — activo en panel (dominio añadido; auto-inject; no usar `PUBLIC_CF_WEB_ANALYTICS_TOKEN`)
- [ ] **Tú:** Search Console — `PUBLIC_GSC_VERIFICATION` + enviar sitemap — ver `docs/analytics-publi.md`
- [ ] **Tú:** Bing Webmaster — `PUBLIC_BING_VERIFICATION` (recomendado)
- [ ] **Tú:** GA4 / Meta Pixel — `PUBLIC_GA_*` / `PUBLIC_META_*` cuando quieras

---

## No hacer aún ⏸️

- Stripe live sin productos/precios definidos
- R2 con archivos reales (coste almacenamiento)
- Cuentas de usuario antes de primera venta
- Claves de licencia antes de tener software activable
- Perfil artista / Twitch (otro proyecto, otro repo)

---

## URLs producción

| Qué | URL |
|-----|-----|
| Home | https://www.nimpo3dstudio.com |
| Música | https://www.nimpo3dstudio.com/musica |
| Catálogo | https://www.nimpo3dstudio.com/catalogo |
| Contacto | https://www.nimpo3dstudio.com/contacto |

---

## Archivos clave

| Archivo | Para qué |
|---------|----------|
| `docs/estado.md` | **Este doc** — tareas y estado |
| `docs/configuracion.md` | Infra Cloudflare, DNS, email |
| `docs/analytics-publi.md` | Analíticas, publicidad, permisos token |
| `src/config/site.json` | Marca, email, redes |
| `src/data/music.json` | Lanzamientos musicales |
| `src/data/products.json` | Catálogo digital |
| `src/data/updates.json` | Feed de novedades |
| `src/styles/layout.css` | Anchos (prose, section--full, panel feed) |
| `README.md` | Cómo desarrollar y añadir productos |

---

## Próximo paso recomendado

1. **Tú:** Search Console — verificar dominio + enviar sitemap (`docs/analytics-publi.md`)  
2. **Tú:** primer lanzamiento musical real en `music.json` + 1–2 MP3 preview  
3. **Tú:** decidir qué va en Catálogo (software) vs Música  
4. **Dev (cuando digas):** infra "listo para rellenar" — esquema D1, `/cuenta` placeholder, campos precio en JSON  
5. **Dev (cuando tengas producto + precio):** fase 2 Stripe + R2

---

## Historial reciente (commits relevantes)

- Badge «Composiciones originales MIDI» en sección música (`d90f2ba`)
- Analíticas, SEO, consentimiento RGPD + doc estrategia (`b9bd962`)
- Feed Novedades + `updates.json` (panel lateral, sin romper container)
- Catálogo fase 1, email contacto, sección Música (tracklist, previews)