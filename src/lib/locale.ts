import type { Locale } from "../i18n/translations";
import { defaultLocale, locales, translations, getTranslation } from "../i18n/translations";

export type { Locale };

export function getLangFromUrl(url: URL): Locale {
  const [, lang] = url.pathname.split("/");
  if (lang && locales.includes(lang as Locale)) {
    return lang as Locale;
  }
  return defaultLocale;
}

export function getLocalizedPath(path: string, lang: Locale): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (lang === defaultLocale) {
    return cleanPath;
  }
  // For default we keep clean, for others prefix
  // But since we use prefix for non-default in this setup, adjust if needed
  // With [lang] structure we always prefix, so:
  return `/${lang}${cleanPath === "/" ? "" : cleanPath}`;
}

export function useTranslations(lang: Locale) {
  return function t(key: keyof typeof translations[Locale]): string {
    return getTranslation(lang, key);
  };
}

export function getLocaleFromPathname(pathname: string): Locale {
  const seg = pathname.split("/")[1];
  if (locales.includes(seg as Locale)) return seg as Locale;
  return defaultLocale;
}

// For links that must always include the current locale prefix
export function localizePath(currentPath: string, targetLang: Locale): string {
  // Remove existing lang prefix if present
  let path = currentPath;
  const parts = path.split("/").filter(Boolean);
  if (parts.length > 0 && locales.includes(parts[0] as Locale)) {
    parts.shift();
  }
  const rest = parts.length ? `/${parts.join("/")}` : "/";
  // Always prefix because of our [lang] + prefixDefaultLocale setup
  return `/${targetLang}${rest === "/" ? "" : rest}`;
}
