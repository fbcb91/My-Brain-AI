# Flows — wireframe e UX dell'MVP

> Versione 0.1. Wireframe ASCII delle schermate principali e dei flussi
> dell'MVP. Da iterare prima di passare al design visivo in Figma.
>
> Riferimenti: vedi `vision.md` (scope), `stack.md` (iOS-first nativo,
> SwiftUI), `heritage.md` (sezione Heritage in dettaglio).

## 1. Information architecture

App a **3 tab**, conformi alle convenzioni iOS.

```
┌─────────────────────────────────┐
│                                 │
│         (contenuto)             │
│                                 │
├─────────────────────────────────┤
│   Today      Memory      You    │
│    [○]        [◇]        [○]    │
└─────────────────────────────────┘
```

| Tab    | Funzione |
|--------|----------|
| Today  | Capture (voce + testo) + timeline cronologica, landing all'avvio |
| Memory | Chat conversazionale con la propria memoria, con citazioni |
| You    | Profilo, Heritage, privacy, export, abbonamento |

## 2. Onboarding — 5 step

Obiettivo: l'utente prova il **loop completo** (capture → chat) entro il
quinto schermo. Il magic moment è lo step 3.

### Step 1 — Welcome + promise

```
┌─────────────────────────────────┐
│                                 │
│            Niklaus              │
│                                 │
│     Your memory. That talks     │
│            back.                │
│                                 │
│                                 │
│   Your data is yours. Forever.  │
│   Even after you.               │
│                                 │
│   No ads. No selling data.      │
│   Export anything, anytime.     │
│                                 │
│                                 │
│         [Begin →]               │
└─────────────────────────────────┘
```

### Step 2 — Why are you building this?

```
┌─────────────────────────────────┐
│  ← Why are you here?            │
│                                 │
│  Choose one. We'll personalize. │
│                                 │
│  ○  For myself, in 30 years     │
│  ○  For my children             │
│  ○  For someone I love          │
│  ○  I'm just curious            │
│                                 │
│  [Skip]                         │
│                                 │
│  [Continue →]                   │
└─────────────────────────────────┘
```

Skippable, ma l'opzione scelta personalizza i prompt successivi e il tono
delle Daily Question dei primi 30 giorni.

### Step 3 — First capture (magic moment)

```
┌─────────────────────────────────┐
│  Talk to Niklaus.               │
│                                 │
│  Tell me something you want     │
│  to remember.                   │
│                                 │
│  Anything — a thought, a        │
│  feeling, something that        │
│  happened today.                │
│                                 │
│                                 │
│         ╭──────────╮            │
│         │    ◉     │            │  ← Hold to record
│         ╰──────────╯            │
│                                 │
│         Hold to record          │
│                                 │
└─────────────────────────────────┘
```

Permesso microfono richiesto **just-in-time** al primo tocco.

Stato durante registrazione:

```
┌─────────────────────────────────┐
│                                 │
│    ● Recording  00:14           │
│                                 │
│    ▁▂▃▅▆▇▆▅▃▂▁▂▃                │  ← waveform
│                                 │
│         ╭──────────╮            │
│         │    ◉     │            │
│         ╰──────────╯            │
│                                 │
│      Release to save            │
└─────────────────────────────────┘
```

Dopo il rilascio: trascrizione live (pochi secondi), conferma rapida.

### Step 4 — First question (proves the loop)

