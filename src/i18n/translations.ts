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
    navLibrary: "Biblioteca",
    navCatalog: "Catálogo",
    navAbout: "Sobre",
    navContact: "Contacto",
    navStoreSoon: "Tienda",
    navMenuOpen: "Abrir menú",
    navMenuClose: "Cerrar menú",

    libEyebrow: "Catálogo unificado",
    libTitle: "Biblioteca",
    libDesc:
      "Miniaturas de vídeo y pistas con stems. Filtra arriba, abre un ítem para detalles y licencia.",
    libFilters: "Filtros",
    libFilterAll: "Todos",
    libFilter11: "Visual 1:1",
    libFilter916: "Visual 9:16",
    libFilterStems: "Con stems",
    libMoods: "Mood",
    libTags: "Tags",
    libNotes: "Notas del estudio",
    libDescription: "Descripción",
    libClose: "Cerrar",
    libEmpty: "Sin ítems en este filtro.",
    libSelect: "Selecciona un ítem",
    libPlay: "Play stems",
    libStemsTitle: "Capas (stems)",
    libNoLicense: "Licencia no habilitada en este ítem demo.",
    libSearch: "Buscar…",
    libType: "Tipo / formato",
    libHasStems: "Con stems",
    libSidebarTitle: "Filtros",
    libUnavailable: "No disponible",
    libPreviewProtect:
      "Preview protegido: oyes ruido (y/o calidad reducida) a propósito para proteger la obra. No es el master. Tras licencia y pago entregamos audio limpio (y stems si los contratas).",
    libPreviewProtectShort: "Hay ruido a propósito · preview protegido · no es el master",
    libPreviewProtectTag: "Preview protegido",

    // Language
    language: "Idioma",
    languageLabel: "Cambiar idioma",
    uiSizeLabel: "Tamaño",
    uiSizeS: "Pequeño",
    uiSizeM: "Medio",
    uiSizeL: "Grande",

    // Home
    homeLibrary: "Ver biblioteca",
    homeListen: "Escuchar música",
    homeCatalog: "Catálogo",
    homeContact: "Contacto",
    homeFeatured: "Destacados",
    homeViewAll: "Ver todo →",
    homeStoreNote:
      "Composiciones originales y previews en la biblioteca. La tienda y el área de clientes llegarán en próximas fases.",

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
      "Nimpo 3D Studio es un estudio de composición original en MIDI: piezas hechas aquí, con criterio musical y trato directo. En la biblioteca puedes escuchar previews, explorar stems y solicitar licencia para tu proyecto.",
    aboutP2:
      "No somos un stock genérico ni un marketplace opaco. Licenciamos obra propia con precios claros, alcance definido y entrega del master (y stems si los contratas) tras acuerdo y pago. Si tu uso es especial o exclusivo, lo revisamos contigo a medida.",
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
    contactLicenseTitle: "Consultas sobre licencias",
    contactLicenseLead:
      "Si tienes dudas sobre licencias, usos o un presupuesto, escríbenos. Para pedir una licencia de una obra concreta, usa el botón Licenciar en la biblioteca.",

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
    musicOriginal: "Composición MIDI original · hecha a mano · sin IA.",
    musicNotice:
      "Audio y vídeo de la web son previews protegidos (baja calidad / degradados). No otorgan derechos de uso. Para un proyecto, elige una licencia abajo.",
    musicSoon: "Próximamente disponible",
    musicLicenseOpen: "Licenciar",

    // Reviews (mock UI)
    reviewsEyebrow: "Comunidad",
    reviewsTitle: "Valoraciones y comentarios",
    reviewsDemoNote: "Vista previa · datos de ejemplo (sin envío real)",
    reviewsScoreAria: "Valoración media {avg} de 5, basada en {n} votos",
    reviewsCount: "{n} valoraciones",
    reviewsDistribution: "Distribución de puntuaciones",
    reviewsFormTitle: "Deja tu valoración",
    reviewsFormHint: "Sobre «{name}». Se publicará tras revisión del estudio.",
    reviewsYourRating: "Tu puntuación",
    reviewsStarsAria: "{n} de 5 estrellas",
    reviewsName: "Nombre",
    reviewsNamePh: "Cómo quieres figurar",
    reviewsUse: "Contexto (opcional)",
    reviewsUseAny: "Sin especificar",
    reviewsUsePersonal: "Personal",
    reviewsUseProject: "Proyecto",
    reviewsUseClient: "Cliente / licencia",
    reviewsComment: "Comentario",
    reviewsCommentPh: "¿Qué te transmite la pieza? (máx. 280)",
    reviewsSubmit: "Enviar valoración",
    reviewsSubmitNote: "Mock: el botón no envía. Backend (D1 + moderación) en una fase posterior.",
    reviewsComments: "Comentarios",
    reviewsShowing: "{n} recientes",
    reviewsCardVotes: "{n} votos",

    // Music licenses
    musicLicenseTitle: "Licenciar esta obra",
    musicLicenseIntro:
      "Elige la licencia y escribe. Comercial tiene precio de lista: pagas tarifa estándar y recibes el master. Composición MIDI original, hecha a mano, sin IA; samples e instrumentos con licencia del estudio.",
    musicLicenseCraft:
      "Hecho a mano · MIDI original · sin IA · samples/instrumentos del estudio",
    musicLicensePreviewNote:
      "El audio de la web lleva ruido y/o baja calidad a propósito: protege la obra. No otorga derechos de uso. El master limpio (y stems si los contratas) solo tras licencia y pago.",
    musicLicenseChoose: "1. Elige la licencia",
    musicLicenseSend: "2. Envía la solicitud",
    musicLicenseTierPersonal: "Personal / no comercial",
    musicLicenseTierPersonalDesc:
      "Solo casos sin negocio (estudio privado, demo interna). No sirve para postear como contenido de marca. Explica el propósito; se puede denegar o pedir crédito. Sin tarifa fija (0–49 €).",
    musicLicenseTierMicro: "Micro / un solo uso",
    musicLicenseTierMicroDesc:
      "1 sting, 1 post, 1 vuelo o 1 episodio declarado. Ideal hooks y previews cortos. Master WAV. No reutilizable en otra campaña.",
    musicLicenseTierCommercial: "Comercial estándar (2 años)",
    musicLicenseTierCommercialDesc:
      "1 obra, 1 proyecto, no exclusiva, 2 años, master WAV. Cortos, brand film orgánico, indie game, webserie 1 ep. Plazos más cortos en el formulario (129 / 159 €).",
    musicLicenseTierAds: "Comercial + Ads",
    musicLicenseTierAdsDesc:
      "Base comercial + campaña de pago (redes/YouTube ~6 meses). Pack lista 2 años: 299 €. Elige «Publicidad / ads» en el formulario.",
    musicLicenseTierExclusive: "Exclusiva / media",
    musicLicenseTierExclusiveDesc:
      "Nadie más licencia en el alcance pactado. Desde 1.200 € (2 años media/territorio). Opción retirar del catálogo (+250 €).",
    musicLicenseTierExclusiveStrong: "Exclusiva fuerte / multi",
    musicLicenseTierExclusiveStrongDesc:
      "Multi-medio, mundial, 2+ años. Suelo 3.000 € (rango típico 3.000–6.000 €+). Contrato y firma.",
    musicLicenseTierBuyout: "Buyout / fuera de catálogo",
    musicLicenseTierBuyoutDesc:
      "Retirada indefinida del catálogo. Desde 2.990 € (suelo del rango 2.990–5.500).",
    musicLicenseTierBuyoutHigh: "Buyout alto / a medida",
    musicLicenseTierBuyoutHighDesc:
      "Forever premium o alcance amplio. Desde 5.500 €; por encima, revisión y contrato.",
    musicLicensePriceOnRequest: "Presupuesto",
    musicLicensePriceRequestOnly: "Bajo petición",
    musicLicensePriceFrom: "Desde",
    musicLicenseCta: "Solicitar esta licencia",
    musicLicenseCtaTier: "Elegir",
    musicLicenseContactPage: "Página de contacto",
    musicLicenseHow:
      "Elige uso y plazo: ves el precio al momento (micro 79 € → comercial 169 € → ads 299 €). Confirmamos, PDF, cobro y master. Exclusiva/buyout: acotamos alcance. Personal: solo sin marca ni monetizar.",

    musicLicenseSummary: "Resumen de licencias",

    // Quote form + usage catalog
    quoteFormTitle: "Presupuesto de licencia",
    quoteFormLead:
      "Elige el tipo de uso legal. Si encaja en catálogo, ves el precio al momento. Si es especial, lo revisamos y te respondemos por email.",
    quoteName: "Tu nombre",
    quoteEmail: "Tu email",
    quoteCompany: "Empresa",
    quoteCompanyPh: "Opcional — productora, marca, estudio…",
    quoteSelect: "Elige…",
    quoteUsageType: "Tipo de uso (ámbito legal)",
    quoteTerritory: "Territorio",
    quoteTerritoryPh: "Ej. España, Europa, mundial…",
    quoteTerm: "Plazo de la licencia",
    quoteTermSingle: "Micro / un solo uso (sting, 1 post, 1 vuelo) — 79 €",
    quoteTerm1y: "1 año — 129 €",
    quoteTermProject: "Vida del proyecto — 159 €",
    quoteTerm2y: "2 años (estándar catálogo) — 169 €",
    quoteTermCustom: "Otro plazo (revisión manual)",
    quoteProject: "Proyecto y uso concreto",
    quoteProjectPh: "Nombre del proyecto, dónde se oye la música, fechas…",
    quoteExtras: "Extras",
    quoteStems: "Stems (capas separadas)",
    quoteEdit: "Edit / recorte corto a medida",
    quoteExclusive: "Quiero exclusividad (no solo uso no exclusivo)",
    quoteBuyout: "Buyout / sacar la obra del catálogo",
    quoteSpecialLegend: "Presupuesto especial (revisión del estudio)",
    quoteSpecialHelp:
      "Márcalo si tu caso no es un uso de la lista estándar: multi-territorio raro, varias obras, marca global, TV lineal nacional, etc. Entonces no se cierra el precio automático: te lo calculamos a mano.",
    quoteSpecialCheck: "Necesito un presupuesto especial / fuera de catálogo",
    quoteSpecialNotes: "Explica el caso especial",
    quoteSpecialNotesPh: "Qué se sale del estándar…",
    quoteLiveLabel: "Tu presupuesto",
    quoteSubmit: "Obtener presupuesto",
    quotePrivacy: "Datos solo para esta licencia. Sin cesión a terceros de marketing.",
    usageGroupPersonal: "Personal",
    usageGroupAudiovisual: "Audiovisual",
    usageGroupAds: "Publicidad",
    usageGroupInteractive: "Juegos y apps",
    usageGroupLive: "Evento / instalación",
    usageGroupSpecial: "Exclusiva y otros",
    usagePersonalPrivate: "Personal / privado (sin negocio) — revisión",
    usageFilmShort: "Cine: corto / festival / student film — según plazo",
    usageFilmFeature: "Cine: largometraje / productora — desde 390 € (revisión)",
    usageSeriesOne: "Serie / webserie: 1 episodio — según plazo",
    usageSeriesMulti: "Serie: varios episodios — desde 390 € (revisión)",
    usageBrandVideo: "Vídeo de marca / corporativo (1 pieza) — según plazo",
    usageSocialBrand: "Redes de marca (1 campaña orgánica) — según plazo",
    usagePodcastOne: "Podcast: 1 episodio — según plazo (micro 79 € si 1 uso)",
    usageAdsPaid: "Publicidad / ads de pago — desde ~209 € (plazo + ads)",
    usageGameIndie: "Juego indie (1 título / uso declarado) — según plazo",
    usageGameLiveops: "Juego live-ops / marketing continuo — desde 590 €/año (revisión)",
    usageAppOne: "App móvil / software (1 app, uso fijo) — según plazo",
    usageAppSaas: "SaaS / app con suscripción o uso ilimitado — desde 590 €/año (revisión)",
    usageInstallOne: "Instalación / museo / evento puntual — según plazo",
    usageTourEvent: "Tour / multi-ciudad / multi-fecha — desde 390 € (revisión)",
    usageExclusive: "Exclusiva por alcance — desde 1.200 €",
    usageBuyout: "Buyout total / fuera de catálogo — desde 2.990 €",
    usageOther: "Otro uso no listado — revisión",

    // Filters / badges
    badgeComingSoon: "Próximamente",
    badgeFeatured: "Destacado",
    badgeProvisional: "Demo · contenido provisional",
    badgeProvisionalShort: "Provisional",
    provisionalNotice:
      "Este contenido es de demostración / relleno. No es un lanzamiento real del catálogo. La obra real de referencia es «Deep in the forest».",

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
    navLibrary: "Library",
    navCatalog: "Catalog",
    navAbout: "About",
    navContact: "Contact",
    navStoreSoon: "Store",
    navMenuOpen: "Open menu",
    navMenuClose: "Close menu",

    libEyebrow: "Unified catalog",
    libTitle: "Library",
    libDesc:
      "Video thumbnails and stem tracks. Filter above, open an item for details and licensing.",
    libFilters: "Filters",
    libFilterAll: "All",
    libFilter11: "Visual 1:1",
    libFilter916: "Visual 9:16",
    libFilterStems: "With stems",
    libMoods: "Mood",
    libTags: "Tags",
    libNotes: "Studio notes",
    libDescription: "Description",
    libClose: "Close",
    libEmpty: "No items in this filter.",
    libSelect: "Select an item",
    libPlay: "Play stems",
    libStemsTitle: "Layers (stems)",
    libNoLicense: "Licensing not enabled on this demo item.",
    libSearch: "Search…",
    libType: "Type / format",
    libHasStems: "With stems",
    libSidebarTitle: "Filters",
    libUnavailable: "Unavailable",
    libPreviewProtect:
      "Protected preview: you hear noise (and/or reduced quality) on purpose to protect the work. This is not the master. After license and payment we deliver clean audio (and stems if purchased).",
    libPreviewProtectShort: "Noise on purpose · protected preview · not the master",
    libPreviewProtectTag: "Protected preview",

    language: "Language",
    languageLabel: "Change language",
    uiSizeLabel: "Size",
    uiSizeS: "Small",
    uiSizeM: "Medium",
    uiSizeL: "Large",

    homeLibrary: "Browse library",
    homeListen: "Listen to music",
    homeCatalog: "Catalog",
    homeContact: "Contact",
    homeFeatured: "Featured",
    homeViewAll: "View all →",
    homeStoreNote:
      "Original compositions and previews live in the library. The store and client area will arrive in later phases.",

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
      "Nimpo 3D Studio is an original MIDI composition studio: work made here, with musical care and direct contact. In the library you can preview pieces, explore stems and request a license for your project.",
    aboutP2:
      "We are not generic stock or an opaque marketplace. We license our own work with clear pricing, defined scope, and master delivery (plus stems if contracted) after agreement and payment. Special or exclusive uses are reviewed with you case by case.",
    aboutP3: "Have questions or want to collaborate?",
    aboutContactLink: "Contact us",

    contactEyebrow: "Contact",
    contactTitle: "Let's talk",
    contactEmail: "Email",
    contactGithub: "GitHub",
    contactInstagram: "Instagram",
    contactNetworks: "Social",
    contactAddNetworks: "Add your social links in src/config/site.json",
    contactLicenseTitle: "License questions",
    contactLicenseLead:
      "If you have questions about licenses, uses or a quote, write to us. To license a specific work, use the License button in the library.",

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
    musicOriginal: "Original MIDI composition · handmade · no AI.",
    musicNotice:
      "Audio and video on this site are protected previews (low quality / degraded). They do not grant usage rights. For a project, choose a license below.",
    musicSoon: "Available soon",
    musicLicenseOpen: "License",

    reviewsEyebrow: "Community",
    reviewsTitle: "Ratings & comments",
    reviewsDemoNote: "Preview · sample data (no real submit)",
    reviewsScoreAria: "Average rating {avg} out of 5, from {n} votes",
    reviewsCount: "{n} ratings",
    reviewsDistribution: "Score distribution",
    reviewsFormTitle: "Leave a rating",
    reviewsFormHint: "About “{name}”. Published after studio review.",
    reviewsYourRating: "Your rating",
    reviewsStarsAria: "{n} out of 5 stars",
    reviewsName: "Name",
    reviewsNamePh: "How you want to appear",
    reviewsUse: "Context (optional)",
    reviewsUseAny: "Not specified",
    reviewsUsePersonal: "Personal",
    reviewsUseProject: "Project",
    reviewsUseClient: "Client / license",
    reviewsComment: "Comment",
    reviewsCommentPh: "What does the piece convey? (max 280)",
    reviewsSubmit: "Submit rating",
    reviewsSubmitNote: "Mock: button does not submit. Backend (D1 + moderation) later.",
    reviewsComments: "Comments",
    reviewsShowing: "{n} recent",
    reviewsCardVotes: "{n} votes",

    musicLicenseTitle: "License this work",
    musicLicenseIntro:
      "Pick a license and write. Commercial has a list price: standard fee, then you get the master. Original handmade MIDI, no AI; samples/instruments licensed by the studio.",
    musicLicenseCraft:
      "Handmade · original MIDI · no AI · studio-licensed samples/instruments",
    musicLicensePreviewNote:
      "Web audio includes noise and/or lower quality on purpose to protect the work. It grants no usage rights. Clean master (and stems if purchased) only after license and payment.",
    musicLicenseChoose: "1. Choose a license",
    musicLicenseSend: "2. Send the request",
    musicLicenseTierPersonal: "Personal / non-commercial",
    musicLicenseTierPersonalDesc:
      "Non-business use only (private study, internal demo). Not for brand posting. State the purpose; may be declined or require credit. No fixed fee (€0–49).",
    musicLicenseTierMicro: "Micro / single use",
    musicLicenseTierMicroDesc:
      "1 sting, 1 post, 1 flight or 1 declared episode. Ideal for hooks and short previews. WAV master. Not reusable on another campaign.",
    musicLicenseTierCommercial: "Standard commercial (2 years)",
    musicLicenseTierCommercialDesc:
      "1 work, 1 project, non-exclusive, 2 years, WAV master. Shorts, organic brand film, indie game, 1-ep web series. Shorter terms in the form (€129 / €159).",
    musicLicenseTierAds: "Commercial + Ads",
    musicLicenseTierAdsDesc:
      "Commercial base + paid campaign (social/YouTube ~6 months). 2-year list pack: €299. Pick “Advertising / paid ads” in the form.",
    musicLicenseTierExclusive: "Exclusive / media",
    musicLicenseTierExclusiveDesc:
      "No one else licenses within the agreed scope. From €1,200 (2-year media/territory). Optional catalog removal (+€250).",
    musicLicenseTierExclusiveStrong: "Strong exclusive / multi",
    musicLicenseTierExclusiveStrongDesc:
      "Multi-media, worldwide, 2+ years. Floor €3,000 (typical €3,000–6,000+). Contract and signature.",
    musicLicenseTierBuyout: "Buyout / leave catalog",
    musicLicenseTierBuyoutDesc:
      "Indefinite catalog removal. From €2,990 (floor of the €2,990–5,500 range).",
    musicLicenseTierBuyoutHigh: "High buyout / custom",
    musicLicenseTierBuyoutHighDesc:
      "Premium forever or wide scope. From €5,500; above that, review and contract.",
    musicLicensePriceOnRequest: "Quote",
    musicLicensePriceRequestOnly: "On request",
    musicLicensePriceFrom: "From",
    musicLicenseCta: "Request this license",
    musicLicenseCtaTier: "Select",
    musicLicenseContactPage: "Contact page",
    musicLicenseHow:
      "Pick use and term: instant price (micro €79 → commercial €169 → ads €299). We confirm, PDF, payment, master. Exclusive/buyout: we scope the fee. Personal: only with no brand and no monetization.",

    musicLicenseSummary: "License summary",

    quoteFormTitle: "License quote",
    quoteFormLead:
      "Pick the legal use type. Catalog fits show the price instantly. Special cases are reviewed and emailed back.",
    quoteName: "Your name",
    quoteEmail: "Your email",
    quoteCompany: "Company",
    quoteCompanyPh: "Optional — production company, brand, studio…",
    quoteSelect: "Choose…",
    quoteUsageType: "Use type (legal scope)",
    quoteTerritory: "Territory",
    quoteTerritoryPh: "e.g. Spain, Europe, worldwide…",
    quoteTerm: "License term",
    quoteTermSingle: "Micro / single use (sting, 1 post, 1 flight) — €79",
    quoteTerm1y: "1 year — €129",
    quoteTermProject: "Project lifetime — €159",
    quoteTerm2y: "2 years (catalog standard) — €169",
    quoteTermCustom: "Other term (manual review)",
    quoteProject: "Project and concrete use",
    quoteProjectPh: "Project name, where the music is heard, dates…",
    quoteExtras: "Extras",
    quoteStems: "Stems (separate layers)",
    quoteEdit: "Short custom edit / trim",
    quoteExclusive: "I want exclusivity (not just non-exclusive use)",
    quoteBuyout: "Buyout / remove work from catalog",
    quoteSpecialLegend: "Special quote (studio review)",
    quoteSpecialHelp:
      "Check this if your case is outside the standard list: unusual multi-territory, multiple works, global brand, national linear TV, etc. Then price is not automatic — we quote by hand.",
    quoteSpecialCheck: "I need a special / off-catalog quote",
    quoteSpecialNotes: "Describe the special case",
    quoteSpecialNotesPh: "What falls outside standard…",
    quoteLiveLabel: "Your quote",
    quoteSubmit: "Get quote",
    quotePrivacy: "Data only for this license. No marketing resale.",
    usageGroupPersonal: "Personal",
    usageGroupAudiovisual: "Audiovisual",
    usageGroupAds: "Advertising",
    usageGroupInteractive: "Games & apps",
    usageGroupLive: "Event / installation",
    usageGroupSpecial: "Exclusive & other",
    usagePersonalPrivate: "Personal / private (no business) — review",
    usageFilmShort: "Film: short / festival / student — by term",
    usageFilmFeature: "Film: feature / major production — from €390 (review)",
    usageSeriesOne: "Series / web series: 1 episode — by term",
    usageSeriesMulti: "Series: multiple episodes — from €390 (review)",
    usageBrandVideo: "Brand / corporate video (1 piece) — by term",
    usageSocialBrand: "Brand social (1 organic campaign) — by term",
    usagePodcastOne: "Podcast: 1 episode — by term (micro €79 if single use)",
    usageAdsPaid: "Advertising / paid ads — from ~€209 (term + ads)",
    usageGameIndie: "Indie game (1 title / declared use) — by term",
    usageGameLiveops: "Live-ops game / ongoing marketing — from €590/yr (review)",
    usageAppOne: "Mobile app / software (1 app, fixed use) — by term",
    usageAppSaas: "SaaS / unlimited-use app — from €590/yr (review)",
    usageInstallOne: "Installation / museum / one-off event — by term",
    usageTourEvent: "Tour / multi-city / multi-date — from €390 (review)",
    usageExclusive: "Scoped exclusivity — from €1,200",
    usageBuyout: "Full buyout / leave catalog — from €2,990",
    usageOther: "Other unlisted use — review",

    badgeComingSoon: "Coming soon",
    badgeFeatured: "Featured",
    badgeProvisional: "Demo · placeholder content",
    badgeProvisionalShort: "Placeholder",
    provisionalNotice:
      "This is demo / placeholder content, not a real catalog release. The real reference work is “Deep in the forest”.",

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
    navLibrary: "Bibliothèque",
    navCatalog: "Catalogue",
    navAbout: "À propos",
    navContact: "Contact",
    navStoreSoon: "Boutique",
    navMenuOpen: "Ouvrir le menu",
    navMenuClose: "Fermer le menu",

    libEyebrow: "Catalogue unifié",
    libTitle: "Bibliothèque",
    libDesc:
      "Miniatures vidéo et pistes stems. Filtrez en haut, ouvrez un élément pour détails et licence.",
    libFilters: "Filtres",
    libFilterAll: "Tous",
    libFilter11: "Visuel 1:1",
    libFilter916: "Visuel 9:16",
    libFilterStems: "Avec stems",
    libMoods: "Mood",
    libTags: "Tags",
    libNotes: "Notes du studio",
    libDescription: "Description",
    libClose: "Fermer",
    libEmpty: "Aucun élément dans ce filtre.",
    libSelect: "Sélectionnez un élément",
    libPlay: "Lecture stems",
    libStemsTitle: "Couches (stems)",
    libNoLicense: "Licence non activée sur cet élément démo.",
    libSearch: "Rechercher…",
    libType: "Type / format",
    libHasStems: "Avec stems",
    libSidebarTitle: "Filtres",
    libUnavailable: "Indisponible",
    libPreviewProtect:
      "Extrait protégé : vous entendez du bruit (et/ou une qualité réduite) exprès pour protéger l'œuvre. Ce n'est pas le master. Après licence et paiement, audio propre (et stems si prévus).",
    libPreviewProtectShort: "Bruit volontaire · extrait protégé · pas le master",
    libPreviewProtectTag: "Extrait protégé",

    language: "Langue",
    languageLabel: "Changer de langue",
    uiSizeLabel: "Taille",
    uiSizeS: "Petit",
    uiSizeM: "Moyen",
    uiSizeL: "Grand",

    homeLibrary: "Voir la bibliothèque",
    homeListen: "Écouter la musique",
    homeCatalog: "Catalogue",
    homeContact: "Contact",
    homeFeatured: "En vedette",
    homeViewAll: "Voir tout →",
    homeStoreNote:
      "Compositions originales et extraits dans la bibliothèque. La boutique et l'espace client arriveront plus tard.",

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
      "Nimpo 3D Studio est un studio de composition MIDI originale : des pièces faites ici, avec soin musical et contact direct. Dans la bibliothèque, vous pouvez écouter les previews, explorer les stems et demander une licence pour votre projet.",
    aboutP2:
      "Nous ne sommes pas un stock générique ni une marketplace opaque. Nous licenciions nos œuvres avec des prix clairs, un périmètre défini, et livraison du master (et des stems si prévus) après accord et paiement. Les usages spéciaux ou exclusifs se discutent au cas par cas.",
    aboutP3: "Des questions ou envie de collaborer ?",
    aboutContactLink: "Contactez-nous",

    contactEyebrow: "Contact",
    contactTitle: "Parlons-en",
    contactEmail: "Email",
    contactGithub: "GitHub",
    contactInstagram: "Instagram",
    contactNetworks: "Réseaux",
    contactAddNetworks: "Ajoutez vos réseaux dans src/config/site.json",
    contactLicenseTitle: "Questions sur les licences",
    contactLicenseLead:
      "Si vous avez des questions sur les licences, les usages ou un devis, écrivez-nous. Pour licencier une œuvre précise, utilisez le bouton Licencier dans la bibliothèque.",

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
    musicOriginal: "Composition MIDI originale · faite à la main · sans IA.",
    musicNotice:
      "L'audio et la vidéo du site sont des extraits protégés (basse qualité / dégradés). Ils ne confèrent aucun droit d'usage. Pour un projet, choisissez une licence ci-dessous.",
    musicSoon: "Disponible bientôt",
    musicLicenseOpen: "Licencier",

    reviewsEyebrow: "Communauté",
    reviewsTitle: "Notes et commentaires",
    reviewsDemoNote: "Aperçu · données d’exemple (pas d’envoi réel)",
    reviewsScoreAria: "Note moyenne {avg} sur 5, basée sur {n} votes",
    reviewsCount: "{n} notes",
    reviewsDistribution: "Répartition des notes",
    reviewsFormTitle: "Laisser une note",
    reviewsFormHint: "À propos de « {name} ». Publié après relecture du studio.",
    reviewsYourRating: "Votre note",
    reviewsStarsAria: "{n} étoiles sur 5",
    reviewsName: "Nom",
    reviewsNamePh: "Comment vous voulez apparaître",
    reviewsUse: "Contexte (optionnel)",
    reviewsUseAny: "Non précisé",
    reviewsUsePersonal: "Personnel",
    reviewsUseProject: "Projet",
    reviewsUseClient: "Client / licence",
    reviewsComment: "Commentaire",
    reviewsCommentPh: "Que vous inspire la pièce ? (max 280)",
    reviewsSubmit: "Envoyer la note",
    reviewsSubmitNote: "Mock : le bouton n’envoie rien. Backend (D1 + modération) plus tard.",
    reviewsComments: "Commentaires",
    reviewsShowing: "{n} récents",
    reviewsCardVotes: "{n} votes",

    musicLicenseTitle: "Licencier cette œuvre",
    musicLicenseIntro:
      "Choisissez la licence et écrivez. Le commercial a un prix catalogue : tarif standard puis master. MIDI original fait main, sans IA ; samples/instruments sous licence du studio.",
    musicLicenseCraft:
      "Fait main · MIDI original · sans IA · samples/instruments du studio",
    musicLicensePreviewNote:
      "L'audio du site inclut du bruit et/ou une qualité réduite exprès pour protéger l'œuvre. Aucun droit d'usage. Master propre (et stems si prévus) seulement après licence et paiement.",
    musicLicenseChoose: "1. Choisissez la licence",
    musicLicenseSend: "2. Envoyez la demande",
    musicLicenseTierPersonal: "Personnel / non commercial",
    musicLicenseTierPersonalDesc:
      "Usage hors business seulement (étude privée, démo interne). Pas pour poster en marque. Précisez l'objectif ; refus possible ou crédit exigé. Pas de tarif fixe (0–49 €).",
    musicLicenseTierMicro: "Micro / usage unique",
    musicLicenseTierMicroDesc:
      "1 sting, 1 post, 1 vol ou 1 épisode déclaré. Idéal hooks et previews courts. Master WAV. Non réutilisable sur une autre campagne.",
    musicLicenseTierCommercial: "Commercial standard (2 ans)",
    musicLicenseTierCommercialDesc:
      "1 œuvre, 1 projet, non exclusif, 2 ans, master WAV. Courts, brand film organique, jeu indé, websérie 1 ep. Durées plus courtes dans le formulaire (129 / 159 €).",
    musicLicenseTierAds: "Commercial + Ads",
    musicLicenseTierAdsDesc:
      "Base commerciale + campagne payante (réseaux/YouTube ~6 mois). Pack liste 2 ans : 299 €. Choisissez « Publicité / pubs » dans le formulaire.",
    musicLicenseTierExclusive: "Exclusif / média",
    musicLicenseTierExclusiveDesc:
      "Personne d'autre ne licence dans le périmètre. Dès 1 200 € (2 ans média/territoire). Retrait catalogue optionnel (+250 €).",
    musicLicenseTierExclusiveStrong: "Exclusif fort / multi",
    musicLicenseTierExclusiveStrongDesc:
      "Multi-supports, mondial, 2+ ans. Plancher 3 000 € (typique 3 000–6 000 €+). Contrat et signature.",
    musicLicenseTierBuyout: "Buyout / hors catalogue",
    musicLicenseTierBuyoutDesc:
      "Retrait indéfini du catalogue. Dès 2 990 € (plancher de la fourchette 2 990–5 500).",
    musicLicenseTierBuyoutHigh: "Buyout haut / sur mesure",
    musicLicenseTierBuyoutHighDesc:
      "Forever premium ou périmètre large. Dès 5 500 € ; au-delà, revue et contrat.",
    musicLicensePriceOnRequest: "Devis",
    musicLicensePriceRequestOnly: "Sur demande",
    musicLicensePriceFrom: "À partir de",
    musicLicenseCta: "Demander cette licence",
    musicLicenseCtaTier: "Choisir",
    musicLicenseContactPage: "Page contact",
    musicLicenseHow:
      "Choisissez usage et durée : prix immédiat (micro 79 € → commercial 169 € → ads 299 €). Confirmation, PDF, paiement, master. Exclusif/buyout : on cadre le fee. Personnel : seulement sans marque ni monétisation.",

    musicLicenseSummary: "Résumé des licences",

    quoteFormTitle: "Devis de licence",
    quoteFormLead:
      "Choisissez le type d'usage légal. Catalogue = prix immédiat. Cas spéciaux = revue et réponse par e-mail.",
    quoteName: "Votre nom",
    quoteEmail: "Votre e-mail",
    quoteCompany: "Entreprise",
    quoteCompanyPh: "Optionnel — prod, marque, studio…",
    quoteSelect: "Choisir…",
    quoteUsageType: "Type d'usage (périmètre légal)",
    quoteTerritory: "Territoire",
    quoteTerritoryPh: "ex. Espagne, Europe, mondial…",
    quoteTerm: "Durée de licence",
    quoteTermSingle: "Micro / usage unique (sting, 1 post, 1 vol) — 79 €",
    quoteTerm1y: "1 an — 129 €",
    quoteTermProject: "Durée du projet — 159 €",
    quoteTerm2y: "2 ans (standard catalogue) — 169 €",
    quoteTermCustom: "Autre durée (revue manuelle)",
    quoteProject: "Projet et usage concret",
    quoteProjectPh: "Nom du projet, où la musique est entendue, dates…",
    quoteExtras: "Extras",
    quoteStems: "Stems (pistes séparées)",
    quoteEdit: "Edit / coupe courte sur mesure",
    quoteExclusive: "Je veux l'exclusivité (pas seulement non exclusif)",
    quoteBuyout: "Buyout / retirer l'œuvre du catalogue",
    quoteSpecialLegend: "Devis spécial (revue du studio)",
    quoteSpecialHelp:
      "Cochez si votre cas sort de la liste standard : multi-territoire inhabituel, plusieurs œuvres, marque globale, TV nationale, etc. Alors le prix n'est pas automatique.",
    quoteSpecialCheck: "J'ai besoin d'un devis spécial / hors catalogue",
    quoteSpecialNotes: "Décrivez le cas spécial",
    quoteSpecialNotesPh: "Ce qui sort du standard…",
    quoteLiveLabel: "Votre devis",
    quoteSubmit: "Obtenir le devis",
    quotePrivacy: "Données uniquement pour cette licence. Pas de revente marketing.",
    usageGroupPersonal: "Personnel",
    usageGroupAudiovisual: "Audiovisuel",
    usageGroupAds: "Publicité",
    usageGroupInteractive: "Jeux et apps",
    usageGroupLive: "Événement / installation",
    usageGroupSpecial: "Exclusif et autres",
    usagePersonalPrivate: "Personnel / privé (sans business) — revue",
    usageFilmShort: "Cinéma : court / festival / étudiant — selon durée",
    usageFilmFeature: "Cinéma : long métrage / grosse prod — dès 390 € (revue)",
    usageSeriesOne: "Série / websérie : 1 épisode — selon durée",
    usageSeriesMulti: "Série : plusieurs épisodes — dès 390 € (revue)",
    usageBrandVideo: "Vidéo de marque / corporate (1 pièce) — selon durée",
    usageSocialBrand: "Réseaux de marque (1 campagne organique) — selon durée",
    usagePodcastOne: "Podcast : 1 épisode — selon durée (micro 79 € si 1 usage)",
    usageAdsPaid: "Publicité / pubs payantes — dès ~209 € (durée + ads)",
    usageGameIndie: "Jeu indé (1 titre / usage déclaré) — selon durée",
    usageGameLiveops: "Jeu live-ops / marketing continu — dès 590 €/an (revue)",
    usageAppOne: "App mobile / logiciel (1 app, usage fixe) — selon durée",
    usageAppSaas: "SaaS / app usage illimité — dès 590 €/an (revue)",
    usageInstallOne: "Installation / musée / événement ponctuel — selon durée",
    usageTourEvent: "Tournée / multi-villes — dès 390 € (revue)",
    usageExclusive: "Exclusivité par périmètre — dès 1 200 €",
    usageBuyout: "Buyout total / hors catalogue — dès 2 990 €",
    usageOther: "Autre usage non listé — revue",

    badgeComingSoon: "Bientôt",
    badgeFeatured: "En vedette",
    badgeProvisional: "Démo · contenu provisoire",
    badgeProvisionalShort: "Provisoire",
    provisionalNotice:
      "Ceci est un contenu de démonstration / provisoire, pas une sortie réelle. L'œuvre de référence est « Deep in the forest ».",

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
