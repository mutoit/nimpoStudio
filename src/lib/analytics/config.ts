export type AnalyticsConfig = {
  cfWebAnalyticsToken: string;
  gaMeasurementId: string;
  gscVerification: string;
  metaPixelId: string;
  bingVerification: string;
};

export function getAnalyticsConfig(): AnalyticsConfig {
  return {
    cfWebAnalyticsToken: import.meta.env.PUBLIC_CF_WEB_ANALYTICS_TOKEN ?? "",
    gaMeasurementId: import.meta.env.PUBLIC_GA_MEASUREMENT_ID ?? "",
    gscVerification: import.meta.env.PUBLIC_GSC_VERIFICATION ?? "",
    metaPixelId: import.meta.env.PUBLIC_META_PIXEL_ID ?? "",
    bingVerification: import.meta.env.PUBLIC_BING_VERIFICATION ?? "",
  };
}

export function hasCfAnalytics(config: AnalyticsConfig): boolean {
  return config.cfWebAnalyticsToken.length > 0;
}

export function hasGa4(config: AnalyticsConfig): boolean {
  return config.gaMeasurementId.length > 0;
}

export function hasMetaPixel(config: AnalyticsConfig): boolean {
  return config.metaPixelId.length > 0;
}