---
status: done
source: direct
tier: XS
mode: normal
date: 2026-08-03
slug: admin-pub-edit-icons
repro: "Admin biblioteca → rail Publicaciones: tiles sin botones visibles de editar/borrar"
legitimidad: mixto
decision: refactorizar
---

# Rail admin: iconos editar/borrar invisibles

## Diagnóstico
- **Dónde deberían estar:** bajo el título de cada celda (`tile__actions`) — `✎` editar · `🗑` borrar.
- **Código:** `src/lib/admin/pubs-rail.ts` L75–78 (y feed análogo en `feed.ts`).
- **También edita:** clic en la **miniatura** (`data-pub-edit` en `tile__media`).
- **Por qué no se ven en captura:** emoji frágiles + barra oscura (feeling bajo); posible clip/`height:0` en media. No faltan en el markup.

## Touch graph (XS)
### TOCAR
| Archivo | Símbolo | Qué cambia |
|---------|---------|------------|
| `pubs-rail.ts` | `renderPubs` markup | labels "Editar"/"Borrar" (+ aria) |
| `admin-biblioteca.css` | `.tile__actions` / `.tile__btn` | always visible, flex-shrink 0, contraste |
| `feed.ts` | `renderFeedGrid` | misma barra (paridad) |

### NO TOCAR
| Archivo | Por qué |
|---------|---------|
| catálogo público | no es admin |
| `productos.astro` rail | ya tiene botones |

### Legitimidad: mixto · decisión: refactorizar (markup válido, UX rota) | Modo: normal

## IMPACTO
Sin fix: solo se puede editar si se descubre clic en cover (no obvio).

## Blocks
1. Textos Editar/Borrar + CSS barra visible  
2. Paridad feed tiles  
3. VERIFY: rail muestra 2 botones por tile

## VERIFY
- Hard refresh admin biblioteca → cada tile con **Editar** | **Borrar**  
- Clic Editar → form se rellena + barra "Editando…"
