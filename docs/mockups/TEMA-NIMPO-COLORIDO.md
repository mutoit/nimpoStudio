# Tema Nimpo colorido

**Estado:** mockup / exploración de marca — **no** es la UI en producción.  
**Origen:** `assets/LOGO.png` (emblema caballo + medallón).  
**Mockups:** `web-paleta-logo.html` · `biblioteca-paleta-logo.html`  
**Producción actual:** carbon + dorado (`src/styles/tokens.css`).

Última revisión: 2026-07-31

---

## Idea

Misma marca Nimpo, lectura **artesanal / mediterránea / medallón**:

- Fondo **crema piedra** (como el muro del logo)
- Acentos **turquesa** del caballo
- Energía **naranja / ámbar** de la crin y el wordmark
- Texto y paneles en **azul navy** del medallón

---

## Tabla de colores

| Token CSS | Hex | Uso |
|-----------|-----|-----|
| `--teal` | `#1f9a96` | CTAs primarios, acentos activos, bordes focus |
| `--teal-deep` | `#0d6b6e` | Hover CTAs, texto de precio, énfasis |
| `--teal-soft` | `#5ec4bf` | Chips sobre fondo oscuro, highlights suaves |
| `--orange` | `#e86a3a` | CTA acento, tags, badges “excl.”, precios extras |
| `--amber` | `#f0a03a` | Gradiente con naranja, barras stems, acentos cálidos |
| `--navy` | `#142a52` | Títulos, nav, textos fuertes |
| `--navy-deep` | `#0a1833` | Fondos de panel (biblioteca), hero oscuro, tiles |
| `--cream` | `#f3e6d2` | Fondo de página / base |
| `--sand` | `#c9a87a` | Bordes, separadores, “piedra” |
| `--stone` | `#8b7355` | (opcional) textos secundarios tierra |
| `--ink` | `#1a1520` | Cuerpo de texto principal |
| `--paper` | `#faf6ef` | Superficie clara intermedia |
| `--card` | `#fffdf9` | Cards y modal |
| `--muted` | `#5c5348` | Texto secundario |

### Swatches (referencia rápida)

```
Teal        ████  #1f9a96
Teal deep   ████  #0d6b6e
Teal soft   ████  #5ec4bf
Orange      ████  #e86a3a
Amber       ████  #f0a03a
Navy        ████  #142a52
Navy deep   ████  #0a1833
Cream       ████  #f3e6d2
Sand        ████  #c9a87a
Ink         ████  #1a1520
Paper       ████  #faf6ef
Muted       ████  #5c5348
```

---

## Gradientes usados

| Nombre | CSS | Dónde |
|--------|-----|--------|
| CTA primary | `linear-gradient(135deg, #1f9a96, #0d6b6e)` | Botones teal |
| CTA accent | `linear-gradient(135deg, #e86a3a, #f0a03a)` | Botones naranja |
| Hero text | `linear-gradient(120deg, #0d6b6e, #e86a3a)` | Palabra destacada |
| Card media | navy → teal → orange (varios) | Portadas software |
| Tile biblioteca | combinaciones navy/teal/ámbar por ítem | Miniaturas grid |
| Panel biblioteca | `#0a1833` + glow teal | Bloque lateral / modal preview |
| Fondo página | cream → paper + radiales teal/naranja al 8–12 % | Body |

---

## Tipografía (mockups)

| Rol | Familia | Notas |
|-----|---------|--------|
| Display / títulos | **Cinzel** | Cercana al peso del wordmark del logo |
| Cuerpo / UI | **Source Sans 3** | Legible en formularios y filtros |

Producción hoy: otras familias en `tokens.css` — no mezclar sin decisión de producto.

---

## Componentes (cómo se aplica)

| Pieza | Tratamiento |
|-------|-------------|
| **Logo** | Circular; sombra navy suave; en header ~48–52 px |
| **Header** | Sticky; fondo cream translúcido + blur; borde sand |
| **Nav activa** | Color teal-deep + subrayado teal |
| **Botón primary** | Gradiente teal |
| **Botón accent** | Gradiente naranja → ámbar |
| **Botón ghost** | Borde navy 15–20 % opacidad |
| **Cards** | Fondo `--card`, borde sand, hover borde teal |
| **Badges** | Stems = teal sólido; Exclusiva = naranja |
| **Filtros chip** | Off = card + borde; On tipo = teal; On mood = naranja |
| **Modal** | 2 col: preview navy/teal + form cream |
| **Precios** | Teal-deep en lista; extras en naranja |
| **Total cotizador** | Fondo mix teal/naranja suave |

---

## Tokens CSS (copiar/pegar)

```css
:root {
  --teal: #1f9a96;
  --teal-deep: #0d6b6e;
  --teal-soft: #5ec4bf;
  --orange: #e86a3a;
  --amber: #f0a03a;
  --navy: #142a52;
  --navy-deep: #0a1833;
  --cream: #f3e6d2;
  --sand: #c9a87a;
  --stone: #8b7355;
  --ink: #1a1520;
  --paper: #faf6ef;
  --card: #fffdf9;
  --muted: #5c5348;
  --font-display: "Cinzel", "Times New Roman", serif;
  --font-body: "Source Sans 3", system-ui, sans-serif;
  --radius: 12px;
  --shadow: 0 16px 40px rgb(10 24 51 / 0.14);
}
```

---

## Archivos del tema (mock)

| Archivo | Qué es |
|---------|--------|
| `logo-nimpo.png` | Logo fuente del tema |
| `web-paleta-logo.html` | Home mock |
| `biblioteca-paleta-logo.html` | Biblioteca + modal |
| `web-paleta-logo-preview.jpg` | Captura home |
| `biblioteca-paleta-logo-preview.jpg` | Captura biblioteca |
| **`TEMA-NIMPO-COLORIDO.md`** | Este doc |

---

## Vs producción

| | Producción | Tema colorido |
|--|------------|----------------|
| Fondo | Casi negro carbon | Crema / paper |
| Acento | Dorado | Teal + naranja |
| Logo | (pendiente / otro) | Emblema caballo |
| Estado | Live en `nimpo-studio` | Solo `docs/mockups/` |

Para llevar esto a la web real haría falta un plan de tokens + componentes (no aplicar a ciegas sobre carbon/dorado).

---

*Exploración de marca · Nimpo 3D Studio · 2026-07-31*
