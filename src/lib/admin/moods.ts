/**
 * Moods admin biblioteca: vocabulario + pills + manage list.
 */

const MOOD_LS_KEY = "nimpo-admin-moods-v1";
const MOOD_DENY_KEY = "nimpo-admin-moods-deny-v1";
const DEFAULT_MOODS = [
  "oscuro",
  "orgánico",
  "inmersivo",
  "nocturno",
  "lento",
  "energético",
  "etérea",
  "apertura",
  "cinematic",
  "minimal",
  "esperanza",
  "ambient",
  "forest",
  "electronic",
  "groove",
  "pads",
  "strings",
  "synth",
];

export function normalizeMood(raw: string) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 40);
}

export type MoodsApi = {
  normalizeMood: typeof normalizeMood;
  rememberMood: (v: string) => void;
  readSelectedMoods: () => string[];
  rebuildMoodPick: (opts?: { selected?: string[]; filters?: string[] }) => void;
  getServerMoods: () => string[];
  setServerMoods: (list: string[]) => void;
  mergeServerMoods: (list: string[]) => void;
};

export function createMoodsApi(opts: {
  getPublications: () => Record<string, unknown>[];
  onStatus: (msg: string, ok?: boolean) => void;
}): MoodsApi {
  let serverMoods: string[] = [];

  const loadStoredMoods = (): string[] => {
    try {
      const raw = JSON.parse(localStorage.getItem(MOOD_LS_KEY) || "[]");
      return Array.isArray(raw) ? raw.map(normalizeMood).filter(Boolean) : [];
    } catch {
      return [];
    }
  };
  const loadDeniedMoods = (): Set<string> => {
    try {
      return new Set(
        (JSON.parse(localStorage.getItem(MOOD_DENY_KEY) || "[]") as string[]).map(
          normalizeMood,
        ),
      );
    } catch {
      return new Set();
    }
  };
  const saveStoredMoods = (list: string[]) => {
    try {
      localStorage.setItem(
        MOOD_LS_KEY,
        JSON.stringify(
          [...new Set(list.map(normalizeMood).filter(Boolean))].sort((a, b) =>
            a.localeCompare(b, "es"),
          ),
        ),
      );
    } catch {
      /* */
    }
  };
  const rememberMood = (v: string) => {
    const n = normalizeMood(v);
    if (!n) return;
    try {
      const deny = loadDeniedMoods();
      if (deny.has(n)) {
        deny.delete(n);
        localStorage.setItem(MOOD_DENY_KEY, JSON.stringify([...deny]));
      }
    } catch {
      /* */
    }
    const set = new Set(loadStoredMoods());
    set.add(n);
    saveStoredMoods([...set]);
  };
  const forgetMood = (v: string) => {
    const n = normalizeMood(v);
    saveStoredMoods(loadStoredMoods().filter((m) => m !== n));
    try {
      const deny = loadDeniedMoods();
      deny.add(n);
      localStorage.setItem(MOOD_DENY_KEY, JSON.stringify([...deny]));
    } catch {
      /* */
    }
  };

  const moodVocabulary = (): string[] => {
    const deny = loadDeniedMoods();
    const s = new Set(DEFAULT_MOODS.map(normalizeMood));
    for (const m of serverMoods) s.add(normalizeMood(m));
    for (const m of loadStoredMoods()) s.add(m);
    for (const p of opts.getPublications()) {
      for (const m of (p.moods as string[]) || []) s.add(normalizeMood(m));
      for (const t of (p.tags as string[]) || []) s.add(normalizeMood(t));
    }
    return [...s]
      .filter((m) => m && !deny.has(m))
      .sort((a, b) => a.localeCompare(b, "es"));
  };

  const readSelectedMoods = (): string[] => {
    const tagsEl = document.querySelector("[data-mood-tags]");
    if (!(tagsEl instanceof HTMLElement)) return [];
    return [...tagsEl.querySelectorAll<HTMLElement>("[data-mood-tag].is-on")]
      .map((el) => normalizeMood(el.dataset.mood || ""))
      .filter(Boolean);
  };

  const rebuildMoodPick = (pickOpts?: { selected?: string[]; filters?: string[] }) => {
    const tagsEl = document.querySelector("[data-mood-tags]");
    const manageEl = document.querySelector("[data-mood-manage]");
    if (!(tagsEl instanceof HTMLElement)) return;

    let selected = new Set<string>();
    if (pickOpts?.selected || pickOpts?.filters) {
      for (const m of pickOpts.selected || []) selected.add(normalizeMood(m));
      for (const m of pickOpts.filters || []) selected.add(normalizeMood(m));
    } else {
      for (const m of readSelectedMoods()) selected.add(m);
    }
    for (const m of selected) rememberMood(m);

    const vocab = moodVocabulary();
    tagsEl.innerHTML = "";
    for (const m of vocab) {
      const on = selected.has(m);
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = on ? "mood-tag is-on" : "mood-tag";
      pill.dataset.moodTag = "1";
      pill.dataset.mood = m;
      pill.setAttribute("aria-pressed", on ? "true" : "false");
      pill.textContent = m;
      pill.title = on ? "Seleccionada · clic para quitar" : "Clic para marcar en esta obra";
      if (on) {
        pill.style.background = "#c9a962";
        pill.style.borderColor = "#c9a962";
        pill.style.color = "#0c0a06";
        pill.style.fontWeight = "700";
        pill.style.boxShadow = "0 0 0 2px rgba(201,169,98,0.5)";
      }
      pill.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const next = new Set(readSelectedMoods());
        if (next.has(m)) next.delete(m);
        else next.add(m);
        rebuildMoodPick({ selected: [...next] });
      });
      tagsEl.appendChild(pill);
      if (on) {
        const hi = document.createElement("input");
        hi.type = "checkbox";
        hi.name = "moodPick";
        hi.value = m;
        hi.checked = true;
        hi.hidden = true;
        tagsEl.appendChild(hi);
        const hf = document.createElement("input");
        hf.type = "checkbox";
        hf.name = "moodFilter";
        hf.value = m;
        hf.checked = true;
        hf.hidden = true;
        tagsEl.appendChild(hf);
      }
    }

    if (manageEl instanceof HTMLElement) {
      manageEl.innerHTML = "";
      for (const m of vocab) {
        const li = document.createElement("li");
        li.className = "mood-manage-row";
        const del = document.createElement("button");
        del.type = "button";
        del.className = "mood-trash";
        del.setAttribute("aria-label", "Borrar " + m);
        del.title = "Quitar de la lista";
        del.innerHTML =
          '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/></svg>';
        del.addEventListener("click", () => {
          if (!confirm("¿Quitar «" + m + "» de la lista global?")) return;
          forgetMood(m);
          void (async () => {
            try {
              const res = await fetch("/admin/items", {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "remove_mood", mood: m }),
              });
              const data = await res.json();
              if (res.ok && data.ok && Array.isArray(data.moods)) {
                serverMoods = data.moods.map(String);
              }
            } catch {
              /* local deny ya aplicado */
            }
            rebuildMoodPick({
              selected: readSelectedMoods().filter((x) => x !== m),
            });
            opts.onStatus("Mood «" + m + "» quitado de la lista.");
          })();
        });
        const span = document.createElement("span");
        span.className = "mood-manage-name";
        span.textContent = m;
        li.appendChild(del);
        li.appendChild(span);
        manageEl.appendChild(li);
      }
    }

    const hint = document.querySelector("[data-mood-hint]");
    if (hint instanceof HTMLElement) {
      hint.hidden = false;
      hint.textContent =
        selected.size + " marcados (obra + filtro web) · " + vocab.length + " etiquetas";
    }
  };

  const addMoodFromInput = () => {
    const input = document.querySelector("[data-mood-custom]");
    if (!(input instanceof HTMLInputElement)) return;
    const v = normalizeMood(input.value);
    if (!v) {
      opts.onStatus("Escribe un mood para añadir.", false);
      return;
    }
    rememberMood(v);
    const next = new Set(readSelectedMoods());
    next.add(v);
    rebuildMoodPick({ selected: [...next] });
    input.value = "";
    opts.onStatus("Mood «" + v + "» añadido y marcado (azul).");
  };

  document.querySelector("[data-mood-add]")?.addEventListener("click", (e) => {
    e.preventDefault();
    addMoodFromInput();
  });
  document.querySelector("[data-mood-custom]")?.addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key === "Enter") {
      e.preventDefault();
      addMoodFromInput();
    }
  });

  return {
    normalizeMood,
    rememberMood,
    readSelectedMoods,
    rebuildMoodPick,
    getServerMoods: () => serverMoods,
    setServerMoods: (list) => {
      serverMoods = list.map(normalizeMood).filter(Boolean);
    },
    mergeServerMoods: (list) => {
      const merged = new Set([
        ...serverMoods.map(normalizeMood),
        ...list.map((x) => normalizeMood(String(x))),
      ]);
      serverMoods = [...merged].filter(Boolean);
    },
  };
}
