# Zombie Snack

Piccolo videogioco 2D in stile retro (pixel art anni '80) fatto con HTML5 Canvas e JavaScript puro.
Nessuna installazione, nessuna dipendenza: si apre direttamente nel browser.

## Come giocare

1. Apri il file `index.html` con un doppio clic (funziona con Chrome, Edge, Firefox).
2. Nella schermata iniziale scorri il carosello dei personaggi con le frecce `←`/`→` (o toccando/cliccando ai lati dello schermo) e premi INVIO (o tocca al centro) per iniziare.
3. Sopravvivi il piu' possibile eliminando gli zombie a colpi di oggetti lanciati.

Sul **telefono** la pagina diventa una console portatile stile Game Boy: usa la croce per scorrere i personaggi, tocca al centro dello schermo o premi A per iniziare, poi gioca con croce e pulsanti A/B. Per provarlo dal cellulare, apri `index.html` dal telefono (es. dalla cartella OneDrive) oppure, dal computer, avvia un server locale e apri l'indirizzo Wi‑Fi nel browser del telefono.

## Personaggi

| Personaggio | Arma            | Caratteristiche                                       |
| ----------- | --------------- | ----------------------------------------------------- |
| **Berto**   | Tazze di caffe' | Lancio rapido e teso, 1 danno, ricarica veloce        |
| **Tommen**  | Paperelle       | Lancio ad arco che rimbalza una volta, 2 danni        |

## Comandi

| Tasto           | Azione                                     |
| --------------- | ------------------------------------------ |
| `←` `→` (A/D)   | Muoviti                                    |
| `SPAZIO` / `W`  | Salta (doppio salto disponibile)           |
| `↓` / `S`       | Abbassati (riduce la hitbox)               |
| `SHIFT`         | Schivata rapida con brevi frame invincibili |
| `F` / `J`       | Lancia l'oggetto                           |
| `P`             | Pausa                                      |
| `INVIO`         | Conferma / rigioca                         |
| `ESC`           | Esci dalla partita: chiede conferma (`INVIO` per uscire, `ESC` per continuare) |

### Telefono (stile Game Boy)

| Pulsante        | Azione                                     |
| --------------- | ------------------------------------------ |
| Croce `←` `→`   | Muoviti                                    |
| Croce `↑` / `A` | Salta (doppio salto)                       |
| Croce `↓`       | Abbassati                                  |
| `B`             | Lancia l'oggetto                           |
| `SELECT`        | Schivata (in pausa: esci dalla partita)    |
| `START`         | Pausa / continua                           |

## Regole

- Hai **3 vite**. Toccare uno zombie ne fa perdere una (poi sei invulnerabile per ~1,5 s).
- Punti per zombie eliminato: **camminatore 10**, **corridore 15**, **bestione 40**.
- Uccisioni ravvicinate aumentano il **combo** (fino a `x5`) e moltiplicano i punti.
- Ogni secondo di sopravvivenza vale 1 punto.
- La difficolta' cresce col tempo: gli zombie arrivano piu' spesso e piu' veloci, da destra e da sinistra.
- Il record viene salvato nel browser (`localStorage`).

## Struttura del progetto

```
index.html          pagina con il canvas e la legenda dei comandi
css/style.css       stile cabinato (PC) e scocca Game Boy (telefono)
js/sprites.js       sprite pixel art (mappe di caratteri) e palette dei personaggi
js/input.js         tastiera + pulsanti touch (stesse azioni)
js/entities.js      classi Player, Zombie, Projectile, Particle, FloatingText
js/game.js          stati di gioco, spawn, collisioni, punteggio, disegno
```

## Come aggiungere un personaggio

Aggiungi un oggetto all'array `CHARACTERS` in `js/sprites.js` con la sua palette e la
configurazione del proiettile (`sprite`, `speed`, `gravity`, `damage`, `cooldown`, `bounces`).
Se serve un nuovo oggetto da lanciare, disegnalo come mappa di caratteri in `SPRITES`.

La schermata di selezione e' un carosello (un personaggio alla volta, con frecce e puntini di
posizione): supporta automaticamente qualunque numero di voci in `CHARACTERS`, non serve toccare
`js/game.js`.
