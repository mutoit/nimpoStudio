import { getAnalyticsConfig, hasGa4, hasMetaPixel } from "./config";
import type { AnalyticsEvent } from "./events";
import { hasAnalyticsConsent } from "./consent";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    nimpoTrack?: (event: AnalyticsEvent) => void;
  }
}

let gaLoaded = false;
let metaLoaded = false;

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

export function initMarketingAnalytics(): void {
  if (!hasAnalyticsConsent()) return;

  const config = getAnalyticsConfig();
  if (hasGa4(config)) loadGa4(config.gaMeasurementId);
  if (hasMetaPixel(config)) loadMetaPixel(config.metaPixelId);
}

export function track(event: AnalyticsEvent): void {
  if (!hasAnalyticsConsent()) return;

  const config = getAnalyticsConfig();

  if (hasGa4(config) && window.gtag) {
    window.gtag("event", event.name, event.payload);
  }

  if (hasMetaPixel(config) && window.fbq && event.name === "page_view") {
    window.fbq("track", "PageView");
  }
}

export function registerAnalyticsClient(): void {
  if (typeof window === "undefined") return;
  window.nimpoTrack = track;
  initMarketingAnalytics();
  window.addEventListener("nimpo:consent", () => initMarketingAnalytics());
}