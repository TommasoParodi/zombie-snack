// Silvia: personaggio, sprite, super meter e super alla senape.

SPRITES.silvia = [
  "..hhhhhh..",
  ".hhhhhhhh.",
  ".hhsssshh.",
  ".hseesseh.",
  ".hssssssh.",
  ".h.wwww.h.",
  ".hwwwwwwh.",
  "..wwwwww..",
  "..jjjjjj..",
  "..jjjjjj..",
  "..jj..jj..",
  "..jj..jj..",
  "..bb..bb..",
  ".bbb..bbb.",
];

SPRITES.silviaCrouch = [
  "..........",
  "..........",
  "..........",
  "..hhhhhh..",
  ".hhhhhhhh.",
  ".hhsssshh.",
  ".hseesseh.",
  ".h.wwww.h.",
  ".hwwwwwwh.",
  "..jjjjjj..",
  "..jj..jj..",
  "..bb..bb..",
  ".bbb..bbb.",
  "..........",
];

SPRITES.silviaJump = [
  "..hhhhhh..",
  ".hhhhhhhh.",
  ".hhsssshh.",
  ".hseesseh.",
  ".hssssssh.",
  "h..wwww..h",
  "hwwwwwwwwh",
  "..wwwwww..",
  "..jjjjjj..",
  ".jj....jj.",
  ".jj....jj.",
  ".jj....jj.",
  ".bb....bb.",
  "bbb....bbb",
];

SPRITES.gnocchi = [
  ".GGGG.",
  "GGLLGG",
  "GGGGGG",
  ".GGGG.",
];

SPRITES.mustardJar = [
  "..CCCCCC..",
  ".CCCCCCCC.",
  ".WWWWWWWW.",
  "WWYYYYYYWW",
  "WYYYYYYYYW",
  "WYYMMMMYYW",
  "WYYMMMMYYW",
  "WYYYYYYYYW",
  "WYYYYYYYYW",
  ".WWWWWWWW.",
  ".WWWWWWWW.",
  "..WWWWWW..",
];

CHARACTERS.push({
  id: "silvia",
  name: "SILVIA",
  weapon: "GNOCCHI ALLA ROMANA",
  description: "Raffica + SUPER SENAPE",
  size: { w: 10, h: 14 },
  sprites: { stand: "silvia", crouch: "silviaCrouch", jump: "silviaJump" },
  palette: {
    h: "#5a3826",
    s: "#e9b98f",
    e: "#261b17",
    w: "#f4f1e8",
    j: "#356a9a",
    b: "#e7e7e2",
  },
  projectile: {
    sprite: "gnocchi",
    palette: { G: "#e8d59b", L: "#fff1be" },
    speed: 4.7,
    gravity: 0.06,
    damage: 1,
    cooldown: 12,
    bounces: 0,
  },
  super: {
    max: 100,
    hitCharge: 4,
    killBonus: 8,
    // Danno (non insta-kill) inflitto al boss di fine livello quando lo colpisce (vedi
    // MustardJarEffect.update() sotto e js/boss.js).
    bossDamage: 35,
  },
});

class MustardJarEffect {
  constructor(player, currentGame) {
    this.game = currentGame;
    this.facing = player.facing;
    this.x = player.facing === 1 ? player.x + player.w + 3 : player.x - 30;
    this.y = player.y - 2;
    this.vx = player.facing * 8.5;
    this.life = 42;
    this.dead = false;
    this.w = SPRITES.mustardJar[0].length * 2;
    this.h = SPRITES.mustardJar.length * 2;
    this.hitZombieIds = new Set();
    this.bossDamage = player.character.super.bossDamage;
    this.hitBoss = false;
  }

  get hitbox() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  update() {
    this.x += this.vx;

    for (const zombie of this.game.zombies) {
      if (zombie.dead || this.hitZombieIds.has(zombie)) continue;
      if (!rectsOverlap(this.hitbox, zombie.hitbox)) continue;

      this.hitZombieIds.add(zombie);
      zombie.hp = 0;
      zombie.dead = true;
      this.game.superActive = true;
      this.game.registerKill(zombie);
      this.game.superActive = false;
      this.game.spawnImpact(zombie.x + zombie.w / 2, zombie.y + zombie.h / 2);
      this.game.screenShake = Math.max(this.game.screenShake, 8);
    }

    // Boss: fuori da game.zombies (vedi js/boss.js), quindi controllato a parte. Danno
    // parziale, non insta-kill come sugli zombie normali, per non risolvere il fight in un colpo.
    const boss = this.game.boss;
    if (boss && !this.hitBoss && !boss.dead && rectsOverlap(this.hitbox, boss.hitbox)) {
      this.hitBoss = true;
      this.game.superActive = true;
      const killed = boss.takeDamage(this.bossDamage);
      if (killed) this.game.registerKill(boss);
      this.game.superActive = false;
      this.game.spawnImpact(boss.x + boss.w / 2, boss.y + boss.h / 2);
      this.game.screenShake = Math.max(this.game.screenShake, 8);
    }

    this.life--;
    if (this.life <= 0 || this.x < -40 || this.x > GAME_W + 40) this.dead = true;
  }

