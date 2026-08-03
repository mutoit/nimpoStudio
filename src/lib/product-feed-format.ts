/**
 * Formato lite del cuerpo de posts del feed de productos.
 * Escape HTML primero; luego listas, saltos y **negrita**.
 * Sin HTML crudo del autor.
 */

import { escapeHtml } from "./dom-escape";

function applyBold(escapedLine: string): string {
  // Tras escape, **texto** no contiene tags del autor
  return escapedLine.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function isUlLine(line: string): boolean {
  return /^[-*]\s+\S/.test(line);
}

function isOlLine(line: string): boolean {
  return /^\d+\.\s+\S/.test(line);
}

function stripListMarker(line: string): string {
  if (isUlLine(line)) return line.replace(/^[-*]\s+/, "");
  if (isOlLine(line)) return line.replace(/^\d+\.\s+/, "");
  return line;
}

/**
 * Convierte texto de post a HTML seguro (listas, párrafos, negrita).
 */
export function formatProductFeedBody(raw: string): string {
  const text = String(raw || "").replace(/\r\n/g, "\n").trim();
  if (!text) return "";

  const lines = text.split("\n");
  const blocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // línea vacía → separador de bloques
    if (!line.trim()) {
      i++;
      continue;
    }

    if (isUlLine(line)) {
      const items: string[] = [];
      while (i < lines.length && isUlLine(lines[i])) {
        items.push(`<li>${applyBold(escapeHtml(stripListMarker(lines[i]).trim()))}</li>`);
        i++;
      }
      blocks.push(`<ul class="updates-panel__list-md">${items.join("")}</ul>`);
      continue;
    }

    if (isOlLine(line)) {
      const items: string[] = [];
      while (i < lines.length && isOlLine(lines[i])) {
        items.push(`<li>${applyBold(escapeHtml(stripListMarker(lines[i]).trim()))}</li>`);
        i++;
      }
      blocks.push(`<ol class="updates-panel__list-md">${items.join("")}</ol>`);
      continue;
    }

    // párrafo: líneas no-lista hasta vacío o lista
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !isUlLine(lines[i]) &&
      !isOlLine(lines[i])
    ) {
      para.push(applyBold(escapeHtml(lines[i].trim())));
      i++;
    }
    if (para.length) {
      blocks.push(`<p class="updates-panel__para">${para.join("<br />")}</p>`);
    }
  }

  return blocks.join("");
}
