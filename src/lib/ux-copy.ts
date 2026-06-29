export const ux = {
  brand: {
    tagline: "Intelligence Reddit",
    promise:
      "Un outil puissant mais intuitif. Premium mais inclusif. Une marque forte mais en retrait.",
  },
  modes: {
    listen: {
      label: "Listen",
      description: "Surveillez les conversations pertinentes en temps réel.",
    },
    publish: {
      label: "Publish",
      description: "Répondez, planifiez et publiez avec validation humaine.",
    },
    analyze: {
      label: "Analyze",
      description: "Mesurez l'impact, le ROI et l'évolution de votre présence.",
    },
  },
  empty: {
    discovery: {
      title: "Silence radio… pour l'instant",
      body: "Aucune conversation ne correspond à vos filtres. RedPulse écoute. La prochaine opportunité arrive.",
      cta: "Ajuster les filtres",
    },
    replies: {
      title: "Votre file est vide",
      body: "C'est le moment idéal pour lancer un warmup ou explorer la découverte.",
      cta: "Voir les conversations",
    },
    warmup: {
      title: "Prêt à chauffer vos comptes ?",
      body: "Le warmup construit votre crédibilité avant la conversion. Patience = karma.",
      cta: "Configurer le warmup",
    },
    team: {
      title: "Vous volez solo",
      body: "Invitez votre équipe. Reddit se gagne mieux à plusieurs.",
      cta: "Inviter un membre",
    },
  },
  cta: {
    explore: "Explorer la plateforme",
    start: "Commencer avec RedPulse",
    analyze: "Analyser mon site",
    enrich: "✦ Enrichir avec l'IA",
    createProject: "Créer mon projet",
    approve: "Valider avant envoi",
    warmup: "Lancer le warmup",
    dashboard: "Accéder au dashboard",
    continue: "Continuer",
  },
  onboarding: {
    steps: ["Produit", "Projet", "Équipe"] as const,
    productTitle: "Collez votre URL. On comprend votre produit.",
    projectTitle: "Donnez un nom à votre projet.",
    teamTitle: "Invitez votre équipe, ou avancez seul·e.",
    successTitle: "Projet créé. Bienvenue à bord.",
    successBody:
      "Vos invité·es reçoivent un accès immédiat. Vous pouvez piloter tout depuis le dashboard.",
    placeholders: {
      url: "https://votre-saas.com",
      projectName: "Ex. Nova Growth, Acme B2B…",
      invites: "collègue@startup.io, partenaire@equipe.com",
      description: "Décrivez ce que vous vendez en une phrase claire.",
    },
  },
  hints: {
    url: "Collez l'URL de votre landing. On s'occupe du reste.",
    description: "Plus c'est précis, plus les réponses IA sonnent humaines.",
    invite: "Séparez les emails par des virgules. Accès immédiat pour chaque invité·e.",
    banRisk: "Score bas = bonne nouvelle. Reddit vous remercie.",
    validation: "Validation humaine requise avant chaque publication.",
    darkMode: "Mode sombre activé. Palette secondaire apaisante pour vos longues sessions.",
  },
  actions: {
    reply: "Répondre",
    boost: "Booster",
    archive: "Archiver",
    dm: "DM",
  },
  toast: {
    analyzed: "Site analysé. Description générée.",
    enriched: "Description optimisée par Claude.",
    projectCreated: "Projet créé. Bienvenue à bord.",
    settingsSaved: "Paramètres enregistrés.",
  },
  modals: {
    archive: {
      title: "Archiver cette conversation ?",
      body: "Elle disparaîtra de votre file active. Vous pourrez la retrouver dans l'historique.",
      confirm: "Archiver",
      cancel: "Annuler",
    },
    deleteTemplate: {
      title: "Supprimer ce template ?",
      body: "Action irréversible. Les brouillons liés ne seront pas affectés.",
      confirm: "Supprimer",
      cancel: "Garder",
    },
  },
  settings: {
    searchPlaceholder: "Rechercher un paramètre…",
    saved: "Modifications enregistrées",
  },
} as const;
