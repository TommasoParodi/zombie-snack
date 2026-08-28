// Effetti sonori sintetici arcade: nessun file audio esterno.
// Versione volutamente semplice: niente code/promesse nel percorso degli effetti.
// Su mobile l'AudioContext viene creato/sbloccato direttamente durante la prima gesture.

const AudioFX = {
  ctx: null,
  master: 0.14,

  ensure() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      this.ctx = new AudioContextClass();
    }

    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  },

  unlock() {
    const ctx = this.ensure();
    if (!ctx) return;

    // Buffer silenzioso avviato dentro la gesture: e' il metodo piu' compatibile
    // per sbloccare Web Audio su Safari/Chrome mobile senza ritardare gli effetti.
    try {
      const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = 0;
      source.buffer = buffer;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(0);
    } catch (_) {}
  },

  /**
   * `node`: destinazione opzionale al posto di `ctx.destination`. Usata da `Music` per instradare
   * ogni nota nel proprio gain node dedicato (volume/mute della musica indipendenti dagli SFX,
   * che restano sul master `this.master`), riusando `tone()`/`noise()` cosi' com'e' invece di
   * duplicare la sintesi.
   */
  tone({ freq = 440, endFreq = freq, duration = 0.08, type = "square", volume = 0.35, delay = 0, node = null }) {
    const ctx = this.ensure();
    if (!ctx) return;

    const start = ctx.currentTime + delay;
    const end = start + duration;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), end);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, this.master * volume), start + Math.min(0.012, duration / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(gain);
    gain.connect(node || ctx.destination);
    osc.start(start);
    osc.stop(end + 0.01);
  },

  noise({ duration = 0.07, volume = 0.22, delay = 0, highpass = 0, lowpass = 0, node = null }) {
    const ctx = this.ensure();
    if (!ctx) return;

    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    const start = ctx.currentTime + delay;
    const end = start + duration;

    let output = source;
    if (highpass > 0) {
      const filter = ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = highpass;
      output.connect(filter);
      output = filter;
    }
    // Il lowpass tiene il "corpo" grave del rumore per le esplosioni (senza,
    // il rumore bianco suona solo come un fruscio metallico acuto).
    if (lowpass > 0) {
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = lowpass;
      output.connect(filter);
      output = filter;
    }

    gain.gain.setValueAtTime(this.master * volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    output.connect(gain);
    gain.connect(node || ctx.destination);
    source.start(start);
    source.stop(end + 0.01);
  },

  jump() {
    this.tone({ freq: 230, endFreq: 470, duration: 0.09, type: "square", volume: 0.28 });
  },

  menu() {
    this.tone({ freq: 620, endFreq: 760, duration: 0.035, type: "square", volume: 0.18 });
  },

  select() {
    this.tone({ freq: 520, endFreq: 700, duration: 0.07, type: "square", volume: 0.28 });
    this.tone({ freq: 780, endFreq: 980, duration: 0.08, type: "square", volume: 0.24, delay: 0.07 });
  },

  attack(characterId) {
    switch (characterId) {
      case "berto":
        this.tone({ freq: 1150, endFreq: 820, duration: 0.055, type: "triangle", volume: 0.26 });
        break;
      case "tommen":
        this.tone({ freq: 390, endFreq: 260, duration: 0.08, type: "square", volume: 0.3 });
        this.tone({ freq: 520, endFreq: 430, duration: 0.05, type: "square", volume: 0.16, delay: 0.025 });
        break;
      case "pruzzo":
        this.noise({ duration: 0.045, volume: 0.3, highpass: 300 });
        this.tone({ freq: 115, endFreq: 75, duration: 0.055, type: "square", volume: 0.35 });
        break;
      case "silvia":
        this.noise({ duration: 0.08, volume: 0.2, highpass: 1300 });
        break;
      case "boledj":
        this.noise({ duration: 0.045, volume: 0.24, highpass: 1800 });
        this.tone({ freq: 900, endFreq: 260, duration: 0.07, type: "sawtooth", volume: 0.15 });
        break;
      case "luca90":
        this.tone({ freq: 1500, endFreq: 620, duration: 0.1, type: "sawtooth", volume: 0.2 });
        break;
      case "fabio":
        this.tone({ freq: 170, endFreq: 300, duration: 0.09, type: "triangle", volume: 0.35 });
        break;
      case "dario":
        this.tone({ freq: 240, endFreq: 180, duration: 0.055, type: "sine", volume: 0.38 });
        break;
      case "carota":
        this.tone({ freq: 780, endFreq: 560, duration: 0.055, type: "square", volume: 0.22 });
        break;
      default:
        this.tone({ freq: 520, endFreq: 360, duration: 0.06, type: "square", volume: 0.22 });
    }
  },

  /**
   * Scoppio in stile Metal Slug: rumore col "corpo" grave (lowpass) invece del solo
   * fruscio acuto, piu' un thump sub-bass sotto per dare peso all'esplosione. `explosionBig`
   * e' la stessa idea allungata/rinforzata per boss ed eventi importanti.
   */
  explosionSmall(delay = 0) {
    this.noise({ duration: 0.1, volume: 0.32, delay, lowpass: 1800 });
    this.tone({ freq: 150, endFreq: 45, duration: 0.12, type: "square", volume: 0.3, delay });
    this.tone({ freq: 55, endFreq: 28, duration: 0.16, type: "sine", volume: 0.22, delay });
  },

  explosionBig(delay = 0) {
    this.noise({ duration: 0.32, volume: 0.4, delay, lowpass: 1500 });
    this.noise({ duration: 0.12, volume: 0.2, delay: delay + 0.06, highpass: 2200 });
    this.tone({ freq: 130, endFreq: 32, duration: 0.34, type: "sawtooth", volume: 0.4, delay });
    this.tone({ freq: 46, endFreq: 20, duration: 0.44, type: "sine", volume: 0.36, delay: delay + 0.02 });
  },

  hit(killed = false) {
    if (killed) {
      this.explosionSmall();
    } else {
      this.noise({ duration: 0.035, volume: 0.18, highpass: 700 });
      this.tone({ freq: 220, endFreq: 160, duration: 0.035, type: "square", volume: 0.18 });
    }
  },

  /** Colpo sul boss: distinto dal colpo sui walker normali, piu' pesante. Al kill: esplosione grande. */
  bossHit(killed = false) {
    if (killed) {
      this.explosionBig();
      return;
    }
    this.noise({ duration: 0.05, volume: 0.26, highpass: 250 });
    this.tone({ freq: 180, endFreq: 85, duration: 0.07, type: "square", volume: 0.3 });
    this.tone({ freq: 62, endFreq: 40, duration: 0.09, type: "sine", volume: 0.2 });
  },

  /** Sirena d'allarme all'arrivo del boss, stile "warning" arcade: due toni alternati. */
  bossSpawn() {
    [340, 500, 340, 500].forEach((freq, i) => {
      this.tone({ freq, endFreq: freq * 1.25, duration: 0.2, type: "square", volume: 0.28, delay: i * 0.22 });
    });
    this.noise({ duration: 0.5, volume: 0.14, lowpass: 1600 });
  },

  /** Schivata: whoosh breve, distinto dal salto/attacco. */
  dodge() {
    this.noise({ duration: 0.1, volume: 0.14, highpass: 1000 });
    this.tone({ freq: 850, endFreq: 240, duration: 0.09, type: "sine", volume: 0.14 });
  },

  /** Fanfara di fine livello, arpeggio ascendente stile "mission complete" arcade. */
  levelClear() {
    [392, 494, 587, 784].forEach((freq, i) => {
      this.tone({ freq, endFreq: freq * 1.02, duration: 0.14, type: "square", volume: 0.26, delay: i * 0.09 });
    });
    this.tone({ freq: 784, endFreq: 1046, duration: 0.32, type: "triangle", volume: 0.22, delay: 0.36 });
  },

  /** Blip generico per entrare/uscire da pausa e conferma-uscita: acuto per aprire, grave per chiudere. */
  menuOpen() {
    this.tone({ freq: 420, endFreq: 640, duration: 0.05, type: "square", volume: 0.16 });
  },

  menuClose() {
    this.tone({ freq: 620, endFreq: 360, duration: 0.05, type: "square", volume: 0.16 });
  },

  hurt() {
    // Molto distinto dall'impatto sugli zombie.
    this.tone({ freq: 300, endFreq: 58, duration: 0.24, type: "sawtooth", volume: 0.55 });
    this.noise({ duration: 0.12, volume: 0.34, highpass: 180 });
  },

  super(characterId) {
    const base = characterId === "luca90" ? 105 : characterId === "fabio" ? 145 : 180;
    this.tone({ freq: base, endFreq: base * 1.5, duration: 0.18, type: "sawtooth", volume: 0.3 });
    this.tone({ freq: base * 2, endFreq: base * 3.1, duration: 0.2, type: "square", volume: 0.18, delay: 0.025 });
    this.noise({ duration: 0.11, volume: 0.18, delay: 0.04, highpass: 500 });
  },

  gameOver() {
    [330, 247, 165].forEach((freq, i) => {
      this.tone({ freq, endFreq: freq * 0.88, duration: 0.16, type: "square", volume: 0.24, delay: i * 0.13 });
    });
  },

  /** Blip per mute/unmute della musica (M): discendente quando si muta, ascendente quando si riattiva. */
  audioToggle(muted) {
    this.tone({ freq: muted ? 520 : 340, endFreq: muted ? 280 : 660, duration: 0.06, type: "square", volume: 0.2 });
  },
};

