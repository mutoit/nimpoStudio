export type Locale = "es" | "en" | "fr";

export const locales: Locale[] = ["es", "en", "fr"];
export const defaultLocale: Locale = "es";

export const localeLabels: Record<Locale, string> = {
  es: "ES",
  en: "EN",
  fr: "FR",
};

export const localeNames: Record<Locale, string> = {
  es: "Español",
  en: "English",
  fr: "Français",
};

// Full UI + content translations
export const translations = {
  es: {
    // Site / common
    siteTagline: "Música MIDI original",
    siteDescription:
      "Composiciones originales MIDI del estudio. Ofrecemos trabajos a medida y packs gratuitos. Estamos trabajando activamente en el catálogo completo.",
    construction: "en construcción",

    // Navigation
    navMusic: "Música",
    navCatalog: "Catálogo",
    navAbout: "Sobre",
    navContact: "Contacto",
    navStoreSoon: "Tienda",

    // Language
    language: "Idioma",
    languageLabel: "Cambiar idioma",

    // Home
    homeListen: "Escuchar música",
    homeCatalog: "Catálogo",
    homeContact: "Contacto",
    homeFeatured: "Destacados",
    homeViewAll: "Ver todo →",
    homeStoreNote:
      "Estamos construyendo composiciones MIDI originales, trabajos a medida y packs gratuitos. La tienda y el área de clientes llegarán en próximas fases.",

    // Catalog
    catalogTitle: "Catálogo",
    catalogSubtitle: "Productos digitales",
    catalogDesc:
      "Explora packs, presets, licencias y recursos. La tienda y el área de clientes llegarán en fases posteriores.",
    catalogAll: "Todos",
    catalogEmptyTitle: "Sin productos publicados",
    catalogEmptyDesc: "Añade entradas en src/data/products.json",

    // Music
    musicTitle: "Música",
    musicSubtitle: "Composiciones originales MIDI",
    musicDesc:
      "Todas las piezas son composiciones originales MIDI del estudio: singles, EPs, álbumes y packs de sincronización. Cada lanzamiento incluye presentación y previews para escuchar antes de comprar.",
    musicEmptyTitle: "Sin lanzamientos publicados",
    musicEmptyDesc: "Añade entradas en src/data/music.json",
    musicHint:
      "Sube los MP3 de preview en public/previews/music/ y edita src/data/music.json con tus composiciones reales.",

    // About
    aboutEyebrow: "Sobre nosotros",
    aboutTitle: "Sobre",
    aboutP1:
      "Nimpo 3D Studio es el espacio donde publicamos nuestros productos digitales: packs de audio, presets, licencias y recursos para creadores.",
    aboutP2:
      "Esta web está pensada para crecer contigo — primero el catálogo, después la tienda, el área de clientes y la gestión de licencias. Todo bajo nuestro control, sin depender de plataformas cerradas.",
    aboutP3: "¿Tienes dudas o quieres colaborar?",
    aboutContactLink: "Escríbenos",

    // Contact
    contactEyebrow: "Contacto",
    contactTitle: "Hablemos",
    contactEmail: "Email",
    contactGithub: "GitHub",
    contactInstagram: "Instagram",
    contactNetworks: "Redes",
    contactAddNetworks: "Añade tus redes en src/config/site.json",

    // Product detail
    productBack: "← Volver al catálogo",
    productLicense: "Licencia",
    productFormats: "Formatos",
    productTags: "Etiquetas",
    productNotice:
      "Compra y descarga disponibles próximamente. Por ahora este producto forma parte del catálogo público.",
    productSoon: "Próximamente disponible",

    // Music detail
    musicBack: "← Volver a música",
    musicFormat: "Formato",
    musicYear: "Año",
    musicTracks: "Temas",
    musicPresentation: "Presentación",
    musicOriginal: "Composición original MIDI.",
    musicNotice:
      "La compra y descarga de composiciones llegará con la tienda. Por ahora puedes escuchar los previews y contactarnos para licencias o encargos.",
    musicSoon: "Próximamente disponible",

    // Filters / badges
    badgeComingSoon: "Próximamente",
    badgeFeatured: "Destacado",

    // Card meta
    cardPersonal: "Uso personal",
    cardCommercial: "Uso comercial",
    cardExclusive: "Exclusiva",
    cardCustom: "Bajo consulta",

    // Tracklist
    tracklistTitle: "Temas",
    tracklistPreview: "Preview",
    tracklistNoPreview: "Sin preview",
    tracklistBrowserNoSupport: "Tu navegador no soporta audio HTML5.",

    // Audio
    audioPreview: "Preview",
    audioNoSupport: "Tu navegador no soporta audio HTML5.",

    // Updates / feed
    updatesFeed: "Feed",
    updatesTitle: "Novedades",
    updatesDesc: "Mejoras y próximos pasos del estudio.",
    updatesEmpty: "Sin novedades publicadas.",
    tagNew: "Nuevo",
    tagImprovement: "Mejora",
    tagFix: "Fix",
    tagNext: "Próximo",

    // Legal
    privacyTitle: "Política de privacidad",
    privacyUpdated: "Última actualización: julio 2026",
    termsTitle: "Términos y condiciones",
    termsDraft: "Estado: borrador — en preparación",
    termsPlaceholder: "Esta página se completará antes de activar la tienda.",
    termsTopics: "Temas que incluirá:",

    // Consent
    consentText: "Usamos cookies de analítica y publicidad para mejorar la web.",
    consentPrivacy: "Privacidad",
    consentAccept: "Aceptar",
    consentReject: "Rechazar",

    // Misc
    backToCatalog: "Volver al catálogo",
    backToMusic: "Volver a música",
    single: "Single",
    ep: "EP",
    album: "Álbum",
    pack: "Pack",
    themeSingular: "tema",
    themePlural: "temas",
    noReleases: "Sin lanzamientos publicados",
  },
  en: {
    siteTagline: "Original MIDI music",
    siteDescription:
      "Original MIDI compositions from the studio. We offer custom work and free packs. We are actively building the full catalog.",
    construction: "in construction",

    navMusic: "Music",
    navCatalog: "Catalog",
    navAbout: "About",
    navContact: "Contact",
    navStoreSoon: "Store",

    language: "Language",
    languageLabel: "Change language",

    homeListen: "Listen to music",
    homeCatalog: "Catalog",
    homeContact: "Contact",
    homeFeatured: "Featured",
    homeViewAll: "View all →",
    homeStoreNote:
      "We are building original MIDI compositions, custom work and free packs. The store and client area will arrive in upcoming phases.",

    catalogTitle: "Catalog",
    catalogSubtitle: "Digital products",
    catalogDesc:
      "Explore packs, presets, licenses and resources. The store and client area will arrive in later phases.",
    catalogAll: "All",
    catalogEmptyTitle: "No published products",
    catalogEmptyDesc: "Add entries in src/data/products.json",

    musicTitle: "Music",
    musicSubtitle: "Original MIDI compositions",
    musicDesc:
      "All pieces are original MIDI compositions from the studio: singles, EPs, albums and sync packs. Each release includes a presentation and previews to listen before buying.",
    musicEmptyTitle: "No published releases",
    musicEmptyDesc: "Add entries in src/data/music.json",
    musicHint:
      "Upload preview MP3s to public/previews/music/ and edit src/data/music.json with your real compositions.",

    aboutEyebrow: "About us",
    aboutTitle: "About",
    aboutP1:
      "Nimpo 3D Studio is the space where we publish our digital products: audio packs, presets, licenses and resources for creators.",
    aboutP2:
      "This site is designed to grow with you — first the catalog, then the store, the client area and license management. Everything under our control, without depending on closed platforms.",
    aboutP3: "Have questions or want to collaborate?",
    aboutContactLink: "Contact us",

    contactEyebrow: "Contact",
    contactTitle: "Let's talk",
    contactEmail: "Email",
    contactGithub: "GitHub",
    contactInstagram: "Instagram",
    contactNetworks: "Social",
    contactAddNetworks: "Add your social links in src/config/site.json",

    productBack: "← Back to catalog",
    productLicense: "License",
    productFormats: "Formats",
    productTags: "Tags",
    productNotice:
      "Purchase and downloads available soon. For now this product is part of the public catalog.",
    productSoon: "Available soon",

    musicBack: "← Back to music",
    musicFormat: "Format",
    musicYear: "Year",
    musicTracks: "Tracks",
    musicPresentation: "Presentation",
    musicOriginal: "Original MIDI composition.",
    musicNotice:
      "Purchasing and downloading compositions will arrive with the store. For now you can listen to previews and contact us for licenses or commissions.",
    musicSoon: "Available soon",

    badgeComingSoon: "Coming soon",
    badgeFeatured: "Featured",

    cardPersonal: "Personal use",
    cardCommercial: "Commercial use",
    cardExclusive: "Exclusive",
    cardCustom: "On request",

    tracklistTitle: "Tracks",
    tracklistPreview: "Preview",
    tracklistNoPreview: "No preview",
    tracklistBrowserNoSupport: "Your browser does not support HTML5 audio.",

    audioPreview: "Preview",
    audioNoSupport: "Your browser does not support HTML5 audio.",

    updatesFeed: "Feed",
    updatesTitle: "Updates",
    updatesDesc: "Improvements and next steps for the studio.",
    updatesEmpty: "No updates published.",
    tagNew: "New",
    tagImprovement: "Improvement",
    tagFix: "Fix",
    tagNext: "Next",

    privacyTitle: "Privacy policy",
    privacyUpdated: "Last updated: July 2026",
    termsTitle: "Terms and conditions",
    termsDraft: "Status: draft — in preparation",
    termsPlaceholder: "This page will be completed before the store goes live.",
    termsTopics: "Topics it will cover:",

    consentText: "We use analytics and advertising cookies to improve the site.",
    consentPrivacy: "Privacy",
    consentAccept: "Accept",
    consentReject: "Reject",

    backToCatalog: "Back to catalog",
    backToMusic: "Back to music",
    single: "Single",
    ep: "EP",
    album: "Album",
    pack: "Pack",
    themeSingular: "track",
    themePlural: "tracks",
    noReleases: "No releases published",
  },
  fr: {
    siteTagline: "Musique MIDI originale",
    siteDescription:
      "Compositions MIDI originales du studio. Nous proposons des travaux sur mesure et des packs gratuits. Nous travaillons activement au catalogue complet.",
    construction: "en construction",

    navMusic: "Musique",
    navCatalog: "Catalogue",
    navAbout: "À propos",
    navContact: "Contact",
    navStoreSoon: "Boutique",

    language: "Langue",
    languageLabel: "Changer de langue",

    homeListen: "Écouter la musique",
    homeCatalog: "Catalogue",
    homeContact: "Contact",
    homeFeatured: "En vedette",
    homeViewAll: "Voir tout →",
    homeStoreNote:
      "Nous construisons des compositions MIDI originales, des travaux sur mesure et des packs gratuits. La boutique et l'espace client arriveront dans les prochaines phases.",

    catalogTitle: "Catalogue",
    catalogSubtitle: "Produits numériques",
    catalogDesc:
      "Explorez les packs, presets, licences et ressources. La boutique et l'espace client arriveront dans les phases ultérieures.",
    catalogAll: "Tous",
    catalogEmptyTitle: "Aucun produit publié",
    catalogEmptyDesc: "Ajoutez des entrées dans src/data/products.json",

    musicTitle: "Musique",
    musicSubtitle: "Compositions MIDI originales",
    musicDesc:
      "Toutes les pièces sont des compositions MIDI originales du studio : singles, EPs, albums et packs de synchronisation. Chaque sortie comprend une présentation et des extraits à écouter avant d'acheter.",
    musicEmptyTitle: "Aucune sortie publiée",
    musicEmptyDesc: "Ajoutez des entrées dans src/data/music.json",
    musicHint:
      "Téléversez les MP3 d'extrait dans public/previews/music/ et modifiez src/data/music.json avec vos vraies compositions.",

    aboutEyebrow: "À propos de nous",
    aboutTitle: "À propos",
    aboutP1:
      "Nimpo 3D Studio est l'espace où nous publions nos produits numériques : packs audio, presets, licences et ressources pour créateurs.",
    aboutP2:
      "Ce site est conçu pour grandir avec vous — d'abord le catalogue, puis la boutique, l'espace client et la gestion des licences. Tout sous notre contrôle, sans dépendre de plateformes fermées.",
    aboutP3: "Des questions ou envie de collaborer ?",
    aboutContactLink: "Contactez-nous",

    contactEyebrow: "Contact",
    contactTitle: "Parlons-en",
    contactEmail: "Email",
    contactGithub: "GitHub",
    contactInstagram: "Instagram",
    contactNetworks: "Réseaux",
    contactAddNetworks: "Ajoutez vos réseaux dans src/config/site.json",

    productBack: "← Retour au catalogue",
    productLicense: "Licence",
    productFormats: "Formats",
    productTags: "Tags",
    productNotice:
      "Achat et téléchargements disponibles bientôt. Pour l'instant ce produit fait partie du catalogue public.",
    productSoon: "Disponible bientôt",

    musicBack: "← Retour à la musique",
    musicFormat: "Format",
    musicYear: "Année",
    musicTracks: "Pistes",
    musicPresentation: "Présentation",
    musicOriginal: "Composition MIDI originale.",
    musicNotice:
      "L'achat et le téléchargement des compositions arriveront avec la boutique. Pour l'instant vous pouvez écouter les extraits et nous contacter pour des licences ou des commandes.",
    musicSoon: "Disponible bientôt",

    badgeComingSoon: "Bientôt",
    badgeFeatured: "En vedette",

    cardPersonal: "Usage personnel",
    cardCommercial: "Usage commercial",
    cardExclusive: "Exclusif",
    cardCustom: "Sur demande",

    tracklistTitle: "Pistes",
    tracklistPreview: "Extrait",
    tracklistNoPreview: "Pas d'extrait",
    tracklistBrowserNoSupport: "Votre navigateur ne prend pas en charge l'audio HTML5.",

    audioPreview: "Extrait",
    audioNoSupport: "Votre navigateur ne prend pas en charge l'audio HTML5.",

    updatesFeed: "Flux",
    updatesTitle: "Nouveautés",
    updatesDesc: "Améliorations et prochaines étapes du studio.",
    updatesEmpty: "Aucune nouveauté publiée.",
    tagNew: "Nouveau",
    tagImprovement: "Amélioration",
    tagFix: "Correction",
    tagNext: "Prochain",

    privacyTitle: "Politique de confidentialité",
    privacyUpdated: "Dernière mise à jour : juillet 2026",
    termsTitle: "Conditions générales",
    termsDraft: "État : brouillon — en préparation",
    termsPlaceholder: "Cette page sera complétée avant le lancement de la boutique.",
    termsTopics: "Sujets qui y figureront :",

    consentText: "Nous utilisons des cookies d'analyse et de publicité pour améliorer le site.",
    consentPrivacy: "Confidentialité",
    consentAccept: "Accepter",
    consentReject: "Refuser",

    backToCatalog: "Retour au catalogue",
    backToMusic: "Retour à la musique",
    single: "Single",
    ep: "EP",
    album: "Album",
    pack: "Pack",
    themeSingular: "piste",
    themePlural: "pistes",
    noReleases: "Aucune sortie publiée",
  },
} as const;

export type TranslationKey = keyof (typeof translations)[Locale];

export function getTranslation(lang: Locale, key: TranslationKey): string {
  const dict = translations[lang] ?? translations[defaultLocale];
  return (dict as any)[key] ?? (translations[defaultLocale] as any)[key] ?? String(key);
}
