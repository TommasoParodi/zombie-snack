// Fabio: lancia pneumatici (rimbalzano, come una vera gomma). Super (stile
// Silvia/Luca90, stessa meccanica di carica): CAMERA D'ARIA, lancia una gomma con
// camera d'aria che vola in avanti e poi scoppia, uccidendo con un'onda d'urto
// circolare chiunque si trovi nel raggio quando esplode.

// Pneumatico lanciato come arma base: un anello di gomma nera.
SPRITES.fabioTire = [
  "..KKKK..",
  ".KKKKKK.",
  "KK....KK",
  "KK....KK",
  "KK....KK",
  "KK....KK",
  ".KKKKKK.",
  "..KKKK..",
];

// Gomma con camera d'aria del super: stessa forma, camera d'aria arancione al centro
// (invece del buco) a segnalare che sta per scoppiare.
SPRITES.fabioTireTube = [
  "..KKKK..",
  ".KKttKK.",
  "KKttttKK",
  "KttttttK",
  "KttttttK",
  "KKttttKK",
  ".KKttKK.",
  "..KKKK..",
];

CHARACTERS.push({
  id: "fabio",
  name: "FABIO",
  weapon: "PNEUMATICI",
  description: "Rotola forte + SUPER CAMERA D'ARIA",
  size: { w: 10, h: 14 },
  sprites: { stand: "hero", crouch: "heroCrouch", jump: "heroJump" },
  palette: { h: "#2a2a2a", s: "#e0ab7c", e: "#1b1b1b", a: "#c94f3d", p: "#2b2b2b", b: "#1b1b1b", r: "#e0ab7c" },
  projectile: {
    sprite: "fabioTire",
    palette: { K: "#1b1b1b" },
    speed: 3.6,
    gravity: 0.13,
    damage: 2,
    cooldown: 22,
    bounces: 2,
  },
  super: {
    max: 100,
    hitCharge: 4,
    killBonus: 8,
  },
});

/** Gomma con camera d'aria: vola in avanti, poi scoppia in un'onda circolare che uccide sul contatto. */
class TireBurstEffect {
  constructor(player, currentGame) {
    this.game = currentGame;
    this.x = player.facing === 1 ? player.x + player.w + 2 : player.x - 14;
    this.y = player.y - 2;
    this.vx = player.facing * 3.5;
    this.vy = -1.5;
    this.w = 12;
    this.h = 12;
    this.travelled = 0;
    this.life = 40;
    this.exploded = false;
    this.explodeRadius = 0;
    this.maxRadius = 40;
    this.explodeTimer = 18;
    this.dead = false;
    this.hitZombieIds = new Set();
  }

  get hitbox() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  update() {
    if (!this.exploded) {
      this.vy += 0.15;
      this.x += this.vx;
      this.y += this.vy;
      this.travelled += Math.abs(this.vx);

      this.life--;
      if (this.travelled >= 90 || this.y + this.h >= GROUND_Y || this.life <= 0) {
        this.exploded = true;
        this.game.screenShake = Math.max(this.game.screenShake, 16);
      }
      return;
    }

    this.explodeRadius = Math.min(this.maxRadius, this.explodeRadius + 5);
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;

    for (const zombie of this.game.zombies) {
      if (zombie.dead || this.hitZombieIds.has(zombie)) continue;
      const zx = zombie.x + zombie.w / 2;
      const zy = zombie.y + zombie.h / 2;
      if (Math.hypot(zx - cx, zy - cy) > this.explodeRadius) continue;

      this.hitZombieIds.add(zombie);
      zombie.hp = 0;
      zombie.dead = true;
      this.game.superActive = true;
      this.game.registerKill(zombie);
      this.game.superActive = false;
      this.game.spawnImpact(zx, zy);
    }

    this.explodeTimer--;
    if (this.explodeTimer <= 0) this.dead = true;
  }