  draw(ctx) {
    drawSprite(
      ctx,
      SPRITES.mustardJar,
      this.x,
      this.y,
      { C: "#d8d8d8", W: "#f4f0dc", Y: "#e9c828", M: "#7f5b16" },
      this.facing === -1,
      2
    );
  }
}

const baseStartGame = game.startGame.bind(game);
game.startGame = function () {
  baseStartGame();
  this.mustardEffects = [];
  this.player.superCharge = 0;
  this.player.superReadyFlash = 0;
  this.superActive = false;
};

const basePlayerUpdate = Player.prototype.update;
Player.prototype.update = function (currentGame) {
  basePlayerUpdate.call(this, currentGame);

  if (this.superReadyFlash > 0) this.superReadyFlash--;

  if (
    this.character.id === "silvia" &&
    Input.wasPressed("super") &&
    this.superCharge >= this.character.super.max
  ) {
    this.activateSilviaSuper(currentGame);
  }
};

Player.prototype.addSuperCharge = function (amount) {
  if (this.character.id !== "silvia" || !this.character.super) return;
  const wasReady = this.superCharge >= this.character.super.max;
  this.superCharge = Math.min(this.character.super.max, this.superCharge + amount);
  if (!wasReady && this.superCharge >= this.character.super.max) {
    this.superReadyFlash = 72;
  }
};

Player.prototype.activateSilviaSuper = function (currentGame) {
  this.superCharge = 0;
  this.superReadyFlash = 0;
  currentGame.mustardEffects.push(new MustardJarEffect(this, currentGame));
  currentGame.screenShake = 20;
  currentGame.texts.push(new FloatingText(this.x + this.w / 2, this.y - 18, "SENAPE!", "#ffe14f"));
};

const baseTakeDamage = Zombie.prototype.takeDamage;
Zombie.prototype.takeDamage = function (amount) {
  const killed = baseTakeDamage.call(this, amount);
  if (
    game.state === "playing" &&
    game.player &&
    game.player.character.id === "silvia" &&
    !game.superActive
  ) {
    game.player.addSuperCharge(game.player.character.super.hitCharge);
  }
  return killed;
};

const baseRegisterKill = game.registerKill.bind(game);
game.registerKill = function (zombie) {
  baseRegisterKill(zombie);
  if (this.player && this.player.character.id === "silvia" && !this.superActive) {
    this.player.addSuperCharge(this.player.character.super.killBonus);
  }
};

const baseUpdatePlaying = game.updatePlaying.bind(game);
game.updatePlaying = function () {
  baseUpdatePlaying();
  if (!this.mustardEffects) this.mustardEffects = [];
  this.mustardEffects.forEach((effect) => effect.update());
  this.mustardEffects = this.mustardEffects.filter((effect) => !effect.dead);
};

const baseDrawWorld = game.drawWorld.bind(game);
game.drawWorld = function () {
  baseDrawWorld();
  if (this.mustardEffects) this.mustardEffects.forEach((effect) => effect.draw(ctx));
};

const basePlayerDraw = Player.prototype.draw;
Player.prototype.draw = function (drawCtx) {
  if (this.character.id === "silvia" && this.superReadyFlash > 0) {
    const sprites = this.character.sprites;
    let sprite = SPRITES[sprites.stand];
    if (this.crouching) sprite = SPRITES[sprites.crouch];
    else if (!this.onGround) sprite = SPRITES[sprites.jump];

    if (Math.floor(this.superReadyFlash / 3) % 2 === 0) {
      drawSpriteTinted(
        drawCtx,
        sprite,
        this.x - 1,
        this.y - 1,
        "rgba(255,225,70,0.85)",
        this.facing === -1,
        1.2
      );
    }
  }
  basePlayerDraw.call(this, drawCtx);
};

const baseDrawHud = game.drawHud.bind(game);
game.drawHud = function () {
  baseDrawHud();
  if (!this.player || this.player.character.id !== "silvia") return;

  const max = this.player.character.super.max;
  const ratio = Math.min(1, this.player.superCharge / max);
  const ready = ratio >= 1;
  const barX = 54;
  const barY = GAME_H - 9;
  const barW = 92;

  ctx.fillStyle = "#050505";
  ctx.fillRect(barX, barY, barW, 5);
  ctx.fillStyle = ready && Math.floor(Date.now() / 120) % 2 === 0 ? "#fff07a" : "#d6b51f";
  ctx.fillRect(barX + 1, barY + 1, (barW - 2) * ratio, 3);
  text(ready ? "SUPER READY - Y" : "SUPER", barX + barW / 2, barY - 8, {
    size: 6,
    align: "center",
    color: ready ? "#fff07a" : "#c7b65c",
  });
};
