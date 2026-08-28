// Rifiniture del selettore personaggi: label uniformi e dentro la carta,
// anteprima centrata usando la larghezza reale dello sprite.

const baseMenuText = text;

function measureMenuTextWidth(str, size) {
  ctx.save();
  ctx.font = `bold ${Math.round(size * SCALE)}px "Courier New", monospace`;
  const width = ctx.measureText(str).width / SCALE;
  ctx.restore();
  return width;
}

function clipMenuLine(str, size, maxWidth = 138) {
  if (measureMenuTextWidth(str, size) <= maxWidth) return str;
  let clipped = str;
  while (clipped.length > 1 && measureMenuTextWidth(`${clipped}…`, size) > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return `${clipped}…`;
}

function wrapMenuLabel(str, size, maxWidth = 138) {
  const words = String(str).trim().split(/\s+/);
  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || measureMenuTextWidth(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === 1) break;
  }

  if (current && lines.length < 2) lines.push(current);

  // Se restano parole fuori, le accodiamo alla seconda riga e tronchiamo solo li'.
  const consumed = lines.join(" ").split(/\s+/).filter(Boolean).length;
  if (consumed < words.length && lines.length === 2) {
    lines[1] = `${lines[1]} ${words.slice(consumed).join(" ")}`;
  }

  return lines.slice(0, 2).map((line) => clipMenuLine(line, size, maxWidth));
}

text = function (str, x, y, options = {}) {
  const isCenteredMenuText =
    game.state === "menu" &&
    x === GAME_W / 2 &&
    options.align === "center";

  if (!isCenteredMenuText) {
    baseMenuText(str, x, y, options);
    return;
  }

  // Nome: dimensione fissa per tutti.
  if (y === 98) {
    baseMenuText(clipMenuLine(String(str), 13), x, y, { ...options, size: 13 });
    return;
  }

  // Arma: una riga, sempre stessa dimensione.
  if (y === 115) {
    baseMenuText(clipMenuLine(String(str), 7), x, y, { ...options, size: 7 });
    return;
  }

  // Descrizione: massimo due righe, entrambe con font identico per tutti i personaggi.
  if (y === 127) {
    const lines = wrapMenuLabel(String(str), 6);
    lines.forEach((line, index) => {
      baseMenuText(line, x, y + index * 7, { ...options, size: 6 });
    });
    return;
  }

  baseMenuText(str, x, y, options);
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

  // Luca90 ha una macchina larga: volutamente piu' grande dell'anteprima standard.
  const previewScale = selected.id === "luca90" ? 5 : 3;
  const spriteWidth = Math.max(...sprite.map((row) => row.length));
  const centeredX = GAME_W / 2 - (spriteWidth * previewScale) / 2;

  baseMenuDrawSprite(drawCtx, sprite, centeredX, y, palette, flip, previewScale);
};
