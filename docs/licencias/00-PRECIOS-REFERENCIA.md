# Precios de licencia — Nimpo 3D Studio (referencia interna)

**Estado:** canon oficial del estudio (crítica de mercado 2026 adoptada).  
**Última revisión:** 2026-07-21  
**Moneda:** EUR (sin IVA salvo que factures con IVA; indícalo en factura).

**Código:** `src/lib/license-quote.ts` ≡ `functions/lib/license-quote.ts` → `LICENSE_PRICES`.  
**Bolsillo:** `TABLA-RAPIDA-PRECIOS.md` · **Plantillas:** personal / comercial / exclusiva.

---

## 0. Criterios de recomendación (no negociables en producto)

1. **Baja entrada** para volumen (compites con stock/suscripciones ~30–60 €).  
2. **Premium real** en usos fuertes (TV/cine/ads nacionales) — MIDI manual + stems + trato directo.  
3. **Dto volumen/EPs:** −15–25 % desde el 2.º track (código: `extraTrackFactor` 0,8 = −20 %).  
4. **Add-ons fijos:** stems +59 €; edit corto +49 €.  
5. **No precio único “comercial”** que diluya valor y pierda ventas bajas y altas.  
6. **Calculadora dinámica** en modal/formulario según uso y plazo declarados.  
7. Tras **5–10 ventas reales** o ~4 semanas: revisar conversión por tier antes de fijar para siempre.

**Posicionamiento en ficha:** *MIDI manual sin IA + stems + clearance directo* — premium indie, no stock puro.

---

## 1. Anclas de catálogo (web / calculadora)

| Código / tier | Alcance típico | Precio lista | ¿Cierre web? |
|---------------|----------------|--------------|--------------|
| `personal` | Privado real (sin marca ni monetizar) | 0–**49 €** o denegación | No — revisión |
| `single` / micro | 1 uso corto, redes hobby, podcast 1 ep, splash | **79 €** | Sí |
| Comercial 1 año | 1 obra, 1 proyecto, no excl., 1 año | **129 €** | Sí |
| Comercial proyecto | Vida del proyecto nombrado | **159 €** | Sí |
| Comercial 2 años | Lista estándar (brand film, corto, game 1 track…) | **169 €** | Sí |
| + stems | Capas | **+59 €** | Sí |
| + edit corto | Recorte ~1 h | **+49 €** | Sí |
| + ads | Campaña pago multi-canal ~6 m | **+130 €** (2y → **299 €**) | Sí (`ads_paid`) |
| Indie pro (suelo) | Feature indie, serie 2–6 eps, game launch pack | **desde 390 €** | Revisión |
| Broadcast / SVOD (suelo) | TV regional, Netflix/Prime 1 título | **desde 890 €** | Revisión |
| Exclusiva media/territorio | 1 medio o país, 1–2 años | **desde 1.200 €** | Instant exclusiva |
| Exclusiva un solo uso / 1 año | Suelos | **890 / 1.100 €** | Instant |
| + retirar catálogo | Sobre exclusiva | **+250 €** | Sí |
| Exclusiva fuerte / multi | Multi-medio, mundial 2+ años | **3.000–6.000 €+** | Revisión / manual |
| Buyout | Fuera catálogo indefinido | **desde 2.990 €** | Instant buyout |
| SaaS / live-ops (suelo) | Uso ilimitado en producto / año | **desde 590 €/año** | Revisión |
| Custom ½ día | + composición | **+199 €** (+ sync) | Sí (add-on) |

**Unidad de venta:** 1 obra = 1 tema. EP: suma temas o pack (§6).

### Evidencia de mercado (resumen 2026)

| Contexto | Rango reportado |
|----------|-----------------|
| Stock (PremiumBeat, Pond5, AudioJungle single) | ~15–200 €/USD RF |
| Sync indie / placements | ~250–2.500 € típico; film 500–5k USD |
| Ads locales/regionales | 1k–15k+ USD (tu uplift es suelo, no techo) |
| TV/streaming background | 2k–25k USD → tu suelo broadcast 890–1.800 € |
| Buyouts / exclusivas fuertes | Premium alto; buyout estudio **≥ 2.990 €** |

---

## 2. Las 8 variables que siempre miras

| # | Variable | Cómo mueve el precio |
|---|----------|----------------------|
| 1 | **Obra** | +1 tema = +base × 0,8 desde el 2.º |
| 2 | **Proyecto** | Multi-proyecto → pack o 2× licencia |
| 3 | **Medio** | Ads y broadcast suben; micro orgánico = 79 |
| 4 | **Territorio** | Mundial 1 proyecto incluido en catálogo; “todas las ventanas” → exclusiva |
| 5 | **Plazo** | micro < 1y < proyecto < 2y < perpetuo/buyout |
| 6 | **Exclusividad** | No = catálogo; cualquier exclusiva ≥ 890 (suelo single) / 1.200 (2y) |
| 7 | **Perfil cliente** | Agencia/marca grande → ads o más |
| 8 | **Entregables** | Stems +59; edit +49; custom +199 |

---

## 3. Personal (`personal`) — bajo petición

