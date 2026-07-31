/**
 * Calculadora de presupuestos de licencia.
 * Canon precios 2026: docs/licencias/00-PRECIOS-REFERENCIA.md + TABLA-RAPIDA.
 *
 * SSoT importes: `license-prices.json` (copiar a functions/lib/ al cambiar).
 * Lógica: mantener en sync con functions/lib/license-quote.ts
 */
import prices from "./license-prices.json";

export type LicenseUsageCode =
  | "personal_private"
  | "film_short"
  | "film_feature"
  | "series_one"
  | "series_multi"
  | "ads_paid"
  | "brand_video"
  | "social_brand"
  | "game_indie"
  | "game_liveops"
  | "app_one"
  | "app_saas"
  | "install_one"
  | "tour_event"
  | "podcast_one"
  | "exclusive_scope"
  | "buyout"
  | "other";

/** single = 1 entrega / 1 publicación / 1 vuelo; project = vida del proyecto nombrado */
export type LicenseTermCode = "single" | "project" | "1y" | "2y" | "custom";

export type QuoteLine = {
  code: string;
  label: string;
  amount: number;
};

export type QuoteMode = "instant" | "review" | "rejected";

export type LicenseQuoteInput = {
  usage: LicenseUsageCode;
  stems?: boolean;
  editShort?: boolean;
  exclusive?: boolean;
  /** Exclusiva multi-medio / fuerte (suelo 3.000 €) */
  exclusiveStrong?: boolean;
  buyout?: boolean;
  /** Buyout alto / a medida (suelo 5.500 €, revisión si hace falta) */
  buyoutHigh?: boolean;
  needSpecialReview?: boolean;
  specialNotes?: string;
  term?: LicenseTermCode;
  /** +1 año comercial o sobre exclusiva (sobre el plazo ya elegido) */
  termPlus1y?: boolean;
  /** Exclusiva: marcar no disponible / retirar del catálogo público */
  removeFromCatalog?: boolean;
  /** Ampliar territorio/medios */
  territoryExpand?: boolean;
  /** Más composición / custom corto */
  moreComposition?: boolean;
};

export type LicenseQuoteResult = {
  mode: QuoteMode;
  currency: "EUR";
  total: number | null;
  fromAmount: number | null;
  lineItems: QuoteLine[];
  summaryKey: string;
  summaryEs: string;
  scopeEs: string[];
};

/**
 * Anclas EUR sin IVA (2026) — lista cerrada (todos con precio salvo presupuesto especial).
 * Single 79 · comercial 129–169 · ads +130 · feature/serie/tour 590 · live/SaaS 790/año ·
 * broadcast 1.200 · exclusiva 890–3.000 · buyout 2.990–5.500 · personal 49.
 */
export const LICENSE_PRICES = prices as {
  singleUse: number;
  term1y: number;
  termProject: number;
  commercialBase: number;
  stems: number;
  editShort: number;
  adsUplift: number;
  exclusiveFrom: number;
  exclusive1y: number;
  exclusiveSingle: number;
  exclusiveProject: number;
  removeFromCatalog: number;
  termPlus1yCommercial: number;
  termPlus1yExclusive: number;
  territoryExpand: number;
  moreComposition: number;
  buyoutFrom: number;
  buyoutHighFrom: number;
  personalFixed: number;
  personalMax: number;
  extraTrackFactor: number;
  filmFeature: number;
  seriesMulti: number;
  tourEvent: number;
  gameLiveopsAnnual: number;
  appSaasAnnual: number;
  broadcast: number;
  indieProFrom: number;
  broadcastFrom: number;
  saasAnnualFrom: number;
  exclusiveStrongFrom: number;
};

export type UsageOptionMeta = {
  code: LicenseUsageCode;
  group: "personal" | "audiovisual" | "ads" | "interactive" | "live" | "special";
  canInstant: boolean;
  base:
    | "commercial"
    | "ads"
    | "personal"
    | "exclusive"
    | "buyout"
    | "fixed"
    | "review";
};

