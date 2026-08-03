export type AnalyticsEventName =
  | "page_view"
  | "music_preview_play"
  | "music_preview_complete"
  | "music_stem_play"
  | "music_stem_interaction"
  | "catalog_view"
  | "product_demo_click"
  | "product_download";

export type AnalyticsEventPayload = {
  page_view: { path: string; title: string };
  music_preview_play: { slug: string; track: string; release?: string; progress?: number };
  music_preview_complete: { slug: string; track: string; release?: string };
  music_stem_play: { title: string; stemsCount: number; release?: string };
  music_stem_interaction: { title: string; action: "solo" | "mute" | "unsolo" | "unmute" | "volume"; layer: string; release?: string };
  catalog_view: { slug: string; category: string };
  /** Demo / beta CTA (download | web | request) */
  product_demo_click: {
    slug: string;
    kind: "download" | "web" | "request";
    status?: string;
  };
  /** Full re-download (cuenta) — contador server en /api/download también */
  product_download: {
    slug: string;
    kind?: "full";
    role?: string;
  };
};

export type AnalyticsEvent<N extends AnalyticsEventName = AnalyticsEventName> = {
  name: N;
  payload: AnalyticsEventPayload[N];
};