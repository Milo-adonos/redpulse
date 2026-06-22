# RedPulse

Reddit marketing automation SaaS — Next.js, tRPC, Drizzle, Auth.js.

## Démarrage rapide

```bash
npm install
cp .env.example .env.local
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000)

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login` | Connexion (demo: `demo@redpulse.app` / `demo1234`) |
| `/signup` | Inscription |
| `/dashboard` | Dashboard (mode démo) |

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- tRPC v10
- Drizzle ORM + PostgreSQL
- Auth.js
- Framer Motion

## Scripts

```bash
npm run dev        # Serveur de dev
npm run build      # Build production
npm run db:push    # Pousser le schéma Drizzle
```
