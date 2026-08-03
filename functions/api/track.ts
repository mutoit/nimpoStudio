/**
 * First-party analytics collector (free, zero external bullshit).
 * Music reproduction events (plays, stems, completes) are logged here.
 * Product demo/beta CTAs also persist download counters to R2.
 *
 * POST /api/track
 */

import {
  incrementDownloadStat,
  type DownloadStatKind,
} from "../lib/download-stats";
import type { ProductsBucket } from "../lib/products-catalog";

type Env = {
  LIBRARY_BUCKET?: ProductsBucket;
};

function mapDemoKind(raw: unknown): DownloadStatKind | null {
  const k = String(raw || "").toLowerCase().trim();
  if (k === "download" || k === "demo") return "demo";
  if (k === "web") return "web";
  if (k === "request") return "request";
  if (k === "full" || k === "product" || k === "paid") return "full";
  return null;
}

export async function onRequest(context: {
  request: Request;
  env: Env;
}) {
  const { request, env } = context;
  const method = request.method;

  if (method === "GET") {
    return Response.json({
      status: "ok",
      message: "Analytics collector is alive. POST events here.",
    });
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
          `🎵 [MUSIC PLAY] track="${payload.track || "?"}" slug="${payload.slug || "?"}" release="${payload.release || "?"}" progress=${payload.progress ?? "start"} path=${path}`,
        );
      } else if (name === "music_preview_complete") {
        console.log(
          `✅ [MUSIC COMPLETE] track="${payload.track || "?"}" slug="${payload.slug || "?"}" release="${payload.release || "?"}" path=${path}`,
        );
      } else if (name === "music_stem_play") {
        console.log(
          `🎛️ [STEM PLAY] title="${payload.title || "?"}" layers=${payload.stemsCount || 0} release="${payload.release || "?"}" path=${path}`,
        );
      } else if (name === "music_stem_interaction") {
        console.log(
          `🔧 [STEM ACTION] ${payload.action} layer="${payload.layer}" title="${payload.title || "?"}" path=${path}`,
        );
      } else {
        console.log(`[MUSIC] ${name}`, JSON.stringify(payload), `path=${path}`);
      }
    } else if (
      name === "product_demo_click" ||
      name === "product_download"
    ) {
      console.log(
        `📦 [PRODUCT ${name}] slug="${payload.slug || "?"}" kind="${payload.kind || "?"}" status="${payload.status || "?"}" path=${path}`,
      );
    } else {
      console.log(`[ANALYTICS] ${name}`, JSON.stringify(payload), `path=${path}`);
    }

    console.log(
      "[ANALYTICS_RAW]",
      JSON.stringify({
        name,
        payload,
        path,
        time,
        ua: request.headers.get("user-agent")?.slice(0, 100) || "",
      }),
    );

    // Persist demo/beta CTAs (R2). Full paid = solo /api/download (evita doble conteo).
    if (name === "product_demo_click" && env.LIBRARY_BUCKET) {
      const kind = mapDemoKind(payload.kind);
      const slug = String(payload.slug || "").trim();
      if (kind && kind !== "full" && slug) {
        await incrementDownloadStat(env.LIBRARY_BUCKET, slug, kind);
      }
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.warn("[ANALYTICS_ERROR]", err);
    return Response.json({ ok: false }, { status: 200 });
  }
}
