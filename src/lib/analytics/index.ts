export { getAnalyticsConfig, hasCfAnalytics, hasGa4, hasMetaPixel, hasClarity } from "./config";
export type { AnalyticsConfig } from "./config";
export { readConsent, writeConsent, hasAnalyticsConsent } from "./consent";
export type { ConsentLevel } from "./consent";
export type { AnalyticsEvent, AnalyticsEventName, AnalyticsEventPayload } from "./events";
export { initMarketingAnalytics, registerAnalyticsClient, track } from "./client";