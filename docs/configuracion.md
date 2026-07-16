# Configuración — Nimpo 3D Studio

Documento de referencia con la infraestructura actual (julio 2026).  
Actualízalo si cambias DNS, dominio, email o deploy.

---

## Resumen rápido

| Qué | Valor |
|-----|--------|
| Dominio | `nimpo3dstudio.com` |
| Web producción | https://www.nimpo3dstudio.com/catalogo |
| Pages preview | `https://nimpo-studio.pages.dev` (tras crear proyecto) |
| Repo GitHub | https://github.com/mutoit/nimpoStudio.git |
| Stack | Astro 7 → build estático → **Cloudflare Pages** (`nimpo-studio`) |
| Cuenta Cloudflare | `nosinfantasia@gmail.com` (subdominio workers: `nosinfantasia.workers.dev`) |

---

## Squarespace (dominio original)

El dominio se compró/gestionó en **Squarespace**.

### Qué hicimos

1. En Squarespace → Dominios → `nimpo3dstudio.com` → **Nameservers**
2. Cambiamos de nameservers de Squarespace a los **2 nameservers de Cloudflare**
3. A partir de ahí el DNS lo controla **Cloudflare**, no Squarespace

### Qué NO tocar en Squarespace

- La tabla DNS de Squarespace **ya no aplica** (nameservers apuntan a Cloudflare)
- No hace falta editar registros A/CNAME en Squarespace

### Registros que Squarespace tenía (histórico — ya borrados en CF)

| Tipo | Nombre | Destino |
|------|--------|---------|
| A | @ | 198.185.159.144 / .145, 198.49.23.144 / .145 |
| CNAME | www | ext-sq.squarespace.com |
| CNAME | _domainconnect | _domainconnect.domains.squarespace.com |
| HTTPS | @ | (registro Squarespace) |

---

## Cloudflare — Dominio

**Ruta:** Menú lateral → **Domains** → `nimpo3dstudio.com`

Estado esperado: **Active**

---

## Cloudflare — DNS (actual)

**Ruta:** Domains → `nimpo3dstudio.com` → **DNS** → Records

### Registros de la web

| Tipo | Nombre | Contenido | Proxy |
|------|--------|-----------|-------|
| A | `@` | `192.0.2.1` | Proxied (nube naranja) |
| CNAME | `www` | *(Pages lo gestiona al añadir custom domain)* | Proxied |

> `192.0.2.1` es placeholder en apex. Tras migrar a Pages, el tráfico va al proyecto `nimpo-studio`.

### Registros de email (Cloudflare Email Routing)

| Tipo | Nombre | Contenido | Proxy |
|------|--------|-----------|-------|
| MX | `@` | `route1/2/3.mx.cloudflare.net` (prioridades 60, 68, 81) | DNS only |
| TXT | `@` | `v=spf1 include:_spf.mx.cloudflare.net ~all` | DNS only |
| TXT | `cf2024-1._domainkey` | (DKIM Cloudflare) | DNS only |

> Puede quedar `google._domainkey` (histórico); no afecta al reenvío actual.

### No debe haber

- Registros A a IPs de Squarespace (198.185.x, 198.49.x)
- CNAME `www` → `ext-sq.squarespace.com`

---

## Cloudflare — Pages (deploy actual)

**Ruta:** Build → **Compute** → **Workers & Pages** → **nimpo-studio** (Pages)

| Campo | Valor |
|-------|--------|
| Proyecto | `nimpo-studio` |
| Repo conectado | `mutoit/nimpoStudio` |
| Rama | `main` |
| Root directory | *(vacío — raíz del repo)* |
| Build command | `npm run build` |
| Build output | `dist` |
| Node | 22 (`.node-version`) |

### wrangler.toml (en el repo)

```toml
name = "nimpo-studio"
pages_build_output_dir = "./dist"
```

### Flujo de publicación

1. Editas código (o la IA lo hace)
2. `git push` a `main`
3. Cloudflare Pages build + deploy automático
4. Si no ves cambios: **Caching** → Purge Everything + `Ctrl+Shift+R`

### Migración desde Worker

El Worker `nimpostudioweb` es legacy. Quitar sus rutas de dominio tras enganchar Pages — ver `SETUP-PAGES.md`.

---

## Email

### Activo — Cloudflare Email Routing (julio 2026)

- `contacto@nimpo3dstudio.com` → reenvío a `nosinfantasia@gmail.com`
- MX en DNS: `route1/2/3.mx.cloudflare.net` (Cloudflare, no Google)
- Regla: **contacto forward** activa
- Web: `src/config/site.json` → `"emailStatus": "active"`

Para responder como `contacto@…` desde Gmail: **Configuración → Enviar correo como**.

### Histórico

Antes había MX de Google (`smtp.google.com`); se sustituyeron al activar Email Routing.

---

## URLs útiles

| URL | Uso |
|-----|-----|
| https://www.nimpo3dstudio.com/catalogo | Producción principal |
| https://nimpo3dstudio.com/catalogo | Apex (mismo sitio) |
| https://nimpo-studio.pages.dev | URL Pages (preview) |
| http://localhost:4321/catalogo | Desarrollo local (`npm run dev`) |

---

## Desarrollo local

```bash
cd nimpo-studio
npm install
npm run dev      # http://localhost:4321
npm run build    # genera dist/
```

---

## Archivos clave del proyecto

| Archivo | Qué configura |
|---------|----------------|
| `src/config/site.json` | Nombre, URL, email, redes |
| `src/data/products.json` | Catálogo de productos |
| `astro.config.mjs` | `site: https://nimpo3dstudio.com` |
| `wrangler.toml` | Pages, output dir |
| `SETUP-PAGES.md` | Checklist migración Pages |
| `AGENTS.md` | Runbook para la IA |
| `public/_headers` | Anti-caché para ver cambios de diseño |

---

## Problemas frecuentes

### La web no carga en el dominio

1. Comprobar DNS (registro A `@` y CNAME `www`)
2. Comprobar Custom domains en proyecto Pages
3. Probar URL `.pages.dev`
4. `ipconfig /flushdns` (Windows)

### Veo diseño viejo tras un deploy

1. Cloudflare → Caching → **Purge Everything**
2. Navegador: `Ctrl + Shift + R` o ventana incógnito

### Apex (sin www) no resuelve

- Esperar propagación DNS o usar `www` mientras tanto
- Redirect Rule opcional: `nimpo3dstudio.com` → `www.nimpo3dstudio.com`

### No encuentro Pages en el menú

- **Build** → **Compute** → Workers & Pages → pestaña **Pages**
- O **Ctrl + K** → `nimpo-studio`

---

## Roadmap infra (fases futuras)

| Fase | Añadir |
|------|--------|
| 2 — Venta | Stripe + `functions/` + R2 (archivos digitales) |
| 3 — Clientes | D1 (base de datos) + magic link auth |
| 4 — Admin | Panel o CMS opcional |

La carpeta `functions/` está reservada; ver `functions/README.md`.

---

## Contacto en la web

- Email activo: `contacto@nimpo3dstudio.com` (Cloudflare Email Routing → Gmail)
- GitHub: https://github.com/mutoit/nimpoStudio