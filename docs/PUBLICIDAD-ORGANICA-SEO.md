# Publicidad gratuita y SEO — Nimpo 3D Studio

Última actualización: 2026-07-21  
Plan práctico **sin presupuesto de ads**. Objetivo: que gente que busca composición, licencias, stems y música original pueda acabar en la web.

---

## Resumen

| Qué | Estado |
|-----|--------|
| Ads de pago (Meta / Google) | Opcional más adelante; **no es gratis** de forma estable |
| SEO + Search Console | **Gratis y prioritario ahora** |
| Cloudflare Web Analytics | Ya activo (visitas + rendimiento) |
| Instagram / redes | Enlace a la web + contenido (gratis) |

**Expectativa realista:** no rankear mañana por “compositor” (palabra genérica y muy competida). Sí se puede trabajar **búsquedas más concretas** + marca + indexación.

---

## Orden de trabajo (ya se puede)

### 1. Google Search Console (imprescindible, gratis)

1. [search.google.com/search-console](https://search.google.com/search-console)  
2. Añadir propiedad `https://nimpo3dstudio.com` (consistencia con/sin `www`)  
3. Verificar (meta HTML → `PUBLIC_GSC_VERIFICATION` en Pages + redeploy)  
4. Enviar sitemap: `https://nimpo3dstudio.com/sitemap-index.xml`  
5. Solicitar indexación de:
   - `/es/`
   - `/es/biblioteca/`
   - `/es/sobre/`
   - fichas de obras reales cuando existan

Detalle técnico: `docs/analytics-publi.md`.

### 2. Bing Webmaster (recomendado, gratis)

- [bing.com/webmasters](https://www.bing.com/webmasters)  
- Importar desde Google si se puede  
- Mismo sitemap  

### 3. Contenido con intención de búsqueda

Textos y páginas orientados a frases reales (no relleno), por ejemplo:

- compositor MIDI original para licencias  
- música original con stems para vídeo / reels / indie games  
- licencia de música comercial (no stock genérico)  
- sync / OST indie / vídeo de marca  

**Dónde:** Sobre, Biblioteca (hero + avisos), descripciones de cada obra, feed Novedades.

Quien implemente en código: copy SEO en `src/i18n/translations.ts`, páginas en `src/pages/`, datos de obras vía admin / catálogo R2.

### 4. Obras reales indexables

Cada pieza en biblioteca = más superficie en Google (título + descripción + media).

- Quitar o marcar `provisional` lo que no sea oferta real  
- Descripciones únicas por obra  
- Moods/tags con check **F (filtro)** solo en los que quieras en la barra pública  

### 5. Enlaces y presencia (gratis)

- Instagram (u otra red) con link a `nimpo3dstudio.com`  
- Perfiles / comunidades de músicos, cortos, games (sin spam)  
- Colaboraciones que enlacen a la web  

Config redes: `src/config/site.json` → `social`.

### 6. Medir

| Herramienta | Para qué |
|-------------|----------|
| Cloudflare Web Analytics | Visitas y Core Web Vitals (ya activo) |
| Search Console | Consultas, clics, indexación |
| Clarity / GA4 (opcional) | Comportamiento y funnels — ver `docs/analytics-publi.md` |

Comprobar indexación en Google:

```
site:nimpo3dstudio.com
```

---

## Keywords realistas (cola media)

Usar de forma natural en títulos, meta y copy (no keyword stuffing):

1. licencia música original  
2. música con stems licencia  
3. compositor MIDI original  
4. sync music indie  
5. música para vídeo de marca licencia  
6. OST corta licencia comercial  
7. música original no stock  
8. licencia stems para reels  
9. música para indie game licencia  
10. compositor para cortometraje  
11. Nimpo 3D Studio (marca)  
12. biblioteca música licencia  
13. presupuesto licencia musical  
14. master música licencia  
15. composición original MIDI  

Revisar cada 4–8 semanas en Search Console qué queries reales aparecen.

---

## Qué no esperar aún

- Top 1 por “compositor” o “música” genérico  
- Tráfico de pago sin presupuesto  
- Resultados de SEO en 24 h (días a semanas para indexar; meses para términos genéricos)

---

## Cómo puede ayudar el agente / desarrollo

1. Copy SEO de Sobre + Biblioteca (ES / EN / FR)  
2. Meta titles y descriptions por página  
3. Meta de verificación GSC/Bing en el build  
4. Ajustes de estructura de contenido y feed  
5. Más adelante: textos de campañas Meta/Google si hay presupuesto  

### Arranques típicos (pedidos al agente)

- “haz el SEO de Sobre + Biblioteca”  
- “primero Search Console (meta de verificación)”  
- “lista de keywords y dónde van en la web”  

---

## Relación con otros docs

| Doc | Contenido |
|-----|-----------|
| `docs/estado.md` | Estado general del producto |
| `docs/analytics-publi.md` | Variables, GA4, Clarity, Pixel, SEO técnico |
| `docs/admin-acceso.md` | Publicar obras (contenido indexable) |
| Este archivo | Plan de publicidad **orgánica** y SEO sin ads |

---

## Checklist rápido

- [ ] Search Console verificado + sitemap enviado  
- [ ] Bing (opcional)  
- [ ] Sobre / Biblioteca con copy orientado a licencias y composición original  
- [ ] ≥ 1–3 obras reales publicadas (no solo demos)  
- [ ] Instagram (u otra red) con link a la web  
- [ ] Revisar `site:nimpo3dstudio.com` y consultas en Search Console cada mes  
