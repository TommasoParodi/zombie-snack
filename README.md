# 🧟 Zombie Snack — Ermit Edition

**Zombie Snack** è un survival retro in pixel art in cui persone discutibilmente qualificate affrontano orde di zombie usando armi ancora più discutibili. Questa è l'edizione scherzosa "griffata" [Ermit](https://www.ermit.it/), colori compresi.

🎮 **Gioca qui:** https://tommasoparodi.github.io/zombie-snack/

L'obiettivo è semplice: **restare vivo, fare punti, superare i livelli e trasformare il cimitero in un disastro organizzato**.

## Gli eroi

| Personaggio | Arma | Perché sceglierlo |
| --- | --- | --- |
| **Berto** | ☕ Tazze di caffè | Spara veloce e senza troppe domande. Ottimo se il piano è "più caffeina, meno zombie". |
| **Tommen** | 🦆 Paperelle | Le paperelle fanno male, rimbalzano e rendono ogni combattimento inspiegabilmente più elegante. |
| **Pruzzo** | 👊 Pugni | Niente proiettili, niente compromessi. Se uno zombie è abbastanza vicino, è già un problema suo. |
| **Silvia** | 🥔 Gnocchi alla romana | Raffiche leggere e veloci. Quando carica la super, arriva un **barattolo gigante di senape** che travolge gli zombie. |
| **Boledj** | 🎣 Canna da pesca + pesce | Usa un pesce come frusta: gittata lunga e possibilità di colpire più zombie con una singola pescata molto poco sportiva. |
| **Luca90** | 🚗 Abbaglianti | Da una macchinina per bambini spara un fascio di luce che attraversa gli zombie. Super: **INQUINAMENTO**, una nube nera che resta in zona e fa piazza pulita. |
| **EB** | 📱 Telefono a boomerang | Lancia lo smartphone, che colpisce all'andata e al ritorno. Finalmente un buon motivo per stare sempre al telefono. |
| **Fabio** | 🛞 Pneumatici | Lancia gomme rimbalzanti. Super: **CAMERA D'ARIA**, con esplosione e onda d'urto circolare. |
| **Dario** | 🏐 Palloni da pallavolo | Tiri rapidi e rimbalzanti. Nessuna super: solo pallavolo ostile. |

### Personaggio segreto

C'è anche **CAROTA**, armato di CID. Non compare normalmente nel carosello: va sbloccato nel menu con una combinazione segreta e resta disponibile solo per la sessione corrente.

## Come si gioca

Muoviti, salta, schiva e attacca mentre gli zombie diventano sempre più frequenti e aggressivi.

Su **PC**:
- `←` `→` / `A` `D` — muoviti
- `SPAZIO` / `W` — salto (anche doppio)
- `↓` / `S` — abbassati
- `X` / `SHIFT` — scatto invulnerabile
- `F` / `J` — attacca
- `Y` — super, quando il personaggio ne ha una e la barra è carica
- `P` — pausa
- `ESC` — esci dalla partita

Su **telefono** il gioco diventa una piccola console portatile con croce direzionale e pulsanti **A / B / X / Y**.

## Livelli e boss

La partita è divisa in **livelli consecutivi**. Nel primo livello, dopo **20 zombie eliminati**, arriva il boss. Nei livelli successivi bisogna sopravvivere a ondate più lunghe prima dello scontro finale.

Quando sconfiggi il boss:
- passi al livello successivo senza azzerare la run;
- **mantieni personaggio, vite e punteggio**;
- gli zombie iniziano a comparire più spesso e diventano più veloci;
- runner e brute iniziano ad arrivare prima;
- anche il boss cresce di vita, velocità e aggressività.

I boss ruotano tra quattro varianti — **COLOSSO, TESTONE, CORAZZATO e FALCE** — e continuano a ripresentarsi ciclicamente mentre i livelli possono andare avanti senza un limite prefissato.

Se completi un livello senza perdere vite, il gioco lo riconosce come **PERFECT**. Naturalmente il livello dopo farà del suo meglio per rovinare la soddisfazione.

## Le regole non scritte del cimitero

- Gli zombie normali vanno giù facilmente. I bestioni, molto meno.
- Le uccisioni ravvicinate fanno salire la **combo** fino a `x5`.
- Il punteggio continua durante tutta la run, anche passando di livello.
- Alcuni personaggi caricano una **super** colpendo e uccidendo zombie.
- Il record viene salvato direttamente nel browser e i punteggi possono essere registrati con un nickname arcade.
- Il gioco ha effetti sonori sintetici generati direttamente dal browser: niente file audio esterni.
- L'uso improprio di gnocchi, paperelle, caffè, pugni, senape, pesci, telefoni e pneumatici è fortemente incoraggiato.

## Sotto il cofano

Fatto con **HTML5 Canvas + JavaScript vanilla + CSS**, senza framework.

Il progetto è volutamente semplice: sprite pixel art disegnati a mano, logica di gioco in JavaScript, audio sintetico via Web Audio API e abbastanza caos da giustificare l'esistenza di una super alla senape.
