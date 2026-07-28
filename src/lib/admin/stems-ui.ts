/**
 * UI de capas stems + dropzone admin biblioteca.
 */

export type StemRow = { label: string; file: File | null };

export type StemsUi = {
  getRows: () => StemRow[];
  setRows: (rows: StemRow[]) => void;
  render: () => void;
  addFiles: (files: FileList | File[]) => void;
  clear: () => void;
};

export function createStemsUi(opts: {
  onStatus: (msg: string, ok?: boolean) => void;
  onChange?: () => void;
}): StemsUi {
  let stemRows: StemRow[] = [];
  const stemsList = document.querySelector("[data-stems-list]");

  const isAudioFile = (f: File) => {
    const n = f.name.toLowerCase();
    if (/\.(mp3|wav|m4a|ogg|aac|flac|aiff?)$/.test(n)) return true;
    return (f.type || "").startsWith("audio/");
  };

  /** false durante el primer paint: evita onChange → stemsUi.getRows() antes de asignar const */
  let ready = false;

  const render = () => {
    if (!stemsList) return;
    if (!stemRows.length) {
      stemsList.innerHTML = `<p class="stems-empty">Aún no hay capas. Arrastra archivos arriba.</p>`;
      if (ready) opts.onChange?.();
      return;
    }
    stemsList.innerHTML = stemRows
      .map(
        (row, i) => `
      <div class="stem-row" data-stem-i="${i}">
        <input type="text" placeholder="Etiqueta" value="${(row.label || "").replace(/"/g, "&quot;")}" data-stem-label />
        <span class="stem-fname" title="${row.file ? row.file.name.replace(/"/g, "") : ""}">${row.file ? row.file.name : "sin archivo"}</span>
        <button type="button" class="btn btn--sm btn--danger" data-stem-remove aria-label="Quitar">×</button>
      </div>`,
      )
      .join("");
    stemsList.querySelectorAll(".stem-row").forEach((el) => {
      const i = Number((el as HTMLElement).dataset.stemI);
      el.querySelector("[data-stem-label]")?.addEventListener("input", (ev) => {
        if (stemRows[i]) stemRows[i]!.label = (ev.target as HTMLInputElement).value;
      });
      el.querySelector("[data-stem-remove]")?.addEventListener("click", () => {
        stemRows.splice(i, 1);
        render();
      });
    });
    if (ready) opts.onChange?.();
  };

  const addFiles = (files: FileList | File[]) => {
    const list = [...files].filter(isAudioFile);
    if (!list.length) {
      opts.onStatus("Suelta archivos de audio (mp3, wav…)", false);
      return;
    }
    stemRows = stemRows.filter((r) => r.file);
    for (const f of list) {
      stemRows.push({
        label: f.name.replace(/\.[^.]+$/, ""),
        file: f,
      });
    }
    render();
    opts.onStatus(`${list.length} stem(s) añadido(s). Puedes renombrar o quitar filas.`);
  };

  const drop = document.querySelector("[data-stems-drop]");
  const pick = document.querySelector("[data-stems-pick]");
  if (drop instanceof HTMLElement) {
    const setDrag = (on: boolean) => drop.classList.toggle("is-drag", on);
    ["dragenter", "dragover"].forEach((ev) => {
      drop.addEventListener(ev, (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDrag(true);
      });
    });
    ["dragleave", "drop"].forEach((ev) => {
      drop.addEventListener(ev, (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (ev === "dragleave") setDrag(false);
      });
    });
    drop.addEventListener("drop", (e) => {
      setDrag(false);
      const dt = (e as DragEvent).dataTransfer;
      if (dt?.files?.length) addFiles(dt.files);
    });
    drop.addEventListener("click", () => {
      if (pick instanceof HTMLInputElement) pick.click();
    });
    drop.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (pick instanceof HTMLInputElement) pick.click();
      }
    });
  }
  if (pick instanceof HTMLInputElement) {
    pick.addEventListener("change", () => {
      if (pick.files?.length) addFiles(pick.files);
      pick.value = "";
    });
  }

  document.querySelector("[data-add-stem]")?.addEventListener("click", () => {
    stemRows.push({ label: "", file: null });
    render();
  });

  stemRows = [];
  render();
  ready = true;

  return {
    getRows: () => stemRows,
    setRows: (rows) => {
      stemRows = rows;
      render();
    },
    render,
    addFiles,
    clear: () => {
      stemRows = [];
      render();
    },
  };
}
