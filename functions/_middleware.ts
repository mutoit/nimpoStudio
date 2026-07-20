/**
 * Protege /admin/* (HTML estático incluido).
 * Cookie firmada con ADMIN_SESSION_SECRET (o derivada de ADMIN_LIBRARY_SECRET).
 * /admin/session se deja pasar (login/logout).
 */

import {
  getSessionFromRequest,
  getSessionSigningKey,
  verifySessionToken,
  type AdminEnv,
} from "./lib/admin-auth";

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isSessionApi(pathname: string): boolean {
  return pathname === "/admin/session" || pathname === "/admin/session/";
}

/** HTML de login si no hay sesión (sustituye el HTML estático público). */
function loginHtml(nextPath: string): string {
  const safeNext = nextPath.startsWith("/admin") ? nextPath : "/admin/biblioteca/";
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>Admin · Nimpo 3D Studio</title>
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0; min-height: 100dvh; display: grid; place-items: center;
      font-family: system-ui, sans-serif; background: #08080a; color: #e8e8ec;
    }
    .card {
      width: min(22rem, 92vw); padding: 1.5rem;
      border: 1px solid rgb(201 169 98 / 0.25); border-radius: 12px;
      background: #121218;
    }
    h1 { margin: 0 0 0.35rem; font-size: 1.15rem; font-weight: 600; }
    p { margin: 0 0 1rem; font-size: 0.85rem; color: #9a9aa6; line-height: 1.45; }
    label { display: block; font-size: 0.75rem; color: #b8b8c0; margin-bottom: 0.35rem; }
    input {
      width: 100%; box-sizing: border-box; padding: 0.65rem 0.75rem;
      border-radius: 8px; border: 1px solid #2a2a32; background: #0c0c10; color: #fff;
    }
    button {
      margin-top: 0.85rem; width: 100%; padding: 0.7rem;
      border: none; border-radius: 8px; cursor: pointer; font-weight: 600;
      background: #c9a962; color: #0a0a0c;
    }
    button:disabled { opacity: 0.5; cursor: wait; }
    .err { color: #f0a0a0; font-size: 0.8rem; margin-top: 0.65rem; min-height: 1.2em; }
    a { color: #c9a962; font-size: 0.8rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Panel privado</h1>
    <p>Solo el estudio. Introduce la contraseña de admin (secreto del servidor).</p>
    <form id="f">
      <label for="p">Contraseña</label>
      <input id="p" name="password" type="password" autocomplete="current-password" required autofocus />
      <button type="submit" id="b">Entrar</button>
      <p class="err" id="e"></p>
    </form>
    <p style="margin-top:1rem"><a href="/es/">← Volver al sitio</a></p>
  </div>
  <script>
    const next = ${JSON.stringify(safeNext)};
    document.getElementById('f').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const b = document.getElementById('b');
      const e = document.getElementById('e');
      b.disabled = true; e.textContent = '';
      try {
        const res = await fetch('/admin/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ password: document.getElementById('p').value }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          e.textContent = data.error === 'not_configured'
            ? 'Admin no configurado (falta secreto en Pages).'
            : data.error === 'rate_limited'
              ? 'Demasiados intentos. Espera unos minutos.'
              : 'Contraseña incorrecta';
          b.disabled = false;
          return;
        }
        location.href = next;
      } catch {
        e.textContent = 'Error de red';
        b.disabled = false;
      }
    });
  </script>
</body>
</html>`;
}

export async function onRequest(context: {
  request: Request;
  env: AdminEnv & Record<string, unknown>;
  next: () => Promise<Response>;
}) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  if (!isAdminPath(url.pathname)) {
    return next();
  }

  if (isSessionApi(url.pathname)) {
    return next();
  }

  const password = String(env.ADMIN_LIBRARY_SECRET || "").trim();
  if (!password) {
    return new Response(
      `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><title>Admin</title></head>
<body style="font-family:system-ui;background:#08080a;color:#eee;padding:2rem">
<h1>Admin no configurado</h1>
<p>Falta la variable secreta <code>ADMIN_LIBRARY_SECRET</code> en Cloudflare Pages
(Settings → Environment variables → Secret). Ver <code>docs/admin-acceso.md</code>.</p>
<p><a href="/es/" style="color:#c9a962">Volver al sitio</a></p>
</body></html>`,
      {
        status: 503,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const signingKey = await getSessionSigningKey(env);
  const token = getSessionFromRequest(request);
  const ok = signingKey ? await verifySessionToken(signingKey, token) : false;
  if (ok) {
    return next();
  }

  const accept = (request.headers.get("Accept") || "").toLowerCase();
  const wantsJson =
    accept.includes("application/json") && !accept.includes("text/html");
  if (request.method === "GET" && !wantsJson) {
    return new Response(loginHtml(url.pathname + url.search), {
      status: 401,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
    status: 401,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
