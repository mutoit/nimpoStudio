# Updates de la app — contrato para el programador del producto

**Modelo:** aviso al arrancar (si hay licencia) → usuario acepta → **navegador o descarga del instalador** → **el usuario instala el setup**.  
Sin auto-instalación silenciosa en la app.

**Última revisión:** 2026-07-31  
**Sitio:** https://www.nimpo3dstudio.com  

---

## ¿Es solo “subir un archivo a un sitio”?

**Casi.** En la práctica:

| Quién | Qué hace |
|--------|----------|
| **Tú (estudio)** | En admin productos: subes el **full** (instalador/zip) + pones el campo **`version`** (ej. `1.2.0`) + publicas |
| **La web** | Guarda el binario en R2 (privado) y expone la **versión** en la API pública del producto |
| **La app** | Al arrancar (con key/usuario registrado): lee la versión remota; si es nueva → mensaje; Aceptar → abre la URL de descarga (cuenta / ficha) |

No hace falta un CDN aparte ni un “servidor de updates” extra.  
**No** se expone el full en una URL pública libre (solo tras compra / cuenta).

---

## Identificadores que debe conocer la app

| Campo | Ejemplo | Notas |
|-------|---------|--------|
| `productSlug` | `mi-app` | Fijo en la app. Es el slug del producto en el catálogo. **No cambiar** si las keys deben seguir valiendo |
| `version` local | `1.0.0` | Compilada en el binario (semver recomendado: `MAJOR.MINOR.PATCH`) |
| License key | `NIMPO-XXXX-…` | Ya la tenéis tras compra / activate |

---

## Comprobar si hay update (API ya existente)

```http
GET https://www.nimpo3dstudio.com/api/products?slug={productSlug}
Accept: application/json
```

**Respuesta útil (detalle):**

```json
{
  "ok": true,
  "view": "detail",
  "item": {
    "slug": "mi-app",
    "name": "…",
    "version": "1.2.0",
    "status": "published",
    "hasFullBuild": true,
    "pricing": [ … ]
  }
}
```

| Campo | Uso en la app |
|-------|----------------|
| `item.version` | Comparar con la versión local |
| `item.hasFullBuild` | Si `false`, no ofrezcas update (aún no hay instalador subido) |
| `item.status` | Solo tiene sentido si no es `draft` (la API ya oculta drafts) |

**CORS:** `Access-Control-Allow-Origin: *` en esta API → la app de escritorio puede hacer el GET sin proxy.

**Si `ok: false` / `not_found`:** no hay producto o está en draft → no molestar al usuario.

### Comparar versiones

Recomendado **semver**:

- Remoto `1.2.0` > local `1.1.0` → hay update.  
- Iguales → silencio.  
- Remoto menor (rollback raro) → ignorar o política vuestra.

Si solo usáis strings, documentad el formato (siempre `x.y.z` numérico).

---

## Cuándo mostrar el aviso

Solo si **hay licencia / usuario registrado en la app** (key activada o panel logueado).  
Si es demo sin compra → **no** forzar update (o solo “hay versión nueva en la web” sin reclamar descarga de full).

---

## Qué hacer al Aceptar

### Opción A (la más simple) — abrir el navegador

Abrir una de estas URLs (HTTPS):

| URL | Cuándo |
|-----|--------|
| `https://www.nimpo3dstudio.com/es/cuenta/` | Re-descarga con magic link (email de compra) |
| `https://www.nimpo3dstudio.com/es/catalogo/` (o ficha del producto) | Si preferís la tienda |

El usuario entra en **cuenta**, se identifica con el email de compra, y baja el **full** actual.

### Opción B — descarga directa desde la app (opcional, un poco más de código)

Hoy el full **no** se da con un GET público. Hace falta:

1. Key válida + producto, o sesión de cuenta.  
2. `POST /api/download` con `{ "licenseKey", "productSlug" }` (o sesión magic) → devuelve URL con token.  
3. La app descarga ese URL a Descargas.  
4. Mensaje: “Instalador listo. Ejecútalo tú.”

Si no queréis complicar la app: **solo opción A**.

---

## Activación (recordatorio; ya existe)

```http
POST https://www.nimpo3dstudio.com/api/license/activate
Content-Type: application/json

{ "key": "NIMPO-…", "machineId": "…", "productSlug": "mi-app" }
```

Respuesta: `ok`, `seats`, `nick`, errores `invalid_key` / `revoked` / `seats_exhausted` / `product_mismatch`.

El check de update **no sustituye** la activación; va **después** de tener key válida en el panel.

---

## Checklist estudio (cada release)

1. Admin → `/admin/productos/` → producto  
2. Subir **full** (instalador)  
3. Poner **`version`** = la misma que lleva el binario nuevo  
4. Guardar / publicar  
5. Probar: `GET /api/products?slug=…` devuelve esa `version` y `hasFullBuild: true`  
6. Probar re-descarga en `/es/cuenta/` con un email de prueba  

**No** hace falta otro servidor.  
**Sí** hace falta que el número de versión en el instalador y en el admin coincidan.

---

## Contrato mínimo (copiar al dev)

```
productSlug   = <slug fijo del catálogo>
localVersion  = <semver en el binario>

Al arrancar (solo si hay licencia activa):
  GET /api/products?slug={productSlug}
  si item.version > localVersion && item.hasFullBuild:
    mostrar: "Hay una actualización (item.version)"
    Aceptar → abrir https://www.nimpo3dstudio.com/es/cuenta/
    (el usuario instala el archivo que baje)

Base URL producción: https://www.nimpo3dstudio.com
```

---

## Fuera de alcance (a propósito)

- Instalación silenciosa / reemplazo del exe en caliente  
- Diff patches  
- Canales beta/stable  
- Forzar cierre de la app  

---

*Nimpo 3D Studio · handoff programador de producto · 2026-07-31*
