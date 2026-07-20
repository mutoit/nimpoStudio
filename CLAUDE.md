# Nimpo 3D Studio — instrucciones para el agente IA

Proyecto: sitio Astro 7 estático + Pages Functions. Repo git en esta carpeta (`nimpo-studio/`).

## Objetivo

El usuario solo pide qué hacer. Tú editas, verificas build, haces commit + push, y compruebas producción.

## Stack (gratis)

| Capa | Servicio |
|------|----------|
| Hosting | **Cloudflare Pages** (`nimpo-studio`) |
| Dominio/DNS | Cloudflare (`nimpo3dstudio.com`) |
| Email | Cloudflare Email Routing |
| Analíticas | CF Web Analytics (panel) + `/api/track` (Pages Function) |
| Repo | GitHub `mutoit/nimpoStudio` |

No usar Vercel para este proyecto.

## Flujo tras cada cambio

1. Trabaja siempre en `E:\nimpoStudioWeb\nimpo-studio\` (o ruta equivalente).
2. `npm run build` — si falla, arregla antes de push.
3. `git add` → `git commit -m "tipo: descripción"` → `git push origin main`.
4. Espera ~2 min; verifica con curl o fetch: `https://www.nimpo3dstudio.com/es/`.
5. Si el usuario no ve cambios: indicar Purge Cache en Cloudflare (o `npm run cf:audit` si hay token).

Deploy principal: **Pages Git** (push dispara build). No ejecutar deploy manual salvo que Pages Git falle.

## Admin privado
- URL: `/admin/biblioteca/` (sin enlace en menú).
- Auth servidor: `functions/_middleware.ts` + secret Pages `ADMIN_LIBRARY_SECRET`.
- Docs: `docs/admin-acceso.md`. Opcional: Cloudflare Access en `/admin*`.
- **No** confiar en headers `CF-Access-Jwt-Assertion` sin verificar firma.

## Qué archivo tocar según la tarea

| Tarea | Archivo(s) |
|-------|------------|
| Producto nuevo/editar | `src/data/products.json` + `public/images/products/` |
| Música / lanzamiento | `src/data/music.json` + `public/images/music/` + `public/previews/music/` |
| Aviso / novedad | `src/data/updates.json` |
| Marca, email, redes | `src/config/site.json` |
| Textos legales | `src/content/legal/` o páginas `[lang]/` |
| Estilos globales | `src/styles/` |
| SEO / meta / analíticas | `src/lib/analytics/`, variables `PUBLIC_*` |
| API analíticas | `functions/api/track.ts` |
| Redirects | `astro.config.mjs` + `public/_redirects` |
| Deploy / infra | `wrangler.toml`, `DEPLOY.md`, `SETUP-PAGES.md` |

## i18n

Rutas con prefijo: `/es/`, `/en/`, `/fr/`. Redirect `/` → `/es` en `astro.config.mjs` y `public/_redirects`.

## Comandos útiles

```bash
npm run dev          # desarrollo local :4321
npm run build        # verificar antes de push
npm run deploy       # respaldo manual (necesita token en .env)
npm run cf:audit     # estado DNS/email/variables
npm run cf:token     # permisos del token API
```

## MCP / herramientas externas

- **GitHub MCP**: comprobar workflow runs (`mutoit/nimpoStudio`) si hace falta.
- **Cloudflare MCP**: configurado en `.cursor/mcp.json` (requiere auth del usuario).
- Scripts `scripts/cloudflare-*.ps1` leen `CLOUDFLARE_API_TOKEN` de `.env`.

## Variables de entorno

- Local: `.env` (copiar de `.env.example`). Nunca commitear `.env`.
- Producción build: Cloudflare Pages → Settings → Environment variables.
- `PUBLIC_*` se embeben en el build de Astro.

## Lo que el usuario debe hacer (no automatizable)

- Crear proyecto Pages y dominios → `SETUP-PAGES.md` (una vez).
- Verificar Search Console / Bing (copiar meta → tú pones `PUBLIC_GSC_VERIFICATION` etc.).
- Stripe / R2 / D1 cuando llegue fase 2 (cuentas y pagos).

## Documentación

| Doc | Contenido |
|-----|-----------|
| `SETUP-PAGES.md` | Migración Pages — checklist usuario |
| `DEPLOY.md` | Flujo deploy |
| `docs/estado.md` | Tareas y roadmap |
| `docs/configuracion.md` | Infra DNS/email |
| `docs/analytics-publi.md` | SEO y analíticas |

## Commits

Formato: `feat:`, `fix:`, `chore:`, `docs:` — mensajes en español o inglés, una línea clara.

## Tests

No ejecutar suites por inicia