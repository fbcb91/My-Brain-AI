# Stack tecnico — Niklaus

> Versione 0.2 — stack di partenza per l'MVP. Scelte rivedibili man mano
> che il prodotto evolve.

## Le due fasi

Niklaus avrà due fasi tecniche distinte, con finalità diverse:

- **Phase 0 — PWA per testing interno e validazione** (presente)
  Una web app installabile via "Add to Home Screen" su iOS/Android.
  Velocissima da iterare, zero attrito di distribuzione, ottima per
  mettere il prodotto in mano a 10–50 testers in giorni invece che mesi.
- **Phase 1 — iOS nativo per lancio commerciale** (futuro)
  Quando il PMF è confermato, riscriviamo nativo in Swift per sbloccare
  Apple Speech on-device, Apple Intelligence, App Store distribution e
  pricing premium.

In alternativa, dopo la Phase 0 si può valutare Capacitor per wrappare
la PWA in un binario distribuibile in App Store senza riscrivere.

---

## Phase 0 — PWA (corrente)

| Componente            | Scelta |
|-----------------------|--------|
| Framework             | **Vite + React 18 + TypeScript** |
| Routing               | React Router 7 |
| Styling               | Tailwind 3 + design tokens del prototipo (paper, ink, accent burnt amber) |
| PWA                   | Manifest + service worker — install via Add to Home Screen |
| Hosting               | Cloudflare Pages (progetto separato, root `app/`) |
| Dominio               | `app.niklaus.app` |
| Auth                  | Supabase Auth (Phase 0.2) |
| DB                    | Supabase Postgres + pgvector (Phase 0.2) |
| Audio storage         | Supabase Storage |
| Voice recording       | MediaRecorder API (browser nativo) |
| Trascrizione          | Whisper API (server-side via Cloudflare Function) |
| LLM principale        | Claude (Anthropic) — server-side |
| Embeddings            | Voyage-3 |

### Cosa la PWA NON ha rispetto al native iOS

- Nessun Apple Speech on-device → trascrizione cloud (Whisper)
- Nessuna Apple Intelligence integration
- Background recording limitato (foreground capture funziona)
- Niente HealthKit
- Niente App Store / niente IAP — non monetizziamo via App Store in
  Phase 0
- Performance ML on-device ridotta — tutto cloud

Per il testing interno e la validazione di prodotto questi sono trade-off
accettabili. Per il lancio commerciale si pivota a Phase 1.

---

## Phase 1 — iOS nativo (post-PMF, deferito)

> Tutto quello che segue resta valido come piano per quando arriveremo
> al lancio commerciale, dopo aver validato il prodotto in PWA.

## Decisione strategica

**iOS-first nativo (Swift), Android in fase 2.**

Razionale:
- Target di lancio (US, UK, paesi nordici) è iOS-heavy nelle fasce paganti
- ARPU iOS 2-3x rispetto ad Android → economics MVP più favorevoli
- Apple Intelligence + Core ML danno vantaggio significativo sull'on-device ML
- Brand "privacy-first" rinforzato dalla piattaforma Apple
- Trade-off accettato: niente Android al lancio (~70% del mercato globale escluso fino a fase 2)

## Mobile — iOS

| Componente               | Scelta |
|--------------------------|--------|
| Linguaggio               | Swift 6 |
| UI                       | SwiftUI |
| Audio recording          | AVFoundation |
| Trascrizione on-device   | **Apple Speech Framework** (gratis, alta qualità inglese, integrazione nativa) |
| LLM on-device piccolo    | Apple Foundation Models (Apple Intelligence) |
| Storage locale cifrato   | SQLCipher o Core Data + encryption |
| Keychain                 | Per chiavi di cifratura client-side |
| Subscription / paywall   | StoreKit 2 + RevenueCat |
| Sign-in                  | Sign in with Apple (obbligatorio App Store) |

## Backend

