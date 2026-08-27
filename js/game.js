/**
 * Logica principale: macchina a stati (menu -> gioco -> game over),
 * spawn degli zombie, collisioni, punteggio e disegno della scena.
 */

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false; // niente sfocature: look pixelato

/** Quanti pixel reali del canvas corrispondono a 1 "pixel di gioco". */
const SCALE = canvas.width / GAME_W;

const HIGHSCORE_KEY = "zombie-snack-highscore";

/** Durata (in frame, ~60 al secondo) della vibrazione quando si perde: 0,5 s. */
const DEATH_SHAKE_FRAMES = 30;

const COLORS = {
  sky: "#101823",
  skyLow: "#1d2a3a",
  ground: "#2c3b26",
  groundDark: "#1e2a1a",
  grass: "#3f6b33",
  text: "#e8f0d8",
  accent: "#7ce87c",
  warn: "#e04b3a",
};

/**
 * Scrive testo usando la risoluzione REALE del canvas (non quella di gioco):
 * cosi' le lettere restano nitide invece di essere ingrandite e sgranate.
 * Le coordinate e la dimensione sono comunque espresse in pixel di gioco.
 */
function text(str, x, y, { size = 8, color = COLORS.text, align = "left", shadow = true } = {}) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, game.shakeX * SCALE, game.shakeY * SCALE);
  ctx.font = `bold ${Math.round(size * SCALE)}px "Courier New", monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = "top";

  const px = Math.round(x * SCALE);
  const py = Math.round(y * SCALE);

  if (shadow) {
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.fillText(str, px + 2, py + 2);
  }

  ctx.fillStyle = color;
  ctx.fillText(str, px, py);
  ctx.restore();
}

const game = {
  state: "menu", // "menu" | "playing" | "paused" | "gameover"
  selectedCharacter: 0,
  character: null,
  player: null,
  zombies: [],
  projectiles: [],
  particles: [],
  texts: [],
  score: 0,
  kills: 0,
  combo: 0,
  comboTimer: 0,
  frame: 0,
  spawnTimer: 60,
  highscore: Number(localStorage.getItem(HIGHSCORE_KEY) || 0),
  stars: [],
  tombstones: [],
  screenShake: 0,
  shakeX: 0,
  shakeY: 0,

  init() {
    Input.init();
    this.buildScenery();
    canvas.addEventListener("click", (event) => this.handleClick(event));
    requestAnimationFrame(() => this.loop());
  },

  /** Stelle e lapidi di sfondo, generate una sola volta. */
  buildScenery() {
    this.stars = Array.from({ length: 45 }, () => ({
      x: Math.random() * GAME_W,
      y: Math.random() * (GROUND_Y - 60),
      bright: Math.random() > 0.6,
    }));

    this.tombstones = Array.from({ length: 6 }, (_, i) => ({
      x: 20 + i * 52 + Math.random() * 12,
      scale: Math.random() > 0.5 ? 2 : 1,
    }));
  },

  startGame() {
    this.character = CHARACTERS[this.selectedCharacter];
    this.player = new Player(this.character);
    this.zombies = [];
    this.projectiles = [];
    this.particles = [];
    this.texts = [];
    this.score = 0;
    this.kills = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.frame = 0;
    this.spawnTimer = 70;
    this.screenShake = 0;
    this.state = "playing";
  },

  /** Testo tastiera sul computer, testo touch sul telefono. */
  hint(keyboardText, touchText) {
    return Input.touch ? touchText : keyboardText;
  },

  canvasX(event) {
    const rect = canvas.getBoundingClientRect();
    return ((event.clientX - rect.left) / rect.width) * GAME_W;
  },

  handleClick(event) {
    const x = this.canvasX(event);

    if (this.state === "menu") {
      // Lati dello schermo = scorri il carosello, centro = conferma la scelta.
      if (CHARACTERS.length > 1 && x < GAME_W / 3) {
        this.prevCharacter();
      } else if (CHARACTERS.length > 1 && x > (GAME_W * 2) / 3) {
        this.nextCharacter();
      } else {
        this.startGame();
      }
    } else if (this.state === "paused") {
      this.state = "playing";
    } else if (this.state === "confirmQuit") {
      if (x < GAME_W / 2) this.goToMenu();
      else this.state = "playing";
    } else if (this.state === "gameover") {
      if (x < GAME_W / 2) this.startGame();
      else this.goToMenu();
    }
  },

  /** Torna al menu azzerando gli effetti a schermo (tra cui la vibrazione). */
  goToMenu() {
    this.state = "menu";
    this.screenShake = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  },

  loop() {
    this.update();
    this.draw();
    Input.endFrame();
    requestAnimationFrame(() => this.loop());
  },

  update() {
    // La vibrazione si esaurisce sempre, in qualsiasi schermata: altrimenti
    // resterebbe "congelata" al game over e proseguirebbe anche nel menu.
    if (this.screenShake > 0) this.screenShake--;

    switch (this.state) {
      case "menu":
        this.updateMenu();
        break;
      case "playing":
        this.updatePlaying();
        break;
      case "paused":
        if (Input.wasPressed("pause")) this.state = "playing";
        if (Input.wasPressed("back") || Input.wasPressed("dodge")) this.state = "confirmQuit";
        break;
      case "confirmQuit":
        if (Input.wasPressed("confirm") || Input.wasPressed("jump") || Input.wasPressed("attack")) this.goToMenu();
        if (Input.wasPressed("back") || Input.wasPressed("pause") || Input.wasPressed("dodge")) this.state = "playing";
        break;
      case "gameover":
        if (Input.wasPressed("confirm") || Input.wasPressed("jump") || Input.wasPressed("attack")) this.startGame();
        if (Input.wasPressed("back") || Input.wasPressed("dodge")) this.goToMenu();
        break;
    }
  },

  updateMenu() {
    if (Input.wasPressed("left")) this.prevCharacter();
    if (Input.wasPressed("right")) this.nextCharacter();
    if (Input.wasPressed("confirm") || Input.wasPressed("jump")) this.startGame();
  },

  /** Scorrimento circolare del carosello: funziona con qualunque numero di personaggi. */
  prevCharacter() {
    this.selectedCharacter = (this.selectedCharacter - 1 + CHARACTERS.length) % CHARACTERS.length;
  },

  nextCharacter() {
    this.selectedCharacter = (this.selectedCharacter + 1) % CHARACTERS.length;
  },

  updatePlaying() {
    if (Input.wasPressed("pause")) {
      this.state = "paused";
      return;
    }

    // ESC chiede conferma prima di abbandonare la partita.
    if (Input.wasPressed("back")) {
      this.state = "confirmQuit";
      return;
    }

    this.frame++;

    // Punti "sopravvivenza": 1 punto al secondo circa.
    if (this.frame % 60 === 0) this.score += 1;

    // Il combo scade se non si uccide nessuno per un po'.
    if (this.comboTimer > 0) {
      this.comboTimer--;
      if (this.comboTimer === 0) this.combo = 0;
    }

    this.player.update(this);
    this.updateSpawning();

    this.projectiles.forEach((p) => p.update());
    this.zombies.forEach((z) => z.update());
    this.particles.forEach((p) => p.update());
    this.texts.forEach((t) => t.update());

    this.resolveCollisions();

    this.projectiles = this.projectiles.filter((p) => !p.dead);
    this.zombies = this.zombies.filter((z) => !z.dead);
    this.particles = this.particles.filter((p) => !p.dead);
    this.texts = this.texts.filter((t) => !t.dead);

    if (this.player.lives <= 0) this.endGame();
  },

  /** La difficolta' cresce col tempo: spawn piu' frequenti e zombie piu' rapidi. */
  updateSpawning() {
    this.spawnTimer--;
    if (this.spawnTimer > 0) return;

    const minutes = this.frame / 3600;
    const interval = Math.max(28, 100 - Math.floor(this.frame / 240) * 5);
    this.spawnTimer = interval + Math.floor(Math.random() * 25);

    const roll = Math.random();
    let typeName = "walker";
    if (roll > 0.85 && this.frame > 900) typeName = "brute";
    else if (roll > 0.55 && this.frame > 420) typeName = "runner";

    const fromLeft = Math.random() < 0.4;
    const speedBonus = Math.min(0.9, minutes * 0.45);
    this.zombies.push(new Zombie(typeName, fromLeft, speedBonus));
  },

  resolveCollisions() {
    // Proiettili contro zombie
    for (const projectile of this.projectiles) {
      if (projectile.dead) continue;
      for (const zombie of this.zombies) {
        if (zombie.dead) continue;
        if (!rectsOverlap(projectile.hitbox, zombie.hitbox)) continue;

        projectile.dead = true;
        const killed = zombie.takeDamage(projectile.config.damage);
        this.spawnImpact(projectile.x, projectile.y);

        if (killed) this.registerKill(zombie);
        break;
      }
    }

    // Zombie contro giocatore
    for (const zombie of this.zombies) {
      if (zombie.dead) continue;
      if (!rectsOverlap(this.player.hitbox, zombie.hitbox)) continue;

      if (this.player.takeHit(zombie.x)) {
        this.screenShake = 10;
        this.combo = 0;
        this.comboTimer = 0;
        this.texts.push(new FloatingText(this.player.x + 5, this.player.y - 8, "AHIA!", COLORS.warn));
      }
    }
  },

  registerKill(zombie) {
    this.kills++;
    this.combo = Math.min(this.combo + 1, 5);
    this.comboTimer = 150;

    const points = zombie.type.points * this.combo;
    this.score += points;

    const label = this.combo > 1 ? `+${points} x${this.combo}` : `+${points}`;
    this.texts.push(new FloatingText(zombie.x + zombie.w / 2, zombie.y - 6, label));
    this.spawnGore(zombie.x + zombie.w / 2, zombie.y + zombie.h / 2);
    this.screenShake = 4;
  },

  spawnGore(x, y) {
    for (let i = 0; i < 14; i++) {
      this.particles.push(
        new Particle(x, y, (Math.random() - 0.5) * 3, -Math.random() * 2.5, i % 3 === 0 ? "#8fbf4a" : "#5aa049", 30 + Math.random() * 20)
      );
    }
  },

  spawnImpact(x, y) {
    for (let i = 0; i < 6; i++) {
      this.particles.push(new Particle(x, y, (Math.random() - 0.5) * 2, -Math.random() * 1.5, "#f4f4f4", 14));
    }
  },

  spawnDust(x, y) {
    for (let i = 0; i < 5; i++) {
      this.particles.push(new Particle(x, y - 1, (Math.random() - 0.5) * 1.6, -Math.random(), "#6b7a5a", 12));
    }
  },

  endGame() {
    this.state = "gameover";
    this.screenShake = DEATH_SHAKE_FRAMES;
    if (this.score > this.highscore) {
      this.highscore = this.score;
      localStorage.setItem(HIGHSCORE_KEY, String(this.highscore));
    }
  },

  // ---------------------------------------------------------------- DISEGNO

  draw() {
    // Scossone della telecamera: l'intensita' si spegne man mano (max 3 pixel).
    const amplitude = Math.min(3, this.screenShake * 0.22);
    this.shakeX = amplitude > 0 ? (Math.random() - 0.5) * 2 * amplitude : 0;
    this.shakeY = amplitude > 0 ? (Math.random() - 0.5) * 2 * amplitude : 0;

    // Tutto il mondo viene disegnato in coordinate di gioco (320x180) e poi
    // ingrandito di SCALE: 1 pixel di gioco = un quadrato netto sullo schermo.
    ctx.setTransform(SCALE, 0, 0, SCALE, this.shakeX * SCALE, this.shakeY * SCALE);
    ctx.clearRect(0, 0, GAME_W, GAME_H);

    this.drawBackground();

    if (this.state === "menu") {
      this.drawMenu();
    } else {
      this.drawWorld();
      this.drawHud();
      if (this.state === "paused") this.drawPause();
      if (this.state === "confirmQuit") this.drawConfirmQuit();
      if (this.state === "gameover") this.drawGameOver();
    }
  },

  drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    gradient.addColorStop(0, COLORS.sky);
    gradient.addColorStop(1, COLORS.skyLow);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_W, GROUND_Y);

    // Stelle
    for (const star of this.stars) {
      ctx.fillStyle = star.bright ? "#e8f0d8" : "#6b7a8a";
      ctx.fillRect(star.x, star.y, 1, 1);
    }

    // Luna
    ctx.fillStyle = "#e8e4c8";
    ctx.beginPath();
    ctx.arc(268, 34, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.sky;
    ctx.beginPath();
    ctx.arc(262, 30, 11, 0, Math.PI * 2);
    ctx.fill();

    // Lapidi
    for (const tomb of this.tombstones) {
      drawSprite(ctx, SPRITES.tombstone, tomb.x, GROUND_Y - 8 * tomb.scale, { M: "#3a4450", m: "#232a33" }, false, tomb.scale);
    }

    // Terreno
    ctx.fillStyle = COLORS.grass;
    ctx.fillRect(0, GROUND_Y, GAME_W, 3);
    ctx.fillStyle = COLORS.ground;
    ctx.fillRect(0, GROUND_Y + 3, GAME_W, GAME_H - GROUND_Y - 3);
    ctx.fillStyle = COLORS.groundDark;
    for (let x = 0; x < GAME_W; x += 8) {
      ctx.fillRect(x + ((x / 8) % 2 === 0 ? 2 : 5), GROUND_Y + 8, 2, 1);
    }
  },

  drawWorld() {
    this.zombies.forEach((z) => z.draw(ctx));
    this.projectiles.forEach((p) => p.draw(ctx));
    this.player.draw(ctx);
    this.particles.forEach((p) => p.draw(ctx));
    this.texts.forEach((t) => t.draw(ctx));
  },

  drawHud() {
    // Barra superiore
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, GAME_W, 16);

    text(`PUNTI ${String(this.score).padStart(5, "0")}`, 5, 4, { size: 9, color: COLORS.accent });
    text(`RECORD ${String(this.highscore).padStart(5, "0")}`, GAME_W / 2, 4, { size: 9, align: "center", color: "#cfe3cf" });

    // Vite: cuoricini pixelati (pieni finche' la vita c'e', spenti quando persa)
    for (let i = 0; i < 3; i++) {
      const x = GAME_W - 12 - i * 12;
      const alive = i < this.player.lives;
      drawSprite(ctx, SPRITES.heart, x, 4, alive ? HEART_PALETTE : HEART_PALETTE_EMPTY);
    }

    if (this.combo > 1) {
      text(`COMBO x${this.combo}`, 5, 19, { size: 8, color: "#ffe066" });
    }

    // Barra di ricarica dell'attacco
    const cd = this.player.attackCooldown / this.character.projectile.cooldown;
    ctx.fillStyle = "#000";
    ctx.fillRect(4, GAME_H - 8, 40, 4);
    ctx.fillStyle = cd > 0 ? "#8a8a8a" : COLORS.accent;
    ctx.fillRect(5, GAME_H - 7, 38 * (1 - cd), 2);
  },

  drawMenu() {
    // Velo scuro per staccare il menu dallo sfondo del cimitero.
    ctx.fillStyle = "rgba(4,8,12,0.55)";
    ctx.fillRect(0, 0, GAME_W, GAME_H);

    text("ZOMBIE SNACK", GAME_W / 2, 8, { size: 16, align: "center", color: COLORS.accent });
    text("SCEGLI IL TUO EROE", GAME_W / 2, 26, { size: 9, align: "center", color: "#a9c9a9" });

    // Carosello: una sola carta centrata, cosi' la schermata regge qualunque
    // numero di personaggi in CHARACTERS senza dover stringere il layout.
    const character = CHARACTERS[this.selectedCharacter];
    const cardW = 150;
    const cardH = 104;
    const cardX = GAME_W / 2 - cardW / 2;
    const cardY = 38;
    const centerX = GAME_W / 2;

    ctx.fillStyle = "rgba(124,232,124,0.16)";
    ctx.fillRect(cardX, cardY, cardW, cardH);
    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = 1;
    ctx.strokeRect(cardX + 0.5, cardY + 0.5, cardW - 1, cardH - 1);

    // Personaggio ingrandito 3 volte (30 pixel di gioco di larghezza, altezza variabile)
    drawSprite(ctx, SPRITES[character.sprites.stand], centerX - 15, cardY + 6, character.palette, false, 3);

    // Icona dell'arma (oggetto lanciato o pugno), ingrandita 2 volte
    const proj = character.projectile;
    drawSprite(ctx, SPRITES[proj.sprite], cardX + cardW - 26, cardY + 20, proj.palette, false, 2);

    text(character.name, centerX, cardY + 60, { size: 13, align: "center", color: COLORS.accent });
    text(character.weapon, centerX, cardY + 77, { size: 8, align: "center", color: "#cfe3cf" });
    text(character.description, centerX, cardY + 89, { size: 7, align: "center", color: "#8fa38f" });

    // Frecce del carosello e puntini di posizione: inutili (e nascosti) con un solo personaggio.
    if (CHARACTERS.length > 1) {
      text("<", cardX - 12, cardY + cardH / 2 - 6, { size: 14, align: "center", color: COLORS.accent });
      text(">", cardX + cardW + 12, cardY + cardH / 2 - 6, { size: 14, align: "center", color: COLORS.accent });

      const dotSpacing = 8;
      const dotsY = cardY + cardH + 8;
      const dotsStartX = centerX - ((CHARACTERS.length - 1) * dotSpacing) / 2;
      CHARACTERS.forEach((_, index) => {
        ctx.fillStyle = index === this.selectedCharacter ? COLORS.accent : "#3a4450";
        ctx.fillRect(dotsStartX + index * dotSpacing - 1, dotsY, 3, 3);
      });
    }

    // Fascia scura in basso: tiene le scritte staccate dal terreno verde.
    ctx.fillStyle = "rgba(4,8,12,0.85)";
    ctx.fillRect(0, 146, GAME_W, GAME_H - 146);

    const blink = Math.floor(Date.now() / 400) % 2 === 0;
    if (blink) {
      text(this.hint("FRECCE PER SCEGLIERE - INVIO PER GIOCARE", "CROCE PER SCEGLIERE - A O TOCCA PER GIOCARE"), GAME_W / 2, 151, {
        size: 8,
        align: "center",
        color: "#ffe066",
      });
    }
    text(`RECORD: ${this.highscore}`, GAME_W / 2, 166, { size: 8, align: "center", color: "#a9c9a9" });
  },

  drawPause() {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, GAME_W, GAME_H);
    text("PAUSA", GAME_W / 2, 70, { size: 16, align: "center", color: COLORS.accent });
    text(this.hint("P = CONTINUA", "START O TOCCA = CONTINUA"), GAME_W / 2, 94, { size: 8, align: "center" });
    text(this.hint("ESC = ESCI DALLA PARTITA", "SELECT = ESCI DALLA PARTITA"), GAME_W / 2, 106, {
      size: 8,
      align: "center",
      color: "#a9c9a9",
    });
  },

  drawConfirmQuit() {
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(0, 0, GAME_W, GAME_H);

    // Riquadro della domanda
    ctx.fillStyle = "rgba(10,16,22,0.95)";
    ctx.fillRect(36, 58, GAME_W - 72, 64);
    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = 1;
    ctx.strokeRect(36.5, 58.5, GAME_W - 73, 63);

    text("USCIRE DALLA PARTITA?", GAME_W / 2, 66, { size: 10, align: "center", color: COLORS.warn });
    text(this.hint("INVIO = SI", "A O TOCCA SX = SI"), GAME_W / 2, 86, { size: 8, align: "center", color: COLORS.accent });
    text(this.hint("ESC = CONTINUA A GIOCARE", "START O TOCCA DX = NO"), GAME_W / 2, 100, {
      size: 8,
      align: "center",
      color: "#a9c9a9",
    });
  },

  drawGameOver() {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, GAME_W, GAME_H);
    text("GAME OVER", GAME_W / 2, 44, { size: 18, align: "center", color: COLORS.warn });
    text(`PUNTI: ${this.score}`, GAME_W / 2, 74, { size: 10, align: "center", color: COLORS.accent });
    text(`ZOMBIE ELIMINATI: ${this.kills}`, GAME_W / 2, 90, { size: 8, align: "center" });
    text(`RECORD: ${this.highscore}`, GAME_W / 2, 102, { size: 8, align: "center", color: "#a9c9a9" });

    const blink = Math.floor(Date.now() / 400) % 2 === 0;
    if (blink) {
      text(this.hint("INVIO = RIGIOCA    ESC = MENU", "A = RIGIOCA    SELECT = MENU"), GAME_W / 2, 126, {
        size: 7,
        align: "center",
        color: "#ffe066",
      });
    }
  },

};

game.init();
