/**
 * Sprite pixel art "fatti a mano".
 * Ogni sprite e' un array di stringhe: 1 carattere = 1 pixel.
 * Il carattere e' una chiave della palette, "." significa trasparente.
 */

const SPRITES = {
  hero: [
    "..hhhhhh..",
    ".hhhhhhhh.",
    ".sssssssh.",
    ".seesseesh",
    ".ssssssss.",
    "..aaaaaa..",
    ".saaaaaas.",
    ".saaaaaas.",
    "..aaaaaa..",
    "..pppppp..",
    "..pp..pp..",
    "..pp..pp..",
    "..bb..bb..",
    ".bbb..bbb.",
  ],

  heroCrouch: [
    "..........",
    "..........",
    "..........",
    "..hhhhhh..",
    ".hhhhhhhh.",
    ".ssssssss.",
    ".seesseess",
    "..aaaaaa..",
    ".saaaaaas.",
    "..pppppp..",
    "..pp..pp..",
    "..bb..bb..",
    ".bbb..bbb.",
    "..........",
  ],

  heroJump: [
    "..hhhhhh..",
    ".hhhhhhhh.",
    ".sssssssh.",
    ".seesseesh",
    ".ssssssss.",
    "s.aaaaaa.s",
    "sraaaaaars",
    "..aaaaaa..",
    "..aaaaaa..",
    "..pppppp..",
    ".pp....pp.",
    ".pp....pp.",
    ".bb....bb.",
    "bbb....bbb",
  ],

  zombie: [
    "..GGGGGG..",
    ".GGGGGGGG.",
    ".GRGGGGRG.",
    ".GGGGGGGG.",
    ".GGKKKKGG.",
    "..VVVVVV..",
    "GGVVVVVVGG",
    "GGVVVVVVGG",
    "..VVVVVV..",
    "..DDDDDD..",
    "..DD..DD..",
    "..DD..DD..",
    "..GG..GG..",
    ".GGG..GGG.",
  ],

  // Proiettile di Berto: tazzina di caffe'
  cup: [
    ".WWWWW..",
    ".WCCCW..",
    ".WWWWWH.",
    ".WWWWWHH",
    ".WWWWWH.",
    "..WWW...",
    "........",
  ],

  // Proiettile di Tommen: paperella di gomma
  duck: [
    ".....YY.",
    "....YYYY",
    "....YBYO",
    "..YYYYYY",
    ".YYYYYYY",
    "..YYYYY.",
    "...WWW..",
  ],

  // Proiettile di Pruzzo: un pugno chiuso
  fist: [
    "..FFFF..",
    ".FnFFnF.",
    "FFFFFFFF",
    "FFFFFFFF",
    ".FFFFFF.",
    "..FFFF..",
  ],

  // Eroe alto (Pruzzo): stessa posa di "hero" ma con torso e gambe piu' lunghi.
  heroTall: [
    "..hhhhhh..",
    ".hhhhhhhh.",
    ".sssssssh.",
    ".seesseesh",
    ".ssssssss.",
    "..aaaaaa..",
    ".saaaaaas.",
    ".saaaaaas.",
    ".saaaaaas.",
    ".saaaaaas.",
    "..aaaaaa..",
    "..pppppp..",
    "..pp..pp..",
    "..pp..pp..",
    "..pp..pp..",
    "..bb..bb..",
    ".bbb..bbb.",
  ],

  heroTallCrouch: [
    "..........",
    "..........",
    "..........",
    "..hhhhhh..",
    ".hhhhhhhh.",
    ".ssssssss.",
    ".seesseess",
    "..aaaaaa..",
    ".saaaaaas.",
    ".saaaaaas.",
    ".saaaaaas.",
    "..pppppp..",
    "..pp..pp..",
    "..pp..pp..",
    "..bb..bb..",
    ".bbb..bbb.",
    "..........",
  ],

  heroTallJump: [
    "..hhhhhh..",
    ".hhhhhhhh.",
    ".sssssssh.",
    ".seesseesh",
    ".ssssssss.",
    "s.aaaaaa.s",
    "sraaaaaars",
    "..aaaaaa..",
    "..aaaaaa..",
    "..aaaaaa..",
    "..aaaaaa..",
    "..pppppp..",
    ".pp....pp.",
    ".pp....pp.",
    ".pp....pp.",
    ".bb....bb.",
    "bbb....bbb",
  ],

  /**
   * Cuore delle vite (9 x 8 pixel): due gobbe in alto, punta in basso.
   * o = contorno scuro, R = rosso pieno, L = riflesso chiaro.
   */
  heart: [
    ".oo...oo.",
    "oLLo.oRRo",
    "oLRRRRRRo",
    "oRRRRRRRo",
    ".oRRRRRo.",
    "..oRRRo..",
    "...oRo...",
    "....o....",
  ],

  tombstone: [
    "..MMMM..",
    ".MMMMMM.",
    "MMMMMMMM",
    "MMMmMMMM",
    "MMmmmMMM",
    "MMMmMMMM",
    "MMMMMMMM",
    "MMMMMMMM",
  ],
};

