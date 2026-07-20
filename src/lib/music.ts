import rawReleases from "../data/music.json";
import type { Locale } from "../i18n/translations";
import { getTranslation } from "../i18n/translations";

export type MusicReleaseType = "single" | "ep" | "album" | "pack";

export type MusicStatus = "published" | "draft" | "coming-soon";

export type MusicTrack = {
  slug: string;
  title: string;
  duration: string;
  previewAudio: string | null;
  description: string;
  stems?: Array<{
    id: string;
    label: string;
    src: string;
  }>;
};

/** Sync license tiers offered for a release (contact-based until store). */
export type MusicLicenseTierId = "personal" | "commercial" | "exclusive";

export type MusicLicensePricing = "fixed" | "from" | "request";

export type MusicLicenseTier = {
  id: MusicLicenseTierId;
  /**
   * List price text, e.g. "290 €" or "1.800 €".
   * How it displays depends on `pricing`.
   */
  priceFrom?: string | null;
  /**
   * fixed = show price as-is (compra simple).
   * from = "Desde {priceFrom}".
   * request = "Bajo petición" (ignora priceFrom en UI).
   */
  pricing?: MusicLicensePricing;
  /**
   * Personal (and special cases): no list price — client must explain purpose.
   * Default true only for `personal` when omitted.
   */
  requestOnly?: boolean;
};

export type MusicLicense = {
  contactOnly?: boolean;
  tiers: MusicLicenseTier[];
};

export type MusicRelease = {
  slug: string;
  name: string;
  type: MusicReleaseType;
  status: MusicStatus;
  year: number;
  shortDescription: string;
  description: string;
  cover: string;
  /** Optional video for the release visual (mp4/webm). Used in music detail page and can sync with StemPlayer. */
  video?: string;
  tags: string[];
  featured?: boolean;
  tracks: MusicTrack[];
  /** Licensing options; defaults to personal (request) + commercial + exclusive. */
  license?: MusicLicense;
  /**
   * Contenido de relleno / demo (no catálogo real).
   * false o omitido en obras reales (p. ej. Deep in the forest).
   */
  provisional?: boolean;
};

export function isProvisionalRelease(release: MusicRelease): boolean {
  if (release.slug === "deep-in-the-forest") return false;
  return release.provisional !== false;
}

/** Studio list prices — keep in sync with docs/licencias/00-PRECIOS-REFERENCIA.md */
const DEFAULT_LICENSE: MusicLicense = {
  contactOnly: true,
  tiers: [
    { id: "personal", requestOnly: true, pricing: "request" },
    { id: "commercial", priceFrom: "290 €", pricing: "fixed" },
    { id: "exclusive", priceFrom: "1.800 €", pricing: "from" },
  ],
};

function normalizeTier(tier: MusicLicenseTier): MusicLicenseTier {
  const requestOnly = tier.requestOnly ?? tier.id === "personal";
  let pricing = tier.pricing;
  if (!pricing) {
    if (requestOnly || tier.id === "personal") pricing = "request";
    else if (tier.id === "exclusive") pricing = "from";
    else if (tier.priceFrom) pricing = "fixed";
    else pricing = "from";
  }
  return { ...tier, requestOnly, pricing };
}

export function getReleaseLicense(release: MusicRelease): MusicLicense {
  const license = release.license;
  if (!license || !license.tiers?.length) {
    return DEFAULT_LICENSE;
  }
  return {
    contactOnly: license.contactOnly !== false,
    tiers: license.tiers.map(normalizeTier),
  };
}

const TIER_LABELS: Record<MusicLicenseTierId, Record<Locale, string>> = {
  personal: {
    es: "Personal / no comercial (bajo petición)",
    en: "Personal / non-commercial (on request)",
    fr: "Personnel / non commercial (sur demande)",
  },
  commercial: {
    es: "Comercial / sync (cine, ads, redes, juegos)",
    en: "Commercial / sync (film, ads, social, games)",
    fr: "Commercial / sync (cinéma, pubs, réseaux, jeux)",
  },
  exclusive: {
    es: "Exclusiva / custom",
    en: "Exclusive / custom",
    fr: "Exclusif / sur mesure",
  },
};