| Componente               | Scelta |
|--------------------------|--------|
| BaaS                     | **Supabase** (Postgres + Auth + Storage + Edge Functions) |
| Database relazionale     | Postgres (incluso in Supabase) |
| Vector DB                | **pgvector** in Supabase (migrabile a Qdrant/Pinecone se necessario) |
| Edge Functions           | Deno — orchestrazione chiamate LLM senza esporre API key |
| Auth                     | Supabase Auth + Sign in with Apple |

## AI / LLM

| Componente               | Scelta |
|--------------------------|--------|
| LLM principale           | **Claude (Anthropic)** — Sonnet 4.6 di default, Opus 4.7 per query complesse |
| Context window           | Fino a 1M token (Opus 4.7) — adatto a memoria personale che cresce |
| Prompt caching           | Attivo da subito, riduce costi 70-90% sulle conversazioni ricorrenti |
| Embeddings               | **Voyage-3** (raccomandato da Anthropic) |
| Fallback                 | GPT-4o / Gemini via OpenRouter per resilienza |

## Memoria (RAG custom)

Architettura semplice, niente librerie opinionate (no Mem0, no Letta) in MVP.

```
Audio → Apple Speech (on-device) → Testo
  ↓
Chunking semantico + metadata (timestamp, mood, entità)
  ↓
Embedding (Voyage-3)
  ↓
pgvector (Supabase, cifrato at-rest)

Query utente:
  Retrieval ibrido (vector + keyword + temporal)
  → Reranking
  → Context injection in Claude con citazioni
```

**Summary gerarchici** generati offline (giornalieri → settimanali → mensili)
per dare a Claude contesto compresso quando il retrieval pesca lontano nel
tempo.

## Cifratura

| Livello                          | Scelta |
|----------------------------------|--------|
| At-rest server                   | Cifratura Supabase + chiavi in Vault |
| In-transit                       | TLS standard |
| Client-side contenuti sensibili  | CryptoKit (Apple) / libsodium |
| E2E completo                     | Non disponibile in MVP con cloud LLM. Roadmap, non stato attuale. |

## Infrastruttura di supporto

| Componente            | Scelta |
|-----------------------|--------|
| Error tracking        | Sentry |
| Analytics             | PostHog self-hosted (o zero analytics in MVP) |
| CI/CD                 | Xcode Cloud o GitHub Actions + Fastlane |
| Feature flags         | PostHog (incluso) |
| Pagamenti / sub       | RevenueCat (astrae App Store/Play Store) |

## Costi infrastrutturali stimati — 1.000 utenti attivi

| Voce                                    | Stima mensile |
|-----------------------------------------|---------------|
| Supabase Pro + storage/bandwidth        | ~$75 |
| Claude API (con prompt caching)         | $1.500–3.000 |
| Voyage embeddings                       | ~$200 |
| RevenueCat                              | Gratis fino $10K MTR, poi 1% |
| Sentry / PostHog                        | $30–80 |
| **Totale**                              | **~$2.000–3.500/mese** |

Pari a **~$2–3.50 di costi infra per utente attivo/mese**. Margine sano su
Personal (€9.99) e Legacy (€19.99) anche dopo App Store fee (15-30%).

## Esplicitamente fuori scope MVP

- **Voice clone** (ElevenLabs / F5-TTS): costoso, non serve a validare retention
- **Integrazioni email / health / social**: fuori scope MVP (vedi Vision §5)
- **Self-hosting / on-prem**: non in fase 1
- **Fine-tuning custom**: non necessario, RAG + Claude bastano per anni
- **Android**: fase 2

## Decisioni rivedibili

Cose dove la scelta attuale è "ok per MVP" ma da riconsiderare:

1. **pgvector vs vector DB dedicato**: pgvector va bene fino a ~10M vector.
   Oltre, valutare Qdrant (self-host) o Pinecone (managed).
2. **Apple Speech vs whisper.cpp**: scelto Apple per semplicità. Quando si
   andrà su Android servirà comunque whisper.cpp, valutare allora se
   uniformare.
3. **Claude come unico LLM**: dipendenza da Anthropic. Mitigata da fallback
   OpenRouter ma da monitorare.
4. **RAG custom vs framework**: in MVP custom è meglio. Se la complessità
   cresce, valutare Mem0 o LangChain memory modules.
