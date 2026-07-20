# Panel admin — acceso solo estudio

URL (no está en el menú público):

- https://www.nimpo3dstudio.com/admin/biblioteca/

## Cómo entra solo tú

1. Secretos en **Cloudflare Pages** → proyecto **nimpo-studio** → **Settings** → **Environment variables**

| Variable | Tipo | Uso |
|----------|------|-----|
| `ADMIN_LIBRARY_SECRET` | Secret | Contraseña de login |
| `ADMIN_SESSION_SECRET` | Secret | Clave HMAC de la cookie (**recomendada**, distinta y larga) |

Si no pones `ADMIN_SESSION_SECRET`, la cookie se firma con una clave **derivada** del password (ok para arrancar; mejor poner una aleatoria de 32+ bytes).

2. Abre `/admin/biblioteca/` → **Panel privado** → contraseña.

3. Sesión: cookie **httpOnly**, `Path=/admin`, `SameSite=Strict`, 14 días. Botón **Cerrar sesión**.

La contraseña **no** va en el JavaScript del navegador. El middleware (`functions/_middleware.ts`) bloquea todo `/admin/*` sin cookie válida.

**Importante:** no se confía en cabeceras tipo `CF-Access-Jwt-Assertion` sin verificar firma (son spoofable).

### CLI

```powershell
cd nimpo-studio
npx wrangler pages secret put ADMIN_LIBRARY_SECRET --project-name=nimpo-studio
npx wrangler pages secret put ADMIN_SESSION_SECRET --project-name=nimpo-studio
# valor largo aleatorio, ej.:
# [Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Max 256 }) -as [byte[]])
npm run deploy
```

Copia local del valor (gitignored): `.admin-secret.local` / `.dev.vars` (solo tu máquina).

```
ADMIN_LIBRARY_SECRET=dev-solo-local
ADMIN_SESSION_SECRET=dev-session-key-min-16-chars
```

## Rate limit

- Login: **8 intentos / 15 min** por IP (memoria isolate + KV si `RATE_LIMIT_KV`).
- Publish: **15 / hora** por IP.
- Tras 429: espera o cambia de red.

### KV global (opcional, multi-edge)

```toml
# wrangler.toml
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "<tu-namespace-id>"
```

Sin KV el límite es por isolate (sigue mejor que nada; WAF/Access refuerzan).

## Publicar (un solo clic)

1. Login en `/admin/biblioteca/`
2. Canal vídeo o stems + archivos + tags/moods
3. **Publicar en la web** → `POST /admin/publish`

### Feed Novedades (home)

En la **misma página** admin, bloque **Feed · Novedades**:

1. Título + descripción (+ etiqueta y fecha)
2. **Publicar en el feed** → `POST /admin/feed` → R2 `catalog/updates.json`
3. Home lee `GET /api/updates` y actualiza el panel al recargar

Seed opcional:
```powershell
npx wrangler r2 object put nimpo-library/catalog/updates.json --file=src/data/updates.json --remote
```
   - Solo ext allowlist: vídeo `mp4/webm/mov`, audio `mp3/wav/m4a/ogg/aac`, imagen `jpg/png/webp`
   - Máx **100 MB** / archivo, **250 MB** total, **24 stems**
   - Content-Type canónico (no se fía del cliente)
   - Sube media a R2 + upsert `catalog/library.json`
4. Abre `/es/biblioteca/` y **recarga**

**No hace falta** copiar JSON ni redeploy.  
`POST /admin/upload` está **retirado** (410).

- Bucket: **`nimpo-library`**
- Binding: **`LIBRARY_BUCKET`**
- Público media: `https://pub-c5f9444f68c84064be0b94ebfd66c91c.r2.dev/...`
- Solo **previews** (nunca masters de entrega en r2.dev público).

## Capa extra recomendada — Cloudflare Access

Zero Trust → Access → Application self-hosted en `www.nimpo3dstudio.com/admin*`  
Policy: Allow → tu email (OTP).

```powershell
pwsh scripts/setup-access-admin.ps1 -Email "tu@email.com"
```

Requiere token API con **Access: Edit**. Access va **delante** del edge; el login por cookie del sitio sigue siendo la defensa en código.

## Local

`astro dev` no ejecuta middleware de Pages.  
Probar auth: `npm run build` + `npx wrangler pages dev dist` con `.dev.vars`.