```
┌─────────────────────────────────┐
│  Now ask Niklaus what you       │
│  just told it.                  │
│                                 │
│  Try: "What did I just say?"    │
│  ┌───────────────────────────┐  │
│  │ Tap to ask →              │  │
│  └───────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

Tap → riempie automaticamente la query → risposta di Niklaus con
citazione → l'utente ha visto il loop in <2 minuti.

### Step 5 — Done

```
┌─────────────────────────────────┐
│                                 │
│  You're all set.                │
│                                 │
│  Niklaus will be here when      │
│  you want to talk.              │
│                                 │
│  ─────────────                  │
│                                 │
│  We'll nudge you once a day.    │
│  No streaks, no guilt.          │
│  [Allow notifications]          │
│  [Not now]                      │
│                                 │
│  ─────────────                  │
│                                 │
│  Free for your first 50         │
│  memories.                      │
│                                 │
│  [Start using Niklaus →]        │
└─────────────────────────────────┘
```

Permesso notifiche just-in-time qui. Pricing in tono soft, non aggressivo.

## 3. Today tab — landing

```
┌─────────────────────────────────┐
│  Tuesday, May 5                 │
│                                 │
│  ┌───────────────────────────┐  │
│  │       ◉                   │  │
│  │  Hold to record           │  │  ← primary action
│  │  Tap to type              │  │
│  └───────────────────────────┘  │
│                                 │
│  Today (3)                      │
│  ─────────────                  │
│  09:14  voice  · 2 min          │
│  12:30  note   · "remember to…" │
│  18:42  voice  · 45s            │
│                                 │
│  Yesterday (5)                  │
│  ─────────────                  │
│  ...                            │
│                                 │
│  Apr 28 (2)                     │
│  ...                            │
└─────────────────────────────────┘
```

Principi:
- Una sola azione primaria (record / type)
- Timeline scrollabile sotto, raggruppata per giorno
- Tap su un item → schermata dettaglio (vedi §6)

### Capture testuale

Tap su "Tap to type" apre un editor minimalista:

```
┌─────────────────────────────────┐
│  Cancel                  Save   │
│                                 │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │  (cursor)                 │  │
│  │                           │  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
│  ◉ Switch to voice              │
└─────────────────────────────────┘
```

## 4. Memory tab — chat

```
┌─────────────────────────────────┐
│  Memory                         │
│                                 │
│    What did I say about Marco   │
│    last week?                   │
│                                 │
│    Niklaus:                     │
│    On April 28 you mentioned    │
│    that Marco was stressed      │
│    about the new project.       │
│    You also said you were       │
│    proud of how he handled      │
│    the meeting on Friday.       │
│                                 │
│    ┌─────────────────────────┐  │
│    │ ▶ Apr 28, 18:42 · voice │  │  ← citation, tappable
│    │ ▶ Apr 30, 21:10 · note  │  │
│    └─────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ Ask anything...           │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### Empty state (prima query)

```
┌─────────────────────────────────┐
│  Memory                         │
│                                 │
│  Ask Niklaus anything you've    │
│  shared.                        │
│                                 │
│  Try:                           │
│  ▸ What was I worried about?    │
│  ▸ Summarize my last week       │
│  ▸ What did I say about work?   │
│                                 │
│  ┌───────────────────────────┐  │
│  │ Ask anything...           │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### Quando Niklaus non sa

```
    Niklaus:
    I don't have anything from
    you about that.
