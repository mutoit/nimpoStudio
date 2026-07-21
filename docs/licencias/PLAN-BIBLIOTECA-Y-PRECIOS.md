# Plan de implementación — Biblioteca + licencias (completo)

**Estado:** plan de producto + **canon precios 2026-07-21** (crítica mercado adoptada).  
**Criterio de precios:** baja entrada (micro **79 €**) + lista comercial **169 €** + premium real (exclusiva **1.200+**, buyout **2.990+**). Calculadora por uso/plazo; no un solo precio plano. Detalle: `00-PRECIOS-REFERENCIA.md`.

---

## 0. Objetivos

1. Biblioteca usable con **miniaturas en frame fijo**, play/pause, sin layouts rotos.  
2. **Licenciar** = formulario **completo** en **modal encima** del catálogo; al cerrar/enviar vuelve al grid.  
3. Preview de audio/vídeo también **dentro del modal**.  
4. Exclusiva: opción **no disponible / vendido / fuera de catálogo**.  
5. **Extras con precio** en el formulario (extensión, más composición, etc.).  
6. Precios **escalonados** (volumen micro + margen alto en exclusiva/ads).

---

## 1. Precios (canon actual)

### 1.1 Referencias de mercado (resumen)

| Fuente / contexto | Rango típico |
|-------------------|--------------|
| Stock (AudioJungle / PremiumBeat / Pond5 single) | ~15–200 USD/EUR RF |
| Sync indie / placements | ~250–2.500 €; film 500–5k USD |
| Ads local/regional | 1k–15k+ USD |
| TV / SVOD background | 2k–25k USD |
| Exclusivas / buyouts | premium alto |

**Posicionamiento Nimpo:** por encima del stock barato (MIDI manual, stems, clearance directo); por debajo del sync mid-tier TV $5k–50k.

### 1.2 Anclas en código (EUR, sin IVA) — 2026-07-21

| Concepto | Valor | Notas |
|----------|-------|--------|
| Micro / un solo uso | **79 €** | Volumen vs stock |
| Comercial 1 año / proyecto / 2 años | **129 / 159 / 169 €** | Lista 2y = 169 |
| + Stems / edit | **+59 / +49 €** | |
| Pack ads (2y) | **299 €** (169+130) | uplift **+130 €** |
| Tema extra mismo proyecto | ×0,8 (−20 %) | rango mercado −15–25 % |
| Exclusiva 2y media/territorio | **desde 1.200 €** | single 890 · 1y 1.100 |
| + retirar catálogo | **+250 €** | |
| Buyout | **desde 2.990 €** | |
| Indie pro / SaaS anual (suelos revisión) | **390 · 590 €** | |
| Custom ½ día | **+199 €** | |

**Regla:** revisar tras 5–10 ventas o A/B ~4 semanas. Fuente: `LICENSE_PRICES`.

### 1.3 Archivos a tocar por precios

- [x] `src/lib/license-quote.ts` + `functions/lib/license-quote.ts`  
- [x] `docs/licencias/00-PRECIOS-REFERENCIA.md`  
- [x] `docs/licencias/TABLA-RAPIDA-PRECIOS.md`  
- [x] plantillas comercial / exclusiva  
- [x] `music.json` `priceFrom` 169 / 1.200  
- [x] i18n es/en/fr

---

## 2. Estados de catálogo (exclusiva / vendido)

### 2.1 Modelo de datos (`library.json` / ítems)

```ts
availability: "available" | "reserved" | "sold_exclusive" | "off_catalog"
// reserved = opcional hold corto
// sold_exclusive = sigue listado con etiqueta "No disponible" / "Exclusiva"
// off_catalog = no se lista en biblioteca pública (solo admin)
```

### 2.2 UI

- Badge en miniatura: **No disponible** / **Exclusiva** / **Vendido** (texto i18n).  
- Sin botón Licenciar (o deshabilitado + “consultar disponibilidad”).  
- Preferencia de producto: por defecto en exclusiva fuerte marcar **sold_exclusive** o **off_catalog** según checkbox del form.

### 2.3 Tras venta (proceso manual v1)

- [ ] Checklist post-pago: cambiar `availability` en JSON + redeploy (o admin futuro).  
- [ ] v2: admin o API que actualice KV/D1 sin redeploy.

---

## 3. Formulario de licencia (modal encima del catálogo)

### 3.1 Comportamiento UX

| Acción | Resultado |
|--------|-----------|
| Clic **Licenciar** o abrir ítem con foco licencia | **Modal / overlay** encima del grid (backdrop oscuro) |
| Clic backdrop o **×** | Cierra modal → catálogo visible, scroll restaurado |
| **Enviar OK** | Mensaje éxito 1–2 s → **cierra solo** → catálogo |
| Escape | Cierra modal |
| Scroll body | Bloqueado mientras modal abierto (`overflow: hidden` en body) |

### 3.2 Contenido del modal (2 columnas en desktop)

**Izquierda — preview**

- [ ] Frame según aspect real (1:1 / 9:16 / 16:9)  
- [ ] Vídeo o cover  
- [ ] Play/pause unificado  
- [ ] Si hay stems: mixer + play (solo una fuente de audio a la vez)  
- [ ] Descripción, moods, tags, notas  

**Derecha — formulario completo** (el “especial” de música)

- [ ] Nombre, email  
- [ ] Tipo de uso (catálogo completo: cine, ads, app…)  
- [ ] Territorio, plazo  
- [ ] Proyecto / uso concreto  
- [ ] Extras con precio (ver §4)  
- [ ] Especial / fuera de estándar  
- [ ] **Precio en vivo** (calculadora)  
- [ ] Enviar → `POST /api/quote`  

### 3.3 No hacer