const MUSIC_MUTE_KEY = "zombie-snack-music-muted";

/**
 * Musica di sottofondo durante il livello: composizione originale (ostinato di basso +
 * stab a fiati sincopati + percussioni) ispirata al piglio "azione militare" delle BGM
 * arcade a scorrimento stile Metal Slug, non una trascrizione di un brano esistente —
 * niente file audio esterni, coerente col resto del progetto (vedi CLAUDE.md).
 *
 * Sequencer volutamente semplice (`setInterval` a passo fisso, niente clock lookahead
 * campione-per-campione): per una BGM di sottofondo il jitter e' impercettibile, e resta
 * coerente con lo stile "niente code/promesse" del resto di questo file.
 */
const Music = {
  ctx: null,
  gainNode: null,
  volume: 0.5,
  muted: localStorage.getItem(MUSIC_MUTE_KEY) === "1",
  playing: false,
  step: 0,
  stepMs: 100, // sedicesimo a 150bpm (60000/150/4)
  timerId: null,

  // Ostinato di basso in La minore, un accordo ogni ottavo (due note = 1 passo di melodia sopra).
  bassPattern: [110.0, 110.0, 130.81, 110.0, 164.81, 146.83, 130.81, 123.47, 110.0, 110.0, 130.81, 164.81, 174.61, 164.81, 146.83, 130.81],
  // Stab sincopati sopra il basso, in gran parte silenzio: danno il piglio "a fiati" senza
  // sovraccaricare il loop. null = nessuna nota in quel sedicesimo.
  leadPattern: [
    null, null, null, 440.0, null, null, null, 523.25, null, null, null, 440.0, null, null, 659.25, 587.33,
    null, null, null, 440.0, null, null, null, 523.25, null, null, null, 440.0, null, 783.99, 659.25, null,
  ],
  kickSteps: new Set([0, 4, 8, 10]),
  snareSteps: new Set([4, 12]),

  ensureGain() {
    const ctx = AudioFX.ensure();
    if (!ctx) return null;
    if (!this.gainNode) {
      this.gainNode = ctx.createGain();
      this.gainNode.gain.value = this.muted ? 0 : this.volume;
      this.gainNode.connect(ctx.destination);
    }
    return this.gainNode;
  },

  applyGain() {
    const ctx = AudioFX.ensure();
    const node = this.gainNode;
    if (!ctx || !node) return;
    const target = this.muted ? 0 : this.volume;
    node.gain.cancelScheduledValues(ctx.currentTime);
    node.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.08);
  },

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem(MUSIC_MUTE_KEY, this.muted ? "1" : "0");
    this.applyGain();
    AudioFX.audioToggle(this.muted);
  },

  start() {
    if (this.playing) return;
    if (!this.ensureGain()) return;

    this.playing = true;
    this.step = 0;
    this.tick();
    this.timerId = setInterval(() => this.tick(), this.stepMs);
  },

  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.playing = false;
  },

  tick() {
    const node = this.gainNode;
    const stepInBar = this.step % 16;

    if (this.step % 2 === 0) {
      const bassFreq = this.bassPattern[Math.floor(this.step / 2) % this.bassPattern.length];
      AudioFX.tone({ freq: bassFreq, duration: 0.16, type: "triangle", volume: 0.55, node });
    }

    const leadFreq = this.leadPattern[this.step % this.leadPattern.length];
    if (leadFreq) AudioFX.tone({ freq: leadFreq, endFreq: leadFreq * 0.97, duration: 0.13, type: "square", volume: 0.3, node });

    if (this.kickSteps.has(stepInBar)) AudioFX.tone({ freq: 62, endFreq: 38, duration: 0.13, type: "sine", volume: 0.6, node });
    if (this.snareSteps.has(stepInBar)) AudioFX.noise({ duration: 0.08, volume: 0.28, highpass: 1200, node });
    if (stepInBar % 2 === 0) AudioFX.noise({ duration: 0.03, volume: 0.1, highpass: 6000, node });

    this.step = (this.step + 1) % this.leadPattern.length;
  },
};

