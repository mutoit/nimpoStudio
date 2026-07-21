/**
 * Calculadora de presupuestos de licencia.
 * Canon precios 2026: docs/licencias/00-PRECIOS-REFERENCIA.md + TABLA-RAPIDA.
 * Crítica mercado adoptada: entrada baja (micro 79) + premium real (exclusiva/buyout) +
 * ads uplift; no un solo “comercial” plano que pierde volumen y techo.
 *
 * El plazo SÍ mueve el precio (micro/single < 1 año < proyecto < 2 años).
 * La duración del audio (20 s vs 3 min) NO rebaja el fee: se cobra el uso, no el minutaje.
 *
 * Mantener en sync: functions/lib/license-quote.ts (misma lógica).
 */

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
 * Anclas EUR sin IVA (2026) — punto fijo de rangos de mercado adoptados.
 * Single/micro 79–99 · comercial 149–169 · ads 249–329 · exclusiva media 1.200–2.500 ·
 * buyout 2.990–5.500 · personal 0–49.
 */
export const LICENSE_PRICES = {
  /** Micro / sting / 1 post orgánico hobby / 1 ep podcast / splash */
  singleUse: 79,
  /** 1 año calendario */
  term1y: 129,
  /** Vida del proyecto nombrado (1 obra en ese proyecto) */
  termProject: 159,
  /** 2 años — lista estándar catálogo */
  commercialBase: 169,
  stems: 59,
  editShort: 49,
  /** Sobre base del plazo → pack ads 2y = 169+130 = 299 */
  adsUplift: 130,
  /** Exclusiva media/territorio · 2 años (suelo) */
  exclusiveFrom: 1200,
  exclusive1y: 1100,
  exclusiveSingle: 890,
  exclusiveProject: 1200,
  /** Retirada catálogo (sobre exclusiva) */
  removeFromCatalog: 250,
  termPlus1yCommercial: 55,
  termPlus1yExclusive: 220,
  territoryExpand: 149,
  /** Custom / ½ día composición (+ sync fee si aplica) */
  moreComposition: 199,
  buyoutFrom: 2990,
  /** Buyout alto / forever premium (techo del rango crítica) */
  buyoutHighFrom: 5500,
  personalMax: 49,
  /** 2.º+ tema mismo proyecto (−20 %; rango mercado −15–25 %) */
  extraTrackFactor: 0.8,
  /** Suelos revisión (no instant) */
  indieProFrom: 390,
  broadcastFrom: 890,
  saasAnnualFrom: 590,
  /** Exclusiva fuerte multi-medio mundial (suelo crítica 3.000–6.000) */
  exclusiveStrongFrom: 3000,
} as const;

export type UsageOptionMeta = {
  code: LicenseUsageCode;
  group: "personal" | "audiovisual" | "ads" | "interactive" | "live" | "special";
  canInstant: boolean;
  base: "commercial" | "ads" | "personal" | "exclusive" | "buyout" | "review";
};

export const USAGE_CATALOG: UsageOptionMeta[] = [
  { code: "personal_private", group: "personal", canInstant: false, base: "personal" },
  { code: "film_short", group: "audiovisual", canInstant: true, base: "commercial" },
  { code: "film_feature", group: "audiovisual", canInstant: false, base: "review" },
  { code: "series_one", group: "audiovisual", canInstant: true, base: "commercial" },
  { code: "series_multi", group: "audiovisual", canInstant: false, base: "review" },
  { code: "brand_video", group: "audiovisual", canInstant: true, base: "commercial" },
  { code: "social_brand", group: "audiovisual", canInstant: true, base: "commercial" },
  { code: "podcast_one", group: "audiovisual", canInstant: true, base: "commercial" },
  { code: "ads_paid", group: "ads", canInstant: true, base: "ads" },
  { code: "game_indie", group: "interactive", canInstant: true, base: "commercial" },
  { code: "game_liveops", group: "interactive", canInstant: false, base: "review" },
  { code: "app_one", group: "interactive", canInstant: true, base: "commercial" },
  { code: "app_saas", group: "interactive", canInstant: false, base: "review" },
  { code: "install_one", group: "live", canInstant: true, base: "commercial" },
  { code: "tour_event", group: "live", canInstant: false, base: "review" },
  { code: "exclusive_scope", group: "special", canInstant: true, base: "exclusive" },
  { code: "buyout", group: "special", canInstant: true, base: "buyout" },
  { code: "other", group: "special", canInstant: false, base: "review" },
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

/** Precio comercial base según plazo (no ads, no exclusiva). */
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
    case "2y":
    default:
      return {
        amount: LICENSE_PRICES.commercialBase,
        label: "Licencia comercial · 2 años",
      };
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

  const forceReview =
    !!input.needSpecialReview ||
    input.usage === "other" ||
    term === "custom" ||
    (!meta.canInstant && !wantsExclusive && !wantsBuyout);

  // —— Personal ——
  if (meta.base === "personal") {
    return {
      mode: "review",
      currency: "EUR",
      total: null,
      fromAmount: 0,
      lineItems: [],
      summaryKey: "quoteResultPersonal",
      summaryEs: `Uso personal: se revisa el propósito (0–${LICENSE_PRICES.personalMax} € o denegación). No sirve para marca ni ads.`,
      scopeEs: [
        ...scopeEs,
        "Solo uso no comercial y propósito declarado.",
        "El estudio puede denegar o pedir crédito.",
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

  // —— Revisión ——
  if (meta.base === "review" || forceReview) {
    const fromBase = commercialPriceForTerm(term === "custom" ? "2y" : term).amount;
    let from = fromBase;
    if (input.usage === "film_feature" || input.usage === "series_multi") {
      from = LICENSE_PRICES.indieProFrom;
    } else if (input.usage === "game_liveops" || input.usage === "app_saas") {
      from = LICENSE_PRICES.saasAnnualFrom;
    } else if (input.usage === "tour_event") {
      from = LICENSE_PRICES.indieProFrom;
    } else if (meta.base === "ads" || input.usage === "ads_paid") {
      from = fromBase + LICENSE_PRICES.adsUplift;
    } else if (input.usage === "other" && input.needSpecialReview) {
      // broadcast / SVOD / rarezas: suelo alto orientativo
      from = LICENSE_PRICES.broadcastFrom;
    }
    return {
      mode: "review",
      currency: "EUR",
      total: null,
      fromAmount: from,
      lineItems: [
        { code: "review_from", label: "Referencia mínima orientativa", amount: from },
      ],
      summaryKey: "quoteResultReview",
      summaryEs: `Caso fuera de tarifa fija. Referencia desde ${from} €; confirmación por email.`,
      scopeEs,
    };
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