  draw(ctx) {
    if (!this.exploded) {
      drawSprite(ctx, SPRITES.fabioTireTube, this.x, this.y, { K: "#1b1b1b", t: "#e8862c" }, this.vx < 0);
      return;
    }

    const alpha = Math.max(0, this.explodeTimer / 18);
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    ctx.strokeStyle = `rgba(255,180,60,${alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, this.explodeRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(255,120,40,${alpha * 0.35})`;
    ctx.beginPath();
    ctx.arc(cx, cy, this.explodeRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}

const baseFabioStartGame = game.startGame.bind(game);
game.startGame = function () {
  baseFabioStartGame();
  this.tireBurstEffects = [];
};

const baseFabioPlayerUpdate = Player.prototype.update;
Player.prototype.update = function (currentGame) {
  baseFabioPlayerUpdate.call(this, currentGame);

  if (
    this.character.id === "fabio" &&
    Input.wasPressed("super") &&
    this.superCharge >= this.character.super.max
  ) {
    this.activateFabioSuper(currentGame);
  }
};

// Riusa this.superCharge/this.superReadyFlash: gia' azzerati per ogni personaggio
// dal patch di startGame in silvia.js (non e' un campo specifico di Silvia).
const baseFabioAddSuperCharge = Player.prototype.addSuperCharge;
Player.prototype.addSuperCharge = function (amount) {
  baseFabioAddSuperCharge.call(this, amount);
  if (this.character.id !== "fabio" || !this.character.super) return;
  const wasReady = this.superCharge >= this.character.super.max;
  this.superCharge = Math.min(this.character.super.max, this.superCharge + amount);
  if (!wasReady && this.superCharge >= this.character.super.max) {
    this.superReadyFlash = 72;
  }
};

Player.prototype.activateFabioSuper = function (currentGame) {
  this.superCharge = 0;
  this.superReadyFlash = 0;
  currentGame.tireBurstEffects.push(new TireBurstEffect(this, currentGame));
  currentGame.screenShake = 10;
  currentGame.texts.push(new FloatingText(this.x + this.w / 2, this.y - 18, "CAMERA D'ARIA!", "#e8862c"));
};

const baseFabioTakeDamage = Zombie.prototype.takeDamage;
Zombie.prototype.takeDamage = function (amount) {
  const killed = baseFabioTakeDamage.call(this, amount);
  if (
    game.state === "playing" &&
    game.player &&
    game.player.character.id === "fabio" &&
    !game.superActive
  ) {
    game.player.addSuperCharge(game.player.character.super.hitCharge);
  }
  return killed;
};

const baseFabioRegisterKill = game.registerKill.bind(game);
game.registerKill = function (zombie) {
  baseFabioRegisterKill(zombie);
  if (this.player && this.player.character.id === "fabio" && !this.superActive) {
    this.player.addSuperCharge(this.player.character.super.killBonus);
  }
};

const baseFabioUpdatePlaying = game.updatePlaying.bind(game);
game.updatePlaying = function () {
  baseFabioUpdatePlaying();
  if (!this.tireBurstEffects) this.tireBurstEffects = [];
  this.tireBurstEffects.forEach((effect) => effect.update());
  this.tireBurstEffects = this.tireBurstEffects.filter((effect) => !effect.dead);
};

const baseFabioDrawWorld = game.drawWorld.bind(game);
game.drawWorld = function () {
  baseFabioDrawWorld();
  if (this.tireBurstEffects) this.tireBurstEffects.forEach((effect) => effect.draw(ctx));
};

const baseFabioPlayerDraw = Player.prototype.draw;
Player.prototype.draw = function (drawCtx) {
  if (this.character.id === "fabio" && this.superReadyFlash > 0) {
    const sprites = this.character.sprites;
    let sprite = SPRITES[sprites.stand];
    if (this.crouching) sprite = SPRITES[sprites.crouch];
    else if (!this.onGround) sprite = SPRITES[sprites.jump];

    if (Math.floor(this.superReadyFlash / 3) % 2 === 0) {
      drawSpriteTinted(drawCtx, sprite, this.x - 1, this.y - 1, "rgba(232,134,44,0.85)", this.facing === -1, 1.2);
    }
  }
  baseFabioPlayerDraw.call(this, drawCtx);
};

const baseFabioDrawHud = game.drawHud.bind(game);
game.drawHud = function () {
  baseFabioDrawHud();
  if (!this.player || this.player.character.id !== "fabio") return;

  const max = this.player.character.super.max;
  const ratio = Math.min(1, this.player.superCharge / max);
  const ready = ratio >= 1;
  const barX = 54;
  const barY = GAME_H - 9;
  const barW = 92;

  ctx.fillStyle = "#050505";
  ctx.fillRect(barX, barY, barW, 5);
  ctx.fillStyle = ready && Math.floor(Date.now() / 120) % 2 === 0 ? "#ffb366" : "#a35a1f";
  ctx.fillRect(barX + 1, barY + 1, (barW - 2) * ratio, 3);
  text(ready ? "SUPER READY - Y" : "SUPER", barX + barW / 2, barY - 8, {
    size: 6,
    align: "center",
    color: ready ? "#ffb366" : "#c78a4f",
  });
};
