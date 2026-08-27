# CLAUDE.md

Guida di riferimento per lavorare su questo repo. **Tienila aggiornata**: quando aggiungi un
pattern nuovo, cambi l'architettura o modifichi la gestione mobile, aggiorna questo file nello
stesso commit della modifica.

## Cos'e' il progetto

Zombie Snack: platform/shooter 2D retro (pixel art), HTML5 Canvas + JavaScript puro (vanilla,
nessun framework). Nessuna build, nessuna dipendenza, nessun bundler: `index.html` si apre
direttamente nel browser e carica gli script in `<script>` tag classici (non moduli ES).

Per testare su telefono reale serve un server locale (es. `python3 -m http.server`) e aprire
l'indirizzo Wi-Fi del PC dal browser del telefono, oppure copiare la cartella sul telefono.

## Struttura dei file

L'ordine di caricamento in `index.html` e' significativo: ogni script usa globali definiti dal
precedente (nessun modulo, nessun import/export).

```
index.html          markup: canvas, D-pad/pulsanti touch, legenda comandi desktop
css/style.css       layout "cabinato" (desktop) + skin "Game Boy" (mobile)
js/sprites.js       1) SPRITES (mappe di caratteri), CHARACTERS, palette, drawSprite/drawSpriteTinted
js/input.js         2) Input: astrae tastiera + touch dietro azioni logiche condivise
js/entities.js      3) costanti mondo di gioco, classi Player/Projectile/Zombie/Particle/FloatingText
js/game.js          4) oggetto `game`: state machine, spawn, collisioni, punteggio, disegno, avvio (game.init())
```

Non spostare la logica di gioco nel file sbagliato: `sprites.js` non deve conoscere lo stato di
gioco, `entities.js` non deve disegnare la UI/HUD (quella resta in `game.js`).

## Pattern architetturali

### Coordinate di gioco vs pixel reali
Il mondo logico e' 320x180 "pixel di gioco" (`GAME_W`/`GAME_H` in `entities.js`). Il canvas reale
e' 960x540 (`SCALE = 3`, calcolato in `game.js`). Tutta la logica (fisica, hitbox, posizioni)
lavora in pixel di gioco; il disegno applica `ctx.setTransform(SCALE, 0, 0, SCALE, ...)` una volta
per frame in `game.draw()`. Il testo (`text()` in `game.js`) e' un'eccezione voluta: resetta la
transform e ridisegna a risoluzione reale per restare nitido invece di scalare i font.
`ctx.imageSmoothingEnabled = false` + CSS `image-rendering: pixelated` mantengono il look pixel-art.

### Macchina a stati del gioco
`game.state` e' una stringa: `menu -> playing -> (paused | confirmQuit) -> gameover -> menu`.
`game.update()` fa uno switch sullo stato e delega a `updateMenu()`/`updatePlaying()`/inline per gli
altri; `game.draw()` fa lo stesso per il disegno (`drawMenu`, `drawWorld`+`drawHud`, `drawPause`,
`drawConfirmQuit`, `drawGameOver`). Aggiungere un nuovo stato = aggiungere un case in entrambi gli
switch, piu' l'eventuale funzione `drawX`/`updateX`.

### Game loop
`requestAnimationFrame` ricorsivo in `game.loop()`: `update()` -> `draw()` -> `Input.endFrame()`.
Nessun timestep fisso: si assume ~60fps (le costanti di velocita'/gravita' sono tarate su quello).

### Input astratto per azione, non per tasto
`Input` espone azioni logiche (`left`, `right`, `up`, `down`, `jump`, `attack`, `dodge`, `pause`,
`confirm`, `back`) invece di tasti fisici. `KEY_MAP` in `input.js` mappa i tasti a queste azioni; i
pulsanti touch usano lo stesso nome via `data-action="..."` nell'HTML. Il resto del gioco (game.js,
entities.js) non sa mai se il comando viene da tastiera o dito: usa solo `Input.isDown(azione)`
(tenuto premuto, per movimento continuo) o `Input.wasPressed(azione)` (premuto in questo frame, per
azioni singole come salto/conferma). Quando aggiungi un nuovo comando: aggiungilo a `KEY_MAP`, poi
eventualmente un bottone con lo stesso `data-action` in `index.html`.

### Sprite come mappe di caratteri
Ogni sprite in `SPRITES` (`sprites.js`) e' un array di stringhe: un carattere = un pixel, `.` =
trasparente. La stessa forma viene ricolorata a runtime passando una `palette` diversa a
`drawSprite(ctx, sprite, x, y, palette, flip, scale)` — per questo zombie/eroi/proiettili
condividono poche forme ma tanti colori (es. `ZOMBIE_PALETTE`, `ZOMBIE_PALETTE_FAST`,
`ZOMBIE_PALETTE_BIG`). `drawSpriteTinted` disegna la stessa forma con un colore unico piatto (flash
bianco quando uno zombie viene colpito, scia bianca semitrasparente nella schivata).

