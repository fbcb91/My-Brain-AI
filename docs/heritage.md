# Heritage — specifica di prodotto

> Versione 0.1. Specifica della sezione **Heritage** dell'app Niklaus.
> Vive nella tab **You → Heritage**, mai nell'onboarding.

## 1. Principi di design

1. **Mai in onboarding.** Le scelte sull'eredità sono emotivamente pesanti.
   L'utente le affronta quando si sente pronto, non al primo contatto.
2. **Compilabile a pezzi.** 5 sotto-aree indipendenti, ordine libero,
   tutto reversibile finché si è in vita.
3. **Tono sobrio.** Mai morboso, mai eufemistico. "After your death" è
   ammesso, "when you're gone" no.
4. **Default permissivi, opt-in restrittivi.** Coerente con il principio
   "se fossi un erede vorrei sapere la verità".
5. **Niente vincoli etici delegati all'utente quando sono inviolabili.**
   Alcune cose (no impersonificazione fraudolenta, no modifica memorie da
   parte degli eredi) sono hardcoded, non configurabili.

## 2. Architettura della sezione

```
You → Heritage
  ├─ Designate heirs
  ├─ Death verification
  ├─ Per-heir access rules
  ├─ Time-locked messages
  └─ Privacy markers
```

Ogni sotto-area ha indicatore di completamento (*not set / configured /
custom*) — informativo, non gamification.

## 3. Designate heirs

L'utente designa una o più persone che otterranno accesso al proprio
Niklaus dopo la morte.

### Dati per ogni erede

- Nome
- Email (canale di notifica e accesso)
- Relazione (testo libero: "figlio", "compagna", "fratello"…)
- Notifica al designato? Default: **sì**, l'erede riceve un'email di
  notifica al momento della designazione ("X ti ha incluso nel proprio
  Heritage Circle"). Opt-out possibile.

### Cosa fa l'erede dopo la morte

- Accede tramite link inviato all'email designata + verifica identità.
- Non ha bisogno di un account Niklaus preesistente.
- L'export completo dei dati grezzi è sempre gratuito (principio non
  negoziabile, vedi Vision §4).
- Per *parlare* con la memoria serve un abbonamento attivo (lifecycle
  vedi §7).

### Vincoli hardcoded sugli eredi (non configurabili)

- Non possono **aggiungere** memorie a nome del defunto.
- Non possono **modificare** memorie esistenti.
- Non possono **trasferire** il loro accesso a terzi.
- Non possono **vedere** la sezione Heritage Preferences (è privata).

## 4. Death verification

Il trigger di accesso degli eredi non è ancora completamente specificato
(domanda aperta — vedi Vision §12).

Direzione attuale: **doppio binario**, entrambi attivi insieme.

### A. Periodic check-in (safety net automatica)

- Notifica periodica "Are you still around?"
- Cadenza configurabile dall'utente: settimanale / mensile / trimestrale.
  Default: mensile.
- Se l'utente non risponde entro N tentativi (default: 3 nell'arco di
  60 giorni), il sistema entra in **stato "presumed inactive"**.
- A "presumed inactive" parte una notifica agli eredi: "X non ha
  risposto ai check-in. Conferma stato per attivare l'accesso."

### B. Heir-confirmed (path attivo)

