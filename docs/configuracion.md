# Configuración — Nimpo 3D Studio

Documento de referencia con la infraestructura actual (julio 2026).  
Actualízalo si cambias DNS, dominio, email o deploy.

---

## Resumen rápido

| Qué | Valor |
|-----|--------|
| Dominio | `nimpo3dstudio.com` |
| Web producción | https://www.nimpo3dstudio.com/catalogo |
| Worker (respaldo) | https://nimpostudioweb.nosinfantasia.workers.dev/catalogo |
| Repo GitHub | https://github.com/mutoit/nimpoStudio.git |
| Stack | Astro 7 → build estático → Cloudflare Worker (assets) |
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
| CNAME | `www` | `nimpostudioweb.nosinfantasia.workers.dev` | Proxied |

> `192.0.2.1` es un placeholder. Con proxy activado, Cloudflare enruta el tráfico al Worker.

### Registros de email (mantener)

| Tipo | Nombre | Contenido | Proxy |
|------|--------|-----------|-------|
| MX | `@` | `smtp.google.com` (prioridad 1) | DNS only |
| TXT | `@` | `v=spf1 include:_spf.google.com ~all` | DNS only |
| TXT | `google._domainkey` | (clave DKIM de Google) | DNS only |

### No debe haber

- Registros A a IPs de Squarespace (198.185.x, 198.49.x)
- CNAME `www` → `ext-sq.squarespace.com`

---

## Cloudflare — Workers Routes

**Ruta:** Domains → `nimpo3dstudio.com` → **Workers Routes**

| Ruta | Worker |
|------|--------|
| `nimpo3dstudio.com/*` | `nimpostudioweb` |
| `www.nimpo3dstudio.com/*` | `nimpostudioweb` |

---

## Cloudflare — Worker / Deploy

**Ruta:** Build → **Compute** → **Workers & Pages** → `nimpostudioweb`  
(O Ctrl+K → buscar `nimpostudioweb`)

| Campo | Valor |
|-------|--------|
| Proyecto | `nimpostudioweb` |
| Repo conectado | `mutoit/nimpoStudio` |
| Rama | `main` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Node | 22 (`.node-version`) |
| Salida build | `dist/` |

### wrangler.toml (en el repo)

```toml
name = "nimpostudioweb"
compatibility_date = "2024-07-01"

[assets]
directory = "./dist"

routes = [
  { pattern = "nimpo3dstudio.com", custom_domain = true },
  { pattern = "www.nimpo3dstudio.com", custom_domain = true },
]
```

### Flujo de publicación

1. Editas código en `nimpo-studio/`
2. `git push` a `main`
3. Cloudflare build + deploy automático
4. Si no ves cambios: **Caching** → Purge Everything + `Ctrl+Shift+R` en el navegador

---

## Email

### Ahora (Google Workspace / MX)

Los registros MX y TXT en DNS apuntan a **Google**. Si usas Gmail/Google Workspace con `@nimpo3dstudio.com`, no borres esos registros.

### Futuro recomendado (gratis, sin Google Workspace)

**Cloudflare Email Routing:**

1. Domains → `nimpo3dstudio.com` → **Email** → **Email Routing**
2. Crear `contacto@nimpo3dstudio.com` → reenvío a tu Gmail personal
3. En `src/config/site.json` → `"emailStatus": "active"`

---

## URLs útiles

| URL | Uso |
|-----|-----|
| https://www.nimpo3dstudio.com/catalogo | Producción principal |
| https://nimpo3dstudio.com/catalogo | Apex (mismo sitio) |
| https://nimpostudioweb.nosinfantasia.workers.dev/catalogo | URL Worker directa |
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
| `wrangler.toml` | Worker, assets, dominios |
| `public/_headers` | Anti-caché para ver cambios de diseño |

---

## Problemas frecuentes

### La web no carga en el dominio

1. Comprobar DNS (registro A `@` y CNAME `www`)
2. Comprobar Workers Routes
3. Probar URL `.workers.dev`
4. `ipconfig /flushdns` (Windows)

### Veo diseño viejo tras un deploy

1. Cloudflare → Caching → **Purge Everything**
2. Navegador: `Ctrl + Shift + R` o ventana incógnito

### Apex (sin www) no resuelve

- Esperar propagación DNS o usar `www` mientras tanto
- Redirect Rule opcional: `nimpo3dstudio.com` → `www.nimpo3dstudio.com`

### No encuentro Workers en el menú

- **Build** → **Compute** → Workers & Pages
- O **Ctrl + K** → `nimpostudioweb`

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

- Email configurado: `contacto@nimpo3dstudio.com` (pendiente Email Routing si aún no activo)
- GitHub: https://github.com/mutoit/nimpoStudio