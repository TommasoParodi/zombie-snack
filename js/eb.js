// EB: sempre al telefono, lo usa come arma. Il telefono vola in avanti, arriva a una
// certa distanza (config.reach) e poi torna indietro verso EB, colpendo (una volta a
// testa, vedi flag "pierce" gia' generico) chiunque incontri sia all'andata che al
// ritorno. Corpo/pose riusano lo sprite "hero" gia' condiviso da Berto/Tommen: quello
// che rende EB riconoscibile e' l'arma, non una forma nuova.

// Proiettile di EB: il suo smartphone, con lo schermo acceso.
SPRITES.ebPhone = [
  ".KKKK.",
  "KWWWWK",
  "KWWWWK",
  "KWWWWK",
  "KWWWWK",
  "KWWWWK",
  "KWWWWK",
  ".KKKK.",
];

CHARACTERS.push({
  id: "eb",
  name: "EB",
  weapon: "TELEFONO A BOOMERANG",
  description: "Sempre al telefono: lo tira e torna indietro",
  size: { w: 10, h: 14 },
  sprites: { stand: "hero", crouch: "heroCrouch", jump: "heroJump" },
  palette: { h: "#1b1b1b", s: "#e0ab7c", e: "#1b1b1b", a: "#3a7fd9", p: "#2b2b2b", b: "#1b1b1b", r: "#e0ab7c" },
  projectile: {
    sprite: "ebPhone",
    palette: { K: "#141414", W: "#8fd6ff" },
    // "boomerang": vola in avanti fino a "reach", poi torna verso il proprietario invece
    // di sparire o cadere. "pierce": colpisce chiunque incontri, andata e ritorno, un
    // colpo a testa (stesso meccanismo generico usato dal fascio di Luca90).
    boomerang: true,
    pierce: true,
    reach: 95,
    speed: 3.6,
    damage: 2,
    cooldown: 30,
    gravity: 0,
    bounces: 0,
    life: 90,
  },
});

const baseEbProjectileUpdate = Projectile.prototype.update;
Projectile.prototype.update = function () {
  if (!this.config.boomerang) {
    baseEbProjectileUpdate.call(this);
    return;
  }

  if (this.originX === undefined) {
    // Player.attack applica sempre l'offset generico di "reach" al punto di comparsa
    // (pensato per le armi melee): qui lo ignoriamo e ripartiamo dal bordo del corpo,
    // cosi' "reach" resta libero di significare solo "distanza massima del boomerang".
    const facing = this.owner.facing;
    this.x = facing === 1 ? this.owner.x + this.owner.w - 2 : this.owner.x + 2 - this.w;
    this.y = this.owner.y + this.owner.h / 2 - this.h / 2;
    this.originX = this.x;
    this.originY = this.y;
    this.returning = false;
  }

  this.spin++;

  if (!this.returning) {
    this.x += this.vx;
    this.y = this.originY + Math.sin(this.spin * 0.25) * 4;
    if (Math.abs(this.x - this.originX) >= this.config.reach || this.x < -20 || this.x > GAME_W + 20) {
      this.returning = true;
    }
  } else {
    const targetX = this.owner.x + this.owner.w / 2 - this.w / 2;
    const targetY = this.owner.y + this.owner.h / 2 - this.h / 2;
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const step = Math.min(dist, this.config.speed * 1.4); // torna un po' piu' veloce dell'andata
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
    if (dist <= step) this.dead = true;
  }

  this.life--;
  if (this.life <= 0) this.dead = true;
};

const baseEbProjectileDraw = Projectile.prototype.draw;
Projectile.prototype.draw = function (drawCtx) {
  if (!this.config.boomerang) {
    baseEbProjectileDraw.call(this, drawCtx);
    return;
  }

  // Nessuna direzione "giusta" da specchiare (va e torna): alterna il flip nel tempo
  // per dare l'illusione della rotazione, invece di seguire vx come le altre armi.
  const flip = Math.floor(this.spin / 4) % 2 === 0;
  drawSprite(drawCtx, SPRITES[this.config.sprite], this.x, this.y, this.config.palette, flip);
};
