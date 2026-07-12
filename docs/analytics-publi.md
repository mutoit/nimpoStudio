# Analíticas y publicidad — Nimpo 3D Studio

Guía de configuración. El código ya está montado; faltan **IDs y tokens** en variables de entorno.

---

## Variables de entorno (`PUBLIC_*`)

Configúralas en:

1. **Local:** `nimpo-studio/.env` (copia de `.env.example`)
2. **Producción:** Cloudflare → Workers → `nimpostudioweb` → **Settings** → **Variables** (Build)

| Variable | Dónde obtenerla |
|----------|-----------------|
| `PUBLIC_CF_WEB_ANALYTICS_TOKEN` | Cloudflare → Web Analytics → sitio → Manage → token beacon |
| `PUBLIC_GA_MEASUREMENT_ID` | Google Analytics 4 → Admin → Data Streams → `G-XXXXXXXX` |
| `PUBLIC_GSC_VERIFICATION` | Search Console → Verificar → meta tag `content="..."` |
| `PUBLIC_BING_VERIFICATION` | Bing Webmaster → Verificar → meta `msvalidate.01` |
| `PUBLIC_META_PIXEL_ID` | Meta Events Manager → Pixel ID (opcional) |

Tras añadir variables: **nuevo deploy** (`git push` o redeploy manual).

---

## Permisos token Cloudflare API (cuando amplíes el token)

Marca en el token existente:

| Recurso | Permiso |
|---------|---------|
| Account → **Account Analytics** | Read + Edit |
| Zone → **Analytics** | Read |
| Zone → **Zone** | Read |

Con Edit en Account Analytics puedes crear/listar sitios RUM por API. El **beacon token** también sale del panel Web Analytics.

---

## Checklist por servicio

### 1. Cloudflare Web Analytics (prioridad — gratis, sin cookies)

1. Cloudflare → **Web Analytics** → Add a site → `www.nimpo3dstudio.com`
2. Copia el **token** del beacon
3. Ponlo en `PUBLIC_CF_WEB_ANALYTICS_TOKEN`
4. Desactiva auto-inject si Cloudflare lo ofrece (evita doble beacon; nosotros lo inyectamos en `AnalyticsHead.astro`)

### 2. Google Analytics 4

1. Crear propiedad GA4 → flujo Web → URL `https://nimpo3dstudio.com`
2. Copiar Measurement ID (`G-...`) → `PUBLIC_GA_MEASUREMENT_ID`
3. El banner de cookies activa GA4 solo si el usuario acepta

**Eventos automáticos:** `page_view`, `music_preview_play`, `catalog_view`

### 3. Google Search Console (publicidad orgánica / SEO)

1. [search.google.com/search-console](https://search.google.com/search-console)
2. Añadir propiedad `https://nimpo3dstudio.com`
3. Verificar con meta tag → valor en `PUBLIC_GSC_VERIFICATION`
4. Enviar sitemap: `https://nimpo3dstudio.com/sitemap-index.xml`

### 4. Bing Webmaster

1. [bing.com/webmasters](https://www.bing.com/webmasters)
2. Añadir sitio → meta tag → `PUBLIC_BING_VERIFICATION`
3. Enviar el mismo sitemap

### 5. Meta Pixel (publicidad de pago / remarketing — opcional)

1. Meta Events Manager → crear Pixel
2. ID numérico → `PUBLIC_META_PIXEL_ID`
3. Solo carga tras consentimiento de cookies

---

## Publicidad orgánica (gratis)

| Canal | Acción |
|-------|--------|
| **Feed** | `src/data/updates.json` — avisos en panel Novedades |
| **Instagram** | Rellena `site.json` → `social.instagram` cuando tengas perfil |
| **GitHub** | Enlace en bio del repo |
| **Música** | Previews en `/musica` cuando subas MP3 |
| **Search Console** | Monitor de impresiones/clics Google |

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

1. `npm run build && npm run preview`
2. Con variables en `.env`, abre la web → banner cookies (si GA/Meta configurados)
3. Acepta → en GA4 **Realtime** debería aparecer 1 usuario
4. Cloudflare Web Analytics → datos en 24–48 h
5. View source → JSON-LD Organization + canonical + sitemap en robots.txt