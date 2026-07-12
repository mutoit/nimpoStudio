import siteConfig from "../config/site.json";

export type SiteConfig = {
  name: string;
  tagline: string;
  description: string;
  url: string;
  email: string;
  emailStatus: "pending" | "active";
  social: {
    instagram: string;
    github: string;
  };
};

export const site = siteConfig as SiteConfig;