```

Mai inventare. Vincolo già in vision §4 ("onestà sui limiti dell'AI").

## 5. Memory item detail

Aperto da un tap sulla timeline (Today) o su una citazione (Memory).

```
┌─────────────────────────────────┐
│  ← April 28, 18:42              │
│                                 │
│  ▶ ━━━━━━━━●━━━━━━━━━  1:24/2:10│
│                                 │
│  Transcript                     │
│  ─────────────                  │
│  Today Marco was visibly        │
│  stressed about the new         │
│  project. I think he's worried  │
│  about the deadline. I should   │
│  check in with him tomorrow…    │
│                                 │
│  ┄┄┄┄┄┄┄┄┄                      │
│                                 │
│  Mark as private  ☐             │
│  Mark as transmissible  ☑       │
│                                 │
│  Delete  ·  Share with Niklaus  │
└─────────────────────────────────┘
```

I marker di privacy (vedi `heritage.md` §7) sono accessibili da qui per
ogni singolo item.

## 6. Daily Question

### Notifica push

```
┌─────────────────────────────────┐
│  Niklaus  · 19:30               │
│  A question for you, when       │
│  you're ready.                  │
└─────────────────────────────────┘
```

Tono: invito, non comando. Mai "you missed yesterday's question".

### Schermata della domanda

```
┌─────────────────────────────────┐
│  ✕                              │
│                                 │
│  Niklaus, Tuesday evening       │
│                                 │
│                                 │
│  "What's something you          │
│   learned this week —           │
│   about yourself?"              │
│                                 │
│                                 │
│         ╭──────────╮            │
│         │    ◉     │            │
│         ╰──────────╯            │
│                                 │
│         Hold to answer          │
│         ✏  Type instead         │
│                                 │
│                                 │
│         [Skip for today]        │
└─────────────────────────────────┘
```

Principi (vedi vision §5):
- 1 al giorno massimo
- Skip esposto come bottone normale, no ombre / disabilitazioni
- Nessuna conferma "are you sure you want to skip" — fidiamoci dell'utente
- Nessuno streak counter visibile ovunque nell'app

### Selezione domande — cenni implementativi

| Fase utente | Tipo domanda |
|---|---|
| Settimane 1–4 | Foundation (chi sei, da dove vieni, persone chiave) |
| Mese 2+ | Gap-filling (dati assenti dalla memoria) |
| Continuo | Depth (riflessione, prospettiva, sensoriale) |
| Reattivo | Basato su temi emersi nei capture recenti |

Spec di selezione algoritmica → futuro `docs/daily-questions.md`.

## 7. You tab

```
┌─────────────────────────────────┐
│  You                            │
│                                 │
│  ●  Marco Rossi                 │
│     Free plan · Upgrade →       │
│                                 │
│  ─────────────                  │
│  Heritage                       │
│  ▸ Designate heirs              │
│  ▸ Heritage preferences         │
│  ▸ Time-locked messages         │
│                                 │
│  Privacy                        │
│  ▸ Export all my data           │
│  ▸ What Niklaus can see         │
│  ▸ Encryption details           │
│                                 │
│  Account                        │
│  ▸ Subscription                 │
│  ▸ Sign out                     │
│  ▸ Delete account               │
│                                 │
│  ─────────────                  │
│  About Niklaus  ·  Support      │
└─────────────────────────────────┘
```

### Export — flusso

Un tap, zero frizione. Coerente con il principio "data ownership reale".

```
┌─────────────────────────────────┐
│  ← Export                       │
│                                 │
│  Get everything you've ever     │
│  shared with Niklaus, in plain  │
│  formats.                       │
│                                 │
│  Includes:                      │
│  ✓ All audio files (M4A)        │
│  ✓ All transcripts (Markdown)   │
│  ✓ All notes (Markdown)         │
│  ✓ Metadata (JSON)              │
│  ✓ Heritage preferences (JSON)  │
│                                 │
│  Estimated size: ~340 MB        │
│                                 │
│  [Generate export →]            │
│                                 │
│  Free, always. No questions.    │
└─────────────────────────────────┘
```

### Heritage

UI già specificata in `heritage.md` §9.

### Paywall (triggered)

Trigger: l'utente ha consumato i 50 capture free, oppure tenta di
accedere a feature paid (memoria oltre 30 giorni, voice clone in fase 2,
ecc.).

```
┌─────────────────────────────────┐
│  ✕                              │
│                                 │
│  You've built something         │
│  meaningful.                    │
│                                 │
│  Keep going with Niklaus.       │
│                                 │
│  ─────────────                  │
│                                 │
│  Personal       €9.99 / month   │
│  Unlimited memories             │
│  All your data, all the time    │
│  [Choose Personal]              │
│                                 │
│  Legacy        €19.99 / month   │
│  Everything in Personal         │
│  + heir designation             │
│  + time-locked messages         │
│  + advanced E2E backup          │
│  [Choose Legacy]                │
│                                 │
│  Yearly: save 20%               │
└─────────────────────────────────┘
```

Tono: nessun urgency artificiale, nessun "limited offer", nessun
countdown. Coerente con un prodotto premium.

## 8. Strategia permessi (just-in-time)

| Permesso        | Richiesto a |
|-----------------|-------------|
| Microfono       | Step 3 onboarding (primo capture vocale) |
| Notifiche       | Step 5 onboarding (con explainer "no streaks, no guilt") |
| Speech Recognition | Implicito con Apple Speech (no popup) |
| Camera          | Solo se mai necessario (post-MVP) |
| Health          | Mai in MVP |

Mai chiedere tutti i permessi all'avvio — pattern noto per perdere il 40%
degli utenti.

## 9. Tone of voice

Niklaus parla così:

✅ "What was I worried about last week?"
✅ "On April 28 you mentioned…"
✅ "I don't have anything from you about that."
✅ "Tell me when you're ready."

❌ "I'm here for you 💙" (troppo Replika)
❌ "Your AI assistant is ready" (troppo Copilot)
❌ "How are you feeling today, Marco?" (intrusivo all'avvio)
❌ "You've been quiet — everything OK?" (passivo-aggressivo)
❌ "Streak: 7 days 🔥" (gamification, vietato)

**Principio**: Niklaus è presente, sobrio, mai invadente. Come un buon
amico che ti ricorda le cose senza fare il santone.

### Default linguistici

- Lingua: inglese (vedi vision §10)
- Stile: frasi brevi, attive, prima persona ("I don't know", non "Niklaus
  doesn't know")
- Date sempre con riferimento naturale ("April 28" non "2026-04-28")
- Numeri arrotondati nelle interazioni casuali, esatti nei dettagli

## 10. Domande aperte di UX

1. **Onboarding — selezione iniziale dell'avatar/voce di Niklaus?**
   Maschile / femminile / neutro? Una sola voce per ora? Decisione di
   brand prima che di UX.
2. **Capture vocale: limite di durata?**
   Hard cap a 5 min? Auto-pausa con resume? Indicazione visiva del
   limite?
3. **Risposte di Niklaus: streaming token o wait-then-show?**
   Streaming sembra più vivo ma può sembrare incerto. Da testare.
4. **Preview audio nella timeline**: scrubbing inline o solo da detail?
5. **Apertura rapida**: shortcut da Lock screen o widget per capture in
   <3 tap? Critico per la promessa "non perdere il pensiero".
6. **Onboarding step 2 — opzione "Other / I'll decide later"**?
   Aggiungerla o costringere a una scelta tra le 4 + Skip?
