# Analíticas, publicidad y SEO — Nimpo 3D Studio

Estrategia y guía de configuración. El código ya está montado; algunos servicios están **activos en panel** sin variables de entorno.

---

## Estado actual (julio 2026)

| Área | Estado | Notas |
|------|--------|-------|
| Cloudflare Web Analytics | **Activo** | Configurado en panel; visitas + CWV |
| First-party collector (`/api/track`) | **Activo** | Siempre recoge `music_*` events (incluso sin consentimiento) |
| SEO técnico (sitemap, robots, meta) | **Hecho** | En producción |
| Google Search Console | **Pendiente** | Falta verificar propiedad y enviar sitemap |
| Bing Webmaster | **Pendiente** | Recomendado |
| GA4 | **Pendiente** | Código listo |
| Microsoft Clarity | **Recomendado gratis** | Session recordings + heatmaps (añade ID) |
| Meta Pixel | **Opcional** | Solo publicidad de pago |

---

## Variables de entorno (`PUBLIC_*`)

Configúralas en:

1. **Local:** `nimpo-studio/.env` (copia de `.env.example`)
2. **Producción:** Cloudflare → **Workers & Pages** → proyecto **nimpo-studio** (Pages) → **Settings** → **Environment variables** (las PUBLIC_* se usan en el build)

| Variable | Dónde obtenerla | ¿Necesaria ahora? |
|----------|-----------------|-------------------|
| `PUBLIC_CF_WEB_ANALYTICS_TOKEN` | Panel Web Analytics → token beacon | **No** — ver sección CF abajo |
| `PUBLIC_GA_MEASUREMENT_ID` | GA4 → Admin → Data Streams → `G-XXXXXXXX` | Cuando quieras GA4 |
| `PUBLIC_GSC_VERIFICATION` | Search Console → Verificar → meta `content="..."` | **Sí** — para indexación Google |
| `PUBLIC_BING_VERIFICATION` | Bing Webmaster → meta `msvalidate.01` | Recomendado |
| `PUBLIC_META_PIXEL_ID` | Meta Events Manager → Pixel ID | Solo publicidad de pago |
| `PUBLIC_CLARITY_PROJECT_ID` | clarity.microsoft.com → Project ID (ej: xxxxxxxx) | **Recomendado** — gratis e ilimitado para la mayoría |

Tras añadir variables: **nuevo deploy** (`git push` o redeploy manual).

---

## 0. No contar mis visitas (estudio)

| Método | Qué hace |
|--------|----------|
| Abrir **una vez** `https://www.nimpo3dstudio.com/?nimpo_no_stats=1` | Guarda opt-out en ese navegador (localStorage). No envía a `/api/track`, GA, Clarity, Meta. |
| Reactivar | `?nimpo_stats=1` |
| Rutas `/admin/` | Siempre excluidas del collector propio |

**Cloudflare Web Analytics** (beacon automático del panel CF) no lee nuestro localStorage. Para no contarte ahí: filtro de IP en el panel de CF si está disponible, o un navegador / perfil aparte solo para mirar stats. Lo que sí controlamos al 100 % es el collector first-party y los scripts de marketing.

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

**Eventos automáticos (máximo gratuito):**
- `page_view`, `catalog_view`
- Música: `music_preview_play`, `music_preview_complete`, `music_preview_play` (con progress 25/50/75)
- Stems: `music_stem_play`, `music_stem_interaction` (solo/mute/volume por capa)
- Siempre van a nuestro colector first-party (`/api/track` → Cloudflare Logs)
- Solo con consentimiento van también a GA4 + Clarity + Meta

GA4 no es obligatorio para indexación; Search Console basta para SEO. GA4 sirve para funnels y comportamiento con consentimiento RGPD.

---

## 4. Meta Pixel (opcional — publicidad de pago)

1. Meta Events Manager → crear Pixel
2. ID numérico → `PUBLIC_META_PIXEL_ID`
3. Solo carga tras consentimiento de cookies

---

## 5. Microsoft Clarity + Colector propio (máximo datos GRATIS)

Para **máximos datos sin pagar** combinamos:

- **Cloudflare Web Analytics** (ya activo): visitas + rendimiento agregado (sin cookies)
- **Colector first-party** (`/api/track`): **todos** los eventos de música se guardan siempre (play, complete, stems, interacciones). Se ven en **Cloudflare → Pages → Logs**. Datos propios.
- **Microsoft Clarity** (gratis): grabaciones de sesiones reales + heatmaps + rage clicks. Ideal para ver exactamente cómo interactúan con el reproductor de stems y previews. 
- **GA4** (gratis): métricas y funnels cuando configures el ID.

### Cómo activar el stack completo gratis

1. Crea cuenta en [clarity.microsoft.com](https://clarity.microsoft.com) → nuevo proyecto para tu sitio → copia el **Project ID**.
2. (Opcional pero potente) Crea GA4 y copia el Measurement ID.
3. Añade en variables de build / `.env`:
   ```
   PUBLIC_CLARITY_PROJECT_ID=tu_id_de_clarity
   PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXX
   ```
4. Deploy.
5. Acepta cookies en el sitio (o prueba en incógnito aceptando) para ver datos en GA/Clarity.
6. Los plays de música **siempre** se registran en los Logs de Cloudflare aunque se rechace el banner.

### Ver los datos de música

- **Cloudflare Logs**: filtra por `[ANALYTICS_EVENT]` o `music_`
- **Clarity**: ve grabaciones filtrando por página `/musica/...` y custom events `music_*`
- **GA4**: en Events o Explorations (cuando esté configurado)

Con esto tienes **cuantitativo + cualitativo + propio** sin coste.

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
functions/api/track.ts      ← colector first-party (siempre activo)
public/robots.txt
sitemap-index.xml           ← generado en build
docs/analytics-publi.md     ← este doc
```

---

## Comprobar que funciona

1. **Web Analytics:** panel Cloudflare → visitas y Core Web Vitals (ya operativo)
2. **Colector propio (recomendado, cero setup extra):** reproduce un preview o stems → Cloudflare → tu proyecto Pages → **Logs** → busca `MUSIC PLAY`, `STEMS PLAY`, `✅ MUSIC COMPLETE` o `[ANALYTICS_RAW]`. Los logs ahora salen en formato legible.
3. **Clarity:** con `PUBLIC_CLARITY_PROJECT_ID` + aceptar → verás sesiones + heatmaps en clarity.microsoft.com
4. **SEO:** `site:nimpo3dstudio.com` en Google tras Search Console
5. **Build local:** `npm run build && npm run preview` → view source
6. **GA4:** con ID + aceptar cookies → Realtime + eventos music_*

---

## Próximo paso recomendado (para datos máximos gratis)

1. **Search Console** — verificar + enviar sitemap
2. **Microsoft Clarity** — crea proyecto gratis y pon `PUBLIC_CLARITY_PROJECT_ID`
3. **GA4** (opcional) — pon `PUBLIC_GA_MEASUREMENT_ID`
4. Reproduce música en el sitio y revisa **Logs de Cloudflare** + Clarity
5. **Bing** + contenido real