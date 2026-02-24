# Registre du Cancer — CHU Tlemcen

Application web de gestion et d'analyse pour le registre du cancer (saisie des cas, suivi, statistiques, export, workflows médicaux).

## Stack technique

- Vite
- React 18 + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (base de données + fonctions Edge)

## Prérequis

- Node.js 18+
- npm

## Installation locale

```bash
npm install
npm run dev
```

L'application démarre sur `http://localhost:8080`.

## Scripts utiles

- `npm run dev` : démarrage en développement
- `npm run build` : build production
- `npm run preview` : aperçu du build
- `npm run lint` : lint ESLint
- `npm run test` : tests Vitest

## Variables d'environnement (fonctions Supabase)

Pour les fonctions liées au traitement IA vocal, configurer :

- `AI_API_KEY`
- `AI_GATEWAY_URL` (optionnel, par défaut `https://api.openai.com/v1/chat/completions`)

## Déploiement

Le déploiement dépend de ton infrastructure cible (Vercel/Netlify/serveur interne + Supabase). Le build front est généré via :

```bash
npm run build
```
