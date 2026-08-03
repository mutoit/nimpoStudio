/**
 * Dropzone genérico admin: arrastrar o clic → escribe en input[type=file] + change.
 * Un solo path de archivos (sin FormData paralelo).
 */

export type BindFileDropzoneOpts = {
  drop: HTMLElement;
  input: HTMLInputElement;
  /** default false */
  multiple?: boolean;
  maxFiles?: number;
  acceptFile?: (f: File) => boolean;
  onReject?: (reason: string) => void;
  /** tras asignar files (change ya disparado) */
  onAssigned?: (files: File[]) => void;
};

/** Parse simple de attribute accept: .ext, mime/*, mime/type */
export function fileMatchesAccept(file: File, acceptAttr: string | null | undefined): boolean {
  const raw = (acceptAttr || "").trim();
  if (!raw) return true;
  const tokens = raw.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (!tokens.length) return true;
  const name = file.name.toLowerCase();
  const type = (file.type || "").toLowerCase();
  const ext = name.includes(".") ? `.${name.split(".").pop()}` : "";
  for (const t of tokens) {
    if (t.startsWith(".")) {
      if (ext === t) return true;
      continue;
    }
    if (t.endsWith("/*")) {
      const prefix = t.slice(0, -1); // "image/"
      if (type.startsWith(prefix)) return true;
      continue;
    }
    if (type && type === t) return true;
  }
  return false;
}

export function bindFileDropzone(opts: BindFileDropzoneOpts): void {
  const { drop, input } = opts;
  const multiple = Boolean(opts.multiple ?? input.multiple);
  const maxFiles = opts.maxFiles ?? (multiple ? 32 : 1);
  const acceptFile =
    opts.acceptFile ??
    ((f: File) => fileMatchesAccept(f, input.getAttribute("accept")));

  const setDrag = (on: boolean) => drop.classList.toggle("is-drag", on);

  const assign = (raw: FileList | File[]) => {
    const list = [...raw].filter(acceptFile);
    if (!list.length) {
      opts.onReject?.("Tipo de archivo no válido para esta zona");
      return;
    }
    const picked = multiple ? list.slice(0, maxFiles) : list.slice(0, 1);
    const dt = new DataTransfer();
    for (const f of picked) dt.items.add(f);
    input.files = dt.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    opts.onAssigned?.(picked);
  };

  ["dragenter", "dragover"].forEach((ev) => {
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDrag(true);
    });
  });
  drop.addEventListener("dragleave", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag(false);
  });
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag(false);
    const files = (e as DragEvent).dataTransfer?.files;
    if (files?.length) assign(files);
  });

  drop.addEventListener("click", (e) => {
    // no reabrir si el target es el input (por si no está hidden en algún caso)
    if (e.target === input) return;
    input.click();
  });
  drop.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      input.click();
    }
  });

  // pick nativo ya dispara change; no re-asignar
}
