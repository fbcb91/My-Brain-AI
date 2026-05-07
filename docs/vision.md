# Vision — Niklaus

> Documento vivo. Versione 0.2.
> Brand: **Niklaus** (codename interno precedente: *My Brain*).
> Dominio: niklaus.app. Trademark e App Store da formalizzare.

---

## 1. Cos'è in una frase

Un'app mobile che ingerisce la tua vita digitale (conversazioni, note, email,
salute, pensieri) e diventa una memoria interrogabile di te — usabile da te
oggi, e dai tuoi cari domani.

## 2. Posizionamento

**Per** chi vuole che qualcosa di sé resti — oggi come ricordo personale,
domani come eredità per chi ami.

**Niklaus è** un backup della tua memoria che parla.

**A differenza di** journaling app, AI companion o cloud storage, Niklaus
unisce ingestione continua dei tuoi dati, un modello che impara a essere te,
e un passaggio ereditario pensato fin dal primo giorno.

## 3. Promessa al cliente

> **I tuoi dati sono tuoi. Per sempre. Anche dopo di te.**

Tre parole che la racchiudono: **Tue. Per sempre. Trasmissibili.**

## 4. Principi non negoziabili

1. **Data ownership reale**
   I dati grezzi (testo, audio, foto, log) sono sempre esportabili in formato
   standard e leggibile, gratis, senza frizione, anche da utenti free.
   *Test*: un utente che cancella l'account deve poter portarsi via tutto in
   meno di 5 minuti.

2. **L'intelligenza è il servizio, i dati no**
   Il modello che parla come te, la voice clone, la memoria vettoriale
   interrogabile sono dietro abbonamento. I dati grezzi no. Distinzione
   chiara, comunicata in modo onesto.

3. **Eredità by design, non come feature**
   La trasmissione ai cari dopo la morte è progettata dal giorno 1, non
   aggiunta dopo. Designazione eredi, trigger di morte, lettere temporizzate
   sono parte del prodotto core.

4. **No ads. No vendita dati. No affiliate.**
   La nostra unica fonte di ricavo è il cliente. Qualsiasi modello che metta
   in conflitto i nostri incentivi con la sua fiducia è escluso.

5. **Privacy come architettura, non come policy**
   Cifratura E2E dove tecnicamente possibile, on-device dove sensato,
   minimizzazione dei dati che lasciano il telefono. La privacy non è una
   pagina legale, è una scelta tecnica verificabile.

6. **Onestà sui limiti dell'AI**
   Quando il modello non sa, dice "non lo so". Non inventa pensieri che il
   defunto non ha mai espresso. Non simula emozioni che non risultano dai
   dati. Soprattutto in modalità eredità.

## 5. MVP — scope iniziale

L'MVP è composto da quattro funzionalità integrate. Tutto il resto viene
dopo.

1. **Journaling vocale quotidiano**
   L'utente registra audio brevi durante la giornata. Trascrizione on-device,
   storage cifrato. Diventa il flusso primario di alimentazione della memoria.

2. **Brain dump / Quick Capture**
   Cattura veloce di idee, pensieri, cose di lavoro, "voglio ricordarmi che…".
   Testo o voce. Stesso pipeline del journaling: alimenta la memoria
   interrogabile e aiuta il modello a imparare meglio chi sei.

3. **Chat con la propria memoria**
   Interfaccia conversazionale in linguaggio naturale per interrogare tutto
   ciò che hai dato in pasto a Niklaus. Risposte ancorate ai dati, con
   citazione della fonte ("lo hai detto il 12 marzo, audio delle 18:42").

4. **Daily Question**
   Ogni giorno Niklaus pone una domanda all'utente per colmare attivamente
   i gap nella memoria e approfondire chi è. È il motore di engagement
   dell'app: risolve il "foglio bianco" che uccide le app di journaling.
   Principi: 1 domanda al giorno massimo, sempre skippabile senza guilt,
   nessuno streak, nessuna gamification. Tono: amico curioso, non
   terapeuta. Selezione progressiva: prima domande di fondazione (chi sei,
   chi ami), poi gap-filling sui dati mancanti, poi domande più profonde
   sui temi emersi.

Tutto il resto (integrazione email, salute, social, voice clone, sezione
eredi, terapia, weekly report) è esplicitamente fuori scope dall'MVP.

### Roadmap post-MVP

**Active Weekly Review** — flagship feature di fase 2, abilitata
dall'integrazione con email, calendar, chat, health, screen time.

Non un riassunto passivo ("hai parlato di X 8 volte"), ma un **mirror
attivo dei tuoi impegni**: Niklaus confronta ciò che hai detto di voler
fare con ciò che i dati mostrano che hai effettivamente fatto.

