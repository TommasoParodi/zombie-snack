// Luca90: a bordo di un carretto/macchinetta per bambini blu, seduto a cielo aperto
// (testa e spalle visibili sopra la carrozzeria). Attacco: fascio di abbaglianti.
// Super (stile Silvia, stessa meccanica di carica): INQUINAMENTO, un polverone
// nero che esce dal tubo di scappamento e uccide sul contatto ogni zombie che
// lo tocca, restando a mezz'aria per qualche istante invece di volare via.

// Non un'auto vera: un carretto/macchinetta per bambini a cielo aperto, con Luca90
// seduto dentro (testa e spalle visibili sopra la carrozzeria), volante incluso.
SPRITES.luca90 = [
  "......hhhh......",
  ".....hssssh.....",
  "....aaaaaaaa....",
  "..bbaaaaaaaagb..",
  ".bbbbbbbbbbbbbb.",
  ".rbbbbbbbbbbbbl.",
  ".kkkkkkkkkkkkkk.",
  "...kk......kk...",
  "...kk......kk...",
];

SPRITES.luca90Crouch = [
  "................",
  "................",
  "....aaaaaaaa....",
  "..bbaaaaaaaagb..",
  ".bbbbbbbbbbbbbb.",
  ".rbbbbbbbbbbbbl.",
  ".kkkkkkkkkkkkkk.",
  "...kk......kk...",
  "...kk......kk...",
];

SPRITES.luca90Jump = [
  "......hhhh......",
  ".....hssssh.....",
  "....aaaaaaaa....",
  "..bbaaaaaaaagb..",
  ".bbbbbbbbbbbbbb.",
  ".rbbbbbbbbbbbbl.",
  ".kkkkkkkkkkkkkk.",
  "...kk......kk...",
  "...kk......kk...",
];

// Proiettile di Luca90: fascio di luce degli abbaglianti.
SPRITES.headlightBeam = ["WWWWWWWWWW", ".YYYYYYYY.", "..YYYYYY.."];

CHARACTERS.push({
  id: "luca90",
  name: "LUCA90",
  weapon: "ABBAGLIANTI",
  description: "Raggio che spazza tutti gli zombie + SUPER INQUINAMENTO",
  size: { w: 16, h: 9 },
  sprites: { stand: "luca90", crouch: "luca90Crouch", jump: "luca90Jump" },
  palette: {
    h: "#3a2a1a",
    s: "#e0ab7c",
    a: "#2f8f5a",
    b: "#1f5fb0",
    g: "#3a3a3a",
    r: "#e04b3a",
    l: "#fff4b0",
    k: "#141414",
  },
  projectile: {
    // sprite/palette usati solo per l'icona nella schermata di selezione (drawMenu):
    // il fascio vero e proprio si disegna con un gradiente custom, vedi drawLucaBeam sotto.
    sprite: "headlightBeam",
    palette: { W: "#ffffff", Y: "#fff2a8" },
    // "beam": non e' un proiettile che vola, e' un raggio anchorato all'auto che si
    // riposiziona ogni frame (stesso principio del "whip" di Boledj); "pierce": colpisce
    // TUTTI gli zombie nel suo raggio (non si ferma al primo), un colpo a testa.
    beam: true,
    pierce: true,
    reach: 130,
    beamHeight: 18,
    speed: 0,
    gravity: 0,
    damage: 1,
    cooldown: 34,
    bounces: 0,
    life: 12,
  },
  super: {
    max: 100,
    hitCharge: 4,
    killBonus: 8,
    // Danno (non insta-kill) inflitto al boss di fine livello (vedi PollutionCloud.update() sotto).
    bossDamage: 30,
  },
});

