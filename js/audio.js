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

  tone({ freq = 440, endFreq = freq, duration = 0.08, type = "square", volume = 0.35, delay = 0 }) {
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
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(end + 0.01);
  },

  noise({ duration = 0.07, volume = 0.22, delay = 0, highpass = 0, lowpass = 0 }) {
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
    gain.connect(ctx.destination);
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
};

// Sblocco diretto durante la gesture. Listener passivi: non interferiscono col multitouch.
window.addEventListener("pointerdown", () => AudioFX.unlock(), { once: true, passive: true, capture: true });
window.addEventListener("touchstart", () => AudioFX.unlock(), { once: true, passive: true, capture: true });
window.addEventListener("keydown", () => AudioFX.unlock(), { once: true, passive: true, capture: true });

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

const baseAudioEndGame = game.endGame.bind(game);
game.endGame = function () {
  AudioFX.gameOver();
  baseAudioEndGame();
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
if (typeof game.startGame === "function") {
  const baseAudioStartGame = game.startGame.bind(game);
  game.startGame = function () {
    if (this.state === "menu") AudioFX.select();
    return baseAudioStartGame();
  };
}
