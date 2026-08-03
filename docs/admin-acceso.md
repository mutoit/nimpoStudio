# Panel admin — acceso solo estudio

URLs (no están en el menú público):

- https://www.nimpo3dstudio.com/admin/biblioteca/ — biblioteca / música
- https://www.nimpo3dstudio.com/admin/productos/ — productos software
- https://www.nimpo3dstudio.com/admin/pedidos/ — pedidos, clientes, transfer, keys
- https://www.nimpo3dstudio.com/admin/abonados/ — abonados newsletter + clientes compra (lista/export)
- https://www.nimpo3dstudio.com/admin/tickets/ — feedback / support / recovery

## Admin productos (`/admin/productos/`)

| Campo | Notas |
|-------|--------|
| **Estado** | `Publicado` · **`Beta`** · **`Demo`** · `Próximamente` · `Borrador` (oculto). No es la categoría. |
| **Beta / Demo** | Precio **no obligatorio**. En catálogo público: chip + sin mailto de compra si no hay Stripe/Payment Link. |
| **Precio EUR** | Decimales OK (`9.90`). Vacío = sin precio público. |
| **Stripe Price ID** | Único campo necesario para cobrar (Checkout). Fallback URL opcional. Glass live: ver `TAREAS-VENTAS-PRIORIDAD.md`. |
| **Imágenes / vídeo** | Al **editar**, la media anterior **se conserva**. Archivos nuevos se **añaden** (máx. 8 imgs). Un vídeo nuevo **sustituye solo el vídeo**. |
| **Reemplazar todo** | Casilla opcional: solo entonces se borran imágenes/vídeo previos y quedan los que subas ahora. |

### Ficha pública (`/es/catalogo/`)

| CTA | Cuándo |
|-----|--------|
| **Probar beta** | `status=beta` **y** Demo = descarga/web + URL (o zip demo). Mismo botón que demo. |
| **Probar demo** | Cualquier otro status público con Demo configurada. |
| **Comprar** | Plan con `stripePriceId` (o Payment Link en buyUrl). |
| **Compartir** | Siempre en ficha activa → Web Share o copiar `/es/catalogo/?p={slug}`. |
| Feedback / contacto | Siempre. |

### Descargas (contadores)

En la misma página **`/admin/productos/`** hay un bloque **Descargas**:

| Contador | Qué cuenta |
|----------|------------|
| **Demo** | Clic en «Probar demo/beta» con demo tipo descarga |
| **Web** | Clic en demo tipo web |
| **Req** | Clic en «Solicitar demo» |
| **Full** | Entrega real del binario con licencia (`GET /api/download?token=`) |

Datos en R2 `catalog/stats/downloads.json`. Respetan opt-out estudio (`?nimpo_no_stats=1`) en clics demo; full se cuenta en servidor al descargar.

Feedback/soporte público y mailto de estudio: **`contacto@nimpo3dstudio.com`** (`src/config/site.json`).  
Detalle catálogo/commerce: `docs/estado.md` § admin productos · `docs/commerce/MAPA-VENTA-CLIENTES-SOPORTE.md`.

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

## Admin biblioteca (`/admin/biblioteca/`)

Form **unificado** por obra (ya no hay «Canal vídeo» / «Canal stems»):

| Campo | Notas |
|-------|--------|
| **Vídeo / visual** | Opcional si hay stems; recomendado para la tarjeta |
| **Cover** | Opcional (poster) |
| **Stems HQ** | Opcional si hay vídeo; van a R2 `full/stems/` (privados) |
| **Master HQ** | Opcional; necesario para **Pagar** en público (`checkoutReady`) |
| **Licencia habilitada** | Si off → sin cotización ni Checkout en la ficha |
| **Precios / Stripe** | **No se editan por obra.** Baremo global: `functions/lib/stripe-license-prices.json` |

`kind` se infiere solo: **hay stems → `stems`**, si no → `video`.

### Publicar (un clic)

1. Login en `/admin/biblioteca/`
2. Título + media (vídeo y/o stems ± master) + moods
3. **Publicar en la web** → `POST /admin/publish`  
   - Ext allowlist: vídeo `mp4/webm/mov`, audio `mp3/wav/…`, imagen `jpg/png/webp`  
   - Máx **100 MB** / archivo, **250 MB** total, **24 stems**  
   - Media → R2 + upsert catálogo (`catalog/library.json` / ítems)

**No hace falta** copiar JSON ni redeploy.  
`POST /admin/upload` está **retirado** (410).

- Bucket: **`nimpo-library`** · Binding: **`LIBRARY_BUCKET`**
- Solo **previews** públicos vía `/api/media` (nunca HQ en `full/`)

### Feed Novedades + abonados email

En la **misma página** admin, bloque **Feed · Novedades**:

1. Título + descripción (+ etiqueta, fecha, **enlace** opcional a producto/obra)
2. Casilla **Avisar abonados por email** (solo si quieres mail; máx. 80 por publicación)
3. **Publicar en el feed** → `POST /admin/feed` → R2 `catalog/updates.json` (+ mails si marcaste avisar)

**Público:** form abono en **home** (bloque bajo el hero) → `POST /api/newsletter` (doble opt-in).  
Panel lateral Novedades = solo feed (sin form; no rompe el rail).  
**Admin listas:** `/admin/abonados/` — abonados (filtro, baja, borrar, CSV) + clientes compra (CSV).  
Lista R2: `catalog/newsletter.json`. Confirm / baja pública: `GET /api/newsletter?action=confirm|unsubscribe&t=…`

Seed feed opcional:
```powershell
npx wrangler r2 object put nimpo-library/catalog/updates.json --file=src/data/updates.json --remote
```

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
