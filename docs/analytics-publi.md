# Analíticas, publicidad y SEO — Nimpo 3D Studio

Estrategia y guía de configuración. El código ya está montado; algunos servicios están **activos en panel** sin variables de entorno.

---

## Estado actual (julio 2026)

| Área | Estado | Notas |
|------|--------|-------|
| Cloudflare Web Analytics | **Activo** | Configurado en panel con dominio `nimpo3dstudio.com`; inyección automática en proxy |
| SEO técnico (sitemap, robots, meta) | **Hecho** | En producción |
| Google Search Console | **Pendiente** | Falta verificar propiedad y enviar sitemap |
| Bing Webmaster | **Pendiente** | Recomendado; puede importarse desde Google |
| GA4 | **Pendiente** | Código listo; falta `PUBLIC_GA_MEASUREMENT_ID` |
| Meta Pixel | **Opcional** | Solo si haces publicidad de pago |

---

## Variables de entorno (`PUBLIC_*`)

Configúralas en:

1. **Local:** `nimpo-studio/.env` (copia de `.env.example`)
2. **Producción:** Cloudflare → Workers → `nimpostudioweb` → **Settings** → **Variables** (Build)

| Variable | Dónde obtenerla | ¿Necesaria ahora? |
|----------|-----------------|-------------------|
| `PUBLIC_CF_WEB_ANALYTICS_TOKEN` | Panel Web Analytics → token beacon | **No** — ver sección CF abajo |
| `PUBLIC_GA_MEASUREMENT_ID` | GA4 → Admin → Data Streams → `G-XXXXXXXX` | Cuando quieras GA4 |
| `PUBLIC_GSC_VERIFICATION` | Search Console → Verificar → meta `content="..."` | **Sí** — para indexación Google |
| `PUBLIC_BING_VERIFICATION` | Bing Webmaster → meta `msvalidate.01` | Recomendado |
| `PUBLIC_META_PIXEL_ID` | Meta Events Manager → Pixel ID | Solo publicidad de pago |

Tras añadir variables: **nuevo deploy** (`git push` o redeploy manual).

---

## 1. Cloudflare Web Analytics ✅ (activo)

**Configuración aplicada:** Cloudflare → **Web Analytics** → Add a site → `nimpo3dstudio.com`.

Cloudflare inyecta el beacon **automáticamente en el proxy** (no hace falta API ni variable en el build). Los datos (visitas, Core Web Vitals, LCP, etc.) aparecen en el panel en 24–48 h.

### No hacer (evitar doble conteo)

- **No** poner `PUBLIC_CF_WEB_ANALYTICS_TOKEN` en `.env` ni en Build Variables mientras la inyección automática del panel esté activa.
- Nuestro código en `AnalyticsHead.astro` solo inyectaría el beacon si esa variable existiera → contaría **doble**.

### Alternativa por API (opcional, no necesaria)

Si en el futuro quisieras controlar el beacon solo desde código: desactivar auto-inject en el panel, añadir el token a `PUBLIC_CF_WEB_ANALYTICS_TOKEN` y redeploy. Requiere token API con Account Analytics Edit (`scripts/cloudflare-web-analytics.ps1`).

---

## 2. Salir en buscadores (SEO e indexación)

Aparecer en Google/Bing requiere **base técnica** (hecha) + **registrar el sitio** y **pedir indexación** (pendiente).

### Lo que ya está hecho en la web

| Elemento | URL / ubicación |
|----------|-----------------|
| `robots.txt` | `https://nimpo3dstudio.com/robots.txt` — permite todo |
| Sitemap | `https://nimpo3dstudio.com/sitemap-index.xml` |
| URLs canónicas | `Layout.astro` |
| Open Graph / Twitter | `Layout.astro` |
| JSON-LD (Organization + WebSite) | `StructuredData.astro` |
| Páginas indexables | `/`, `/musica`, `/catalogo`, `/sobre`, `/contacto`, `/privacidad`, `/terminos` |

Esto **permite** la indexación; no garantiza posiciones altas.

### Pasos pendientes — Google Search Console (imprescindible)

