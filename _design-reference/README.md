# Design reference

Cartella temporanea per il design Claude del prototipo Niklaus.

## Cosa metterci

Estrai lo ZIP scaricato da Claude Design e copia tutto il contenuto qui
dentro. Tipicamente:

- `index.html` (o `Landing+Page.html`)
- eventuali file CSS / JS / asset
- immagini / SVG

Struttura attesa (esempio):

```
_design-reference/
├── index.html
├── styles.css        (se presente)
├── script.js         (se presente)
└── assets/           (se presente)
    └── ...
```

## Workflow

1. Tu pushi qui i file del design
2. Io leggo i file e porto fedelmente il design nella landing Astro
   in `web/src/`
3. Quando tutto è portato, possiamo cancellare questa cartella

## Non in produzione

Questa cartella è solo riferimento di design. Non viene mai inclusa
nel deploy della landing (`web/dist/`).
