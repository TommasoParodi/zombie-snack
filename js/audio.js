// Effetti sonori sintetici arcade: nessun file audio esterno.
// Il Web Audio viene sbloccato alla prima interazione e gli effetti aspettano
// che l'AudioContext sia davvero RUNNING: cosi' il primo suono non viene perso.

const AudioFX = {
  ctx: null,
  master: 0.14,
  readyPromise: null,

  ensure() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return Promise.resolve(null);
      this.ctx = new AudioContextClass();
    }

    if (this.ctx.state === "running") return Promise.resolve(this.ctx);
    if (this.readyPromise) return this.readyPromise;

    this.readyPromise = this.ctx
      .resume()
      .then(() => {
        // Warm-up silenzioso minimale: sblocca il percorso audio durante la gesture
        // senza tentare di pre-inizializzare tutte le forme d'onda (instabile su alcuni telefoni).
        const buffer = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
        const source = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();
        gain.gain.value = 0;
        source.buffer = buffer;
        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start();
        return this.ctx;
      })
      .catch(() => null)
      .finally(() => {
        this.readyPromise = null;
      });

    return this.readyPromise;
  },

  run(callback) {
    this.ensure().then((ctx) => {
      if (!ctx || ctx.state !== "running") return;
      callback(ctx);
    });
  },

  tone({ freq = 440, endFreq = freq, duration = 0.08, type = "square", volume = 0.35, delay = 0 }) {
    this.run((ctx) => {
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
    });
  },

  noise({ duration = 0.07, volume = 0.22, delay = 0, highpass = 0 }) {
    this.run((ctx) => {
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
        source.connect(filter);
        output = filter;
      }

      gain.gain.setValueAtTime(this.master * volume, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      output.connect(gain);
      gain.connect(ctx.destination);
      source.start(start);
      source.stop(end + 0.01);
    });
  },

  jump() {
    this.tone({ freq: 230, endFreq: 470, duration: 0.09, type: "square", volume: 0.28 });
  },

  menu() {
    this.tone({ freq: 620, endFreq: 760, duration: 0.035, type: "square", volume: 0.18 });
  },

  select() {
    this.tone({ freq: 520, endFreq: 700, duration: 0.07, type: "square", volume: 0.25 });
    this.tone({ freq: 780, endFreq: 980, duration: 0.08, type: "square", volume: 0.22, delay: 0.07 });
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

  hit(killed = false) {
    if (killed) {
      this.noise({ duration: 0.085, volume: 0.3, highpass: 220 });
      this.tone({ freq: 160, endFreq: 65, duration: 0.1, type: "square", volume: 0.28 });
    } else {
      this.noise({ duration: 0.035, volume: 0.18, highpass: 700 });
      this.tone({ freq: 220, endFreq: 160, duration: 0.035, type: "square", volume: 0.18 });
    }
  },

  hurt() {
    this.tone({ freq: 260, endFreq: 62, duration: 0.22, type: "sawtooth", volume: 0.48 });
    this.noise({ duration: 0.11, volume: 0.3, highpass: 180 });
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

// Sblocca l'audio alla prima vera interazione senza alterare gesture o multitouch.
const unlockAudio = () => AudioFX.ensure();
window.addEventListener("pointerdown", unlockAudio, { once: true, passive: true, capture: true });
window.addEventListener("keydown", unlockAudio, { once: true, passive: true, capture: true });

// Hook non invasivi: audio.js e' caricato per ultimo e avvolge la logica gia' esistente.
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

  baseAudioPlayerUpdate.call(this, currentGame);

  if (jumping) AudioFX.jump();
  if (usingSuper) AudioFX.super(this.character.id);
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

// Conferma della scelta: suono diverso dal semplice scorrimento del carosello.
const baseAudioStartGame = game.startGame.bind(game);
game.startGame = function () {
  if (this.state === "menu") AudioFX.select();
  baseAudioStartGame();
};