1. [search.google.com/search-console](https://search.google.com/search-console)
2. **Añadir propiedad** → `https://nimpo3dstudio.com` (mantener consistencia con/sin `www`)
3. Verificación → método **etiqueta HTML** → copiar solo el valor de `content="..."`
4. Añadir a `.env` y Build Variables:

   ```
   PUBLIC_GSC_VERIFICATION=el_codigo_de_google
   ```

5. Deploy
6. Search Console → **Sitemaps** → enviar `https://nimpo3dstudio.com/sitemap-index.xml`
7. **Inspección de URLs** → solicitar indexación de `/`, `/musica`, `/catalogo`

### Pasos pendientes — Bing Webmaster (recomendado)

1. [bing.com/webmasters](https://www.bing.com/webmasters) — opción importar desde Google
2. Verificación → `PUBLIC_BING_VERIFICATION` → deploy
3. Enviar el mismo sitemap

### Comprobar si ya estás indexado

Buscar en Google:

```
site:nimpo3dstudio.com
```

- **0 resultados** → normal en sitio nuevo; completar Search Console + sitemap
- **Aparecen URLs** → ya indexado; el resto es tiempo y contenido

### Tiempos realistas

| Fase | Plazo habitual |
|------|----------------|
| Primera indexación | Días a 1–2 semanas |
| Búsqueda por marca («Nimpo 3D Studio») | Suele ser antes |
| Términos genéricos («sample packs», etc.) | Meses + contenido + enlaces |

### Qué mejora el posicionamiento (después de indexar)

1. Contenido real en `music.json` y `products.json` (sustituir ejemplos)
2. Textos únicos por página (descripciones, no solo títulos)
3. Redes (`site.json` → Instagram) enlazando a la web
4. Actualizar `src/data/updates.json` al publicar novedades
5. El badge «en construcción» no impide indexar; más contenido = más keywords

---

## 3. Google Analytics 4 (pendiente)

1. Crear propiedad GA4 → flujo Web → URL `https://nimpo3dstudio.com`
2. Measurement ID (`G-...`) → `PUBLIC_GA_MEASUREMENT_ID`
3. El banner de cookies activa GA4 **solo** si el usuario acepta

**Eventos automáticos:** `page_view`, `music_preview_play`, `catalog_view`

GA4 no es obligatorio para indexación; Search Console basta para SEO. GA4 sirve para funnels y comportamiento con consentimiento RGPD.

---

## 4. Meta Pixel (opcional — publicidad de pago)

1. Meta Events Manager → crear Pixel
2. ID numérico → `PUBLIC_META_PIXEL_ID`
3. Solo carga tras consentimiento de cookies

---

## Publicidad orgánica (gratis)

| Canal | Acción |
|-------|--------|
| **Search Console** | Verificación + sitemap + monitor impresiones/clics |
| **Bing Webmaster** | Mismo sitemap; refuerza Bing |
| **Feed** | `src/data/updates.json` — avisos en panel Novedades |
| **Instagram** | `site.json` → `social.instagram` cuando tengas perfil |
| **GitHub** | Enlace en bio del repo |
| **Música** | Previews en `/musica` cuando subas MP3 |

---

## Permisos token Cloudflare API (solo si automatizas por API)

Editar token: [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens/) (Ctrl+K → «API token»).

Comprobar con `scripts/test-cloudflare-token.ps1`.

| Endpoint | Permiso en el token |
|----------|---------------------|
| Cuenta, Zona, DNS, Email rules | Suele funcionar |
| Web Analytics RUM (API) | Account → Account Analytics → Read + Edit |
| Workers scripts | Account → Workers Scripts → Edit |
| Workers routes | Zone → Workers Routes → Edit |
| Cache purge | Zone → Cache Purge → Purge |

Los tokens `cfat_` no usan `/user/tokens/verify`; usa `/accounts/{id}/tokens/verify`.

**Para Web Analytics no hace falta** si ya está activo en panel.

---

## Archivos del sistema

```
src/lib/analytics/          ← módulo (gate único)
src/components/AnalyticsHead.astro
src/components/ConsentBanner.astro
src/components/StructuredData.astro
public/robots.txt
sitemap-index.xml           ← generado en build
docs/analytics-publi.md     ← este doc
```

---

## Comprobar que funciona

1. **Web Analytics:** panel Cloudflare → visitas y Core Web Vitals (ya operativo)
2. **SEO:** `site:nimpo3dstudio.com` en Google tras Search Console
3. **Build local:** `npm run build && npm run preview` → view source: JSON-LD, canonical, robots con sitemap
4. **GA4:** con `PUBLIC_GA_MEASUREMENT_ID` + aceptar cookies → Realtime en GA4

---

## Próximo paso recomendado

1. **Search Console** — verificar + enviar sitemap (máxima prioridad para buscadores)
2. **Bing Webmaster** — importar desde Google
3. **GA4** — cuando quieras analítica con cookies
4. **Contenido real** — música y catálogo para mejorar keywords