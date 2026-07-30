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
    navCatalog: "Productos",
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
    libLoadMore: "Cargar más",
    libLoading: "Cargando…",
    libLoadError: "No se pudo cargar el catálogo.",
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

    // Catalog / software products
    catalogTitle: "Productos",
    catalogSubtitle: "Software",
    catalogDesc:
      "Plugins, apps y tools del estudio. Elige uno en el panel para ver descripción, imágenes o vídeo.",
    catalogAll: "Todos",
    catalogEmptyTitle: "Catálogo en preparación",
    catalogEmptyDesc: "",
    catalogComingSoon: "Próximamente",

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
    aboutEyebrow: "Sobre mí",
    aboutTitle: "Sobre",
    aboutP1:
      "Nimpo 3D Studio es mi marca personal para productos digitales: software y música. Hace más de quince años empecé a componer por mi cuenta, tocando el piano con un solo dedo. Fue un camino emocionante: descubrir qué significa componer y, a la vez, descubrir mis habilidades y mi pasión.",
    aboutP2:
      "Mis creaciones nacen de la inspiración —supongo que es cuando bajan las musas—; nada está planificado. El 99 % de mis obras son MIDI, tocadas o compuestas por mí, aunque me encanta mezclarlas con las texturas de la música electrónica.",
    aboutP3:
      "Aunque la mayor parte de mi trabajo es por cuenta propia, puedo colaborar en proyectos. Si te gusta mi estilo, no dudes en escribirme. Puedo adaptarme a otros géneros, pero siempre intentaré verlo desde mi perspectiva: así el resultado es más genuino.",
    aboutP4: "Gracias por visitarme.",
    aboutP5: "¿Tienes un proyecto o quieres hablar?",
    aboutContactLink: "Escríbeme",

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
    productDemo: "Probar demo",
    productDemoRequest: "Solicitar demo",
    productBuy: "Comprar",
    productBuyRequest: "Solicitar compra",
    productFeedback: "Feedback / soporte",
    productFeedbackTitle: "Feedback del producto",
    productFeedbackLead:
      "Bug, sugerencia o soporte. Si eres cliente, verifica con tu email de compra para prioridad.",
    productFeedbackChannel: "Tipo de petición",
    productFeedbackSubtype: "Detalle",
    productFeedbackBug: "Bug",
    productFeedbackSuggestion: "Sugerencia",
    productFeedbackSupport: "Soporte",
    productFeedbackOther: "Otro",
    productFeedbackMessage: "Mensaje",
    productFeedbackSend: "Enviar",
    productFeedbackOk: "Mensaje enviado. Te responderemos por email.",
    productFeedbackErr: "No se pudo enviar. Inténtalo de nuevo.",
    productFeedbackVerified: "Cliente verificado",
    productFeedbackProspect: "Sin compra verificada (prospecto)",
    productFeedbackVerify: "Verificar como cliente",
    productPriceFrom: "desde",
    productVersion: "v",

    accountEyebrow: "Cliente",
    accountTitle: "Tu cuenta",
    accountLead:
      "Introduce tu email de compra: te enviamos un enlace mágico para ver licencias y re-descargar.",
    accountSendLink: "Enviar enlace",
    accountLinkSent: "Revisa tu email (el enlace caduca en 30 min).",
    accountLogout: "Cerrar sesión",
    accountOrders: "Tus pedidos",
    accountEmpty: "Aún no hay pedidos con este email.",
    accountDownload: "Descargar",
    accountLicense: "Licencia",
    accountError: "No se pudo completar la acción.",
    accountCheckoutOk: "Pago recibido. Revisa tu email y esta cuenta.",
    accountNick: "Nick (público en el producto)",
    accountNickSave: "Guardar nick",
    accountNickHint: "3–20 caracteres: letras, números o _",
    accountNickOk: "Nick guardado.",
    accountRecovery: "¿Perdiste el acceso al email?",
    accountRecoveryLead:
      "Pide recuperación: no revelamos si un email existe. Revisamos compra y te escribimos.",
    accountRecoveryOld: "Email de compra (si lo recuerdas)",
    accountRecoveryNew: "Email de contacto actual",
    accountRecoveryKey: "Clave de licencia (opcional)",
    accountRecoveryProof: "Prueba (fecha, importe, id Stripe…)",
    accountRecoveryMsg: "Mensaje",
    accountRecoverySend: "Enviar solicitud",
    accountRecoveryOk: "Solicitud recibida. Si podemos ayudarte, te contactamos.",

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
    share: "Compartir",
    shareCopied: "Enlace copiado",
    shareFailed: "No se pudo copiar",

    // Reviews (lista común es/en/fr; textos de usuario sin traducir)
    reviewsTitle: "Valoraciones y comentarios",
    reviewsScoreAria: "Valoración media {avg} de 5, basada en {n} votos",
    reviewsCount: "{n} valoraciones",
    reviewsEmpty: "Aún no hay comentarios. Sé el primero en valorar esta pieza.",
    reviewsYourRating: "Tu puntuación",
    reviewsStarsAria: "{n} de 5 estrellas",
    reviewsNamePh: "Cómo quieres figurar",
    reviewsCommentPh: "¿Qué te transmite la pieza? (máx. 280)",
    reviewsSubmit: "Enviar valoración",
    reviewsSubmitNote: "El envío se activará cuando conectemos el almacenamiento (lista única para todos los idiomas).",

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
    quoteStemsHint:
      "Master en capas sueltas (p. ej. pads, melodía, bajo) para recortar, bajar o remezclar en tu DAW. No es el master estéreo solo.",
    quoteEdit: "Edit / recorte corto a medida",
    quoteEditHint:
      "Pedimos un recorte o edit corto a medida (sting, loop, fade) a partir de la obra. No sustituye una composición nueva entera.",
    quoteTermPlus1y: "Extensión +1 año",
    quoteTermPlus1yHint:
      "Suma un año más al plazo elegido. Precio bajo: +55 € sobre licencia comercial; +220 € si hay exclusiva.",
    quoteTerritoryExpand: "Ampliar territorio / medios",
    quoteTerritoryExpandHint:
      "Más países o más canales de los del uso base (p. ej. pasar de ES a UE/mundial, o añadir TV/paid media).",
    quoteMoreComposition: "Más composición / custom ½ día",
    quoteMoreCompositionHint:
      "Hasta ~½ día de trabajo del estudio: variaciones, arreglos o ajustes a medida sobre la pieza.",
    quoteExclusive: "Quiero exclusividad (no solo uso no exclusivo)",
    quoteExclusiveHint:
      "Nadie más licencia esa obra en el alcance acordado (territorio/plazo). Suelo desde 1.200 €; se revisa el alcance.",
    quoteExclusiveStrong: "Exclusiva fuerte multi-medio",
    quoteExclusiveStrongHint:
      "Exclusiva amplia (varios medios / alcance fuerte). Suelo desde 3.000 €; alcance por escrito.",
    quoteRemoveFromCatalog: "Retirar del catálogo público",
    quoteRemoveFromCatalogHint:
      "Dejamos de ofrecer la obra en la biblioteca pública (suele ir con exclusiva). +250 € sobre el acuerdo.",
    quoteBuyout: "Buyout / sacar la obra del catálogo",
    quoteBuyoutHint:
      "Cesión amplia / buyout: la obra sale del catálogo comercial del estudio. Suelo desde 2.990 €.",
    quoteBuyoutHigh: "Buyout alto / a medida",
    quoteBuyoutHighHint:
      "Buyout premium o caso a medida (marca global, forever, multi-obra…). Suelo desde 5.500 €.",
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
    usageAdsPaid: "Publicidad / ads de pago — desde 209 € (plazo + ads)",
    usageAdsPaidHint:
      "No es un descuento de −209 €. El ~ o «desde» significa aproximado/suelo: plazo micro 79 € + suplemento ads 130 € = 209 €. Con plazo 2 años: 169 + 130 = 299 €. El total exacto sale al elegir el plazo abajo.",
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
    privacyDesc: "Política de privacidad de Nimpo 3D Studio",
    privacyController: "Responsable",
    privacyControllerBody: "— contacto:",
    privacyDataTitle: "Qué datos recogemos",
    privacyDataAnalytics:
      "Navegación analítica — páginas visitadas, referrer, país aproximado, dispositivo.",
    privacyDataEvents:
      "Eventos de uso — reproducción de previews musicales, visitas a fichas de catálogo.",
    privacyDataContact:
      "Contacto — solo si nos escribes por email (fuera de esta web).",
    privacyDataConsent:
      "Cookies de consentimiento — preferencia aceptar/rechazar analítica (localStorage).",
    privacyServicesTitle: "Servicios de analítica y publicidad",
    privacyCfAnalytics:
      "Cloudflare Web Analytics — sin cookies, medición agregada. Activo si hay token configurado.",
    privacyGa4:
      "Google Analytics 4 — solo tras aceptar cookies. Medición de uso y eventos.",
    privacyMeta:
      "Meta Pixel — solo tras aceptar, si está configurado. Publicidad y remarketing futuro.",
    privacySearch:
      "Google Search Console / Bing Webmaster — verificación de propiedad del sitio (meta tag).",
    privacyLegalTitle: "Base legal (RGPD)",
    privacyLegalBody:
      "Interés legítimo y consentimiento para analítica/marketing. Puedes rechazar cookies no esenciales con el banner inferior. Cloudflare Web Analytics opera sin cookies de seguimiento.",
    privacyRightsTitle: "Tus derechos",
    privacyRightsBody:
      "Acceso, rectificación, supresión y oposición escribiendo a {email}. Puedes borrar la preferencia de cookies eliminando datos del sitio en tu navegador.",
    privacyFutureTitle: "Ventas futuras",
    privacyFutureBody:
      "Cuando activemos la tienda se actualizará esta política con datos de pedidos, facturación y cuentas de cliente.",
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
    navCatalog: "Products",
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
    libLoadMore: "Load more",
    libLoading: "Loading…",
    libLoadError: "Could not load the catalog.",
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

    catalogTitle: "Products",
    catalogSubtitle: "Software",
    catalogDesc:
      "Studio plugins, apps and tools. Pick one in the panel to see description, images or video.",
    catalogAll: "All",
    catalogEmptyTitle: "Catalog in progress",
    catalogEmptyDesc: "",
    catalogComingSoon: "Coming soon",

    musicTitle: "Music",
    musicSubtitle: "Original MIDI compositions",
    musicDesc:
      "All pieces are original MIDI compositions from the studio: singles, EPs, albums and sync packs. Each release includes a presentation and previews to listen before buying.",
    musicEmptyTitle: "No published releases",
    musicEmptyDesc: "Add entries in src/data/music.json",
    musicHint:
      "Upload preview MP3s to public/previews/music/ and edit src/data/music.json with your real compositions.",

    aboutEyebrow: "About me",
    aboutTitle: "About",
    aboutP1:
      "Nimpo 3D Studio is my personal brand for digital products — software and music. More than fifteen years ago I started composing on my own, playing piano with a single finger. It was an exciting path: discovering what composition really is, and discovering my own skills and passion.",
    aboutP2:
      "My work comes from inspiration — I suppose that’s when the muses show up — nothing is planned in advance. About 99% of my pieces are MIDI, performed or written by me, though I love blending them with the textures of electronic music.",
    aboutP3:
      "Most of my work is independent, but I can join projects too. If you like my style, feel free to write. I can adapt to other styles, yet I always try to see them from my own perspective — that keeps the result more genuine.",
    aboutP4: "Thank you for visiting.",
    aboutP5: "Have a project or want to talk?",
    aboutContactLink: "Write to me",

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
    productDemo: "Try demo",
    productDemoRequest: "Request demo",
    productBuy: "Buy",
    productBuyRequest: "Request purchase",
    productFeedback: "Feedback / support",
    productFeedbackTitle: "Product feedback",
    productFeedbackLead:
      "Bug, suggestion or support. If you're a customer, verify with your purchase email for priority.",
    productFeedbackChannel: "Request type",
    productFeedbackSubtype: "Detail",
    productFeedbackBug: "Bug",
    productFeedbackSuggestion: "Suggestion",
    productFeedbackSupport: "Support",
    productFeedbackOther: "Other",
    productFeedbackMessage: "Message",
    productFeedbackSend: "Send",
    productFeedbackOk: "Message sent. We'll reply by email.",
    productFeedbackErr: "Could not send. Try again.",
    productFeedbackVerified: "Verified customer",
    productFeedbackProspect: "No verified purchase (prospect)",
    productFeedbackVerify: "Verify as customer",
    productPriceFrom: "from",
    productVersion: "v",

    accountEyebrow: "Account",
    accountTitle: "Your account",
    accountLead:
      "Enter your purchase email: we'll send a magic link to view licenses and re-download.",
    accountSendLink: "Send link",
    accountLinkSent: "Check your email (link expires in 30 min).",
    accountLogout: "Log out",
    accountOrders: "Your orders",
    accountEmpty: "No orders for this email yet.",
    accountDownload: "Download",
    accountLicense: "License",
    accountError: "Could not complete the action.",
    accountCheckoutOk: "Payment received. Check your email and this account.",
    accountNick: "Nick (public in the product)",
    accountNickSave: "Save nick",
    accountNickHint: "3–20 chars: letters, numbers or _",
    accountNickOk: "Nick saved.",
    accountRecovery: "Lost access to your email?",
    accountRecoveryLead:
      "Request recovery: we never reveal if an email exists. We check the purchase and write back.",
    accountRecoveryOld: "Purchase email (if you remember)",
    accountRecoveryNew: "Current contact email",
    accountRecoveryKey: "License key (optional)",
    accountRecoveryProof: "Proof (date, amount, Stripe id…)",
    accountRecoveryMsg: "Message",
    accountRecoverySend: "Submit request",
    accountRecoveryOk: "Request received. If we can help, we'll contact you.",

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
    share: "Share",
    shareCopied: "Link copied",
    shareFailed: "Could not copy",

    reviewsTitle: "Ratings & comments",
    reviewsScoreAria: "Average rating {avg} out of 5, from {n} votes",
    reviewsCount: "{n} ratings",
    reviewsEmpty: "No comments yet. Be the first to rate this piece.",
    reviewsYourRating: "Your rating",
    reviewsStarsAria: "{n} out of 5 stars",
    reviewsNamePh: "How you want to appear",
    reviewsCommentPh: "What does the piece convey? (max 280)",
    reviewsSubmit: "Submit rating",
    reviewsSubmitNote: "Submit will activate when storage is connected (one shared list for all languages).",

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
    quoteStemsHint:
      "Master as separate layers (e.g. pads, melody, bass) so you can mute, trim or remix in your DAW. Not just a stereo master.",
    quoteEdit: "Short custom edit / trim",
    quoteEditHint:
      "A short custom cut or edit (sting, loop, fade) from the work. Not a full new composition.",
    quoteTermPlus1y: "Extension +1 year",
    quoteTermPlus1yHint:
      "Adds one year to the term you chose. +€55 on commercial licenses; +€220 if exclusivity is selected.",
    quoteTerritoryExpand: "Expand territory / media",
    quoteTerritoryExpandHint:
      "More countries or channels than the base use (e.g. ES → EU/worldwide, or add TV/paid media).",
    quoteMoreComposition: "More composition / custom ½ day",
    quoteMoreCompositionHint:
      "Up to about half a day of studio work: variations, arrangement or custom tweaks on the piece.",
    quoteExclusive: "I want exclusivity (not just non-exclusive use)",
    quoteExclusiveHint:
      "No one else licenses this work in the agreed scope (territory/term). From €1,200; scope is confirmed in writing.",
    quoteExclusiveStrong: "Strong multi-media exclusivity",
    quoteExclusiveStrongHint:
      "Broad exclusivity (multiple media / strong scope). From €3,000; scope in writing.",
    quoteRemoveFromCatalog: "Remove from public catalog",
    quoteRemoveFromCatalogHint:
      "We stop offering the work in the public library (usually with exclusivity). +€250 on top of the deal.",
    quoteBuyout: "Buyout / remove work from catalog",
    quoteBuyoutHint:
      "Broad buyout: work leaves the studio commercial catalog. From €2,990.",
    quoteBuyoutHigh: "High / custom buyout",
    quoteBuyoutHighHint:
      "Premium or custom buyout (global brand, forever, multi-work…). From €5,500.",
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
    usageAdsPaid: "Advertising / paid ads — from €209 (term + ads)",
    usageAdsPaidHint:
      "Not a −€209 discount. “From” means the floor: micro term €79 + ads uplift €130 = €209. With 2-year term: €169 + €130 = €299. Exact total appears when you pick the term below.",
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
    privacyDesc: "Nimpo 3D Studio privacy policy",
    privacyController: "Controller",
    privacyControllerBody: "— contact:",
    privacyDataTitle: "What data we collect",
    privacyDataAnalytics:
      "Analytics browsing — pages visited, referrer, approximate country, device.",
    privacyDataEvents:
      "Usage events — music preview playback, product page views.",
    privacyDataContact:
      "Contact — only if you email us (outside this website).",
    privacyDataConsent:
      "Consent cookies — analytics accept/reject preference (localStorage).",
    privacyServicesTitle: "Analytics and advertising services",
    privacyCfAnalytics:
      "Cloudflare Web Analytics — cookieless, aggregate measurement. Active when a token is configured.",
    privacyGa4:
      "Google Analytics 4 — only after you accept cookies. Usage and event measurement.",
    privacyMeta:
      "Meta Pixel — only after accept, if configured. Advertising and future remarketing.",
    privacySearch:
      "Google Search Console / Bing Webmaster — site ownership verification (meta tag).",
    privacyLegalTitle: "Legal basis (GDPR)",
    privacyLegalBody:
      "Legitimate interest and consent for analytics/marketing. You can reject non-essential cookies with the bottom banner. Cloudflare Web Analytics runs without tracking cookies.",
    privacyRightsTitle: "Your rights",
    privacyRightsBody:
      "Access, rectification, erasure and objection by writing to {email}. You can clear the cookie preference by deleting this site’s data in your browser.",
    privacyFutureTitle: "Future sales",
    privacyFutureBody:
      "When we enable the store, this policy will be updated with order, billing and customer account data.",
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
    navCatalog: "Produits",
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
    libLoadMore: "Charger plus",
    libLoading: "Chargement…",
    libLoadError: "Impossible de charger le catalogue.",
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

    catalogTitle: "Produits",
    catalogSubtitle: "Logiciel",
    catalogDesc:
      "Plugins, apps et outils du studio. Choisissez-en un dans le panneau pour voir description, images ou vidéo.",
    catalogAll: "Tous",
    catalogEmptyTitle: "Catalogue en préparation",
    catalogEmptyDesc: "",
    catalogComingSoon: "Prochainement",

    musicTitle: "Musique",
    musicSubtitle: "Compositions MIDI originales",
    musicDesc:
      "Toutes les pièces sont des compositions MIDI originales du studio : singles, EPs, albums et packs de synchronisation. Chaque sortie comprend une présentation et des extraits à écouter avant d'acheter.",
    musicEmptyTitle: "Aucune sortie publiée",
    musicEmptyDesc: "Ajoutez des entrées dans src/data/music.json",
    musicHint:
      "Téléversez les MP3 d'extrait dans public/previews/music/ et modifiez src/data/music.json avec vos vraies compositions.",

    aboutEyebrow: "À propos de moi",
    aboutTitle: "À propos",
    aboutP1:
      "Nimpo 3D Studio est ma marque personnelle pour les produits numériques — logiciel et musique. Il y a plus de quinze ans, j’ai commencé à composer seul, en jouant du piano avec un seul doigt. Ce fut un chemin passionnant : découvrir ce qu’est la composition, et découvrir en même temps mes aptitudes et ma passion.",
    aboutP2:
      "Mes créations naissent de l’inspiration — je suppose que c’est quand les muses descendent — ; rien n’est planifié. Environ 99 % de mes œuvres sont en MIDI, jouées ou composées par moi, même si j’adore les mélanger aux textures de la musique électronique.",
    aboutP3:
      "La majeure partie de mon travail est indépendante, mais je peux aussi collaborer sur des projets. Si mon style vous plaît, n’hésitez pas à m’écrire. Je peux m’adapter à d’autres styles, tout en cherchant toujours à les voir depuis ma perspective — ce qui rend le résultat plus authentique.",
    aboutP4: "Merci de votre visite.",
    aboutP5: "Un projet, ou envie d’en parler ?",
    aboutContactLink: "Écrivez-moi",

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
    productDemo: "Essayer la démo",
    productDemoRequest: "Demander une démo",
    productBuy: "Acheter",
    productBuyRequest: "Demander l'achat",
    productFeedback: "Feedback / support",
    productFeedbackTitle: "Feedback produit",
    productFeedbackLead:
      "Bug, suggestion ou support. Client : vérifiez avec l'email d'achat pour la priorité.",
    productFeedbackChannel: "Type de demande",
    productFeedbackSubtype: "Détail",
    productFeedbackBug: "Bug",
    productFeedbackSuggestion: "Suggestion",
    productFeedbackSupport: "Support",
    productFeedbackOther: "Autre",
    productFeedbackMessage: "Message",
    productFeedbackSend: "Envoyer",
    productFeedbackOk: "Message envoyé. Nous répondrons par email.",
    productFeedbackErr: "Échec de l'envoi. Réessayez.",
    productFeedbackVerified: "Client vérifié",
    productFeedbackProspect: "Achat non vérifié (prospect)",
    productFeedbackVerify: "Vérifier comme client",
    productPriceFrom: "à partir de",
    productVersion: "v",

    accountEyebrow: "Compte",
    accountTitle: "Votre compte",
    accountLead:
      "Entrez l'email d'achat : nous envoyons un lien magique pour voir licences et re-télécharger.",
    accountSendLink: "Envoyer le lien",
    accountLinkSent: "Vérifiez votre email (lien valable 30 min).",
    accountLogout: "Déconnexion",
    accountOrders: "Vos commandes",
    accountEmpty: "Aucune commande pour cet email.",
    accountDownload: "Télécharger",
    accountLicense: "Licence",
    accountError: "Action impossible.",
    accountCheckoutOk: "Paiement reçu. Vérifiez votre email et ce compte.",
    accountNick: "Pseudo (public dans le produit)",
    accountNickSave: "Enregistrer le pseudo",
    accountNickHint: "3–20 car. : lettres, chiffres ou _",
    accountNickOk: "Pseudo enregistré.",
    accountRecovery: "Perdu l'accès à l'email ?",
    accountRecoveryLead:
      "Demande de récupération : nous ne révélons pas si un email existe. Vérification d'achat puis contact.",
    accountRecoveryOld: "Email d'achat (si vous vous en souvenez)",
    accountRecoveryNew: "Email de contact actuel",
    accountRecoveryKey: "Clé de licence (optionnel)",
    accountRecoveryProof: "Preuve (date, montant, id Stripe…)",
    accountRecoveryMsg: "Message",
    accountRecoverySend: "Envoyer la demande",
    accountRecoveryOk: "Demande reçue. Si nous pouvons aider, nous vous contactons.",

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
    share: "Partager",
    shareCopied: "Lien copié",
    shareFailed: "Impossible de copier",

    reviewsTitle: "Notes et commentaires",
    reviewsScoreAria: "Note moyenne {avg} sur 5, basée sur {n} votes",
    reviewsCount: "{n} notes",
    reviewsEmpty: "Pas encore de commentaires. Soyez le premier à noter cette pièce.",
    reviewsYourRating: "Votre note",
    reviewsStarsAria: "{n} étoiles sur 5",
    reviewsNamePh: "Comment vous voulez apparaître",
    reviewsCommentPh: "Que vous inspire la pièce ? (max 280)",
    reviewsSubmit: "Envoyer la note",
    reviewsSubmitNote: "L’envoi s’activera quand le stockage sera connecté (une seule liste pour toutes les langues).",

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
    quoteStemsHint:
      "Master en pistes séparées (pads, mélodie, basse…) pour couper, baisser ou remixer dans votre DAW. Pas seulement le master stéréo.",
    quoteEdit: "Edit / coupe courte sur mesure",
    quoteEditHint:
      "Une coupe ou un edit court sur mesure (sting, loop, fade) à partir de l’œuvre. Ce n’est pas une composition neuve entière.",
    quoteTermPlus1y: "Extension +1 an",
    quoteTermPlus1yHint:
      "Ajoute un an à la durée choisie. +55 € sur licence commerciale ; +220 € s’il y a exclusivité.",
    quoteTerritoryExpand: "Élargir territoire / médias",
    quoteTerritoryExpandHint:
      "Plus de pays ou de canaux que l’usage de base (ex. ES → UE/mondial, ou TV/paid media).",
    quoteMoreComposition: "Plus de composition / custom ½ jour",
    quoteMoreCompositionHint:
      "Jusqu’à ~½ jour de travail studio : variations, arrangement ou ajustements sur mesure.",
    quoteExclusive: "Je veux l'exclusivité (pas seulement non exclusif)",
    quoteExclusiveHint:
      "Personne d’autre ne licence l’œuvre dans le périmètre convenu. Dès 1 200 € ; périmètre écrit.",
    quoteExclusiveStrong: "Exclusivité forte multi-supports",
    quoteExclusiveStrongHint:
      "Exclusivité large (plusieurs médias / périmètre fort). Dès 3 000 € ; contrat écrit.",
    quoteRemoveFromCatalog: "Retirer du catalogue public",
    quoteRemoveFromCatalogHint:
      "L’œuvre n’est plus proposée dans la bibliothèque publique (souvent avec exclusivité). +250 €.",
    quoteBuyout: "Buyout / retirer l'œuvre du catalogue",
    quoteBuyoutHint:
      "Buyout large : l’œuvre sort du catalogue commercial du studio. Dès 2 990 €.",
    quoteBuyoutHigh: "Buyout haut / sur mesure",
    quoteBuyoutHighHint:
      "Buyout premium ou cas sur mesure (marque globale, forever…). Dès 5 500 €.",
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
    usageAdsPaid: "Publicité / pubs payantes — dès 209 € (durée + ads)",
    usageAdsPaidHint:
      "Ce n’est pas une remise de −209 €. « Dès » = plancher : micro 79 € + ads 130 € = 209 €. Avec 2 ans : 169 + 130 = 299 €. Le total exact s’affiche en choisissant la durée ci-dessous.",
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
    privacyDesc: "Politique de confidentialité de Nimpo 3D Studio",
    privacyController: "Responsable",
    privacyControllerBody: "— contact :",
    privacyDataTitle: "Quelles données nous collectons",
    privacyDataAnalytics:
      "Navigation analytique — pages consultées, referrer, pays approximatif, appareil.",
    privacyDataEvents:
      "Événements d’usage — lecture d’extraits musicaux, visites des fiches catalogue.",
    privacyDataContact:
      "Contact — uniquement si vous nous écrivez par e-mail (hors de ce site).",
    privacyDataConsent:
      "Cookies de consentement — préférence accepter/refuser l’analytique (localStorage).",
    privacyServicesTitle: "Services d’analytique et de publicité",
    privacyCfAnalytics:
      "Cloudflare Web Analytics — sans cookies, mesure agrégée. Actif si un jeton est configuré.",
    privacyGa4:
      "Google Analytics 4 — uniquement après acceptation des cookies. Mesure d’usage et d’événements.",
    privacyMeta:
      "Meta Pixel — uniquement après acceptation, s’il est configuré. Publicité et remarketing futur.",
    privacySearch:
      "Google Search Console / Bing Webmaster — vérification de propriété du site (balise meta).",
    privacyLegalTitle: "Base légale (RGPD)",
    privacyLegalBody:
      "Intérêt légitime et consentement pour l’analytique/marketing. Vous pouvez refuser les cookies non essentiels via la bannière en bas. Cloudflare Web Analytics fonctionne sans cookies de suivi.",
    privacyRightsTitle: "Vos droits",
    privacyRightsBody:
      "Accès, rectification, suppression et opposition en écrivant à {email}. Vous pouvez effacer la préférence de cookies en supprimant les données du site dans votre navigateur.",
    privacyFutureTitle: "Ventes futures",
    privacyFutureBody:
      "Lorsque la boutique sera activée, cette politique sera mise à jour avec les données de commandes, de facturation et de comptes clients.",
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
