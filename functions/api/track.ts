/**
 * First-party analytics collector (free, zero external bullshit).
 * Music reproduction events (plays, stems, completes) are logged here.
 *
 * Data goes directly to YOUR Cloudflare project Logs.
 * No accounts, no "install something", no third parties needed for basic data.
 *
 * POST /api/track
 */
export async function onRequest(context: any) {
  const { request } = context;
  const method = request.method;

  // Simple health check
  if (method === "GET") {
    return Response.json({ status: "ok", message: "Analytics collector is alive. POST events here." });
  }

  if (method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const event = await request.json();
    const name = event.name || "unknown";
    const payload = event.payload || {};
    const path = event.path || request.headers.get("referer") || "";
    const ts = event.ts || Date.now();
    const time = new Date(ts).toISOString();

    // === SPECIAL NICE LOGGING FOR MUSIC REPRODUCTION ===
    if (name.startsWith("music_")) {
      if (name === "music_preview_play") {
        console.log(
          `🎵 [MUSIC PLAY] track="${payload.track || "?"}" slug="${payload.slug || "?"}" release="${payload.release || "?"}" progress=${payload.progress ?? "start"} path=${path}`
        );
      } else if (name === "music_preview_complete") {
        console.log(
          `✅ [MUSIC COMPLETE] track="${payload.track || "?"}" slug="${payload.slug || "?"}" release="${payload.release || "?"}" path=${path}`
        );
      } else if (name === "music_stem_play") {
        console.log(
          `🎛️ [STEM PLAY] title="${payload.title || "?"}" layers=${payload.stemsCount || 0} release="${payload.release || "?"}" path=${path}`
        );
      } else if (name === "music_stem_interaction") {
        console.log(
          `🔧 [STEM ACTION] ${payload.action} layer="${payload.layer}" title="${payload.title || "?"}" path=${path}`
        );
      } else {
        console.log(`[MUSIC] ${name}`, JSON.stringify(payload), `path=${path}`);
      }
    } else {
      console.log(`[ANALYTICS] ${name}`, JSON.stringify(payload), `path=${path}`);
    }

    // Full raw JSON for power users (easy to copy from Logs)
    console.log(
      "[ANALYTICS_RAW]",
      JSON.stringify({
        name,
        payload,
        path,
        time,
        ua: request.headers.get("user-agent")?.slice(0, 100) || ""
      })
    );

    return Response.json({ ok: true });
  } catch (err) {
    console.warn("[ANALYTICS_ERROR]", err);
    return Response.json({ ok: false }, { status: 200 });
  }
}
