// Rifiniture visive di Silvia: barattolo di senape più riconoscibile.

SPRITES.mustardJar = [
  "....CCCCCCCC....",
  "...CCCCCCCCCC...",
  "...DDDDDDDDDD...",
  "..WWWWWWWWWWWW..",
  ".WYYYYYYYYYYYYW.",
  "WYYYYYYYYYYYYYYW",
  "WYYYLLLLLLLLYYYW",
  "WYYLWWWWWWWWLYYW",
  "WYYLWWWWWWWWLYYW",
  "WYYYLLLLLLLLYYYW",
  "WYYYYYYYYYYYYYYW",
  "WYYYYYYYYYYYYYYW",
  ".WYYYYYYYYYYYYW.",
  "..WWWWWWWWWWWW..",
  "...WWWWWWWWWW...",
];

MustardJarEffect.prototype.draw = function (ctx) {
  const palette = {
    C: "#bfc3c7", // tappo metallico
    D: "#777d82", // bordo/scanalature del tappo
    W: "#f4f0dc", // vetro/etichetta
    Y: "#e9c828", // senape
    L: "#8b6518", // bordo etichetta
  };

  const scale = 2;
  drawSprite(ctx, SPRITES.mustardJar, this.x, this.y, palette, this.facing === -1, scale);

  // Etichetta vera e propria: la parola rende immediatamente riconoscibile il barattolo.
  const labelX = this.x + 7 * scale;
  const labelY = this.y + 7 * scale;
  ctx.save();
  ctx.fillStyle = "#fff8df";
  ctx.fillRect(Math.round(this.x + 4 * scale), Math.round(this.y + 7 * scale), 8 * scale, 3 * scale);
  ctx.strokeStyle = "#6f5013";
  ctx.lineWidth = 1;
  ctx.strokeRect(Math.round(this.x + 4 * scale) + 0.5, Math.round(this.y + 7 * scale) + 0.5, 8 * scale - 1, 3 * scale - 1);
  ctx.fillStyle = "#6a4b0d";
  ctx.font = "bold 4px Courier New, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("SENAPE", Math.round(labelX + scale), Math.round(labelY + 3));
  ctx.restore();
};
