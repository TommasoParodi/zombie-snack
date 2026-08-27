// Boledj: cuffie in testa e pesce lanciato con la canna da pesca a effetto frusta.

SPRITES.boledj = [
  "..hhhhhh..",
  ".HhhhhhhH.",
  "HHssssssHH",
  ".HseesseH.",
  ".HssssssH.",
  "..aaaaaa..",
  ".saaaaaas.",
  ".saaaaaas.",
  "..aaaaaa..",
  "..pppppp..",
  "..pp..pp..",
  "..pp..pp..",
  "..bb..bb..",
  ".bbb..bbb.",
];

SPRITES.boledjCrouch = [
  "..........",
  "..........",
  "..........",
  "..hhhhhh..",
  ".HhhhhhhH.",
  "HHssssssHH",
  ".HseesseH.",
  "..aaaaaa..",
  ".saaaaaas.",
  "..pppppp..",
  "..pp..pp..",
  "..bb..bb..",
  ".bbb..bbb.",
  "..........",
];

SPRITES.boledjJump = [
  "..hhhhhh..",
  ".HhhhhhhH.",
  "HHssssssHH",
  ".HseesseH.",
  ".HssssssH.",
  "s.aaaaaa.s",
  "sraaaaaars",
  "..aaaaaa..",
  "..aaaaaa..",
  "..pppppp..",
  ".pp....pp.",
  ".pp....pp.",
  ".bb....bb.",
  "bbb....bbb",
];

SPRITES.boledjFish = [
  "...FF....",
  ".FFFFFF..",
  "FFFFFFFFT",
  ".FFFFFF..",
  "...FF....",
];

CHARACTERS.push({
  id: "boledj",
  name: "BOLEDJ",
  weapon: "CANNA + PESCE",
  description: "Frustata di pesce",
  size: { w: 10, h: 14 },
  sprites: { stand: "boledj", crouch: "boledjCrouch", jump: "boledjJump" },
  palette: {
    h: "#2d241d",
    H: "#252a33",
    s: "#d9aa83",
    e: "#17191d",
    a: "#546f8d",
    p: "#30343c",
    b: "#1d2026",
    r: "#d9aa83",
  },
  projectile: {
    sprite: "boledjFish",
    palette: { F: "#79b7c8", T: "#d9e7e8" },
    whip: true,
    reach: 52,
    duration: 24,
    damage: 2,
    cooldown: 30,
    speed: 0,
    gravity: 0,
    bounces: 0,
    life: 24,
  },
});

// Conserviamo il comportamento standard e personalizziamo solo la frustata di Boledj.
const boledjBaseProjectileUpdate = Projectile.prototype.update;
Projectile.prototype.update = function () {
  if (!this.config.whip) {
    boledjBaseProjectileUpdate.call(this);
    return;
  }

  if (this.whipAge === undefined) {
    this.whipAge = 0;
    this.whipFacing = this.owner.facing;
    this.whipStartY = this.owner.y + (this.owner.crouching ? 8 : 5);
    this.w = SPRITES[this.config.sprite][0].length;
    this.h = SPRITES[this.config.sprite].length;
  }

  this.whipAge++;
  const duration = this.config.duration || 24;
  const half = duration / 2;
  const outward = this.whipAge <= half;
  const progress = outward ? this.whipAge / half : (duration - this.whipAge) / half;
  const eased = Math.sin(Math.max(0, progress) * Math.PI / 2);
  const handX = this.owner.x + (this.whipFacing === 1 ? this.owner.w - 1 : 1);
  const handY = this.owner.y + (this.owner.crouching ? 8 : 5);
  const distance = 5 + this.config.reach * eased;

  this.x = handX + this.whipFacing * distance - (this.whipFacing === -1 ? this.w : 0);
  this.y = handY - Math.sin(Math.max(0, progress) * Math.PI) * 12 - this.h / 2;
  this.life = duration - this.whipAge;
  if (this.whipAge >= duration) this.dead = true;
};

const boledjBaseProjectileDraw = Projectile.prototype.draw;
Projectile.prototype.draw = function (drawCtx) {
  if (!this.config.whip) {
    boledjBaseProjectileDraw.call(this, drawCtx);
    return;
  }

  const handX = Math.round(this.owner.x + (this.whipFacing === 1 ? this.owner.w - 1 : 1));
  const handY = Math.round(this.owner.y + (this.owner.crouching ? 8 : 5));
  const fishX = Math.round(this.x + this.w / 2);
  const fishY = Math.round(this.y + this.h / 2);

  // Canna corta in mano.
  drawCtx.strokeStyle = "#7a5638";
  drawCtx.lineWidth = 2;
  drawCtx.beginPath();
  drawCtx.moveTo(handX, handY + 2);
  drawCtx.lineTo(handX + this.whipFacing * 7, handY - 7);
  drawCtx.stroke();

  // Lenza: curva leggermente per dare l'impressione di una vera frustata.
  const rodTipX = handX + this.whipFacing * 7;
  const rodTipY = handY - 7;
  const midX = (rodTipX + fishX) / 2;
  const midY = Math.min(rodTipY, fishY) - 5;
  drawCtx.strokeStyle = "#d9e7e8";
  drawCtx.lineWidth = 1;
  drawCtx.beginPath();
  drawCtx.moveTo(rodTipX, rodTipY);
  drawCtx.quadraticCurveTo(midX, midY, fishX, fishY);
  drawCtx.stroke();

  drawSprite(
    drawCtx,
    SPRITES[this.config.sprite],
    this.x,
    this.y,
    this.config.palette,
    this.whipFacing === -1
  );
};
