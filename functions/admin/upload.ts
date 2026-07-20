/**
 * POST /admin/upload — RETIRADO.
 * Usar POST /admin/publish (un clic: media + catálogo).
 */

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function onRequest() {
  return json(
    {
      ok: false,
      error: "gone",
      message:
        "POST /admin/upload está retirado. Usa POST /admin/publish desde /admin/biblioteca/.",
    },
    410,
  );
}
