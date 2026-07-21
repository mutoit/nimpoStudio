# Migración a Cloudflare Pages — checklist (solo tú, ~15 min)

Haz estos pasos **una vez**. Después solo pides cambios y la IA hace `git push`.

---

## 1. Crear proyecto Pages

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Autoriza GitHub si pide.
3. Repo: **`mutoit/nimpoStudio`**.
4. Configuración de build:

   | Campo | Valor |
   |-------|--------|
   | Production branch | `main` |
   | Framework preset | None / Astro (si aparece) |
   | **Root directory** | *(dejar vacío)* |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Environment variable | `NODE_VERSION` = `22` *(opcional si falla el build)* |

5. **Save and Deploy** — espera el primer build (puede fallar si aún no has hecho push de los cambios de migración; repite deploy tras el push).

---

## 2. Nombre del proyecto

El proyecto debe llamarse **`nimpo-studio`** (coincide con `wrangler.toml` y scripts).

Si Cloudflare generó otro nombre, renómbralo en **Settings → General** o ajusta `wrangler.toml` / `scripts/deploy.ps1` al nombre real.

---

## 3. Dominios personalizados

En el proyecto Pages → **Custom domains** → **Set up a custom domain**:

1. `nimpo3dstudio.com`
2. `www.nimpo3dstudio.com`

Cloudflare actualizará DNS automáticamente. Acepta los cambios que proponga.

---

## 4. Variables de entorno (cuando las necesites)

Pages → **Settings** → **Environment variables** → Production:

| Variable | Cuándo |
|----------|--------|
| `PUBLIC_GSC_VERIFICATION` | Search Console |
| `PUBLIC_BING_VERIFICATION` | Bing Webmaster |
| `PUBLIC_GA_MEASUREMENT_ID` | Google Analytics 4 |
| `PUBLIC_CLARITY_PROJECT_ID` | Microsoft Clarity (gratis) |
| `PUBLIC_META_PIXEL_ID` | Solo si haces ads |

**Web Analytics (manual + opt-out estudio):** en el panel CF → Manage site → **Enable with JS Snippet installation**.  
Pon el token del snippet en `PUBLIC_CF_WEB_ANALYTICS_TOKEN` (Pages → Variables + `.env` local).  
No uses “Enable” automático: si no, el auto-inject te cuenta siempre y el opt-out `?nimpo_no_stats=1` no puede cortarlo.

Tras añadir variables: **Retry deployment** o un `git push`.

---

## 5. Quitar el Worker del dominio (importante)

Si no haces esto, Worker y Pages pueden pisarse.

1. **Domains** → `nimpo3dstudio.com` → **Workers Routes** → elimina rutas de `nimpostudioweb`.
2. Worker `nimpostudioweb` → **Settings** → quita custom domains si aparecen.
3. **DNS** → revisa que `www` ya no apunte a `*.workers.dev` (Pages lo cambia al añadir custom domain).

El Worker puede quedarse sin dominio (archivado) o borrarse más adelante.

---

## 6. Token API (opcional — para la IA y deploy manual)

Solo si quieres que scripts locales y GitHub Actions de respaldo funcionen:

1. [API Tokens](https://dash.cloudflare.com/profile/api-tokens/) → **Create Token** → plantilla **Edit Cloudflare Workers** o custom:
   - Account → **Cloudflare Pages** → Edit
   - Account → **Account Settings** → Read
   - Zone → **DNS** → Edit *(opcional)*
   - Zone → **Cache Purge** → Purge *(opcional)*

2. Copia el token a:
   - `nimpo-studio/.env` → `CLOUDFLARE_API_TOKEN=...`
   - GitHub → repo → **Settings** → **Secrets** → `CLOUDFLARE_API_TOKEN`

3. Verifica: `npm run cf:token`

---

## 7. Comprobar que todo va

- [ ] Pages muestra último deploy **Success**
- [ ] https://www.nimpo3dstudio.com/es/ carga
- [ ] https://nimpo3dstudio.com/es/ carga (o redirige a www)
- [ ] https://www.nimpo3dstudio.com/api/track → JSON `{"status":"ok",...}`
- [ ] Email `contacto@nimpo3dstudio.com` sigue funcionando (no tocar MX)

---

## 8. Push de los cambios de migración

Si la IA aún no ha hecho push, en `nimpo-studio/`:

```bash
git add .
git commit -m "chore: migrate deploy to Cloudflare Pages"
git push origin main
```

Pages hará un nuevo build automáticamente.

---

## Listo

A partir de aquí: **pides el cambio → la IA edita y hace push → Pages publica solo.**