// Sblocco diretto durante la gesture. Listener passivi: non interferiscono col multitouch.
window.addEventListener("pointerdown", () => AudioFX.unlock(), { once: true, passive: true, capture: true });
window.addEventListener("touchstart", () => AudioFX.unlock(), { once: true, passive: true, capture: true });
window.addEventListener("keydown", () => AudioFX.unlock(), { once: true, passive: true, capture: true });

// Muta/riattiva la musica con M: tasto globale, non un'azione di Input (funziona in
// qualunque schermata, non solo durante "playing", e non ha bisogno di un pulsante touch).
window.addEventListener("keydown", (event) => {
  if (event.code === "KeyM") Music.toggleMute();
});

const baseAudioAttack = Player.prototype.attack;
Player.prototype.attack = function (currentGame) {
  baseAudioAttack.call(this, currentGame);
  AudioFX.attack(this.character.id);
};

const baseAudioPlayerUpdate = Player.prototype.update;
Player.prototype.update = function (currentGame) {
  const jumping = (Input.wasPressed("jump") || Input.wasPressed("up")) && this.jumpsLeft > 0;
  const usingSuper =
    Input.wasPressed("super") &&
    this.character.super &&
    (this.superCharge ?? 0) >= this.character.super.max;
  const dodging = Input.wasPressed("dodge") && this.dodgeCooldown === 0;

  baseAudioPlayerUpdate.call(this, currentGame);

  if (jumping) AudioFX.jump();
  if (usingSuper) AudioFX.super(this.character.id);
  if (dodging) AudioFX.dodge();
};

