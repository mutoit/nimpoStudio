export type ConsentLevel = "none" | "analytics";

const STORAGE_KEY = "nimpo_consent";

export function readConsent(): ConsentLevel {
  if (typeof window === "undefined") return "none";
  const value = localStorage.getItem(STORAGE_KEY);
  return value === "analytics" ? "analytics" : "none";
}

export function writeConsent(level: ConsentLevel): void {
  localStorage.setItem(STORAGE_KEY, level);
  window.dispatchEvent(new CustomEvent("nimpo:consent", { detail: level }));
}

export function hasAnalyticsConsent(): boolean {
  return readConsent() === "analytics";
}