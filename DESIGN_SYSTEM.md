# RedPulse — Design System

**Version:** 2.0 · Juin 2026

---

## 1. Charte graphique globale

### Ambiance
Sombre, élégante, premium. Nuances subtiles de noirs profonds et gris froids (`hsl(220, 8–10%, 2–14%)`). Chaque surface respire — pas de gris SaaS générique.

### Couleurs

| Token | Valeur | Usage |
|-------|--------|-------|
| `--background` | `hsl(220 10% 2%)` | Fond principal |
| `--surface-cold` | `hsl(220 10% 4%)` | Cartes, panneaux |
| `--surface-elevated` | `hsl(220 8% 7%)` | Modales, dropdowns |
| `--border` | `hsl(220 8% 14%)` | Séparateurs |
| `--foreground` | `hsl(210 20% 98%)` | Texte principal |
| `--muted-foreground` | `hsl(220 5% 52%)` | Texte secondaire |
| `--primary` | `#F97316` | Accents, CTA, marque |
| `--secondary` | `hsl(220 8% 10%)` | Palette secondaire apaisante |

### Typographie
- **Famille :** Inter (fallback system-ui)
- **Display :** 600–700, tracking `-0.04em`, aérée
- **Body :** 400–500, leading `1.6`, contrasté
- **Labels :** 11px, uppercase, tracking `0.15em`

### Surfaces UI
- **Glass :** `bg-white/[0.03]` + `backdrop-blur-xl` + bordure `white/6%`
- **Neumorphisme :** `.neu-surface` (highlight haut + ombre légère), `.neu-inset` (retrait)
- **Radius :** `0.75rem` (cards), `9999px` (pills)

### Motion
- **Easing :** `cubic-bezier(0.22, 1, 0.36, 1)`
- **Durée :** 200ms (micro), 500–800ms (sections)
- **Reduced motion :** respect `prefers-reduced-motion`

---

## 2. Logo

Symbole minimaliste : deux arcs convergents (conversation + influence) + point central (pulse). Typographie grasse « RedPulse ».

Déclinaisons : light on dark (app), dark on light (print), icon square (favicon).

Fichiers : `src/components/brand/logo.tsx`, `public/logo.svg`, `public/icon.svg`

---

## 3. Composants

| Composant | Fichier | Usage |
|-----------|---------|-------|
| `Logo` | `brand/logo.tsx` | Navbar, auth, sidebar |
| `GlassPanel` | `landing/glass-panel.tsx` | Landing, cards premium |
| `NeuSurface` | `ui/neu-surface.tsx` | Dashboard, settings |
| `FloatingInput` | `ui/floating-input.tsx` | Auth, settings |
| `ModeTabs` | `dashboard/mode-tabs.tsx` | Listen · Publish · Analyze |
| `ConfirmModal` | `ui/confirm-modal.tsx` | Confirmations binaires |
| `InfoTip` | `ui/info-tip.tsx` | Bulles d'information |
| `UserMenu` | `dashboard/user-menu.tsx` | Profil + préférences rapides |
| `StatWidget` | `dashboard/stat-widget.tsx` | KPIs dashboard |
| `DataList` | `dashboard/data-list.tsx` | Conversations, posts |
| `AuthShell` | `auth/auth-shell.tsx` | Login, signup |

---

## 4. Écrans

### Landing
- Hero centré, **CTA unique contrasté** + lien secondaire discret
- Scroll storytelling immersif (4 chapitres)
- Captures séquencées, animations subtiles
- Pied de page sobre (contact, confidentialité)
- Pas de pricing

### Onboarding (3 étapes)
1. **Produit** — URL + description IA
2. **Projet** — nom du projet
3. **Équipe** — invitations + création
- Bouton « Créer mon projet » actif dès que le nom est renseigné
- Écran de succès → CTA dashboard

### Dashboard
- Sidebar avec icônes expressives
- KPIs hiérarchisés (conversations, ROI, engagement)
- Graphiques interactifs contextualisés
- Profil utilisateur accessible (`UserMenu`)

### Fonctionnalités (Listen · Publish · Analyze)
- Onglets de mode, état actif distinct
- Listes aérées, aperçu au survol
- Actions contextuelles (répondre, booster, archiver)
- Filtres + recherche omniprésente

### Paramètres
- Organisation par thèmes, recherche instantanée
- Wizard 5 étapes, tooltips explicatifs
- Feedback succès, gestion d'erreur proactive
- Mode sombre (clair bientôt)

### Modals
- Concises, choix binaires explicites
- Animations entrée/sortie, focus automatique
- État succès visible, fermeture automatisée

---

## 5. Principes UI

- Chaque écran renforce la marque
- Hiérarchie visuelle au service de la complétion de tâches
- Réduire le bruit, augmenter le signal
- Copie exhaustive mais jamais verbeuse
- Composants réutilisables et combinables
- Aucun état sans feedback, aucune action sans garde-fou

---

## 6. Brand voice

- Ton direct mais bienveillant, centré utilisateur
- Formulations inclusives, français international
- Vocabulaire technique expliqué, pas de jargon marketing
- Touche d'humour bienvenue si appropriée
- Exemples concrets, métaphores éclairantes

Source copy : `src/lib/ux-copy.ts`

---

## 7. Responsive

Mobile-first. Sidebar → drawer sur `< md`. Éditeur IA → plein écran sur mobile. Touch targets ≥ 44px.
