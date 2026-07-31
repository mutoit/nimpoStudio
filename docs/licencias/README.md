# Licencias de música — pack operativo

Documentos para **vender ya**, sin “consultar por todo”.

## Modelo web actual (2026-07-31)

**Política técnica completa:** [`docs/commerce/POLITICA-MUSICA-BIBLIOTECA.md`](../commerce/POLITICA-MUSICA-BIBLIOTECA.md)

| Canal | Uso |
|-------|-----|
| **Pagar online** | Biblioteca → Checkout Stripe si la obra tiene master + `stripePriceId` |
| **Cotización** | Formulario → `/api/quote` (exclusivas, usos raros, sin Price aún) |
| **Preview** | 1 mix ligero en web; master/stems HQ solo tras pago (R2 privado) |

Los precios de la **calculadora** de este pack siguen siendo la referencia de catálogo; el Price de Stripe de cada ficha debe alinearse con la tarifa que quieras cobrar online.

| Archivo | Para qué |
|---------|----------|
| [**../commerce/POLITICA-MUSICA-BIBLIOTECA.md**](../commerce/POLITICA-MUSICA-BIBLIOTECA.md) | **Política web**: preview / HQ / checkout / descarga |
| [**TABLA-RAPIDA-PRECIOS.md**](./TABLA-RAPIDA-PRECIOS.md) | **Vista rápida** uso → precio (bolsillo) |
| [00-PRECIOS-REFERENCIA.md](./00-PRECIOS-REFERENCIA.md) | Lista completa + reglas + evidencia |
| [**ESTRATEGIA-LANZAMIENTO.md**](./ESTRATEGIA-LANZAMIENTO.md) | Founder price 5–10 clientes, case studies, **testimonios y valoraciones** |
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
| Exclusiva fuerte multi-medio | **Desde 3.000 €** |
| Buyout | **Desde 2.990 €** |
| Buyout alto / a medida | **Desde 5.500 €** |

**Criterios:** baja entrada (volumen vs stock 30–60 €) · premium real en TV/cine/ads · dto volumen −15–25 % desde 2.º track · add-ons fijos · calculadora dinámica por uso (no precio plano).

Fuente de verdad en código: `src/lib/license-quote.ts` = `functions/lib/license-quote.ts` (`LICENSE_PRICES`).  
UI: `music.json` → `license.tiers[].priceFrom` + i18n usage labels.

Si cambias un precio: **license-quote** (src + functions) + **TABLA-RAPIDA** + **00-PRECIOS** + plantillas + i18n + `music.json`.

## Correo

| Dirección | Uso |
|-----------|-----|
| `licencias@nimpo3dstudio.com` | From de presupuestos automáticos + reenvío a Gmail |
| `contacto@nimpo3dstudio.com` | Contacto general |

## Flujo de una venta

### A) Online (preferido cuando hay Price + master)

1. Cliente en biblioteca → **Pagar con tarjeta** (Stripe).  
2. Webhook → pedido + mail con descarga 72 h.  
3. Re-descarga desde `/es/cuenta/` (magic link).  
4. Opcional: PDF de licencia con plantilla si quieres formalizar.

### B) Cotización / exclusiva / sin Price

1. Cliente rellena formulario → `/api/quote`.  
2. Confirmas tarifa (`00-PRECIOS-REFERENCIA.md` / tabla rápida).  
3. Rellenas plantilla → PDF.  
4. Cobras (transfer / Stripe manual).  
5. Entregas master/stems (R2 privado o envío).  
6. Archivas PDF + pago.

## A/B y métricas (recomendado)

Tras 5–10 ventas o ~4 semanas: revisar conversión por tier (micro vs 2y vs ads). Ajustar anclas solo con datos; no por “precio bonito”.

## Lanzamiento (cuando el catálogo esté listo)

Ver [**ESTRATEGIA-LANZAMIENTO.md**](./ESTRATEGIA-LANZAMIENTO.md):

- Primeros **5–10 clientes**: founder **−15–25 %** (ej. comercial **129 €** vs lista 169) + stems gratis o crédito.  
- Documentar **case studies**.  
- Pedir **testimonios** y **valoración** de las obras (pendiente de UI en la web).

## Firma

- Comercial estándar: PDF + “acepto” por email + pago = suficiente para empezar.  
- Exclusiva / marcas: DocuSign / Adobe Sign.

## No es asesoría legal

Plantillas de trabajo del estudio. Si facturas mucho o firmas con majors, revísalas con un abogado.
