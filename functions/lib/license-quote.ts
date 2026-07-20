/**
 * Calculadora de presupuestos de licencia.
 * Precios: docs/licencias/PLAN-BIBLIOTECA-Y-PRECIOS.md (conservadores, media baja).
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

export type LicenseTermCode = "project" | "1y" | "2y" | "custom";

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
  buyout?: boolean;
  needSpecialReview?: boolean;
  specialNotes?: string;
  term?: LicenseTermCode;
  /** +1 año comercial o sobre exclusiva */
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

/** Anclas conservadoras (media baja). EUR sin IVA. */
export const LICENSE_PRICES = {
  commercialBase: 179,
  stems: 59,
  editShort: 49,
  adsUplift: 150,
  exclusiveFrom: 890,
  removeFromCatalog: 190,
  termPlus1yCommercial: 59,
  termPlus1yExclusive: 190,
  territoryExpand: 149,
  moreComposition: 149,
  buyoutFrom: 2490,
  personalMax: 39,
  extraTrackFactor: 0.8,
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
 */
export function calculateLicenseQuote(input: LicenseQuoteInput): LicenseQuoteResult {
  const meta = USAGE_BY_CODE[input.usage];
  const lineItems: QuoteLine[] = [];
  const scopeEs: string[] = [
    "Composición original del estudio (MIDI), hecha a mano, sin IA como autora.",
    "1 obra (tema) y 1 proyecto declarado, salvo acuerdo distinto.",
    "Sin derecho a revender el audio como librería o stock.",
    "Previews web no son el master; entrega tras aceptación y pago.",
  ];

  const wantsExclusive =
    meta.base === "exclusive" || !!input.exclusive || input.usage === "exclusive_scope";
  const wantsBuyout = meta.base === "buyout" || !!input.buyout || input.usage === "buyout";

  const forceReview =
    !!input.needSpecialReview ||
    input.usage === "other" ||
    input.term === "custom" ||
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
    let total = LICENSE_PRICES.buyoutFrom;
    lineItems.push({
      code: "buyout",
      label: "Buyout / fuera de catálogo indefinido",
      amount: LICENSE_PRICES.buyoutFrom,
    });
    total = addExtras(input, lineItems, total, true);
    return {
      mode: "instant",
      currency: "EUR",
      total,
      fromAmount: null,
      lineItems,
      summaryKey: "quoteResultBuyout",
      summaryEs: `Buyout de catálogo: ${total} € (IVA no incluido). La obra deja de ofrecerse a terceros.`,
      scopeEs: [
        ...scopeEs,
        "Retirada de catálogo y no re-licencia en el alcance del buyout.",
      ],
    };
  }

  // —— Exclusiva ——
  if (wantsExclusive) {
    let total = LICENSE_PRICES.exclusiveFrom;
    lineItems.push({
      code: "exclusive",
      label: "Exclusiva (alcance pactado)",
      amount: LICENSE_PRICES.exclusiveFrom,
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
      summaryEs: remove
        ? `Exclusiva + no disponible en catálogo: ${total} €.`
        : `Exclusiva (puede seguir listada como «no disponible»): ${total} €.`,
      scopeEs: [
        ...scopeEs,
        "Exclusividad en el alcance pactado por escrito.",
        remove
          ? "Retirada o marcaje no disponible en catálogo público durante la exclusiva."
          : "Puede permanecer visible como no disponible / exclusiva.",
      ],
    };
  }

  // —— Revisión ——
  if (meta.base === "review" || forceReview) {
    const from =
      meta.base === "ads" || input.usage === "film_feature"
        ? LICENSE_PRICES.commercialBase + LICENSE_PRICES.adsUplift
        : LICENSE_PRICES.commercialBase;
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
  let total = 0;
  if (meta.base === "ads" || input.usage === "ads_paid") {
    total = LICENSE_PRICES.commercialBase + LICENSE_PRICES.adsUplift;
    lineItems.push({
      code: "commercial",
      label: "Licencia comercial base",
      amount: LICENSE_PRICES.commercialBase,
    });
    lineItems.push({
      code: "ads",
      label: "Ads / campaña de pago",
      amount: LICENSE_PRICES.adsUplift,
    });
    scopeEs.push(
      "Vuelo publicitario de pago multi-canal de referencia (hasta ~6 meses, 1 marca).",
    );
  } else {
    total = LICENSE_PRICES.commercialBase;
    lineItems.push({
      code: "commercial",
      label: "Licencia comercial estándar",
      amount: LICENSE_PRICES.commercialBase,
    });
    scopeEs.push(
      "No exclusiva. Territorio mundial, plazo 2 años (o vida del proyecto), master WAV.",
      "Medios del proyecto: online, redes, festival, trailer del mismo proyecto.",
    );
  }

  total = addExtras(input, lineItems, total, false);

  return {
    mode: "instant",
    currency: "EUR",
    total,
    fromAmount: null,
    lineItems,
    summaryKey: "quoteResultInstant",
    summaryEs: `Presupuesto de catálogo: ${total} € (IVA no incluido). Condiciones estándar del uso elegido.`,
    scopeEs,
  };
}

export function formatEur(amount: number): string {
  return `${amount.toLocaleString("es-ES")} €`;
}
