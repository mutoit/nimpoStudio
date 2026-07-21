# Licencias de música — pack operativo

Documentos para **vender ya**, sin “consultar por todo”.

| Archivo | Para qué |
|---------|----------|
| [**TABLA-RAPIDA-PRECIOS.md**](./TABLA-RAPIDA-PRECIOS.md) | **Vista rápida** uso → precio (bolsillo) |
| [00-PRECIOS-REFERENCIA.md](./00-PRECIOS-REFERENCIA.md) | Lista completa + reglas + evidencia |
| [plantilla-personal.md](./plantilla-personal.md) | Contrato corto personal |
| [plantilla-comercial.md](./plantilla-comercial.md) | Contrato comercial **169 €** base + plazos |
| [plantilla-exclusiva.md](./plantilla-exclusiva.md) | Contrato exclusiva **desde 1.200 €** |
| [PLAN-BIBLIOTECA-Y-PRECIOS.md](./PLAN-BIBLIOTECA-Y-PRECIOS.md) | Plan biblioteca + historial de anclas |

## Canon 2026 (adoptado)

| Tier | Lista web / calculadora |
|------|-------------------------|
| Personal | Bajo petición (**0–49 €** o denegación). Marca/monetizar → comercial |
| Micro / single | **79 €** |
| Comercial 1 año / proyecto / 2 años | **129 / 159 / 169 €** |
| Ads pack (2 años) | **299 €** (169 + 130) |
| Stems / edit | **+59 / +49 €** |
| Exclusiva media/territorio | **Desde 1.200 €** |
| Buyout | **Desde 2.990 €** |

**Criterios:** baja entrada (volumen vs stock 30–60 €) · premium real en TV/cine/ads · dto volumen −15–25 % desde 2.º track · add-ons fijos · calculadora dinámica por uso (no precio plano).

Fuente de verdad en código: `src/lib/license-quote.ts` = `functions/lib/license-quote.ts` (`LICENSE_PRICES`).  
UI: `music.json` → `license.tiers[].priceFrom` + i18n usage labels.

Si cambias un precio: **license-quote** (src + functions) + **TABLA-RAPIDA** + **00-PRECIOS** + plantillas + i18n + `music.json`.

## Correo

| Dirección | Uso |
|-----------|-----|
| `licencias@nimpo3dstudio.com` | From de presupuestos automáticos + reenvío a Gmail |
| `contacto@nimpo3dstudio.com` | Contacto general |

## Flujo de una venta comercial normal

1. Cliente rellena formulario (biblioteca o ficha) → `/api/quote`.  
2. Confirmas tarifa (o cotizas con `00-PRECIOS-REFERENCIA.md` si es revisión).  
3. Rellenas `plantilla-comercial.md` (o exclusiva) → PDF.  
4. Cobras.  
5. Envías master (y stems si pagó +59).  
6. Archivas PDF + pago.

## A/B y métricas (recomendado)

Tras 5–10 ventas o ~4 semanas: revisar conversión por tier (micro vs 2y vs ads). Ajustar anclas solo con datos; no por “precio bonito”.

## Firma

- Comercial estándar: PDF + “acepto” por email + pago = suficiente para empezar.  
- Exclusiva / marcas: DocuSign / Adobe Sign.

## No es asesoría legal

Plantillas de trabajo del estudio. Si facturas mucho o firmas con majors, revísalas con un abogado.
