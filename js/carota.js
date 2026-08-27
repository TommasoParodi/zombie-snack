// CAROTA: personaggio segreto. Non e' in CHARACTERS finche' non si sblocca inserendo,
// nel menu (schermata iniziale), la sequenza SU SU GIU' SU SU con la croce/tastiera.
// Una volta sbloccato resta disponibile per sempre (localStorage), il carosello lo
// mostra da solo: non serve toccare updateMenu/drawMenu/prevCharacter/nextCharacter,
// CHARACTERS.push() e' l'unica cosa che serve (vedi CLAUDE.md).

SPRITES.cidFile = [
  ".WWWWc..",
  ".WWWWWW.",
  ".WllllW.",
  ".WllllW.",
  ".WllllW.",
  ".WllllW.",
  ".WWWWWW.",
  "........",
];

const CAROTA_UNLOCK_KEY = "zombie-snack-carota-unlocked";
const CAROTA_SEQUENCE = ["up", "up", "down", "up", "up"];

const CAROTA_CHARACTER = {
  id: "carota",
  name: "CAROTA",
  weapon: "CID",
  description: "Personaggio segreto",
  size: { w: 10, h: 14 },
  sprites: { stand: "hero", crouch: "heroCrouch", jump: "heroJump" },
  palette: { h: "#4a8f3a", s: "#e08a3a", e: "#1b1b1b", a: "#d9642c", p: "#2f4a1f", b: "#1b1b1b", r: "#e08a3a" },
  projectile: {
    sprite: "cidFile",
    palette: { W: "#f4f1e8", l: "#8a8a8a", c: "#d8d2c0" },
    speed: 4,
    gravity: 0.08,
    damage: 1,
    cooldown: 18,
    bounces: 1,
  },
};

function carotaUnlocked() {
  return localStorage.getItem(CAROTA_UNLOCK_KEY) === "1";
}

// Sbloccato in una sessione precedente: compare nel carosello fin dall'avvio.
if (carotaUnlocked()) CHARACTERS.push(CAROTA_CHARACTER);

let carotaSecretBuffer = [];

function unlockCarota() {
  if (carotaUnlocked()) return;
  localStorage.setItem(CAROTA_UNLOCK_KEY, "1");
  CHARACTERS.push(CAROTA_CHARACTER);
  game.carotaUnlockFlash = 150;
}

const baseCarotaUpdateMenu = game.updateMenu.bind(game);
game.updateMenu = function () {
  baseCarotaUpdateMenu();

  if (this.carotaUnlockFlash > 0) this.carotaUnlockFlash--;
  if (carotaUnlocked()) return;

  const pressedDir = Input.wasPressed("up") ? "up" : Input.wasPressed("down") ? "down" : null;
  if (!pressedDir) return;

  carotaSecretBuffer.push(pressedDir);
  if (carotaSecretBuffer.length > CAROTA_SEQUENCE.length) carotaSecretBuffer.shift();

  if (
    carotaSecretBuffer.length === CAROTA_SEQUENCE.length &&
    carotaSecretBuffer.every((dir, i) => dir === CAROTA_SEQUENCE[i])
  ) {
    unlockCarota();
    carotaSecretBuffer = [];
  }
};

const baseCarotaDrawMenu = game.drawMenu.bind(game);
game.drawMenu = function () {
  baseCarotaDrawMenu();
  if (!this.carotaUnlockFlash || this.carotaUnlockFlash <= 0) return;

  const boxW = 190;
  const boxH = 40;
  const boxX = GAME_W / 2 - boxW / 2;
  const boxY = GAME_H / 2 - boxH / 2;

  ctx.fillStyle = "rgba(10,16,22,0.95)";
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.strokeStyle = COLORS.accent;
  ctx.lineWidth = 1;
  ctx.strokeRect(boxX + 0.5, boxY + 0.5, boxW - 1, boxH - 1);

  text("PERSONAGGIO SBLOCCATO!", GAME_W / 2, boxY + 9, { size: 10, align: "center", color: COLORS.accent });
  text("CAROTA", GAME_W / 2, boxY + 23, { size: 11, align: "center", color: "#ffe066" });
};
