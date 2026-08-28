// Rifiniture del selettore personaggi: le label restano dentro la carta e
// l'anteprima usa la larghezza reale dello sprite invece di assumere 10 px.

const baseMenuText = text;

function measureMenuTextWidth(str, size) {
  ctx.save();
  ctx.font = `bold ${Math.round(size * SCALE)}px "Courier New", monospace`;
  const width = ctx.measureText(str).width / SCALE;
  ctx.restore();
  return width;
}

function fitMenuLabel(str, requestedSize, maxWidth = 138) {
  let size = requestedSize;
  while (size > 4 && measureMenuTextWidth(str, size) > maxWidth) size -= 0.25;

  if (measureMenuTextWidth(str, size) <= maxWidth) return { str, size };

  let clipped = str;
  while (clipped.length > 1 && measureMenuTextWidth(`${clipped}…`, size) > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return { str: `${clipped}…`, size };
}

text = function (str, x, y, options = {}) {
  const isCharacterCardLabel =
    game.state === "menu" &&
    x === GAME_W / 2 &&
    y >= 95 &&
    y <= 132 &&
    options.align === "center";

  if (!isCharacterCardLabel) {
    baseMenuText(str, x, y, options);
    return;
  }

  const fitted = fitMenuLabel(String(str), options.size ?? 8);
  baseMenuText(fitted.str, x, y, { ...options, size: fitted.size });
};

const baseMenuDrawSprite = drawSprite;
drawSprite = function (drawCtx, sprite, x, y, palette, flip = false, scale = 1) {
  const selected = game.state === "menu" ? CHARACTERS[game.selectedCharacter] : null;
  const isCharacterPreview =
    selected &&
    scale === 3 &&
    sprite === SPRITES[selected.sprites.stand];

  if (!isCharacterPreview) {
    baseMenuDrawSprite(drawCtx, sprite, x, y, palette, flip, scale);
    return;
  }

  // Luca90 ha una macchina larga: la facciamo volutamente molto piu' grande
  // dell'anteprima standard. Tutti gli sprite vengono comunque centrati davvero.
  const previewScale = selected.id === "luca90" ? 5 : 3;
  const spriteWidth = Math.max(...sprite.map((row) => row.length));
  const centeredX = GAME_W / 2 - (spriteWidth * previewScale) / 2;

  baseMenuDrawSprite(drawCtx, sprite, centeredX, y, palette, flip, previewScale);
};