// Il fascio degli abbaglianti non e' un proiettile che vola: resta anchorato al muso
// dell'auto e si riposiziona ogni frame, un rettangolo giallo lungo "reach" che copre
// l'altezza di uno zombie (stesso principio del "whip" di Boledj in boledj.js).
const baseLucaProjectileUpdate = Projectile.prototype.update;
Projectile.prototype.update = function () {
  if (!this.config.beam) {
    baseLucaProjectileUpdate.call(this);
    return;
  }

  const facing = this.owner.facing;
  const bodyX = facing === 1 ? this.owner.x + this.owner.w - 2 : this.owner.x + 2;
  this.w = this.config.reach;
  this.h = this.config.beamHeight;
  this.x = facing === 1 ? bodyX : bodyX - this.w;
  this.y = this.owner.y + this.owner.h / 2 - this.h / 2;

  this.life--;
  if (this.life <= 0) this.dead = true;
};

const baseLucaProjectileDraw = Projectile.prototype.draw;
Projectile.prototype.draw = function (drawCtx) {
  if (!this.config.beam) {
    baseLucaProjectileDraw.call(this, drawCtx);
    return;
  }

  const alpha = Math.min(0.85, this.life / 6);
  const facing = this.owner.facing;
  const gradient = drawCtx.createLinearGradient(this.x, 0, this.x + this.w, 0);
  if (facing === 1) {
    gradient.addColorStop(0, `rgba(255,244,176,${alpha})`);
    gradient.addColorStop(1, "rgba(255,244,176,0)");
  } else {
    gradient.addColorStop(0, "rgba(255,244,176,0)");
    gradient.addColorStop(1, `rgba(255,244,176,${alpha})`);
  }
  drawCtx.fillStyle = gradient;
  drawCtx.fillRect(this.x, this.y, this.w, this.h);
};

/** Polverone nero: nasce dal tubo di scappamento (lato opposto alla marcia), si espande e poi resta a mezz'aria un attimo, uccidendo sul contatto. */
class PollutionCloud {
  constructor(player, currentGame) {
    this.game = currentGame;
    this.x = player.facing === 1 ? player.x - 4 : player.x + player.w - 4;
    this.y = player.y + player.h - 2;
    this.vx = -player.facing * 0.15;
    this.vy = -0.12;
    this.w = 10;
    this.h = 10;
    this.maxW = 46;
    this.maxH = 26;
    this.life = 90;
    this.dead = false;
    this.hitZombieIds = new Set();
    this.bossDamage = player.character.super.bossDamage;
    this.hitBoss = false;
  }