/** Palette di colori per i due personaggi giocabili. */
const CHARACTERS = [
  {
    id: "berto",
    name: "BERTO",
    weapon: "TAZZE DI CAFFE",
    description: "Lancio veloce e teso",
    size: { w: 10, h: 14 },
    sprites: { stand: "hero", crouch: "heroCrouch", jump: "heroJump" },
    palette: { h: "#3a2a1a", s: "#e8b98c", e: "#1b1b1b", a: "#d94f3d", p: "#3b4a6b", b: "#2b2b33", r: "#e8b98c" },
    projectile: {
      sprite: "cup",
      palette: { W: "#f4f4f4", C: "#6b3b1f", H: "#d0d0d0" },
      speed: 4.2,
      gravity: 0.05,
      damage: 1,
      cooldown: 16,
      bounces: 0,
    },
  },
  {
    id: "tommen",
    name: "TOMMEN",
    weapon: "PAPERELLE",
    description: "Colpo forte che rimbalza",
    size: { w: 10, h: 14 },
    sprites: { stand: "hero", crouch: "heroCrouch", jump: "heroJump" },
    palette: { h: "#f2d14a", s: "#f0c9a0", e: "#1b1b1b", a: "#3fa9d9", p: "#2f3b4a", b: "#22252b", r: "#f0c9a0" },
    projectile: {
      sprite: "duck",
      palette: { Y: "#f7d13c", B: "#1b1b1b", O: "#e8862c", W: "#ffffff" },
      speed: 3.2,
      gravity: 0.11,
      damage: 2,
      cooldown: 26,
      bounces: 1,
    },
  },
  {
    id: "pruzzo",
    name: "PRUZZO",
    weapon: "PUGNI",
    description: "Pugno corto ma durissimo",
    size: { w: 10, h: 17 },
    sprites: { stand: "heroTall", crouch: "heroTallCrouch", jump: "heroTallJump" },
    palette: { h: "#2a1f14", s: "#e0ab7c", e: "#1b1b1b", a: "#5a6b3a", p: "#2b2b2b", b: "#1b1b1b", r: "#e0ab7c" },
    projectile: {
      sprite: "fist",
      palette: { F: "#e0ab7c", n: "#a8703f" },
      // Arma "attaccata al corpo": non vola via, resta ancorata davanti a Pruzzo
      // per la durata del pugno invece di muoversi in autonomia.
      melee: true,
      // Braccio lungo: il pugno si allunga ben oltre il corpo (3 volte la distanza base).
      reach: 16,
      speed: 0,
      gravity: 0,
      damage: 3,
      cooldown: 18,
      bounces: 0,
      life: 10,
    },
  },
];

const ZOMBIE_PALETTE = {
  G: "#5aa049",
  R: "#e04b3a",
  K: "#1d2a1a",
  V: "#7a5aa0",
  D: "#3c4a2f",
};

const ZOMBIE_PALETTE_FAST = {
  G: "#8fbf4a",
  R: "#ffd24a",
  K: "#1d2a1a",
  V: "#b03a3a",
  D: "#4a4a2f",
};

const ZOMBIE_PALETTE_BIG = {
  G: "#3f7a4f",
  R: "#ff5a3a",
  K: "#101a10",
  V: "#4a3a6b",
  D: "#2a3324",
};

/** Cuore pieno e cuore vuoto (vita persa). */
const HEART_PALETTE = { o: "#3a0f0f", R: "#e04b3a", L: "#ff8a76" };
const HEART_PALETTE_EMPTY = { o: "#141519", R: "#33343a", L: "#43454c" };

/**
 * Disegna uno sprite pixel per pixel.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string[]} sprite mappa di caratteri
 * @param {number} x posizione X (in pixel di gioco)
 * @param {number} y posizione Y
 * @param {Record<string,string>} palette mappa carattere -> colore
 * @param {boolean} flip se true specchia orizzontalmente
 * @param {number} scale dimensione di ogni pixel
 */
function drawSprite(ctx, sprite, x, y, palette, flip = false, scale = 1) {
  const baseX = Math.round(x);
  const baseY = Math.round(y);

  for (let row = 0; row < sprite.length; row++) {
    const line = sprite[row];
    for (let col = 0; col < line.length; col++) {
      const key = line[col];
      if (key === ".") continue;
      const color = palette[key];
      if (!color) continue;

      const drawCol = flip ? line.length - 1 - col : col;
      ctx.fillStyle = color;
      ctx.fillRect(baseX + drawCol * scale, baseY + row * scale, scale, scale);
    }
  }
}

/** Disegna lo sprite tingendolo di un colore unico (usato per il flash del danno). */
function drawSpriteTinted(ctx, sprite, x, y, color, flip = false, scale = 1) {
  const baseX = Math.round(x);
  const baseY = Math.round(y);

  ctx.fillStyle = color;
  for (let row = 0; row < sprite.length; row++) {
    const line = sprite[row];
    for (let col = 0; col < line.length; col++) {
      if (line[col] === ".") continue;
      const drawCol = flip ? line.length - 1 - col : col;
      ctx.fillRect(baseX + drawCol * scale, baseY + row * scale, scale, scale);
    }
  }
}
