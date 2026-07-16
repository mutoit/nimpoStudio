# Despliegue — Nimpo 3D Studio

## Cómo funciona (después de la migración a Pages)

```
Editas código / pides cambio a la IA
        ↓
git push origin main
        ↓
Cloudflare Pages (Git conectado) → npm run build → publica dist/
        ↓
https://www.nimpo3dstudio.com actualizado (~1–2 min)
```

**Una sola vez:** sigue [SETUP-PAGES.md](SETUP-PAGES.md) para crear el proyecto Pages y enganchar el dominio.

## Configuración Pages (referencia)

| Campo | Valor |
|-------|--------|
| Proyecto | `nimpo-studio` |
| Repo | `mutoit/nimpoStudio` |
| Rama producción | `main` |
| Root directory | *(vacío — la raíz del repo)* |
| Build command | `npm run build` |
| Build output | `dist` |
| Node.js | 22 |

## Para la IA (agente)

Tras cualquier cambio listo para publicar:

1. `npm run build` en `nimpo-studio/` (verificar que compila).
2. `git add` → `git commit` → `git push origin main`.
3. Esperar ~2 min y comprobar `https://www.nimpo3dstudio.com/es/`.
4. Si no se ve el cambio: Cloudflare → Caching → Purge Everything.

No hace falta `wrangler deploy` ni tocar el Worker antiguo.

## Respaldo manual

```bash
npm run deploy          # build + wrangler pages deploy (requiere CLOUDFLARE_API_TOKEN en .env)
```

O en GitHub → Actions → **Deploy to Cloudflare Pages** → Run workflow (requiere secret `CLOUDFLARE_API_TOKEN`).

## Desarrollo local

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # genera dist/
```

## Pages Functions

`/api/track` vive en `functions/api/track.ts` — analíticas first-party. Pages la despliega automáticamente junto al sitio estático.

## Histórico

Antes el sitio usaba el Worker `nimpostudioweb`. Tras migrar a Pages, quita el dominio del Worker (ver SETUP-PAGES.md paso 5).