const baseAudioTakeHit = Player.prototype.takeHit;
Player.prototype.takeHit = function (fromX) {
  const damaged = baseAudioTakeHit.call(this, fromX);
  if (damaged) AudioFX.hurt();
  return damaged;
};

const baseAudioZombieDamage = Zombie.prototype.takeDamage;
Zombie.prototype.takeDamage = function (amount) {
  const killed = baseAudioZombieDamage.call(this, amount);
  AudioFX.hit(killed);
  return killed;
};

// Il boss e' una classe a se' (non eredita da Zombie, vedi boss.js), quindi ha bisogno
// del proprio wrap: senza questo i colpi sul boss restano muti.
const baseAudioBossDamage = Boss.prototype.takeDamage;
Boss.prototype.takeDamage = function (amount) {
  const killed = baseAudioBossDamage.call(this, amount);
  AudioFX.bossHit(killed);
  return killed;
};

const baseAudioSpawnBoss = game.spawnBoss.bind(game);
game.spawnBoss = function () {
  baseAudioSpawnBoss();
  AudioFX.bossSpawn();
};

const baseAudioCompleteLevel = game.completeLevel.bind(game);
game.completeLevel = function () {
  baseAudioCompleteLevel();
  AudioFX.levelClear();
};

// Confronta lo stato prima/dopo update() per intercettare pausa/conferma-uscita anche
// quando arrivano da tastiera/touch (che agiscono dentro lo switch di update(), non in
// funzioni dedicate come startGame/spawnBoss).
const baseAudioUpdate = game.update.bind(game);
game.update = function () {
  const prevState = this.state;
  baseAudioUpdate();
  const state = this.state;
  if (state === prevState) return;

  if (state === "paused" || state === "confirmQuit") AudioFX.menuOpen();
  else if (prevState === "paused" && state === "playing") AudioFX.menuClose();
  else if (prevState === "confirmQuit" && (state === "playing" || state === "menu")) AudioFX.menuClose();
};

// Apertura/chiusura della schermata impostazioni: stesso blip di pausa/conferma-uscita.
const baseAudioOpenSettings = game.openSettings.bind(game);
game.openSettings = function () {
  baseAudioOpenSettings();
  AudioFX.menuOpen();
};

const baseAudioCloseSettings = game.closeSettings.bind(game);
game.closeSettings = function () {
  AudioFX.menuClose();
  baseAudioCloseSettings();
};

// Riscontro tattile per un rebind/reset riuscito, riusando i preset tone() esistenti
// invece di sintetizzare un suono nuovo solo per questo.
const baseAudioApplyRebind = Input.applyRebind.bind(Input);
Input.applyRebind = function (action, code) {
  baseAudioApplyRebind(action, code);
  AudioFX.select();
};

