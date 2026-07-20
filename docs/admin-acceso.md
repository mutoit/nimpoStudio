# Panel admin — acceso solo estudio

URL (no está en el menú público):

- https://www.nimpo3dstudio.com/admin/biblioteca/

## Cómo entra solo tú

1. Secreto en **Cloudflare Pages** → proyecto **nimpo-studio** → **Settings** → **Environment variables**  
   - Name: `ADMIN_LIBRARY_SECRET` (tipo **Secret**)  
   - Valor: contraseña larga solo tuya  

2. Abre `/admin/biblioteca/` → pantalla **Panel privado** → contraseña.

3. Sesión: cookie **httpOnly**, `Path=/admin`, 14 días. Botón **Cerrar sesión**.

La contraseña **no** va en el JavaScript del navegador. El middleware (`functions/_middleware.ts`) bloquea todo `/admin/*` sin cookie válida.

**Importante:** no se confía en cabeceras tipo `CF-Access-Jwt-Assertion` sin verificar firma (son spoofable).

### CLI

```powershell
cd nimpo-studio
npx wrangler pages secret put ADMIN_LIBRARY_SECRET --project-name=nimpo-studio
npm run deploy
```

Copia local del valor (gitignored): `.admin-secret.local` / `.dev.vars` (solo tu máquina).

## Rate limit

- Login: **10 intentos / 15 min** por IP (en memoria del isolate).
- Tras 429: espera o cambia de red.

## Qué hace el panel

### Archivos (vídeo / cover / stems)
1. Eliges archivos con el selector del navegador (no es solo texto).
2. **Preparar archivos + JSON** descarga cada media con el nombre correcto + un `.library-item.json`.
3. Tú mueves los media a `public/library/` y pegas el JSON en `src/data/library.json`.
4. `npm run build` / deploy.

### R2 (opcional, servidor)
Si en la cuenta Cloudflare activas **R2** y añades el binding `LIBRARY_BUCKET` al proyecto Pages, el botón **Subir a R2** usa `POST /admin/upload` (misma cookie admin).  
Hoy la cuenta puede tener R2 desactivado (`enable R2 in dashboard`); hasta entonces usa la descarga local.

- **No** es un almacén de masters de entrega: lo público es preview de catálogo.
- Masters finales: fuera de la web.

## Capa extra opcional — Cloudflare Access

Zero Trust → Access → Application self-hosted en `www.nimpo3dstudio.com/admin*`  
Policy: Allow → tu email (OTP).

Requiere token API con **Access: Edit**. Script: `scripts/setup-access-admin.ps1 -Email "tu@email.com"`.

Access va **delante** del edge; el login por cookie del sitio sigue siendo la defensa en código.

## Local

`astro dev` no ejecuta middleware de Pages.  
Probar auth: `npm run build` + `npx wrangler pages dev dist` con `.dev.vars`:

```
ADMIN_LIBRARY_SECRET=dev-solo-local
```