| Propósito real | Acción | Precio |
|----------------|--------|--------|
| Escucha privada / aprendizaje | Aprobar | **0 €** |
| Demo interna cerrada | Aprobar + crédito si se enseña | **0 €** |
| Portfolio sin marca ni monetizar | Valorar | **0–49 €** + crédito |
| YouTube / reel “contenido” / sponsors | **No personal** → comercial | **≥ 79 €** |
| Cualquier marca o cliente | Comercial | **≥ 79–169 €** |

---

## 4. Comercial y micro

### Micro 79 €

- 1 entrega / 1 publicación / 1 vuelo / 1 ep / sting declarado.  
- No reutilizable en otra campaña o proyecto.  
- Master WAV. Mundial en ese uso.

### Lista 169 € (2 años)

- 1 obra, no exclusiva, 1 proyecto, 2 años, mundial en el marco del proyecto.  
- Online, redes orgánicas del proyecto, festival, trailer del mismo proyecto.  
- **No:** reventa stock, sublicencia genérica, ads multi-canal (→ +130), exclusiva.

### Add-ons

| Add-on | Precio |
|--------|--------|
| Stems | +59 € |
| Edit corto | +49 € |
| Ads campaña | +130 € |
| Tema 2+ mismo proyecto | ×0,8 s/ base |
| Custom ½ día | +199 € |

---

## 5. Matriz por caso (suelos)

### 5.1 Audiovisual

| Caso | Referencia |
|------|------------|
| Student / corto festival 1 obra | 79–169 según plazo |
| Brand film 1 pieza sin ads | 169 |
| Largometraje indie / productora | **desde 390** (revisión; pack 390–690) |
| Serie 1 ep | 79–169 |
| Serie 2–6 eps | pack / revisión **≥ 390** |
| TV regional / SVOD 1 título | **desde 890–1.800** |
| TV nacional / multi-cadena | **1.200–2.500+** o exclusiva |

### 5.2 Ads y branded

| Caso | Referencia |
|------|------------|
| Ads pago multi-canal ~6 m | base plazo + **130** (2y = **299**) |
| Brand film orgánico 1 pieza | 169 |
| Campaña global / holding | revisión **desde 1.200+** |
| TV spot nacional | revisión **desde 1.500+** |

### 5.3 Juegos y apps

| Caso | Referencia |
|------|------------|
| Indie game 1 título 1 track | 169 |
| Varias pistas mismo juego | 169 + 135×… (−20 %) |
| Live-ops / UA continuo | **desde 590/año** |
| SaaS / uso ilimitado en producto | **desde 590–1.200/año** |
| AAA / publisher | alta / exclusiva **≥ 1.200–10.000+** |

### 5.4 Exclusiva y buyout

| Caso | Referencia |
|------|------------|
| Exclusiva un solo uso | **890 €** |
| Exclusiva 1 año | **1.100 €** |
| Exclusiva 2 años media/territorio | **1.200 €** |
| + retirar catálogo | **+250 €** |
| Exclusiva fuerte multi-medio | **3.000–6.000 €+** |
| Buyout forever | **desde 2.990 €** |

---

## 6. Packs y varios temas

| Situación | Fórmula |
|-----------|---------|
| 1 tema 2y | 169 € (+ add-ons) |
| n temas mismo proyecto | 169 + 135×(n−1) |
| EP 1 proyecto | ≈ 70–85 % del sumatorio |
| 2 proyectos distintos | 2× licencia (o pack ~1,7× si cierran juntos) |

---

## 7. Descuentos y lo que no haces

| Pedido | Respuesta |
|--------|-----------|
| “¿50 € comercial?” | No. Micro **79** o lista **169**. |
| Crédito en vez de pago | Solo personal aprobado. |
| Pago al prize | No. Prepago master. |
| NGO | Hasta −50 % una vez, documentado. |
| Volumen 5+ obras | Pack −15–30 % sobre suma. |

---

## 8. Flujo operativo

```
Formulario (biblioteca / ficha)
  → /api/quote (LICENSE_PRICES)
  → mail licencias@ + cliente
  → instant: plantilla-comercial, cobro, WAV/stems
  → review: esta doc §5, 24–48 h
  → exclusiva/buyout: plantilla-exclusiva + prepago
```

---

## 9. Cómo actualizar precios

1. `LICENSE_PRICES` en **src** y **functions** `license-quote.ts` (idénticos).  
2. `TABLA-RAPIDA-PRECIOS.md` + este archivo.  
3. Plantillas comerciales/exclusiva.  
4. `music.json` `priceFrom` + `src/i18n/translations.ts`.  
5. Deploy.  
6. Opcional: A/B 2–4 semanas por tier y trackea conversiones.

---

## 10. Historial de anclas (resumen)

| Época | Comercial 2y | Exclusiva | Buyout | Notas |
|-------|--------------|-----------|--------|-------|
| Primera lista | 290 | 1.800 | 5.000 | Demasiado alto vs stock |
| Conservadora 2026-07 | 179 | 890 | 2.490 | Entrada mejor; techo blando |
| **Canon crítica 2026-07-21** | **169** + micro **79** | **1.200** | **2.990** | Volumen + premium real |

---

*Documento interno · no publicar tal cual · 2026-07-21*