export const USAGE_CATALOG: UsageOptionMeta[] = [
  { code: "personal_private", group: "personal", canInstant: true, base: "personal" },
  { code: "film_short", group: "audiovisual", canInstant: true, base: "commercial" },
  { code: "film_feature", group: "audiovisual", canInstant: true, base: "fixed" },
  { code: "series_one", group: "audiovisual", canInstant: true, base: "commercial" },
  { code: "series_multi", group: "audiovisual", canInstant: true, base: "fixed" },
  { code: "brand_video", group: "audiovisual", canInstant: true, base: "commercial" },
  { code: "social_brand", group: "audiovisual", canInstant: true, base: "commercial" },
  { code: "podcast_one", group: "audiovisual", canInstant: true, base: "commercial" },
  { code: "ads_paid", group: "ads", canInstant: true, base: "ads" },
  { code: "game_indie", group: "interactive", canInstant: true, base: "commercial" },
  { code: "game_liveops", group: "interactive", canInstant: true, base: "fixed" },
  { code: "app_one", group: "interactive", canInstant: true, base: "commercial" },
  { code: "app_saas", group: "interactive", canInstant: true, base: "fixed" },
  { code: "install_one", group: "live", canInstant: true, base: "commercial" },
  { code: "tour_event", group: "live", canInstant: true, base: "fixed" },
  { code: "exclusive_scope", group: "special", canInstant: true, base: "exclusive" },
  { code: "buyout", group: "special", canInstant: true, base: "buyout" },
  /** Lista: broadcast 1.200 €. Solo “presupuesto especial” queda sin total. */
  { code: "other", group: "special", canInstant: true, base: "fixed" },
];

const USAGE_BY_CODE = Object.fromEntries(
  USAGE_CATALOG.map((u) => [u.code, u]),
) as Record<LicenseUsageCode, UsageOptionMeta>;

export function isLicenseUsageCode(v: string): v is LicenseUsageCode {
  return v in USAGE_BY_CODE;
}

export function isLicenseTermCode(v: string): v is LicenseTermCode {
  return v === "single" || v === "project" || v === "1y" || v === "2y" || v === "custom";
}

function termLabel(term: LicenseTermCode): string {
  switch (term) {
    case "single":
      return "un solo uso";
    case "1y":
      return "1 año";
    case "project":
      return "vida del proyecto";
    case "custom":
      return "plazo a medida";
    case "2y":
    default:
      return "2 años";
  }
}

/** Precio comercial base según plazo (no ads, no exclusiva). custom → tarifa 2 años. */
export function commercialPriceForTerm(term: LicenseTermCode = "2y"): {
  amount: number;
  label: string;
} {
  switch (term) {
    case "single":
      return {
        amount: LICENSE_PRICES.singleUse,
        label: "Licencia micro / un solo uso",
      };
    case "1y":
      return {
        amount: LICENSE_PRICES.term1y,
        label: "Licencia comercial · 1 año",
      };
    case "project":
      return {
        amount: LICENSE_PRICES.termProject,
        label: "Licencia comercial · vida del proyecto",
      };
    case "custom":
      return {
        amount: LICENSE_PRICES.commercialBase,
        label: "Licencia comercial · plazo a medida (lista 2 años)",
      };
    case "2y":
    default:
      return {
        amount: LICENSE_PRICES.commercialBase,
        label: "Licencia comercial · 2 años",
      };
  }
}

/** Tarifas fijas por uso (no dependen del plazo comercial 1y/2y). */
export function fixedPriceForUsage(usage: LicenseUsageCode): {
  amount: number;
  label: string;
  annual?: boolean;
} | null {
  switch (usage) {
    case "film_feature":
      return {
        amount: LICENSE_PRICES.filmFeature,
        label: "Cine largometraje / productora (1 obra, 1 título)",
      };
    case "series_multi":
      return {
        amount: LICENSE_PRICES.seriesMulti,
        label: "Serie varios episodios (1 obra, mismo proyecto)",
      };
    case "tour_event":
      return {
        amount: LICENSE_PRICES.tourEvent,
        label: "Tour / multi-ciudad / multi-fecha",
      };
    case "game_liveops":
      return {
        amount: LICENSE_PRICES.gameLiveopsAnnual,
        label: "Juego live-ops / marketing continuo (anual)",
        annual: true,
      };
    case "app_saas":
      return {
        amount: LICENSE_PRICES.appSaasAnnual,
        label: "SaaS / app uso ilimitado (anual)",
        annual: true,
      };
    case "other":
      return {
        amount: LICENSE_PRICES.broadcast,
        label: "Broadcast / TV / SVOD (no exclusiva, 1 título)",
      };
    default:
      return null;
  }
}

