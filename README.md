# Nimpo 3D Studio — Web

Catálogo de productos digitales. Fase 1: vitrina estática. Preparado para tienda, clientes y licencias.

- **Dominio:** https://nimpo3dstudio.com (custom domain vía wrangler routes)
- **Repo:** https://github.com/mutoit/nimpoStudio.git

## Desarrollo local

```bash
cd nimpo-studio
npm install
npm run dev
```

Abre http://localhost:4321/catalogo

## Añadir un producto (5 minutos)

1. Edita `src/data/products.json` — copia un objeto existente y cambia los campos.
2. Imagen de portada:
   - **Opción A:** URL externa (como los ejemplos actuales)
   - **Opción B:** archivo en `public/images/products/tu-producto.jpg` → `"images": ["/images/products/tu-producto.jpg"]`
3. Preview de audio (opcional): pon un MP3 corto en `public/previews/` y `"previewAudio": "/previews/tu-preview.mp3"`
4. `status`: `published` | `draft` (oculto) | `coming-soon`
5. `npm run build` para comprobar que no hay errores.

## Configuración del sitio

Edita `src/config/site.json`:

- `email` — dirección de contacto
- `emailStatus` — cambia a `"active"` cuando Email Routing esté activo
- `social` — Instagram, GitHub, etc.

## Email con tu dominio (gratis, sin Google Workspace)

**Cloudflare Email Routing** reenvía `contacto@nimpo3dstudio.com` → tu Gmail/outlook personal.

1. Añade el dominio `nimpo3dstudio.com` a Cloudflare (DNS).
2. En Cloudflare → **Email** → **Email Routing** → activar.
3. Crea dirección: `contacto@nimpo3dstudio.com` → reenvío a tu email personal.
4. En `site.json`: `"emailStatus": "active"`.

No pagas Google Workspace. Recibes y respondes desde tu email habitual (puedes configurar "enviar como" en Gmail).

## Subir a GitHub

```bash
cd nimpo-studio
git init
git add .
git commit -m "feat: catálogo fase 1"
git remote add origin https://github.com/mutoit/nimpoStudio.git
git branch -M main
git push -u origin main
```

Si el repo ya tiene contenido, haz `git pull` primero o fusiona según prefieras.

## Deploy en Cloudflare

1. Conectar repo `mutoit/nimpoStudio` en Cloudflare.
2. **Build command:** `npm run build`
3. **Deploy command:** `npx wrangler deploy` (usa `wrangler.toml` → carpeta `dist/`)
4. **Node version:** 22
5. Tras el deploy: **Custom domain** → `nimpo3dstudio.com`

Cada push a `main` redeploya automáticamente.

## Estado y tareas

Qué está hecho, qué falta y qué depende de contenido real:  
→ [`docs/estado.md`](docs/estado.md)

## Documentación de infraestructura

Configuración Cloudflare, Squarespace, DNS, Workers y email:  
→ [`docs/configuracion.md`](docs/configuracion.md)

## Roadmap

| Fase | Qué incluye |
|------|-------------|
| **1 (ahora)** | Música, catálogo, fichas, sobre, contacto |
| **2** | Stripe + R2 + email de confirmación |
| **3** | Cuentas + descargas + licencias |
| **4** | Panel admin opcional |

## Estructura

```
docs/estado.md           ← tareas y estado del proyecto
src/data/updates.json    ← feed de novedades (panel lateral)
src/data/music.json      ← composiciones / lanzamientos
src/data/products.json   ← catálogo digital
src/config/site.json     ← marca y contacto
public/images/music/     ← portadas música
public/previews/music/   ← MP3 preview
public/images/products/  ← portadas productos
functions/               ← API futura (vacía)
```