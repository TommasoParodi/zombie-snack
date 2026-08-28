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
index.html              markup: canvas, D-pad/pulsanti touch, legenda comandi desktop
css/style.css           layout "cabinato" (desktop) + skin "Game Boy" (mobile)
js/firebase-config.js   0) configurazione del progetto Firebase (per js/scores.js), caricato
                        insieme all'SDK Firebase (CDN, build "compat") prima di tutto il resto
js/sprites.js           1) SPRITES (mappe di caratteri), CHARACTERS, palette, drawSprite/drawSpriteTinted
js/input.js             2) Input: astrae tastiera + touch dietro azioni logiche condivise
js/entities.js          3) costanti mondo di gioco, classi Player/Projectile/Zombie/Particle/FloatingText
js/boss.js              3.4) classe Boss + bossConfigForLevel(level) — entita' di fine livello,
                        riusa SPRITES.zombie/drawSprite, entita' core non un monkeypatch
js/scores.js            3.5) modulo `Scores`: salva i punteggi su Firestore (fallback localStorage)
js/game.js              4) oggetto `game`: state machine, spawn, collisioni, punteggio, disegno, avvio (game.init())
```

Persistenza dei punteggi: vedi `docs/punteggi-persistenza.md` per architettura, percorso
decisionale e istruzioni di setup del progetto Firebase.

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
`game.state` e' una stringa: `menu -> playing -> (paused | confirmQuit) -> enterName -> gameover ->
menu`, con un ramo secondario `playing -> levelClear -> (playing [livello successivo] | menu)` per
il sistema di livelli (vedi sezione dedicata sotto). Lo stato `enterName` si inserisce tra la morte
del giocatore (`endGame()`) e la normale schermata di game over: mostra un selettore di nickname
stile arcade a 3 caselle (`updateEnterName`/`drawEnterName`, costante `NAME_CHARSET`), poi salva il
punteggio (o lo salta) tramite `Scores.save()` (vedi `js/scores.js` e
`docs/punteggi-persistenza.md`) prima di passare a `"gameover"`. **`enterName`/`gameover` restano
riservati alla sola morte del giocatore**: il sistema di livelli non li tocca mai, anche quando la
run continua per molti livelli. `game.update()` fa uno switch sullo stato e delega a
`updateMenu()`/`updatePlaying()`/`updateEnterName()`/inline per gli altri; `game.draw()` fa lo
stesso per il disegno (`drawMenu`, `drawWorld`+`drawHud`, `drawPause`, `drawConfirmQuit`,
`drawEnterName`, `drawLevelClear`, `drawGameOver`). Aggiungere un nuovo stato = aggiungere un case
in entrambi gli switch, piu' l'eventuale funzione `drawX`/`updateX`.

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
`CHARACTERS` (`sprites.js`) e' un array di oggetti dati: `size` (`w`/`h` in pixel di gioco),
`sprites` (nomi delle chiavi in `SPRITES` per le tre pose: `stand`/`crouch`/`jump`), palette
dell'eroe, e config del proiettile (`sprite`, `palette`, `speed`, `gravity`, `damage`, `cooldown`,
`bounces`, `life` opzionale, `melee` opzionale, `reach` opzionale). `Player` legge `size`/`sprites` per dimensioni e
disegno (vedi `Pruzzo`, piu' alto degli altri con sprite dedicati `heroTall*`); `Player.attack` e
`Projectile` leggono solo la config del proiettile, senza logica specifica per personaggio. `life`
(frame prima che il proiettile sparisca da solo) e `melee: true` sono quello che rende il pugno di
Pruzzo un attacco corpo a corpo invece di un lancio: con `melee` il `Projectile` ignora `vx`/`vy`/
`gravity`/`bounces` e ogni frame si riancora a una posizione fissa rispetto al proprietario
(`Projectile.anchorX/anchorY`, calcolati alla creazione), restando "attaccato" al personaggio
invece di attraversare lo schermo. `reach` (in `Player.attack`) allontana il punto di comparsa
dell'arma dal corpo — per Pruzzo simula un braccio lungo che colpisce piu' distante. Per le armi
`melee`, `Projectile.drawArm()` disegna il braccio come un semplice rettangolo pieno (colore
`palette.s`, la pelle) tra il bordo del corpo del proprietario e il pugno: non e' uno sprite a
mappa di caratteri perche' la sua lunghezza cambia con `reach`/la posizione, non e' una forma
fissa. Un altro flag generico e' `pierce: true` (letto in `game.resolveCollisions`, `game.js`): un
proiettile "pierce" non sparisce al primo zombie colpito, continua a danneggiare chiunque entri nel
suo raggio finche' resta attivo (`config.life`), un solo colpo a testa (tracciato in
`projectile.hitZombieIds`, popolato solo se `config.pierce`). Usato dagli abbaglianti di Luca90
(`js/luca90.js`): li' il proiettile e' anche "anchorato" all'auto come il pugno di Pruzzo, ma con
un `Projectile.prototype.update`/`draw` dedicato (stesso schema del "whip" di Boledj in
`boledj.js`) che lo ridisegna ogni frame come un rettangolo largo `reach` invece di un piccolo
sprite fisso, per rappresentare un fascio di luce che copre un'area invece di un punto. Stesso
schema anche per `EB` (`js/eb.js`, riusa pero' lo sprite umanoide condiviso `hero`/`heroCrouch`/
`heroJump` di Berto/Tommen, nessuna forma nuova): il suo telefono (`config.boomerang: true`) vola
in avanti fino a `reach`, poi torna verso il proprietario invece di sparire, sempre con `pierce`
per colpire chiunque incontri andata e ritorno. L'azione logica resta `attack` (non "lancio"): l'input,
l'etichetta dei comandi (`index.html`) e la barra di ricarica sono generici, la differenza fra
"lanciare" e "colpire" sta solo nella config del proiettile. Per aggiungere un personaggio: nuovo
oggetto in `CHARACTERS` (+ nuovo/i sprite in `SPRITES` se serve una forma o un oggetto nuovo da
lanciare). Stesso principio per `ZOMBIE_TYPES` in `entities.js` (velocita'/vita/punti/scala/palette).

Un personaggio non deve avere per forza le proporzioni umanoidi di `hero`/`heroTall`: `LUCA90`
(`js/luca90.js`) e' un carretto/macchinetta per bambini con Luca90 seduto dentro, testa e spalle
visibili sopra la carrozzeria (`size: {w:16,h:9}`, piu' largo e basso dei personaggi umani).
`Player.hitbox` (in `entities.js`) usa `Math.min(9, this.h)` per l'altezza da accovacciato proprio
per restare corretto anche con personaggi gia' piu' bassi di 9px: se aggiungi un personaggio ancora
piu' basso non serve toccare altro, la formula si adatta da sola.

### Super attacco a carica (pattern Silvia/Luca90/Fabio)
Alcuni personaggi hanno, oltre all'attacco base, un "super" attivabile con l'azione `super` (tasto
Y) quando una barra di carica e' piena: Silvia (`js/silvia.js`, SENAPE), Luca90 (`js/luca90.js`,
INQUINAMENTO) e Fabio (`js/fabio.js`, CAMERA D'ARIA — una gomma che vola in avanti e poi scoppia in
un'onda circolare) lo implementano ciascuno nel proprio file, con lo stesso pattern duplicato
volutamente (coerente con lo stile "un file per personaggio" del progetto, vedi `js/boledj.js` per
un esempio di personaggio con arma custom ma senza super): campo dati `character.super`
(`max`/`hitCharge`/`killBonus`), `player.superCharge`/`player.superReadyFlash` (inizializzati per
*ogni* personaggio dal patch di `game.startGame` in `silvia.js`, quindi riusabili da chi arriva
dopo senza reinizializzarli), `Player.prototype.addSuperCharge` esteso in catena (ogni file cattura
la versione precedente come `base...` e la richiama prima di aggiungere il proprio ramo per il
proprio `character.id`), una classe effetto dedicata (`MustardJarEffect`/`PollutionCloud`/
`TireBurstEffect`) con `update()`/`draw()`/`hitbox`, e i soliti wrap in catena di
`game.updatePlaying`/`game.drawWorld`/`game.drawHud`/`Player.prototype.draw`/
`Player.prototype.update`/`Zombie.prototype.takeDamage`/`game.registerKill` (ognuno cattura
`base...` = versione corrente della funzione, la richiama, poi aggiunge il proprio comportamento
solo se `character.id` corrisponde). Aggiungere un altro personaggio con super = nuovo file che
segue lo stesso schema, caricato dopo `game.js` in `index.html`. Ognuna delle tre classi effetto
infligge anche danno **parziale** (non insta-kill) a `game.boss` quando presente, tramite
`character.super.bossDamage` — il boss e' fuori da `game.zombies` (vedi sezione "Sistema di
livelli e boss" sotto), quindi ogni effetto lo controlla a parte con un flag `hitBoss` per non
applicare il danno piu' volte se resta a contatto per piu' frame.

### Sistema di livelli e boss
Il gioco e' a livelli **infiniti**: `game.level` (parte da 1, incrementato in `nextLevel()`),
`game.levelKills` (uccisioni nel livello corrente, azzerate ad ogni livello) e
`game.levelKillsToSpawnBoss` (soglia che cresce col livello, `20 + (level-1)*8`) determinano
quando `updatePlaying()` chiama `spawnBoss()`. Il boss (`js/boss.js`, classe `Boss` +
`bossConfigForLevel(level)`) **non entra in `game.zombies`**: e' un campo singolo dedicato
(`game.boss`, istanza o `null`) con collisione esplicita separata in `resolveCollisions()`
(proiettili-vs-boss e boss-vs-player, blocchi paralleli a quelli dei normali zombie invece di
generalizzare l'array condiviso — coerente con lo stile del progetto, un'entita' con una sola
istanza alla volta e semantica diversa da uno zombie usa-e-getta non vale un'astrazione).

Aspetto: dato che i livelli sono infiniti non si disegna un boss unico per livello, si ruota su un
**roster fisso di 4 aspetti** (`BOSS_ROSTER` in `js/boss.js`: Colosso/Testone/Corazzato/Falce, ognuno
con `{name, sprite, palette}`), scelto ciclicamente in `bossConfigForLevel(level)` con
`(level-1) % BOSS_ROSTER.length` — stesso principio di varieta' con un set finito gia' usato da
`ZOMBIE_TYPES`. Tutti e 4 restano sulla griglia 10x14 di `SPRITES.zombie` (Colosso la riusa
com'e', gli altri tre sono forme nuove, Corazzato riusa testa/gambe di `SPRITES.zombie` e cambia
solo il torso) cosi' `Boss.w`/`Boss.h` non hanno bisogno di sapere quale aspetto e' in uso.
Aggiungere un quinto aspetto = una nuova voce in `BOSS_ROSTER` (+ eventuale nuovo sprite 10x14),
nessun'altra modifica. Il boss ha una firma compatibile con `Zombie` (`hitbox`, `takeDamage`,
`type.points`) cosi' puo' passare per `game.registerKill`/`spawnGore`/`spawnImpact` senza
modificare quelle funzioni. Fasi di `Boss.update()`: entra da un bordo verso il centro
("entering"), poi pattuglia avanti e indietro senza mai uscire dai bordi ("patrol", zona
`patrolMinX`..`patrolMaxX`), con cariche periodiche verso il giocatore ("charge") ed evocazione
di zombie "walker" di rinforzo (`summonInterval`/`summonCount`, entrambi scalati per livello).
Mentre `game.boss` e' presente, `updateSpawning()` sospende lo spawn normale (`if (this.boss)
return;`): il boss evoca da solo i propri rinforzi.

Alla morte del boss, `updatePlaying()` chiama `completeLevel()`: calcola `game.levelPerfect`
confrontando `this.player.lives` con `game.livesAtLevelStart` (**si azzera ad ogni livello**, non
e' "nessuna vita persa nell'intera run" — coerente con uno "stage clear perfetto" arcade
classico), poi passa allo stato `"levelClear"` (`drawLevelClear()`: resoconto in stile Metal
Slug — personaggio disegnato grande e vincitore, testo pomposo/ironico, statistiche di run
`this.kills`/`this.score` gia' esistenti, "PERFECT" se applicabile). Da li' `confirm`/`jump` va a
`nextLevel()` (stessa run, punteggio/vite/personaggio invariati, difficolta' piu' alta), `back`/
`dodge` torna al menu (stesso comportamento di uscita di `confirmQuit`, nessun salvataggio —
quello resta riservato a `enterName`/morte del giocatore).

Due dettagli non ovvi, utili se si tocca questa logica:
- `game.livesAtLevelStart` parte a `null` in `startGame()` invece del valore reale delle vite, e
  viene catturato pigramente al primo frame di `"playing"` in `updatePlaying()`. Motivo:
  `character-lives.js` fa il wrap di `startGame()` e sovrascrive `this.player.lives` col valore
  per personaggio **dopo** aver chiamato la versione base — catturarlo dentro `startGame()`
  leggerebbe ancora il default del costruttore `Player` (3), non le vite reali del personaggio
  scelto (5 per Berto/Tommen/Pruzzo).
- `nextLevel()` azzera anche `this.frame`: la rampa di difficolta' a tempo di `updateSpawning()`
  (quella preesistente, gia' presente prima del sistema di livelli) satura dopo ~2 minuti;
  azzerarla ad ogni livello la fa ripartire, cosi' il bonus di difficolta' legato a `game.level`
  (sommato alle stesse tre formule: intervallo di spawn, soglie di sblocco runner/brute,
  `speedBonus`) resta percepibile fin dai primi secondi di ogni livello invece di diventare quasi
  l'unico fattore dopo i primi minuti di gioco.

### Selezione personaggio a carosello
`drawMenu()`/`updateMenu()` in `game.js` non assumono mai un numero fisso di personaggi: mostrano
una sola carta centrata per `CHARACTERS[game.selectedCharacter]`, con `game.prevCharacter()` /
`game.nextCharacter()` che scorrono con wraparound (`(i ± 1 + n) % n`). Frecce `<`/`>` e i puntini
di posizione sotto la carta si disegnano solo se `CHARACTERS.length > 1`. Input: `left`/`right`
(tastiera o croce touch) scorrono, `confirm`/`jump` (o tap al centro dello schermo) confermano; sul
canvas, il terzo sinistro/destro dello schermo scorre il carosello, il terzo centrale conferma
(vedi `handleClick`). Aggiungere un personaggio a `CHARACTERS` non richiede **nessuna** modifica a
questa logica: il carosello si adatta da solo a qualunque lunghezza dell'array.

### Personaggio segreto (pattern CAROTA)
`CAROTA` (`js/carota.js`) non e' in `CHARACTERS` di default: essendo il carosello puramente
"lunghezza dell'array" (vedi sopra), basta NON pushare il personaggio finche' non e' sbloccato
perche' resti invisibile, senza toccare `drawMenu`/`updateMenu`/carosello. Lo sblocco vale solo per
la sessione corrente (flag `carotaUnlockedFlag` in memoria, **non** `localStorage`: si azzera a
ogni ricaricamento della pagina, va rifatto ogni volta) e si ottiene completando, nello stato
`"menu"`, la sequenza segreta (`CAROTA_SEQUENCE`, array di azioni `up`/`down` da inserire in ordine
— `up`/`down` non sono usati da `updateMenu()` base, quindi liberi per questo) tracciata in un
buffer a scorrimento dentro un wrap di `game.updateMenu`. Un wrap di `game.drawMenu` mostra un
riquadro "PERSONAGGIO SBLOCCATO!" per `game.carotaUnlockFlash` frame quando lo sblocco avviene.
Aggiungere un altro personaggio segreto = stesso schema in un nuovo file (flag e sequenza propri).

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
