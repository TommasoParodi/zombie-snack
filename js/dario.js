// Dario: vestito da pallavolista, lancia palloni da pallavolo. Nessun super: come
// Boledj/EB/Carota, riusa il corpo umanoide condiviso (hero/heroCrouch/heroJump) con
// una palette propria (maglia blu, pantaloncini bianchi) e un'arma nuova.

// Pallone da pallavolo: base bianca, cuciture blu curve.
SPRITES.darioBall = [
  "..WWWW..",
  ".WWbbWW.",
  "WWbWWbWW",
  "WbWWWWbW",
  "WbWWWWbW",
  "WWbWWbWW",
  ".WWbbWW.",
  "..WWWW..",
];

CHARACTERS.push({
  id: "dario",
  name: "DARIO",
  weapon: "PALLONI DA PALLAVOLO",
  description: "Schiacciate veloci",
  size: { w: 10, h: 14 },
  sprites: { stand: "hero", crouch: "heroCrouch", jump: "heroJump" },
  palette: { h: "#3a2a1a", s: "#e0ab7c", e: "#1b1b1b", a: "#1f5fb0", p: "#f4f1e8", b: "#1b1b1b", r: "#e0ab7c" },
  projectile: {
    sprite: "darioBall",
    palette: { W: "#f4f1e8", b: "#1f5fb0" },
    speed: 4.5,
    gravity: 0.09,
    damage: 1,
    cooldown: 16,
    bounces: 1,
  },
});