const baseAudioCycleTouchSlot = Input.cycleTouchSlot.bind(Input);
Input.cycleTouchSlot = function (slot) {
  baseAudioCycleTouchSlot(slot);
  AudioFX.menu();
};

const baseAudioResetKeyMap = Input.resetKeyMap.bind(Input);
Input.resetKeyMap = function () {
  baseAudioResetKeyMap();
  AudioFX.select();
};

const baseAudioResetTouchMap = Input.resetTouchMap.bind(Input);
Input.resetTouchMap = function () {
  baseAudioResetTouchMap();
  AudioFX.select();
};

const baseAudioEndGame = game.endGame.bind(game);
game.endGame = function () {
  AudioFX.gameOver();
  Music.stop();
  baseAudioEndGame();
};

// Uscita dalla partita in corso senza morire (conferma-uscita, "torna al menu" da
// levelClear): anche qui la musica di livello deve fermarsi.
const baseAudioGoToMenu = game.goToMenu.bind(game);
game.goToMenu = function () {
  Music.stop();
  baseAudioGoToMenu();
};

/**
 * Iconcina altoparlante nella barra superiore dell'HUD: onde sonore se la musica e' attiva,
 * barrata (rosso) se muta. Disegnata a mano coi primitivi del canvas invece che come sprite
 * in sprites.js: e' un'icona UI minuscola legata allo stato audio, non un personaggio/oggetto
 * di gioco (sprites.js non deve conoscere lo stato di gioco, vedi CLAUDE.md).
 */
function drawMusicIcon(x, y, muted) {
  const color = muted ? "#5a5f52" : COLORS.accent;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + 2);
  ctx.lineTo(x + 2, y + 2);
  ctx.lineTo(x + 5, y);
  ctx.lineTo(x + 5, y + 8);
  ctx.lineTo(x + 2, y + 6);
  ctx.lineTo(x, y + 6);
  ctx.closePath();
  ctx.fill();

  ctx.lineWidth = 1;
  if (muted) {
    ctx.strokeStyle = COLORS.warn;
    ctx.beginPath();
    ctx.moveTo(x + 6, y - 1);
    ctx.lineTo(x + 12, y + 9);
    ctx.stroke();
  } else {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(x + 5, y + 4, 3, -0.7, 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 5, y + 4, 6, -0.55, 0.55);
    ctx.stroke();
  }
}

// Icona permanente (non solo quando muta) nella barra superiore, a sinistra dei cuoricini
// (che partono da x=308 e occupano 12px l'uno, vedi drawHud in game.js e
// CHARACTER_LIVES in character-lives.js): senza, mute/unmute non ha alcun riscontro
// visivo persistente se in quel momento non sta suonando nessuna nota. La posizione si
// calcola dal numero massimo di vite del personaggio corrente (non fissa a 3) perche'
// character-lives.js disegna cuori extra a sinistra per i personaggi a 4/5 vite: con un
// x fisso l'icona finiva sovrapposta al cuore piu' a sinistra per quei personaggi.
const baseAudioDrawHud = game.drawHud.bind(game);
game.drawHud = function () {
  baseAudioDrawHud();
  const maxLives = (typeof CHARACTER_LIVES !== "undefined" ? CHARACTER_LIVES[this.player.character.id] : null) ?? 3;
  const leftmostHeartX = GAME_W - 12 - (maxLives - 1) * 12;
  drawMusicIcon(leftmostHeartX - 18, 4, Music.muted);
};

const baseAudioPrevCharacter = game.prevCharacter.bind(game);
game.prevCharacter = function () {
  baseAudioPrevCharacter();
  AudioFX.menu();
};

const baseAudioNextCharacter = game.nextCharacter.bind(game);
game.nextCharacter = function () {
  baseAudioNextCharacter();
  AudioFX.menu();
};

// Suono di conferma personaggio, senza assumere che startGame esista sempre.
// startGame() e' anche il punto d'ingresso per (ri)avviare la musica di livello: sia dal
// menu (nuova run) sia dal game over (riprova), non solo la prima volta.
if (typeof game.startGame === "function") {
  const baseAudioStartGame = game.startGame.bind(game);
  game.startGame = function () {
    if (this.state === "menu") AudioFX.select();
    const result = baseAudioStartGame();
    Music.start();
    return result;
  };
}