Esempi:
- *"Hai detto domenica che volevi dormire 8 ore. Media reale: 6h12.
  Le sere peggiori erano dopo riunioni con Marco."*
- *"Hai promesso a tua moglie venerdì che l'avresti chiamata di più.
  Non l'hai fatto."*

Vincolo etico fondante: **Niklaus non giudica con metriche universali.**
Riflette rispetto a *quello che l'utente stesso ha detto di volere*. Non è
"dovresti fare più sport" (wellness coach generico — escluso dal nostro
positioning), è "a marzo hai detto di voler correre 3 volte a settimana,
in queste 4 settimane stai facendo 1.2". Tono: nessun shaming, nessun
"you failed", sì "this is what I'm noticing".

Questa feature è il principale moltiplicatore di valore percepito post-MVP
e giustifica da sola la fascia Legacy.

**Conversazioni come memoria** — le chat tra utente e Niklaus *sono*
parte della memoria, non un canale separato. Le domande che fai
rivelano cosa stai cercando in te stesso; i follow-up dicono cosa ti
interessa davvero; le reazioni a una risposta ("non è quello", "ma
quando?") sono meta-feedback su quanto Niklaus ti capisce. Ogni
scambio è un mini-self-report.

Implicazioni architetturali (post-MVP):
- Ogni messaggio utente entra nel sistema di memoria (separato dai
  capture per natura, ma indicizzato e interrogabile come loro).
- Le chat recenti diventano contesto per le nuove chat — Niklaus
  ricorda di cosa abbiamo già parlato.
- Embeddings su chat + capture insieme → la retrieval pesca da
  entrambi.
- Le Daily Question si generano (anche) da pattern emersi nelle
  chat ricenti, non solo dai gap nei capture.
- Privacy: le chat sono dato sensibile come i capture, stesso regime
  di esportazione, cancellazione, cifratura, eredità.

In MVP la chat è persistita solo localmente (single rolling
conversation per utente, IndexedDB / localStorage). Da Phase 3 in
avanti diventa cloud-first, multi-conversazione e parte attiva del
modello di memoria.

## 6. Caso d'uso cuore: l'eredità digitale

Il cuore emotivo e commerciale del prodotto.

- **Motivazione duratura per l'utente**: scrivi e condividi non solo per te
  oggi, ma per qualcuno domani. Risolve il problema cronico del churn nelle
  app di journaling.
- **Tolleranza al prezzo molto più alta**: nessuno paga €20/mese per un
  diario. Molti pagano €20/mese per "lasciare una versione di sé ai propri
  figli".
- **Difendibilità nel tempo**: dopo 5-10 anni di dati dentro, non sei
  sostituibile. Il fossato non è tecnico, è temporale ed emotivo.

### Sotto-narrativa (alla Neuralink)

Allusione, non promessa: "stai costruendo qualcosa che oggi parla con i tuoi
figli — domani chissà". Il transumanesimo è uno strato implicito che attira
early adopter tech, ma non è il messaggio principale verso il pubblico
mainstream.

## 7. Modello di monetizzazione (ipotesi di partenza)

Tre tier. Numeri da validare.

| Tier      | Prezzo indicativo | Cosa offre |
|-----------|-------------------|------------|
| Free      | €0                | 50 messaggi/mese, 30 gg memoria, 1 fonte connessa, export completo sempre |
| Personal  | ~€9.99/mese       | Illimitato, memoria infinita, tutte le fonti, voice |
| Legacy    | ~€19.99/mese      | + designazione eredi, lettere temporizzate, voice clone, backup E2E avanzato |

Da valutare: piano annuale (~€70-90/anno) per ridurre frizione decisionale
sul modello stile Calm/Headspace.

## 8. Architettura tecnica — principi e scelte

Architettura **ibrida cloud-first** con traiettoria dichiarata verso
on-device. Promettiamo la traiettoria, non lo stato attuale.

| Componente                       | Dove vive    | Note |
|----------------------------------|--------------|------|
| Cattura audio + trascrizione     | On-device    | Whisper locale, dati grezzi mai in chiaro fuori dal telefono |
| Memoria recente (giorni/settimane) | On-device  | SQLite cifrato, latenza zero, funziona offline |
| Memoria long-term (vector DB)    | Cloud        | Cifratura at-rest, architettura auditabile |
| LLM principale (chat memoria)    | Cloud        | Claude / GPT, qualità irraggiungibile on-device oggi |
| LLM piccolo (suggerimenti)       | On-device    | Llama 3.2 / Phi-3 quantized |
| Voice clone (training)           | Cloud        | Richiede GPU |
| Voice clone (inferenza)          | On-device quando possibile | Latenza + privacy |

**Roadmap architetturale:**

- **Fase 1 (MVP, mesi 0–12)**: cloud-first, cifratura at-rest robusta,
  comunicazione trasparente all'utente.
- **Fase 2 (12–24 mesi)**: spostare progressivamente più inferenza on-device
  con il miglioramento dei modelli locali (Apple Intelligence, Gemini Nano).
- **Fase 3 (24+ mesi)**: tier opzionale "fully local" come differenziatore
  premium per utenti più esigenti sulla privacy.

## 9. Eredità digitale — preferenze utente

Le scelte sull'accesso post-mortem **non vivono nell'onboarding** (troppo
pesanti emotivamente per il primo contatto). Vivono in una **sezione
dedicata "Heritage Preferences"**, compilabile in qualsiasi momento.

**Default scelti** (applicati se l'utente non personalizza):

- **Accesso eredi**: pieno. Gli eredi designati possono interrogare l'intera
  memoria senza restrizioni di contenuto.
- **Filtri di contenuto**: nessuno. Niklaus non censura, non addolcisce, non
  inventa: dice la verità che risulta dai dati.
- **Onestà sui limiti**: quando il modello non sa, dice "non lo so". Mai
  inventare pensieri o emozioni non supportati dai dati.
- **Diritto all'oblio**: se l'utente in vita ha marcato contenuti come
  "privati / non trasmissibili", restano esclusi. Tutto il resto passa.

Razionale: *"se fossi un erede, vorrei sapere la verità"*. Default permissivi,
opt-in restrittivi.

L'utente può sempre, in qualsiasi momento:
- Marcare singoli contenuti come privati / non trasmissibili
- Restringere l'accesso degli eredi a finestre temporali o argomenti
- Programmare lettere/messaggi temporizzati ("apri quando mio figlio compie 18")
- Modificare gli eredi designati

## 10. Lingua e mercati

- **Lingua del prodotto**: inglese (UI, marketing, contenuti).
- **Mercati di lancio prioritari**: US, UK, Canada, Australia, paesi nordici
  (Svezia, Danimarca, Olanda, Norvegia), Germania urbana, Singapore.
- **Mercati di seconda fase**: Europa del sud (incluso Italia), Asia Pacifico,
  LatAm.
- **Compliance baseline**: GDPR (default per tutti, anche utenti non-EU),
  CCPA per California.

Razionale: prodotto pensato per mercati culturalmente aperti all'introspezione
digitale e con disponibilità a pagare per servizi premium su privacy.

## 11. Cosa NON è Niklaus

Definire cosa escludiamo è importante quanto cosa includiamo.

- **Non è un AI companion romantico** (no Replika, no character.ai)
- **Non è un assistente produttività** (no Notion AI, no Copilot)
- **Non è un social network** (i tuoi dati non sono mai condivisi pubblicamente)
- **Non è un wellness coach generico** (non vendiamo terapia, non sostituiamo
  professionisti)
- **Non vende mai dati aggregati**, nemmeno "anonimizzati"
- **Non promette trasferimento di coscienza** (allusione sì, promessa no)

## 12. Domande aperte da risolvere prima dell'MVP

Decisioni ancora da prendere.

1. **Trigger di morte**
   Come si verifica il decesso per attivare l'accesso degli eredi? Check-in
   periodico ("sei vivo?")? Conferma multipla degli eredi designati?
   Integrazione con servizi notarili o anagrafe?

2. **Verifica trademark e App Store per "Niklaus"**
   Dominio `niklaus.app` libero, search Google poco rumorosa (alcune
   sovrapposizioni con personaggi di fiction tipo *The Vampire Diaries*,
   ma basso rischio brand). Restano da verificare: trademark in classe 9
   (software) e 42 (SaaS) in EU + US, App Store / Play Store availability.

3. **Pricing — tier annuale vs solo mensile**
   Aggiungere piano annuale stile Calm/Headspace (~€70-90/anno) per ridurre
   frizione? Da validare con test di conversione.

4. **Wording delle Heritage Preferences**
   Le domande della sezione vanno scritte con cura. Valutare consulenza
   psicologica/etica per il copy.

## 13. Prossimi passi

1. Wireframe / prototipo dell'MVP (3 funzionalità: journaling vocale, brain
   dump, chat memoria)
2. Verifica trademark + App Store per "Niklaus"
3. Bozza scritta delle Heritage Preferences (domande + default)
4. Stack tecnico definito (mobile framework, vector DB, modelli)
5. Onboarding che mostri il valore in <10 minuti
