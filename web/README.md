# Niklaus — Landing

Landing page e waitlist. Astro + Tailwind, deploy su Cloudflare Pages.

## Sviluppo locale

```bash
cd web
npm install
npm run dev
```

## Build

```bash
npm run build
```

Output statico in `dist/`.

## Deploy su Cloudflare Pages

Configurazione consigliata:

- **Framework preset**: Astro
- **Root directory**: `web`
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Functions directory**: `functions` (rilevato automaticamente da `web/functions/`)

### Variabili d'ambiente

| Nome             | Dove                | Note |
|------------------|---------------------|------|
| `PLUNK_API_KEY`  | Cloudflare Pages    | Chiave secret di Plunk per l'invio dei contatti al waitlist |

Senza `PLUNK_API_KEY` la funzione `/api/waitlist` accetta gli indirizzi e
risponde 200 ma non li persiste — utile per test, da non lasciare in
produzione.

## Struttura

```
web/
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
├── package.json
├── public/
│   └── favicon.svg
├── src/
│   ├── env.d.ts
│   ├── layouts/
│   │   └── Layout.astro
│   ├── pages/
│   │   └── index.astro
│   └── styles/
│       └── global.css
└── functions/
    └── api/
        └── waitlist.ts
```

## Brand

- Background: `#F5F1EA` (paper)
- Foreground: `#1A1A1A` (ink)
- Muted: `#6B6661`
- Accent: `#5C4A3A`
- Serif: Cormorant Garamond
- Sans: Inter