function licenseEmailBody(
  release: MusicRelease,
  lang: Locale,
  tierId?: MusicLicenseTierId,
): string {
  const work = `«${release.name}» (${release.slug})`;

  if (tierId === "personal") {
    const byLang: Record<Locale, string[]> = {
      es: [
        "Hola,",
        "",
        `Solicito uso PERSONAL / NO COMERCIAL de ${work}.`,
        "",
        "Propósito concreto (obligatorio — sin esto no se evalúa):",
        "",
        "Dónde se publicaría (si se publica):",
        "¿Hay marcas, sponsors o dinero de por medio? (sí/no):",
        "Fecha o plazo aproximado:",
        "Notas:",
        "",
        "Entiendo que los previews de la web no son licencia de uso.",
        "",
        "Gracias.",
      ],
      en: [
        "Hello,",
        "",
        `I request PERSONAL / NON-COMMERCIAL use of ${work}.`,
        "",
        "Specific purpose (required — cannot be reviewed without it):",
        "",
        "Where it would be published (if anywhere):",
        "Any brands, sponsors or money involved? (yes/no):",
        "Approx. date or window:",
        "Notes:",
        "",
        "I understand site previews are not a usage license.",
        "",
        "Thanks.",
      ],
      fr: [
        "Bonjour,",
        "",
        `Je demande un usage PERSONNEL / NON COMMERCIAL de ${work}.`,
        "",
        "Objectif précis (obligatoire — sans cela pas d'évaluation) :",
        "",
        "Où serait-ce publié (le cas échéant) :",
        "Marques, sponsors ou argent en jeu ? (oui/non) :",
        "Date ou période approx. :",
        "Notes :",
        "",
        "Je comprends que les extraits du site ne constituent pas une licence d'usage.",
        "",
        "Merci.",
      ],
    };
    return (byLang[lang] ?? byLang.es).join("\n");
  }

  if (tierId === "exclusive") {
    const byLang: Record<Locale, string[]> = {
      es: [
        "Hola,",
        "",
        `Quiero una licencia EXCLUSIVA / custom de ${work}.`,
        "",
        "Proyecto / productora / marca:",
        "Medio (cine, serie, ad, juego, otro):",
        "Territorio:",
        "Plazo de exclusividad deseado:",
        "Fecha de entrega / estreno:",
        "Presupuesto orientativo (si lo hay):",
        "¿Necesitáis stems o edit a medida?",
        "Notas:",
        "",
        "Gracias.",
      ],
      en: [
        "Hello,",
        "",
        `I want an EXCLUSIVE / custom license for ${work}.`,
        "",
        "Project / production company / brand:",
        "Medium (film, series, ad, game, other):",
        "Territory:",
        "Desired exclusivity term:",
        "Delivery / release date:",
        "Indicative budget (if any):",
        "Do you need stems or a custom edit?",
        "Notes:",
        "",
        "Thanks.",
      ],
      fr: [
        "Bonjour,",
        "",
        `Je souhaite une licence EXCLUSIVE / sur mesure pour ${work}.`,
        "",
        "Projet / production / marque :",
        "Support (cinéma, série, pub, jeu, autre) :",
        "Territoire :",
        "Durée d'exclusivité souhaitée :",
        "Date de livraison / sortie :",
        "Budget indicatif (le cas échéant) :",
        "Stems ou edit sur mesure ?",
        "Notes :",
        "",
        "Merci.",
      ],
    };
    return (byLang[lang] ?? byLang.es).join("\n");
  }

  // commercial (default) or unspecified — list price 290 € (see docs/licencias)
  const tierLine =
    tierId === "commercial"
      ? {
          es: "Licencia: Comercial / sync — tarifa lista 290 € (no exclusiva, 1 proyecto).",
          en: "License: Commercial / sync — list price €290 (non-exclusive, 1 project).",
          fr: "Licence : Commercial / sync — prix catalogue 290 € (non exclusif, 1 projet).",
        }[lang]
      : {
          es: "Licencia de interés: (personal / comercial 290 € / exclusiva desde 1.800 €)",
          en: "License of interest: (personal / commercial €290 / exclusive from €1,800)",
          fr: "Licence souhaitée : (personnel / commercial 290 € / exclusif dès 1 800 €)",
        }[lang];

  const byLang: Record<Locale, string[]> = {
    es: [
      "Hola,",
      "",
      `Quiero licenciar ${work}.`,
      tierLine,
      "",
      "Proyecto / productora / marca:",
      "Medio (cine, corto, serie, ad, redes, juego, instalación…):",
      "Territorio:",
      "Fechas de uso / campaña:",
      "¿Uso en ads de pago a gran escala? (sí/no — si sí, referencia +300 €):",
      "¿Stems? (sí = +100 € / no):",
      "Notas:",
      "",
      "Gracias.",
    ],
    en: [
      "Hello,",
      "",
      `I would like to license ${work}.`,
      tierLine,
      "",
      "Project / production company / brand:",
      "Medium (film, short, series, ad, social, game, installation…):",
      "Territory:",
      "Usage / campaign dates:",
      "Large-scale paid ads? (yes/no — if yes, +€300 reference):",
      "Stems? (yes = +€100 / no):",
      "Notes:",
      "",
      "Thanks.",
    ],
    fr: [
      "Bonjour,",
      "",
      `Je souhaite licencier ${work}.`,
      tierLine,
      "",
      "Projet / production / marque :",
      "Support (cinéma, court, série, pub, réseaux, jeu, installation…) :",
      "Territoire :",
      "Dates d'usage / campagne :",
      "Pubs payantes à grande échelle ? (oui/non — si oui, +300 € référence) :",
      "Stems ? (oui = +100 € / non) :",
      "Notes :",
      "",
      "Merci.",
    ],
  };
  return (byLang[lang] ?? byLang.es).join("\n");
}

