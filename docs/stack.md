# Stack tecnico — Niklaus

> Versione 0.1 — stack di partenza per l'MVP. Scelte rivedibili man mano
> che il prodotto evolve.

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