- Mini-form de 4 campos en panel estrecho.  
- Empujar el formulario **debajo** de un grid de 100 ítems.

---

## 4. Extras en el formulario (con precio)

Todos como **checkboxes** (o select cantidad) que suman al total o marcan revisión:

| Extra (id) | Precio conservador | ¿Instant o review? |
|------------|--------------------|--------------------|
| `stems` | +59 € | Instant |
| `edit_short` | +49 € | Instant |
| `ads_uplift` | +150 € (o usage ads_paid) | Instant |
| `term_plus_1y` | +59 € (comercial) / +190 € (si exclusiva) | Instant |
| `exclusive_soft` | base 1.200 € (2y) / 890 single | Instant exclusiva o “desde” |
| `remove_from_catalog` | +190 € (con exclusiva) | Instant add-on |
| `territory_expand` | +149 € | Instant o review si multi-global |
| `more_composition` | +149 € | Instant; si “más de ½ día” → special |
| `buyout` | desde 2.490 € | Review |
| `need_special_review` | — | Fuerza review |

**Precio en vivo:** `base + sum(extras)` o mensaje “Revisión” si exclusive/buyout/special.

Actualizar:

- [ ] `calculateLicenseQuote` con nuevos flags  
- [ ] Body de email de presupuesto (listar extras)  
- [ ] i18n labels de cada extra  

---

## 5. Miniaturas: play / pause

- [ ] Botón **play** centrado (o esquina) en cada `.lb__frame`  
- [ ] 1ª pulsación: play vídeo o stems preview  
- [ ] 2ª si está sonando: **pause/stop**  
- [ ] Solo **una** reproducción global a la vez (parar la anterior)  
- [ ] Icono cambia play ↔ pause  
- [ ] Hover opcional; **el control es el botón**, no solo hover  

---

## 6. Preview dentro del modal

- [ ] Al abrir, preview listo (vídeo poster o primer frame)  
- [ ] Play en modal independiente del grid  
- [ ] Al cerrar modal: **parar** todo audio/vídeo  

---

## 7. Frame de miniaturas (no olvidar)

- [ ] Frame **uniforme 1:1** (o 4:5) en el grid  
- [ ] `object-fit: cover` dentro  
- [ ] Badge de aspect real  
- [ ] CSS **`is:global`** (innerHTML no recibe scope de Astro)  
- [ ] Verificar en producción que el CSS no lleve `[data-astro-cid-…]` en reglas `.lb__*`  

---

## 8. API y email

- [ ] `POST /api/quote` acepta todos los extras nuevos  
- [ ] Email estudio + cliente con desglose de precio  
- [ ] From `licencias@` + routing a Gmail (ya hecho)  
- [ ] `QUOTE_TO_EMAIL` operativo  

---

## 9. Admin / subida (no olvidar en la misma ola o siguiente)

- [ ] Canal vídeo vs canal stems (ya esbozado)  
- [ ] Campos: moods, tags, notes, description, licenseEnabled, provisional  
- [ ] v1: genera JSON (actual)  
- [ ] v2 (opcional): subida real a R2 + escritura de ítem  

---

## 10. Orden de implementación (sprints)

### Sprint A — UX biblioteca (crítico)

1. Confirmar CSS global + frame 1:1 en prod (visual QA).  
2. **Modal overlay** para detalle + licencia (no sección abajo).  
3. Cierre × / backdrop / Escape / post-envío.  
4. Play/pause en miniaturas + parar al cerrar.  
5. Preview sonora/visual en el modal.

### Sprint B — Formulario + precios

6. Form completo en el modal (usage + extras con €).  
7. Bajar anclas a tabla §1.2 en quote calc + docs.  
8. Extra “retirar del catálogo” + estados availability.  
9. Emails con desglose.

### Sprint C — Catálogo post-venta

10. Badges No disponible / Exclusiva / Vendido.  
11. Ocultar `off_catalog`.  
12. Checklist manual post-pago (doc corta).  
13. (Opcional) admin toggle availability.

### Sprint D — Pulido

14. Un solo audio engine.  
15. Mobile: modal full-screen.  
16. Accesibilidad: focus trap en modal, `aria-modal`.  
17. Prueba con 20+ ítems falsos (scroll + modal).

---

## 11. Criterios de “hecho” (DoD)

- [ ] No hay botones blancos / CSS sin aplicar en cards.  
- [ ] Todas las miniaturas misma caja; ningún 9:16 gigante en el grid.  
- [ ] Play en thumb para y reanuda/para.  
- [ ] Licenciar abre modal encima; formulario con usos + extras + precio.  
- [ ] Enviar o cerrar devuelve al catálogo limpio.  
- [ ] Precios en código = tabla §1.2.  
- [ ] Docs de precios y plantillas alineados.  
- [ ] Deploy verificado en `/es/biblioteca/`.

---

## 12. Fuera de alcance (explícito, no olvidar que NO va ahora)

- Checkout Stripe automático.  
- Generación PDF de licencia al vuelo.  
- Subida de archivos al servidor sin pasar por `public/` + JSON.  
- PRO / sociedades de gestión.  

---

## 13. Aprobación de precios (canon 2026-07-21)

| | Estado |
|--|--------|
| Micro **79 €** | Adoptado |
| Comercial 2 años **169 €** | Adoptado |
| Ads pack 2y **299 €** (169+130) | Adoptado |
| Exclusiva desde **1.200 €** (+250 retirar) | Adoptado |
| Buyout desde **2.990 €** | Adoptado |
| Calculadora dinámica uso+plazo | En código |
| Docs unificados | 00-PRECIOS + TABLA-RAPIDA + plantillas + i18n |

Revisar tras 5–10 ventas reales o A/B ~4 semanas.

---

*Plan de referencia · actualizar este doc si se cambia un precio o un DoD*
