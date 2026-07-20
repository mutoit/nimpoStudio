# Licencias de música — pack operativo

Documentos para **vender ya**, sin “consultar por todo”.

| Archivo | Para qué |
|---------|----------|
| [**TABLA-RAPIDA-PRECIOS.md**](./TABLA-RAPIDA-PRECIOS.md) | **Vista rápida** uso → precio (la de bolsillo) |
| [00-PRECIOS-REFERENCIA.md](./00-PRECIOS-REFERENCIA.md) | Lista completa + reglas |
| [plantilla-personal.md](./plantilla-personal.md) | Contrato corto personal |
| [plantilla-comercial.md](./plantilla-comercial.md) | Contrato comercial **179 €** + add-ons |
| [plantilla-exclusiva.md](./plantilla-exclusiva.md) | Contrato exclusiva **desde 890 €** |
| [PLAN-BIBLIOTECA-Y-PRECIOS.md](./PLAN-BIBLIOTECA-Y-PRECIOS.md) | Plan biblioteca + anclas conservadoras |

## En la web (comportamiento deseado)

| Tier | Lo que ve el cliente |
|------|----------------------|
| Personal | Bajo petición (propósito) |
| Comercial | **179 €** |
| Ads pack | **329 €** |
| Exclusiva | **Desde 890 €** |
| Buyout | **Desde 2.490 €** |

Fuente de verdad de precios en código: `src/lib/license-quote.ts` (`LICENSE_PRICES`).  
UI: `music.json` → `license.tiers[].priceFrom` + i18n usage labels.  
Si cambias un precio: actualiza **license-quote** (src + functions) + **TABLA-RAPIDA** + i18n + plantillas.

## Correo

| Dirección | Uso |
|-----------|-----|
| `licencias@nimpo3dstudio.com` | From de presupuestos automáticos + reenvío a tu Gmail |
| `contacto@nimpo3dstudio.com` | Contacto general (también reenvío a Gmail) |

Si el cliente responde al presupuesto, llega a **licencias@** → Gmail.

## Flujo de una venta comercial normal

1. Cliente rellena el formulario en la ficha → `/api/quote`.  
2. Confirmas tarifa (o cotizas con `00-PRECIOS-REFERENCIA.md` si es revisión).  
3. Rellenas `plantilla-comercial.md` (o exclusiva) → PDF.  
4. Cobras.  
5. Envías master (y stems si pagó +100).  
6. Archivas PDF + pago.

## Firma

- Comercial estándar: PDF + “acepto” por email + pago = suficiente para empezar.  
- Exclusiva / marcas: DocuSign / Adobe Sign.

## No es asesoría legal

Plantillas de trabajo del estudio. Si facturas mucho o firmas con majors, revísalas con un abogado.
