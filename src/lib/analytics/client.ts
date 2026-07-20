import { getAnalyticsConfig, hasGa4, hasMetaPixel, hasClarity } from "./config";
import type { AnalyticsEvent } from "./events";
import { hasAnalyticsConsent } from "./consent";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    clarity?: (...args: any[]) => void;
    dataLayer?: unknown[];
    nimpoTrack?: (event: AnalyticsEvent) => void;
  }
}

let gaLoaded = false;
let metaLoaded = false;
let clarityLoaded = false;

function loadGa4(measurementId: string): void {
  if (gaLoaded || typeof document === "undefined") return;
  gaLoaded = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId, { anonymize_ip: true });
}

function loadMetaPixel(pixelId: string): void {
  if (metaLoaded || typeof document === "undefined") return;
  metaLoaded = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);

  window.fbq = function fbq(...args: unknown[]) {
    (window.fbq as { queue?: unknown[] }).queue = (window.fbq as { queue?: unknown[] }).queue ?? [];
    (window.fbq as { queue: unknown[] }).queue.push(args);
  };
  window.fbq("init", pixelId);
  window.fbq("track", "PageView");
}

function loadClarity(projectId: string): void {
  if (clarityLoaded || typeof document === "undefined") return;
  clarityLoaded = true;

  // Microsoft Clarity (free, session recordings + heatmaps)
  const w = window as any;
  w.clarity =
    w.clarity ||
    function (...args: any[]) {
      (w.clarity.q = w.clarity.q || []).push(args);
    };

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${projectId}`;
  document.head.appendChild(script);
}

function sendToOwnCollector(event: AnalyticsEvent): void {
  // First-party collector (free, always-on for max data, no 3rd party cookies)
  // Goes to our Cloudflare Pages Function → visible in Logs + can be extended to D1/KV
  try {
    const payload = {
      ...event,
      path: typeof location !== "undefined" ? location.pathname : "",
      ts: Date.now(),
    };
    const body = JSON.stringify(payload);

    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", body);
    } else if (typeof fetch !== "undefined") {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // never break the player
  }
}

export function initMarketingAnalytics(): void {
  if (!hasAnalyticsConsent()) return;

  const config = getAnalyticsConfig();
  if (hasGa4(config)) loadGa4(config.gaMeasurementId);
  if (hasMetaPixel(config)) loadMetaPixel(config.metaPixelId);
  if (hasClarity(config)) loadClarity(config.clarityProjectId);
}

export function track(event: AnalyticsEvent): void {
  // 1. ALWAYS send to our own first-party collector (max free data, even if cookies rejected)
  sendToOwnCollector(event);

  // 2. Third-party marketing only if consent
  if (!hasAnalyticsConsent()) return;

  const config = getAnalyticsConfig();

  if (hasGa4(config) && window.gtag) {
    window.gtag("event", event.name, event.payload);
  }

  if (hasMetaPixel(config) && window.fbq && event.name === "page_view") {
    window.fbq("track", "PageView");
  }

  // Microsoft Clarity custom events + tags (free qualitative data)
  const w = window as any;
  if (hasClarity(config) && w.clarity) {
    try {
      w.clarity("event", event.name);
      if (event.name.startsWith("music_") && event.payload) {
        const p = event.payload as any;
        if (p.track) w.clarity("set", "track", p.track);
        if (p.slug) w.clarity("set", "music_slug", p.slug);
        if (p.release) w.clarity("set", "music_release", p.release);
        if (p.layer) w.clarity("set", "music_layer", p.layer);
      }
    } catch {}
  }
}

export function registerAnalyticsClient(): void {
  if (typeof window === "undefined") return;
  window.nimpoTrack = track;
  initMarketingAnalytics();
  window.addEventListener("nimpo:consent", () => initMarketingAnalytics());
}