# Panel admin — acceso solo estudio

URL (no está en el menú público):

- https://www.nimpo3dstudio.com/admin/biblioteca/

## Cómo entra solo tú (capa 1 — ya en código)

1. En **Cloudflare Dashboard** → **Workers & Pages** → proyecto **nimpo-studio**  
2. **Settings** → **Environment variables**  
3. Añade secreto de producción:

   | Name | Type | Value |
   |------|------|--------|
   | `ADMIN_LIBRARY_SECRET` | **Secret** | una contraseña larga solo tuya |

4. Redeploy (o `npm run deploy`).

5. Abre `/admin/biblioteca/` → pantalla de login del servidor → introduce esa contraseña.

La sesión es una **cookie httpOnly** firmada (14 días). Botón **Cerrar sesión** en el panel.

**Importante:** la contraseña **no** va en el JavaScript público. Sin el secreto en Pages, `/admin/*` no deja pasar.

### CLI (alternativa)

```powershell
cd nimpo-studio
# te pedirá el valor (no lo pegues en git)
npx wrangler pages secret put ADMIN_LIBRARY_SECRET --project-name=nimpo-studio
npm run deploy
```

## Capa 2 (recomendada) — Cloudflare Access

Añade login por **email** delante de toda la ruta `/admin/*`:

1. [Zero Trust Dashboard](https://one.dash.cloudflare.com/) → **Access** → **Applications**  
2. **Add an application** → **Self-hosted**  
3. Public hostname:
   - `www.nimpo3dstudio.com` path `admin*`
   - y/o `nimpo3dstudio.com` path `admin*`  
4. Policy: **Allow** → **Emails** → tu email (ej. el de la cuenta Cloudflare / Gmail del estudio)  
5. Identity: **One-time PIN** (email) es suficiente (gratis en plan free de Zero Trust).

Resultado: al abrir `/admin/...` primero Cloudflare pide tu email + código; luego la contraseña del panel (doble candado).

Script de ayuda (requiere token API con permiso **Access: Edit**):

```powershell
pwsh scripts/setup-access-admin.ps1 -Email "tu@email.com"
```

## Qué no hacer

- No pongas el secreto en `PUBLIC_*` ni en el repo.  
- No enlaces `/admin` desde el menú del sitio.  
- No uses la clave antigua del front (`nimpo-admin-library`): ya no aplica.

## Local

`astro dev` **no** ejecuta el middleware de Pages: el HTML de admin se ve sin cookie.  
Para probar auth de verdad: `npm run build` + `npx wrangler pages dev dist` con el secret en `.dev.vars`:

```
ADMIN_LIBRARY_SECRET=dev-solo-local
```
