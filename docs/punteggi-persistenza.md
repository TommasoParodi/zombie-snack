# Persistenza punteggi (nickname + score globale su Firestore)

Tiene traccia del lavoro sulla feature "salva il punteggio a fine partita". Da aggiornare mano a
mano che si evolve (vedi "Note per il futuro").

## Obiettivo

Alla fine di ogni partita (non solo sui nuovi record) il giocatore puo' inserire un nickname
opzionale di massimo 3 caratteri alfanumerici, stile arcade classico (si "cicla" ogni casella con
sinistra/destra tra spazio/0-9/A-Z), e salvare il proprio punteggio in un archivio persistente,
sempre in append: nessuna entry precedente viene mai persa o sovrascritta. Dal menu (tasto `P` su
desktop, START su touch) si apre una schermata "CLASSIFICA" coi primi 10 punteggi (vedi
"Leggere la classifica" piu' sotto).

## Percorso decisionale (perche' Firestore e non altro)

Tre ipotesi valutate in ordine, ognuna scartata per un vincolo emerso via via:

1. **Mini-server Python locale** che scrive un file `scores.json` — scartata perche' l'app deve
   poter girare su **Azure Static Web Apps** restando un sito puramente statico (nessun server da
   scrivere/mantenere), vincolo che l'utente vuole tenere stringente almeno per ora.
2. **File System Access API del browser** (il gioco stesso apre/scrive un file locale, zero
   backend) — scartata perche' funziona solo su Chrome/Edge desktop e il file non e' condiviso tra
   dispositivi/browser diversi: l'utente vuole punteggi **davvero globali per tutti**.
3. **Firebase Firestore, richiamato direttamente dal client** — scelta finale. Firestore accetta
   scritture dirette dal browser (protette da *security rules* lato Google, non da un backend
   nostro), quindi non serve alcun server proprio (compatibile con hosting 100% statico) mentre
   l'archivio resta unico e condiviso in cloud (davvero globale).

## Architettura

```
index.html               <script> Firebase SDK (build "compat", da CDN) + js/firebase-config.js
                          + js/scores.js, caricati prima di js/game.js
js/firebase-config.js     configurazione del progetto Firebase (valori segnaposto finche' non
                          viene creato un progetto reale — vedi sotto)
js/scores.js              modulo Scores: Scores.save(entry) scrive un documento nella collection
                          Firestore "scores"; Scores.fetchTop(n) legge i migliori n ordinati per
                          punteggio; entrambi con fallback silenzioso su localStorage se Firestore
                          non risponde (offline, config segnaposto, security rules non allargate)
js/game.js                stati di gioco "enterName" (vedi sotto) e "leaderboard" (schermata
                          classifica, raggiungibile dal menu con l'azione "pause")
```

Nessuna build, nessun bundler, nessuna dipendenza npm: le build "compat" di Firebase sono pensate
apposta per l'uso con `<script>` classici (espongono l'oggetto globale `firebase`), coerenti con
"javascript puro, script tag classici" (vedi CLAUDE.md).

## Come creare il progetto Firebase (passo-passo)