  get hitbox() {
    return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h };
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.w = Math.min(this.maxW, this.w + 0.9);
    this.h = Math.min(this.maxH, this.h + 0.5);

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
    }

    // Boss: fuori da game.zombies (vedi js/boss.js), controllato a parte. Danno parziale,
    // non insta-kill come sugli zombie normali.
    const boss = this.game.boss;
    if (boss && !this.hitBoss && !boss.dead && rectsOverlap(this.hitbox, boss.hitbox)) {
      this.hitBoss = true;
      this.game.superActive = true;
      const killed = boss.takeDamage(this.bossDamage);
      if (killed) this.game.registerKill(boss);
      this.game.superActive = false;
      this.game.spawnImpact(boss.x + boss.w / 2, boss.y + boss.h / 2);
    }

    this.life--;
    if (this.life <= 0) this.dead = true;
  }

  draw(ctx) {
    const alpha = Math.min(0.75, this.life / 90 + 0.15);
    ctx.fillStyle = `rgba(30,30,30,${alpha})`;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.w / 2, this.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(70,70,70,${alpha * 0.6})`;
    ctx.beginPath();
    ctx.ellipse(this.x - this.w * 0.15, this.y - this.h * 0.1, this.w * 0.32, this.h * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

const baseLucaStartGame = game.startGame.bind(game);
game.startGame = function () {
  baseLucaStartGame();
  this.pollutionEffects = [];
};

const baseLucaPlayerUpdate = Player.prototype.update;
Player.prototype.update = function (currentGame) {
  baseLucaPlayerUpdate.call(this, currentGame);

  if (
    this.character.id === "luca90" &&
    Input.wasPressed("super") &&
    this.superCharge >= this.character.super.max
  ) {
    this.activateLucaSuper(currentGame);
  }
};

// Riusa this.superCharge/this.superReadyFlash: gia' azzerati per ogni personaggio
// dal patch di startGame in silvia.js (non e' un campo specifico di Silvia).
const baseLucaAddSuperCharge = Player.prototype.addSuperCharge;
Player.prototype.addSuperCharge = function (amount) {
  baseLucaAddSuperCharge.call(this, amount);
  if (this.character.id !== "luca90" || !this.character.super) return;
  const wasReady = this.superCharge >= this.character.super.max;
  this.superCharge = Math.min(this.character.super.max, this.superCharge + amount);
  if (!wasReady && this.superCharge >= this.character.super.max) {
    this.superReadyFlash = 72;
  }
};

Player.prototype.activateLucaSuper = function (currentGame) {
  this.superCharge = 0;
  this.superReadyFlash = 0;
  currentGame.pollutionEffects.push(new PollutionCloud(this, currentGame));
  currentGame.screenShake = 14;
  currentGame.texts.push(new FloatingText(this.x + this.w / 2, this.y - 18, "INQUINAMENTO!", "#9a9a9a"));
};

const baseLucaTakeDamage = Zombie.prototype.takeDamage;
Zombie.prototype.takeDamage = function (amount) {
  const killed = baseLucaTakeDamage.call(this, amount);
  if (
    game.state === "playing" &&
    game.player &&
    game.player.character.id === "luca90" &&
    !game.superActive
  ) {
    game.player.addSuperCharge(game.player.character.super.hitCharge);
  }
  return killed;
};

const baseLucaRegisterKill = game.registerKill.bind(game);
game.registerKill = function (zombie) {
  baseLucaRegisterKill(zombie);
  if (this.player && this.player.character.id === "luca90" && !this.superActive) {
    this.player.addSuperCharge(this.player.character.super.killBonus);
  }
};

const baseLucaUpdatePlaying = game.updatePlaying.bind(game);
game.updatePlaying = function () {
  baseLucaUpdatePlaying();
  if (!this.pollutionEffects) this.pollutionEffects = [];
  this.pollutionEffects.forEach((effect) => effect.update());
  this.pollutionEffects = this.pollutionEffects.filter((effect) => !effect.dead);
};

const baseLucaDrawWorld = game.drawWorld.bind(game);
game.drawWorld = function () {
  baseLucaDrawWorld();
  if (this.pollutionEffects) this.pollutionEffects.forEach((effect) => effect.draw(ctx));
};

const baseLucaPlayerDraw = Player.prototype.draw;
Player.prototype.draw = function (drawCtx) {
  if (this.character.id === "luca90" && this.superReadyFlash > 0) {
    const sprites = this.character.sprites;
    let sprite = SPRITES[sprites.stand];
    if (this.crouching) sprite = SPRITES[sprites.crouch];
    else if (!this.onGround) sprite = SPRITES[sprites.jump];

    if (Math.floor(this.superReadyFlash / 3) % 2 === 0) {
      drawSpriteTinted(drawCtx, sprite, this.x - 1, this.y - 1, "rgba(90,90,90,0.85)", this.facing === -1, 1.2);
    }
  }
  baseLucaPlayerDraw.call(this, drawCtx);
};

const baseLucaDrawHud = game.drawHud.bind(game);
game.drawHud = function () {
  baseLucaDrawHud();
  if (!this.player || this.player.character.id !== "luca90") return;

  const max = this.player.character.super.max;
  const ratio = Math.min(1, this.player.superCharge / max);
  const ready = ratio >= 1;
  const barX = 54;
  const barY = GAME_H - 9;
  const barW = 92;

  ctx.fillStyle = "#050505";
  ctx.fillRect(barX, barY, barW, 5);
  ctx.fillStyle = ready && Math.floor(Date.now() / 120) % 2 === 0 ? "#cfcfcf" : "#5a5a5a";
  ctx.fillRect(barX + 1, barY + 1, (barW - 2) * ratio, 3);
  text(ready ? "SUPER READY - Y" : "SUPER", barX + barW / 2, barY - 8, {
    size: 6,
    align: "center",
    color: ready ? "#cfcfcf" : "#8a8a8a",
  });
};
