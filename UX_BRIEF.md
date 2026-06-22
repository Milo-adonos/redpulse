# RedPulse — Brief Design & UX

## 1. Charte graphique globale

- Ambiance sombre, élégante et premium
- Nuances subtiles de noirs profonds et de gris froids
- Typographie moderne sans-serif, aérée et contrastée
- Éléments UI épurés et technologiques (neumorphisme, glassmorphisme)
- Animations fluides et microinteractions soignées

## 2. Landing page

- Logo minimaliste et iconique, typographie grasse, symbole fort
- Titre principal centré, CTA unique et contrasté
- Effet de défilement immersif, storytelling des fonctionnalités
- Captures d'écran séquencées, animations subtiles
- Contenu aspirationnel, phrases-clés percutantes
- Pied de page sobre avec liens de contact

## 3. Onboarding & création de projet

- Parcours en 3 étapes : **Produit → Projet → Équipe**
- Champs de saisie aérés, placeholders inspirants
- Bouton « Créer mon projet » actif par défaut (nom renseigné)
- Accès immédiat à l'app pour les membres invités
- Écran de succès avec CTA vers le dashboard

## 4. Dashboard

- Vue d'ensemble épurée, données hiérarchisées
- Métriques clés (conversations, ROI, engagement)
- Graphiques interactifs, données contextualisées
- Navigation latérale intuitive, icônes expressives
- Profil utilisateur accessible, préférences rapides

## 5. Fonctionnalités principales (Listen · Publish · Analyze)

| Mode | Route principale | Rôle |
|------|------------------|------|
| **Listen** | `/dashboard/discovery` | Veille, filtres, détection |
| **Publish** | `/dashboard/replies`, `/dashboard/warmup` | Réponses, warmup, validation |
| **Analyze** | `/dashboard/analytics` | Métriques, ROI, tendances |

- Onglets pour alterner entre modes, état actif distinct
- Listes aérées, aperçu au survol
- Actions contextuelles (répondre, booster, archiver)
- Filtres puissants, recherche omniprésente
- Création de contenu assistée, suggestions IA

## 6. Paramètres & configuration

- Organisation par thèmes, recherche instantanée
- Assistant de configuration, wizards contextuels
- Explications sur demande (InfoTip)
- Feedback de succès, gestion d'erreur proactive
- Mode sombre activable, palette secondaire apaisante

## 7. Modals & confirmations

- Modals concises, choix binaires explicites
- Titres actionnables, boutons contrastés
- Animations d'entrée/sortie, focus automatique
- État de succès visible, fermeture automatisée
- Annulation facile, conséquences expliquées

## Principes UI

- Chaque écran renforce la marque
- Hiérarchie visuelle au service de la complétion de tâches
- Réduire le bruit, augmenter le signal
- Composants réutilisables, feedback systématique

## Brand voice

- Ton direct mais bienveillant
- Français international, inclusif
- Technique expliqué, pas de jargon marketing
- Exemples concrets, métaphores éclairantes

## Parcours utilisateur type

1. Coller l'URL du SaaS sur la landing → analyse automatique
2. Compléter / enrichir la description (IA)
3. Nom du projet + inviter l'équipe
4. Dashboard : premiers KPIs
5. Warmup → Reply assistant → Analytics → Équipe

## Modules implémentés

| Module | Route |
|--------|-------|
| Onboarding interactif | `/#start` |
| Dashboard | `/dashboard` |
| Listen | `/dashboard/discovery` |
| Publish | `/dashboard/replies`, `/dashboard/warmup` |
| Analyze | `/dashboard/analytics` |
| Équipe | `/dashboard/team` |
| Paramètres | `/dashboard/settings` |
| Éditeur IA | `/dashboard/replies/editor` |

Copy centralisée : `src/lib/ux-copy.ts`