- Un erede può aprire una *richiesta di attivazione* in qualsiasi momento.
- Richiede:
  - Caricamento certificato di morte (o documento equivalente locale)
  - Conferma da almeno un secondo erede designato (se ce n'è più di uno)
  - Periodo di grazia di 14 giorni in cui l'utente, se vivo, può bloccare
    la richiesta (notifica push + email)
- Se nessun secondo erede esiste, è richiesto un periodo di grazia esteso
  a 30 giorni.

### Direzione futura

Integrazione con servizi notarili / anagrafe ove disponibili. Da valutare
mercato per mercato.

## 5. Per-heir access rules

Per ogni erede designato, l'utente può specificare regole di accesso.

### Default (se non personalizzato)

- **Pieno accesso** a tutta la memoria
- **Nessun filtro** di contenuto
- **Disponibile immediatamente** dopo l'attivazione del trigger di morte

### Override possibili

- **Time gate**: accesso disponibile solo dopo una certa data o evento
  (es. "mio figlio: accesso quando compie 18 anni")
- **Topic gate**: accesso ristretto a certi argomenti (es. "fratello:
  solo memorie taggate 'famiglia'")
- **Layered release**: certi contenuti rilasciati a tappe (es. "primo
  anno: solo ricordi felici; dopo: tutto")

### Comportamento di Niklaus quando parla con un erede

**Default: terza persona.**

```
Erede: "Did dad love me?"
Niklaus: "Your father mentioned you with affection many times.
          On June 12, 2027 he said: 'sono fiero di come sta crescendo'.
          On the day of your graduation he said he was moved.
          [3 sources]"
```

**Opt-in: prima persona** — attivabile solo dall'utente *in vita*,
mai automaticamente.

```
Erede (con prima persona attiva): "Did you love me, dad?"
Niklaus: "More than I ever told you in life. The day you were born
          I wrote: 'oggi è cambiato tutto, in meglio'."
```

L'utente che attiva la prima persona deve confermare esplicitamente:
*"I want my heirs to be able to talk to a model that speaks as me.
I understand this may be emotionally powerful and that the model
remains a reflection of my data, not me."*

### Vincoli hardcoded sul comportamento del modello

- **Nessuna invenzione**: se l'erede chiede qualcosa che il defunto non
  ha mai espresso, Niklaus risponde *"I don't have anything from your
  father about that."* Mai inventare pensieri, emozioni, opinioni.
- **Citazioni sempre disponibili**: ogni risposta emotiva ha una fonte
  cliccabile. L'erede può sempre verificare.
- **No frodi**: il modello rifiuta qualunque richiesta che possa portare
  a danno economico/legale dell'erede mascherato da "volontà del defunto"
  (es. richieste di trasferimenti bancari, password, decisioni legali).
  Hardcoded.
- **Trasparenza sulla natura**: alla prima interazione, e su richiesta in
  qualsiasi momento, Niklaus chiarisce di essere una rappresentazione
  basata sulle memorie del defunto, non il defunto stesso.

## 6. Time-locked messages

L'utente in vita può registrare messaggi destinati a essere sbloccati a
condizioni specifiche.

### Trigger supportati

- **Data assoluta**: "1 gennaio 2050"
- **Età di un erede**: "quando mia figlia compie 18 anni"
- **Anniversario**: "ad ogni nostro anniversario di matrimonio"
- **Evento dichiarato**: "quando mia moglie mi raggiungerà" (richiede
  conferma successiva da un erede o sistema esterno)
- **Sblocco condizionale**: "solo dopo che mio padre sarà morto"

### Formato

- Voce o testo o entrambi
- Allegati: foto, audio aggiuntivo
- Etichetta visibile all'utente in vita ("Locked until X — for Y")

### Modificabilità

- Sempre modificabili e cancellabili dall'utente in vita.
- Una volta sbloccati e consegnati, immutabili.

## 7. Privacy markers

L'utente può marcare singoli contenuti come **non trasmissibili**.

### Granularità

- Singolo elemento (audio, nota, conversazione)
- Tag tematico (es. "lavoro confidenziale", "salute mentale")
- Finestra temporale (es. "tutto ciò che ho detto tra il 1 marzo e il
  15 maggio 2026")
- Persona menzionata (es. "tutto ciò che riguarda Marco")

### Effetto

- Esclusi da risposte agli eredi
- Inclusi nell'export grezzo dell'utente in vita
- Inclusi nell'export grezzo agli eredi **se** marcati come "private but
  transmissible in raw export only" (opt-in granulare)
- Default: privato significa privato. Non passa né come risposta né come
  export agli eredi.

### Reversibilità

- Sempre reversibile finché in vita.
- Dopo la morte, immodificabile.

## 8. Continuità abbonamento dopo la morte

| Aspetto                          | Comportamento |
|----------------------------------|---------------|
| Export grezzo dei dati           | Sempre gratuito, per sempre, agli eredi designati |
| Conversazione con Niklaus        | Richiede abbonamento attivo |
| Pagamento dell'abbonamento       | Tre opzioni (sotto) |
| Cancellazione abbonamento        | Dati conservati per finestra di grazia (12 mesi) prima dell'eliminazione |

### Opzioni di pagamento post-mortem

1. **Erede prende in carico**: paga lui/lei l'abbonamento standard.
2. **Legacy lifetime**: pagamento una tantum in vita (es. €499) che
   garantisce accesso illimitato post-mortem agli eredi.
3. **Pre-paid heritage**: l'utente paga in anticipo X anni di accesso
   per gli eredi.

Opzioni 2 e 3 da definire come parte del modello di pricing finale.

## 9. Esperienza utente — la sezione in app

```
┌─────────────────────────────────┐
│  ← Heritage                     │
│                                 │
│  Decide what happens to your    │
│  memory when you're no longer   │
│  here.                          │
│                                 │
│  You don't need to decide       │
│  everything now. Come back any  │
│  time.                          │
│                                 │
│  ▸ Designate heirs           ●  │   ← ● = configured
│  ▸ Death verification        ○  │   ← ○ = default
│  ▸ Access rules              ○  │
│  ▸ Time-locked messages      –  │   ← – = empty
│  ▸ Privacy markers           ●  │
│                                 │
│  Last reviewed: 14 days ago     │
│  [Review my settings →]         │
└─────────────────────────────────┘
```

Note di copy:
- *"Decide what happens to your memory when you're no longer here."* —
  diretto, calmo, non eufemistico.
- *"You don't need to decide everything now."* — riduce ansia da
  compilazione.
- *"Last reviewed"* — invito gentile alla revisione periodica.

## 10. Domande aperte

1. **Verifica identità degli eredi**: passport scan? KYC leggero?
   Solo email + 2FA? Trade-off frizione vs frode.
2. **Giurisdizione applicabile**: la legge sull'eredità digitale
   varia per paese. Servirà consulenza legale prima del lancio
   pubblico in EU e US.
3. **Pricing del Legacy lifetime**: €299, €499, €999? Da testare.
4. **Cosa succede se un erede non risponde mai**: dopo N anni di
   inattività, accesso devolve agli altri eredi? Si chiude tutto?
5. **Diritto di rifiutare l'eredità**: l'erede può dichiarare di non
   volere accesso. UX di questo flusso da disegnare.
6. **GDPR e dati di terzi**: la memoria del defunto include riferimenti
   a persone vive che non hanno mai consentito. Quale equilibrio tra
   diritto del defunto a trasmettere e diritto di terzi alla privacy?
   Da approfondire con consulenza legale.