### Personaggi/oggetti come configurazione dati
`CHARACTERS` (`sprites.js`) e' un array di oggetti dati: palette dell'eroe + config del proiettile
(`sprite`, `palette`, `speed`, `gravity`, `damage`, `cooldown`, `bounces`). `Player.throwProjectile`
e `Projectile` leggono solo questa config, senza logica specifica per personaggio. Per aggiungere un
personaggio: nuovo oggetto in `CHARACTERS` (+ nuovo sprite in `SPRITES` se serve un oggetto nuovo da
lanciare). Stesso principio per `ZOMBIE_TYPES` in `entities.js` (velocita'/vita/punti/scala/palette).

### Selezione personaggio a carosello
`drawMenu()`/`updateMenu()` in `game.js` non assumono mai un numero fisso di personaggi: mostrano
una sola carta centrata per `CHARACTERS[game.selectedCharacter]`, con `game.prevCharacter()` /
`game.nextCharacter()` che scorrono con wraparound (`(i ± 1 + n) % n`). Frecce `<`/`>` e i puntini
di posizione sotto la carta si disegnano solo se `CHARACTERS.length > 1`. Input: `left`/`right`
(tastiera o croce touch) scorrono, `confirm`/`jump` (o tap al centro dello schermo) confermano; sul
canvas, il terzo sinistro/destro dello schermo scorre il carosello, il terzo centrale conferma
(vedi `handleClick`). Aggiungere un personaggio a `CHARACTERS` non richiede **nessuna** modifica a
questa logica: il carosello si adatta da solo a qualunque lunghezza dell'array.

### Entita' come classi leggere con update/draw
`Player`, `Projectile`, `Zombie`, `Particle`, `FloatingText` in `entities.js`: ognuna ha `update()`
e `draw(ctx)`, un flag `dead` e (dove serve collisione) un getter `hitbox`. `game.js` le tiene in
array (`zombies`, `projectiles`, `particles`, `texts`), le aggiorna/disegna con `forEach`, e le
rimuove con `array = array.filter(x => !x.dead)` dopo la fase di collisione — mai `splice` durante
l'iterazione.

### Punteggio, combo, persistenza
Punti a tempo (1/secondo) + punti a uccisione moltiplicati dal combo (`registerKill` in `game.js`,
combo max x5, scade con `comboTimer`). High score in `localStorage` (chiave `HIGHSCORE_KEY`),
letto/scritto solo in `game.js`.

## Gestione Mobile

Il telefono non e' un layout "responsive" del cabinato: sotto una certa soglia diventa una skin
diversa, una console portatile stile Game Boy, con gli stessi elementi HTML.

- **Rilevamento**: sia CSS che JS usano la stessa media query logica: `(max-width: 820px), (hover:
  none) and (pointer: coarse) and (max-width: 1024px)`. In CSS e' su `@media`; in JS,
  `Input.init()` (`input.js`) la valuta con `window.matchMedia(...)`, tiene `Input.touch`
  aggiornato su resize/rotazione (`change` listener) e aggiunge/rimuove la classe
  `is-touch` su `<body>`. Se cambi la soglia, cambiala in **entrambi** i posti (CSS e `input.js`) o
  CSS e JS si disallineranno su alcuni tablet.
- **Stessa logica di input, controlli diversi**: il D-pad e i pulsanti A/B/SELECT/START in
  `index.html` (`#touch-pad`) hanno `data-action` con gli stessi nomi delle azioni da tastiera.
  `Input.bindTouchPad()` li collega con eventi **Pointer** (`pointerdown`/`pointerup`/
  `pointercancel`/`lostpointercapture`, con `setPointerCapture`) invece di `touchstart/end`: cosi'
  piu' dita indipendenti possono tenere premuti piu' pulsanti insieme (es. muoviti + salta), e il
  rilascio e' affidabile anche se il dito scivola fuori dal bottone.
  `game.js`/`entities.js` non contengono **nessun** ramo `if (Input.touch)` per la logica di
  gioco: la differenza tocca solo i testi mostrati (vedi `game.hint()`, che sceglie tra stringa
  tastiera e stringa touch per HUD/pause/game over).
  Quando aggiungi un comando nuovo va aggiornato sia `KEY_MAP` sia (se serve un pulsante fisico)
  l'HTML del D-pad/pulsanti.
- **Layout CSS a skin intera**: sotto la soglia mobile, `.cabinet__title` e `.legend` (legenda
  desktop) spariscono, `.touch-pad`/`.gb-speaker` compaiono, e `.handheld` prende lo sfondo/bordi
  plastica del Game Boy (variabili `--gb-*` in `:root`). Esiste anche una variante **landscape**
  separata (stessa media query + `orientation: landscape`) che dispone schermo al centro, croce a
  sinistra, A/B a destra (stile GBA) invece dello stack verticale.
- **Fullscreen "app-like" sul telefono**: `index.html` ha meta tag per comportarsi da web-app
  (`apple-mobile-web-app-capable`, `mobile-web-app-capable`, `viewport-fit=cover`,
  `user-scalable=no`). Il CSS mobile blocca lo scroll della pagina (`overflow: hidden`,
  `height: 100dvh`, `touch-action: none`, `overscroll-behavior: none`) e `Input.preventPageScroll()`
  in `input.js` chiama `preventDefault()` sui `touchmove` dentro l'area di gioco, altrimenti uno
  swipe scatenerebbe lo scroll/pull-to-refresh del browser invece di controllare il D-pad.
  `env(safe-area-inset-*)` gestisce notch/home-indicator.
- **Canvas invariato**: il canvas resta sempre 960x540 con `width: 100%; aspect-ratio: 16/9`; e'
  solo la cornice attorno (cabinato vs Game Boy) a cambiare, mai la risoluzione o la logica di
  gioco.

## Convenzioni

- Testi di gioco, commenti e README in **italiano**.
- Commenti solo dove il *perche'* non e' ovvio dal codice (vedi lo stile gia' usato nei file
  esistenti); niente commenti che ripetono cosa fa il codice.
- Nessuna dipendenza esterna, nessun build step: mantieni il progetto apribile con un doppio clic
  su `index.html`.
