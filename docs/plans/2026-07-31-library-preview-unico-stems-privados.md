# Plan: preview único + stems/master privados (modelo único)

**tier:** M  
**status:** done  
**date:** 2026-07-31  
**orden:** usuario «hazlo así» (aplicar sin STOP)

## Scope

- Biblioteca pública: **solo 1 preview** (mix comprimido ± ruido). Sin player multi-stem.
- Admin: sube **stems HQ intactos** + opcional master; genera **una** copia de trabajo (mix) para la web.
- Originales no se reescriben (ni mono ni make-up).
- Limpiar dual `src`/`cleanSrc`, bake-por-stem, re-bake ruido desde clean, play público StemTransport en biblioteca.

## Modelo

| Asset | R2 | Público |
|-------|-----|---------|
| Preview mix | `library/{slug}/…-preview…` | sí `/api/media` |
| Stems HQ | `library/{slug}/full/stems/…` | no (403 en media) |
| Master | `library/{slug}/full/…` | no |

Catálogo: `preview`, `stems[{id,label,key}]`, `hasStems`, `masterKey`/`hasMaster`.

## Touch map

### P1 Publish + schema
| Archivo | Símbolo | Rol |
|---------|---------|-----|
| `functions/admin/publish.ts` | putPrivateStem, StemItem | HQ → full/stems; form stem_i = original |
| `functions/lib/media-upload.ts` | isPrivateMasterKey | reutilizar / full/ |
| `functions/lib/catalog-sanitize.ts` | sanitizeCatalogItem | público sin stems[]; admin meta hasStems |
| `functions/api/library.ts` | detail/list | sin stems URLs |

### P2 Admin client
| Archivo | Símbolo | Rol |
|---------|---------|-----|
| `src/lib/preview-noise-bake.ts` | bakeLibraryPreview | 1 mix+ruido+mp3; quitar bake por stem o deprecar |
| `src/lib/admin/publish.ts` | bindAdminPublish | stems intactos + 1 preview |
| `src/pages/admin/biblioteca.astro` | UI/play | sin dual clean; labels claros |
| `functions/admin/media.ts` | (nuevo) | stream privado admin |
| `src/lib/admin/preview-rebuild.ts` | rebuild | desde keys privadas o preview |

### P3 Biblioteca
| Archivo | Símbolo | Rol |
|---------|---------|-----|
| `src/lib/library-browser/play-session.ts` | playPreviewOrStems | solo preview |
| `src/lib/library-browser/bind.ts` | modal mix | sin multi-stem play |

### NO TOCAR
| Archivo | Por qué |
|---------|---------|
| `StemPlayer.astro` / music static | releases JSON aparte |
| Stripe / master download tokens | siguiente slice |
| software fullKey products | otro canal |

## Out of scope
- Checkout música + token descarga stems
- Migración batch R2 de stems viejos (re-publicar ficha)
- Quitar `stem-transport.ts` (sigue music pages)

## Verify
1. Build OK
2. Public `/api/library?slug=` sin `stems[]` con URLs; `hasPreview`/`preview` sí
3. Nuevo publish: keys bajo `full/stems/`; preview sin `/full/`
4. `/api/media/…/full/…` → 403
5. Admin UI: Escuchar mezcla local; publicar genera 1 preview

## Blocks
1. Server publish + sanitize + admin media  
2. Bake library preview único + admin publish client  
3. Biblioteca play solo preview + UI cleanup  
4. Docs + commit
