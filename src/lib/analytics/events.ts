export type AnalyticsEventName =
  | "page_view"
  | "music_preview_play"
  | "catalog_view";

export type AnalyticsEventPayload = {
  page_view: { path: string; title: string };
  music_preview_play: { slug: string; track: string; release?: string };
  catalog_view: { slug: string; category: string };
};

export type AnalyticsEvent<N extends AnalyticsEventName = AnalyticsEventName> = {
  name: N;
  payload: AnalyticsEventPayload[N];
};