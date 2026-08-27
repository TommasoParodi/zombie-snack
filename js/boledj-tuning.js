// Rifinitura Boledj: lancio teso, gittata maggiore e ricarica piu' lenta.
const boledjCharacter = CHARACTERS.find((character) => character.id === "boledj");
if (boledjCharacter) {
  boledjCharacter.projectile.reach = 80; // oltre +50% rispetto ai 52 originali
  boledjCharacter.projectile.cooldown = 60; // ricarica a meta' velocita'
}

const boledjTunedBaseUpdate = Projectile.prototype.update;
Projectile.prototype.update = function () {
  boledjTunedBaseUpdate.call(this);
  if (!this.config.whip || this.dead) return;

  // Il pesce viaggia dritto all'altezza della mano: niente traiettoria a campana.
  const handY = this.owner.y + (this.owner.crouching ? 8 : 5);
  this.y = handY - this.h / 2;
};

const boledjTunedBaseDraw = Projectile.prototype.draw;
Projectile.prototype.draw = function (drawCtx) {
  if (!this.config.whip) {
    boledjTunedBaseDraw.call(this, drawCtx);
    return;
  }

  const handX = Math.round(this.owner.x + (this.whipFacing === 1 ? this.owner.w - 1 : 1));
  const handY = Math.round(this.owner.y + (this.owner.crouching ? 8 : 5));
  const rodTipX = handX + this.whipFacing * 7;
  const rodTipY = handY - 2;
  const fishX = Math.round(this.x + this.w / 2);
  const fishY = Math.round(this.y + this.h / 2);

  // Canna e lenza dritte: l'attacco deve sembrare una frustata tesa.
  drawCtx.strokeStyle = "#7a5638";
  drawCtx.lineWidth = 2;
  drawCtx.beginPath();
  drawCtx.moveTo(handX, handY + 2);
  drawCtx.lineTo(rodTipX, rodTipY);
  drawCtx.stroke();

  drawCtx.strokeStyle = "#d9e7e8";
  drawCtx.lineWidth = 1;
  drawCtx.beginPath();
  drawCtx.moveTo(rodTipX, rodTipY);
  drawCtx.lineTo(fishX, fishY);
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
