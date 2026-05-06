# Niklaus — App (PWA)

Web app installabile via "Add to Home Screen". Phase 0 dello stack
(vedi `docs/stack.md`). Stack: Vite + React 18 + TypeScript +
Tailwind + React Router 7.

## Sviluppo locale

```bash
cd app
cp .env.example .env.local   # poi edita con le tue chiavi Supabase
npm install
npm run dev
```

Apri `http://localhost:5174`. Per testare sul telefono nello stesso
Wi-Fi: `npm run dev` ascolta su `0.0.0.0`, prendi l'IP del Mac e
visita `http://<ip>:5174` da Safari iOS.

### Variabili d'ambiente

| Nome                      | Dove                          | Note |
|---------------------------|-------------------------------|------|
| `VITE_SUPABASE_URL`       | `.env.local` + Cloudflare Pages | URL del progetto Supabase (Project Settings → Data API) |
| `VITE_SUPABASE_ANON_KEY`  | `.env.local` + Cloudflare Pages | Anon public key dello stesso progetto |

L'anon key è progettata per essere pubblica — la sicurezza arriva
dalle policy Row Level Security in Postgres.

### Bindings Cloudflare Pages

| Nome | Tipo | Note |
|------|------|------|
| `AI` | Workers AI | Necessario per `/api/transcribe`. Senza, le trascrizioni falliscono e la UI resta su "Transcribing…" |

Da configurare nel dashboard Cloudflare → Pages → progetto **niklaus-app**
→ **Settings** → **Bindings** → **Add binding** → tipo **Workers AI**,
nome variabile `AI`. Triggera un re-deploy dopo l'aggiunta.

## Build

```bash
npm run build
```

Output statico in `dist/`.

## Deploy su Cloudflare Pages

1. Cloudflare → Workers & Pages → **Create** → connetti GitHub al repo
2. **Framework preset**: Vite
3. **Root directory**: `app`
4. **Build command**: `npm run build`
5. **Build output directory**: `dist`
6. (opzionale) Environment variables: nessuna richiesta in Phase 1
7. Aggiungi custom domain `app.niklaus.app` (CNAME automatico se il DNS è su Cloudflare)

## Installare su iPhone (Add to Home Screen)

1. Apri `app.niklaus.app` (o l'URL `*.pages.dev`) **in Safari**
   (Chrome iOS non installa PWA)
2. Tap sul pulsante condivisione (quadrato con freccia in alto)
3. Scorri e tap **"Aggiungi alla schermata Home"** / "Add to Home Screen"
4. Conferma il nome "Niklaus" e tap **Aggiungi**
5. L'icona appare in homescreen — tap apre l'app a schermo intero,
   senza barra del browser

Su Android: stesso flusso da Chrome → menu → "Installa app".

## Struttura

```
app/
├── index.html              · entry HTML con meta PWA + manifest link
├── public/
│   ├── favicon.svg         · icona "N" (placeholder per ora)
│   └── manifest.webmanifest · web manifest
├── src/
│   ├── main.tsx            · entry React + Router
│   ├── App.tsx             · routes + layout
│   ├── components/
│   │   ├── TabBar.tsx      · bottom nav fixed
│   │   └── Waveform.tsx    · waveform animata per il record
│   ├── screens/
│   │   ├── Today.tsx       · capture + timeline (UI demo)
│   │   ├── Memory.tsx      · chat con citazioni (UI demo, risposte canned)
│   │   └── You.tsx         · profilo + heritage + privacy + account
│   └── styles/
│       └── global.css      · Tailwind + base
├── tailwind.config.js
├── postcss.config.js
├── vite.config.ts
├── tsconfig*.json
└── package.json
```

## Stato Phase 1

Cosa funziona già:
- ✅ Tre tab navigabili (Today / Memory / You)
- ✅ Today: hold-to-record con waveform animata, aggiunge un item
  fittizio alla timeline al rilascio
- ✅ Memory: chat UI con risposte canned, suggested prompts, "I don't
  know" per domande senza match, citazioni cliccabili
- ✅ You: profile card, sezioni Heritage / Privacy / Account
- ✅ PWA installabile (manifest + meta tags iOS)

Cosa NON è ancora reale (Phase 0.2+):
- ❌ Niente recording vero (è UI mock)
- ❌ Niente trascrizione (manca Whisper API)
- ❌ Niente persistenza (dati in memoria, scompaiono al refresh)
- ❌ Niente auth (Supabase Auth)
- ❌ Niente chat reale (manca Claude API + RAG)
- ❌ Heritage non configurabile (placeholder)
- ❌ Daily Question non presente
- ❌ Icone PWA in PNG (solo SVG fallback — basta per testing, da
  generare per launch)

## TODO icone PWA

Il manifest attuale referenzia solo `favicon.svg`. iOS Safari
generalmente accetta SVG ma per fedeltà massima conviene generare
PNG dedicati. Quando vorremo polish:

```bash
# da un'icona sorgente 1024x1024 (es. icon.png)
brew install imagemagick
magick icon.png -resize 192x192 public/icon-192.png
magick icon.png -resize 512x512 public/icon-512.png
magick icon.png -resize 180x180 public/apple-touch-icon.png
```

E aggiornare `manifest.webmanifest` + `index.html` di conseguenza.