/** Suelo exclusiva según plazo. */
export function exclusivePriceForTerm(term: LicenseTermCode = "2y"): {
  amount: number;
  label: string;
} {
  switch (term) {
    case "single":
      return {
        amount: LICENSE_PRICES.exclusiveSingle,
        label: "Exclusiva · un solo uso / vuelo",
      };
    case "1y":
      return {
        amount: LICENSE_PRICES.exclusive1y,
        label: "Exclusiva · 1 año",
      };
    case "project":
      return {
        amount: LICENSE_PRICES.exclusiveProject,
        label: "Exclusiva · vida del proyecto",
      };
    case "2y":
    default:
      return {
        amount: LICENSE_PRICES.exclusiveFrom,
        label: "Exclusiva · 2 años (alcance pactado)",
      };
  }
}

function addExtras(
  input: LicenseQuoteInput,
  lineItems: QuoteLine[],
  total: number,
  isExclusiveDeal: boolean,
): number {
  let t = total;

  if (input.stems) {
    t += LICENSE_PRICES.stems;
    lineItems.push({ code: "stems", label: "Stems (capas)", amount: LICENSE_PRICES.stems });
  }
  if (input.editShort) {
    t += LICENSE_PRICES.editShort;
    lineItems.push({
      code: "edit",
      label: "Edit / recorte corto",
      amount: LICENSE_PRICES.editShort,
    });
  }
  if (input.termPlus1y) {
    const amt = isExclusiveDeal
      ? LICENSE_PRICES.termPlus1yExclusive
      : LICENSE_PRICES.termPlus1yCommercial;
    t += amt;
    lineItems.push({ code: "term_plus_1y", label: "Extensión +1 año", amount: amt });
  }
  if (input.removeFromCatalog && isExclusiveDeal) {
    t += LICENSE_PRICES.removeFromCatalog;
    lineItems.push({
      code: "remove_from_catalog",
      label: "Retirar / no disponible en catálogo público",
      amount: LICENSE_PRICES.removeFromCatalog,
    });
  }
  if (input.territoryExpand) {
    t += LICENSE_PRICES.territoryExpand;
    lineItems.push({
      code: "territory_expand",
      label: "Ampliación territorio / medios",
      amount: LICENSE_PRICES.territoryExpand,
    });
  }
  if (input.moreComposition) {
    t += LICENSE_PRICES.moreComposition;
    lineItems.push({
      code: "more_composition",
      label: "Más composición / custom (½ día)",
      amount: LICENSE_PRICES.moreComposition,
    });
  }

  return t;
}

/**
 * P⇒Q: input con usage válido ⇒ result con mode y total/fromAmount coherentes.
 * El plazo (term) modifica el precio de lista comercial y exclusiva.
 */