1. Vai su [console.firebase.google.com](https://console.firebase.google.com) con un account
   Google, crea un nuovo progetto (nome libero, es. "zombie-snack").
2. Nel menu laterale: **Build -> Firestore Database -> Crea database**. Scegli **modalita'
   produzione** (non "modalita' test", che scade dopo 30 giorni) e una regione vicina.
3. Nella scheda **Regole** di Firestore, incolla le regole minime consigliate (vedi sotto) e
   pubblica.
4. **Impostazioni progetto** (icona ingranaggio) -> scorri fino a "Le tue app" -> **Aggiungi app ->
   Web** (icona `</>`). Dai un nome, non serve Firebase Hosting.
5. Copia i valori mostrati (`apiKey`, `authDomain`, `projectId`, `storageBucket`,
   `messagingSenderId`, `appId`) dentro `js/firebase-config.js`, sostituendo i segnaposto
   `"SOSTITUISCI"`.
6. Ricarica il gioco: al primo salvataggio dovrebbe comparire un documento nella collection
   `scores` (visibile in Console Firebase -> Firestore Database -> Dati).

`js/firebase-config.js` va committato nel repo una volta compilato: `apiKey`/`projectId` non sono
segreti (identificano solo il progetto), la protezione dei dati sta tutta nelle security rules,
non nel nascondere questi valori.

### Security rules consigliate

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /scores/{scoreId} {
      allow create: if request.resource.data.nickname is string
                    && request.resource.data.nickname.size() <= 3
                    && request.resource.data.score is number
                    && request.resource.data.score >= 0
                    && request.resource.data.kills is number
                    && request.resource.data.kills >= 0;
      allow read: if true;
      allow update, delete: if false;
    }
  }
}
```

Permettono la **creazione** di documenti con forma valida e la **lettura** libera (serve alla
schermata classifica, vedi sotto); modifica/cancellazione restano bloccate. **Chi ha gia' un
progetto Firebase configurato con le regole precedenti (`allow read: if false`) deve aggiornarle
manualmente nella Console Firebase** (Firestore Database -> Regole) perche' la classifica mostri i
punteggi globali invece del solo fallback locale — vedi "Leggere la classifica" sotto.

## Schema del documento Firestore (`scores/{id}`)

```json
{
  "nickname": "AB1",
  "score": 4820,
  "kills": 37,
  "character": "berto",
  "date": "<Firestore Timestamp, generato server-side>"
}
```

- `nickname`: 0-3 caratteri `[A-Z0-9]`, facoltativo (puo' essere `""`).
- `character`: uno degli `id` in `CHARACTERS` (`berto`/`tommen`/`pruzzo`/`silvia`/`boledj`), o
  `null`.
- `date`: `firebase.firestore.FieldValue.serverTimestamp()` — non ci si fida dell'orologio del
  client.
- Ogni `add()` crea un nuovo documento con ID auto-generato: e' un append naturale (nessuna
  scrittura legge/sovrascrive le entry precedenti) e crea la collection al primo salvataggio se
  non esiste ancora.

## Nuovo stato di gioco "enterName"

Si inserisce tra la morte del giocatore e la normale schermata di game over:
`playing -> endGame() -> "enterName" -> "gameover" -> menu`.

Controlli (stesse azioni logiche gia' esistenti in `Input`, nessun nuovo tasto/azione introdotto):
- `left`/`right`: cambiano il carattere della casella attiva (ciclano `NAME_CHARSET`, spazio =
  casella vuota).
- `confirm`/`jump`: confermano la casella e passano alla successiva; sulla terza, salvano
  (`Scores.save(...)`, fire-and-forget) e passano a "gameover".
- `back`/`dodge`: annullano l'inserimento in qualsiasi momento, nessun salvataggio, si passa
  comunque a "gameover".

Il vecchio record (`HIGHSCORE_KEY` in `localStorage`, mostrato in HUD/menu) resta invariato e
indipendente da questa feature.

## Nuovo stato di gioco "leaderboard" (leggere la classifica)

Raggiungibile solo dal menu iniziale, mai da altre schermate: azione `pause` (tasto `P` su
desktop, pulsante START su touch — entrambi liberi nel menu, nessun altro significato li' e mai
rimappabili, stesso principio del `back`/Esc che apre le impostazioni). Simmetrico all'angolo
"OPZIONI" gia' esistente: un secondo angolo cliccabile in alto a sinistra
(`game.LEADERBOARD_LABEL_RECT` in `js/game.js`) apre la stessa schermata anche col mouse/tocco.

`game.openLeaderboard()` imposta `game.state = "leaderboard"` e lancia
`Scores.fetchTop(10)` (fire-and-forget, come `Scores.save`): finche' la Promise non risponde,
`game.leaderboardEntries` resta `null` e `drawLeaderboard()` mostra "CARICAMENTO...". `back`,
`pause`, `confirm`/`jump` o un click qualsiasi chiudono la schermata (`closeLeaderboard()`) e
tornano al menu, nessun salvataggio coinvolto (e' solo lettura).

`Scores.fetchTop(limit)` prova prima Firestore (`orderBy("score","desc").limit(limit)`); se fallisce
(offline, config segnaposto, o le security rules non permettono ancora `read` — vedi sopra) ricade
sugli stessi punteggi salvati in locale (`localStorage`, chiave `zombie-snack-scores`), ordinati
lato client. Per questo la classifica funziona "out of the box" anche senza un progetto Firebase
reale, ma in quel caso mostra solo i punteggi fatti su quel browser, non quelli globali.

## Limiti noti

- **Nessuna autenticazione**: chiunque conosca l'app puo' scrivere punteggi via console del
  browser, bypassando il gioco vero. Le security rules validano solo la *forma* dei dati (tipi,
  lunghezza), non l'autenticita' di chi scrive. Limite accettato per un archivio punteggi casual
  senza login.
- Se `js/firebase-config.js` ha ancora i valori segnaposto (progetto non creato), ogni
  salvataggio/lettura fallisce silenziosamente e usa `localStorage` (chiave
  `zombie-snack-scores`) — comodo per sviluppare/testare i flussi "enterName"/"leaderboard" senza
  un progetto Firebase reale, ma i punteggi in quel caso restano locali al browser (non condivisi
  con nessun altro giocatore).

## Stato di avanzamento

- [x] Stato di gioco `enterName` (selettore nickname arcade a 3 caselle) implementato in
      `js/game.js`.
- [x] Modulo `js/scores.js` (Firestore + fallback localStorage) implementato.
- [x] `js/firebase-config.js` con valori segnaposto, script aggiunti a `index.html`.
- [x] Documentazione (questo file) e aggiornamento `CLAUDE.md`.
- [x] Stato di gioco `leaderboard` (schermata classifica, `Scores.fetchTop`) implementato in
      `js/game.js`.
- [ ] Creazione del progetto Firebase reale e compilazione di `js/firebase-config.js` (passo
      manuale, da fare dall'utente).
- [ ] Allargamento delle security rules del progetto Firebase reale per permettere `read` sulla
      collection `scores` (passo manuale in Console Firebase, vedi sezione "Security rules
      consigliate" — senza questo la classifica mostra solo i punteggi salvati localmente).
- [ ] Verifica end-to-end con progetto Firebase reale (vedi checklist di test nel piano di
      implementazione).

## Note per il futuro

- Eventuale hit-testing del mouse per lo stato "enterName" (oggi il click non fa nulla in quello
  stato, solo D-pad/tastiera funzionano — scelta deliberata per semplicita').
- Eventuale autenticazione anonima Firebase se lo spam di punteggi falsi diventasse un problema
  reale.
