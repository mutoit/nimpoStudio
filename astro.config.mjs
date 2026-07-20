// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { locales, defaultLocale } from "./src/i18n/translations";

export default defineConfig({
  site: "https://nimpo3dstudio.com",
  integrations: [sitemap()],
  i18n: {
    defaultLocale,
    locales,
    routing: {
      prefixDefaultLocale: true,
    },
  },
  redirects: {
    "/": "/es/",
  },
});