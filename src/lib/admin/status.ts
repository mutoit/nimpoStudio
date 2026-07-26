/**
 * Feedback UI admin (status + toast).
 */

export function setStatus(msg: string, ok = true) {
  const el = document.querySelector("[data-status]");
  if (!(el instanceof HTMLElement)) return;
  el.hidden = false;
  el.textContent = msg;
  el.classList.toggle("is-err", !ok);
}

export function showToast(msg: string, ms = 4000) {
  let t = document.querySelector("[data-admin-toast]");
  if (!(t instanceof HTMLElement)) {
    t = document.createElement("div");
    t.setAttribute("data-admin-toast", "");
    t.setAttribute("role", "status");
    (t as HTMLElement).style.cssText =
      "position:fixed;bottom:1.25rem;left:50%;transform:translateX(-50%);z-index:9999;" +
      "max-width:min(92vw,28rem);padding:0.75rem 1.1rem;border-radius:12px;" +
      "background:rgb(20 18 28 / 0.95);border:1px solid rgb(201 169 98 / 0.45);" +
      "color:#f2e4bc;font-size:0.88rem;box-shadow:0 12px 40px rgb(0 0 0 / 0.5);";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  (t as HTMLElement).hidden = false;
  window.setTimeout(() => {
    if (t instanceof HTMLElement) t.hidden = true;
  }, ms);
}

export type LightState = "idle" | "pending" | "loading" | "ok" | "err";

export function setLight(role: string, state: LightState, text?: string) {
  const el = document.querySelector(`[data-ml="${role}"]`);
  if (!(el instanceof HTMLElement)) return;
  el.dataset.state = state;
  const lab = el.querySelector("[data-ml-label]");
  if (lab && text != null) lab.textContent = text;
}