export function calculateLicenseQuote(input: LicenseQuoteInput): LicenseQuoteResult {
  const meta = USAGE_BY_CODE[input.usage];
  const lineItems: QuoteLine[] = [];
  const term: LicenseTermCode =
    input.term && isLicenseTermCode(input.term) ? input.term : "2y";

  const scopeEs: string[] = [
    "Composición original del estudio (MIDI), hecha a mano, sin IA como autora.",
    "1 obra (tema) y 1 proyecto declarado, salvo acuerdo distinto.",
    "Sin derecho a revender el audio como librería o stock.",
    "Previews web no son el master; entrega tras aceptación y pago.",
    "El precio es por derechos de uso, no por minutos de audio (un sting de 20 s y un tema de 3 min comparten tarifa de uso).",
  ];

  const wantsExclusive =
    meta.base === "exclusive" || !!input.exclusive || input.usage === "exclusive_scope";
  const wantsBuyout = meta.base === "buyout" || !!input.buyout || input.usage === "buyout";

  // Solo “presupuesto especial” cierra sin total. Plazo custom → lista 2 años.
  const forceReview = !!input.needSpecialReview;

  // —— Personal (precio cerrado) ——
  if (meta.base === "personal") {
    const amount = LICENSE_PRICES.personalFixed;
    let total = amount;
    lineItems.push({
      code: "personal",
      label: "Licencia personal / privado (sin negocio)",
      amount,
    });
    total = addExtras(input, lineItems, total, false);
    return {
      mode: "instant",
      currency: "EUR",
      total,
      fromAmount: null,
      lineItems,
      summaryKey: "quoteResultInstant",
      summaryEs: `Uso personal: ${total} € (IVA no incluido). No sirve para marca, cliente ni ads.`,
      scopeEs: [
        ...scopeEs,
        "Solo uso no comercial y propósito declarado.",
        "Si hay marca, monetización o cliente → licencia comercial.",
      ],
    };
  }

  // —— Buyout ——
  if (wantsBuyout) {
    const high = !!input.buyoutHigh;
    if (high && input.needSpecialReview) {
      // Buyout a medida por encima del suelo alto
      return {
        mode: "review",
        currency: "EUR",
        total: null,
        fromAmount: LICENSE_PRICES.buyoutHighFrom,
        lineItems: [
          {
            code: "buyout_high_review",
            label: "Buyout alto / a medida (referencia)",
            amount: LICENSE_PRICES.buyoutHighFrom,
          },
        ],
        summaryKey: "quoteResultReview",
        summaryEs: `Buyout alto / a medida: referencia desde ${LICENSE_PRICES.buyoutHighFrom} €; confirmación por email.`,
        scopeEs: [
          ...scopeEs,
          "Retirada indefinida de catálogo. Alcance y fee final a pactar.",
        ],
      };
    }
    const base = high ? LICENSE_PRICES.buyoutHighFrom : LICENSE_PRICES.buyoutFrom;
    let total = base;
    lineItems.push({
      code: high ? "buyout_high" : "buyout",
      label: high
        ? "Buyout alto / forever premium"
        : "Buyout / fuera de catálogo indefinido",
      amount: base,
    });
    total = addExtras(input, lineItems, total, true);
    return {
      mode: "instant",
      currency: "EUR",
      total,
      fromAmount: null,
      lineItems,
      summaryKey: "quoteResultBuyout",
      summaryEs: high
        ? `Buyout alto: ${total} € (IVA no incluido). Fuera de catálogo indefinido.`
        : `Buyout de catálogo: ${total} € (IVA no incluido). La obra deja de ofrecerse a terceros.`,
      scopeEs: [
        ...scopeEs,
        "Retirada de catálogo y no re-licencia en el alcance del buyout.",
      ],
    };
  }

  // —— Exclusiva ——
  if (wantsExclusive) {
    const strong = !!input.exclusiveStrong;
    const ex = exclusivePriceForTerm(term === "custom" ? "2y" : term);
    const amount = strong ? LICENSE_PRICES.exclusiveStrongFrom : ex.amount;
    let total = amount;
    lineItems.push({
      code: strong ? "exclusive_strong" : "exclusive",
      label: strong
        ? "Exclusiva fuerte multi-medio (suelo)"
        : ex.label,
      amount,
    });
    total = addExtras(input, lineItems, total, true);
    const remove = !!input.removeFromCatalog;
    return {
      mode: "instant",
      currency: "EUR",
      total,
      fromAmount: null,
      lineItems,
      summaryKey: "quoteResultExclusive",
      summaryEs: strong
        ? `Exclusiva fuerte multi-medio: ${total} €. Casos 3.000–6.000+ se revisan si el alcance lo exige.`
        : remove
          ? `Exclusiva (${termLabel(term)}) + no disponible en catálogo: ${total} €.`
          : `Exclusiva (${termLabel(term)}): ${total} €.`,
      scopeEs: [
        ...scopeEs,
        strong
          ? "Exclusividad multi-medio / fuerte en el alcance pactado."
          : `Exclusividad en el alcance pactado · plazo: ${termLabel(term)}.`,
        remove
          ? "Retirada o marcaje no disponible en catálogo público durante la exclusiva."
          : "Puede permanecer visible como no disponible / exclusiva.",
      ],
    };
  }

  // —— Solo presupuesto especial (sin precio cerrado) ——
  if (forceReview) {
    const from = commercialPriceForTerm(term === "custom" ? "2y" : term).amount;
    return {
      mode: "review",
      currency: "EUR",
      total: null,
      fromAmount: from,
      lineItems: [
        { code: "review_from", label: "Referencia mínima orientativa", amount: from },
      ],
      summaryKey: "quoteResultReview",
      summaryEs: `Presupuesto especial: sin tarifa fija. Referencia orientativa desde ${from} €; te respondemos por email.`,
      scopeEs,
    };
  }

  // —— Tarifas fijas por uso (feature, serie multi, tour, live-ops, SaaS, broadcast) ——
  if (meta.base === "fixed") {
    const fixed = fixedPriceForUsage(input.usage);
    if (fixed) {
      let total = fixed.amount;
      lineItems.push({
        code: input.usage,
        label: fixed.label,
        amount: fixed.amount,
      });
      total = addExtras(input, lineItems, total, false);
      scopeEs.push(
        fixed.annual
          ? "Licencia anual renovable. Uso en el producto/servicio declarado."
          : "1 obra y 1 proyecto/título declarado. No exclusiva salvo add-ons.",
      );
      return {
        mode: "instant",
        currency: "EUR",
        total,
        fromAmount: null,
        lineItems,
        summaryKey: "quoteResultInstant",
        summaryEs: fixed.annual
          ? `Presupuesto de catálogo: ${total} € / año (IVA no incluido).`
          : `Presupuesto de catálogo: ${total} € (IVA no incluido).`,
        scopeEs,
      };
    }
  }

  // —— Instant comercial / ads ——
  const commercial = commercialPriceForTerm(term);
  let total = 0;

  if (meta.base === "ads" || input.usage === "ads_paid") {
    total = commercial.amount + LICENSE_PRICES.adsUplift;
    lineItems.push({
      code: "commercial",
      label: commercial.label,
      amount: commercial.amount,
    });
    lineItems.push({
      code: "ads",
      label: "Ads / campaña de pago",
      amount: LICENSE_PRICES.adsUplift,
    });
    scopeEs.push(
      `Vuelo publicitario de pago multi-canal · plazo de derechos: ${termLabel(term)}.`,
    );
  } else {
    total = commercial.amount;
    lineItems.push({
      code: "commercial",
      label: commercial.label,
      amount: commercial.amount,
    });
    if (term === "single") {
      scopeEs.push(
        "Un solo uso: 1 entrega / 1 publicación o vuelo declarado. No reutilizable en otra campaña o proyecto.",
        "Territorio mundial en ese uso. Master WAV.",
      );
    } else if (term === "1y") {
      scopeEs.push(
        "No exclusiva. Territorio mundial, 1 año desde la fecha de licencia, master WAV.",
        "Medios del proyecto: online, redes, festival, trailer del mismo proyecto.",
      );
    } else if (term === "project") {
      scopeEs.push(
        "No exclusiva. Vida del proyecto nombrado (mientras ese proyecto exista en su forma declarada).",
        "No se reutiliza la obra en otro proyecto sin nueva licencia.",
      );
    } else {
      scopeEs.push(
        "No exclusiva. Territorio mundial, plazo 2 años, master WAV.",
        "Medios del proyecto: online, redes, festival, trailer del mismo proyecto.",
      );
    }
  }

  total = addExtras(input, lineItems, total, false);

  return {
    mode: "instant",
    currency: "EUR",
    total,
    fromAmount: null,
    lineItems,
    summaryKey: "quoteResultInstant",
    summaryEs: `Presupuesto de catálogo (${termLabel(term)}): ${total} € (IVA no incluido).`,
    scopeEs,
  };
}

export function formatEur(amount: number): string {
  return `${amount.toLocaleString("es-ES")} €`;
}