/** mailto: with subject/body for license requests. */
export function buildLicenseMailto(
  email: string,
  release: MusicRelease,
  lang: Locale,
  tierId?: MusicLicenseTierId,
): string {
  const tierBit = tierId ? ` — ${TIER_LABELS[tierId][lang]}` : "";
  const subjects: Record<Locale, string> = {
    es: `Licencia — ${release.name}${tierBit}`,
    en: `License — ${release.name}${tierBit}`,
    fr: `Licence — ${release.name}${tierBit}`,
  };

  const subject = encodeURIComponent(subjects[lang] ?? subjects.es);
  const body = encodeURIComponent(licenseEmailBody(release, lang, tierId));
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

export function getReleaseTypeLabels(lang: Locale = "es") {
  return {
    single: getTranslation(lang, "single"),
    ep: getTranslation(lang, "ep"),
    album: getTranslation(lang, "album"),
    pack: getTranslation(lang, "pack"),
  } as const;
}

// Legacy default
export const releaseTypeLabels = getReleaseTypeLabels("es");

const allReleases = rawReleases as MusicRelease[];

export function getPublishedReleases(): MusicRelease[] {
  return allReleases.filter(
    (release) => release.status === "published" || release.status === "coming-soon",
  );
}

export function getFeaturedReleases(): MusicRelease[] {
  return getPublishedReleases().filter((release) => release.featured);
}

export function getReleaseBySlug(slug: string): MusicRelease | undefined {
  const release = allReleases.find((item) => item.slug === slug);
  if (!release || release.status === "draft") return undefined;
  return release;
}

export function getStaticMusicPaths(): { params: { slug: string } }[] {
  return getPublishedReleases().map((release) => ({
    params: { slug: release.slug },
  }));
}

export function getTrackCount(release: MusicRelease): number {
  return release.tracks.length;
}