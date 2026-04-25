# Frontend — Agent Selector

> L'utilisateur peut soit parler à OSCAR (recommandé), soit appeler directement un agent.

## Vue Sidebar / Picker

Liste des agents avec :
- Icône + nom + rôle court
- Statut (active / beta / coming-soon)
- Module activé ou grisé (selon plan Stripe)
- Indicateur de **dernière utilisation**

## Vue agent dédiée (`/agents/[slug]`)
Pour un agent activé, vue avec :
- Header : avatar, nom, rôle, version
- Description courte + "Quand l'utiliser"
- Quick prompts (3-5 raccourcis pré-remplis)
- Chat dédié (équivalent OSCAR mais système prompt = agent)
- Galerie des derniers livrables produits par cet agent
- Lien vers la doc README (open in panel)

## Module désactivé
Affiche carte "🔒 Module non activé" avec CTA "Voir les modules" → page Stripe.

## Onboarding agent
Premier passage sur un agent → tooltip ou modale 3 étapes :
1. Quel input fournir
2. Exemple de demande
3. Exemple de livrable
