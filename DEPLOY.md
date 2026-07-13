# Despliegue Automático - Nimpo 3D Studio

## Objetivo
Que **cualquier cambio** (incluso cambiar una palabra) se publique automáticamente haciendo solo `git push`.

## Opción Recomendada (la más fácil a largo plazo): Cloudflare Pages + GitHub

Esta es la forma más automática y con menos mantenimiento.

### Configuración (se hace **una sola vez**)

1. Ve a [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Pages** → **Create a project** → **Connect to Git**.

2. Conecta tu cuenta de GitHub y selecciona el repositorio `mutoit/nimpoStudio`.

3. En la configuración del proyecto:
   - **Production branch**: `main`
   - **Root directory**: `nimpo-studio`   ← Importante
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Node.js version**: 22

4. Haz clic en **Save and Deploy**.

5. Una vez desplegado:
   - Ve a **Custom domains**
   - Añade `nimpo3dstudio.com` y `www.nimpo3dstudio.com` (ya los tenías configurados antes).

### A partir de ahora

```bash
# Cambias lo que sea (una palabra, un texto, un componente...)
git add .
git commit -m "actualización"
git push origin main
```

→ En menos de 2 minutos estará publicado.

**Ventajas**:
- No tienes que gestionar tokens API.
- Previews automáticos en Pull Requests.
- Cloudflare se encarga de todo.

## Opción Alternativa: GitHub Actions + Wrangler

Ya está configurado en `.github/workflows/deploy.yml`.

### Requisito (una sola vez)

1. En GitHub → tu repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
2. Nombre: `CLOUDFLARE_API_TOKEN`
3. Valor: Crea un token en Cloudflare con estos permisos:
   - Account > **Workers Scripts** → Edit
   - Account > **Workers Routes** → Edit

Una vez puesto el secret, cada `git push` dispara el workflow automáticamente.

## Para mí (el agente de IA)

Después de la configuración de arriba:
- Yo puedo editar archivos directamente.
- Cuando el cambio esté listo, haré commit + push.
- El deploy se hace solo.
- Tú no tienes que tocar nada más.

## Comandos útiles

```bash
# Desarrollo
npm run dev

# Build local para comprobar
npm run build

# Deploy manual (solo si es necesario)
npm run build && npx wrangler deploy
```

## Notas

- El sitio usa rutas con prefijo de idioma (`/es`, `/en`, `/fr`).
- El redirect `/` → `/es` está en `astro.config.mjs`.
- Si usas Cloudflare Pages, el redirect también se puede manejar con `_redirects` en `public/`.
