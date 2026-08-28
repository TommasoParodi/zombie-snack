/**
 * Boss di fine livello. Entita' core (non un monkeypatch come i file dei personaggi):
 * riusa/estende le forme sprite del sistema pixel-art esistente, nessun asset esterno.
 * Non entra in game.zombies: e' un campo singolo dedicato (game.boss in game.js), con
 * collisione esplicita separata in resolveCollisions() invece di generalizzare l'array
 * condiviso per un'entita' con semantica diversa da uno zombie usa-e-getta (una sola
 * istanza alla volta, non muore uscendo dallo schermo, evoca rinforzi).
 *
 * Aspetto diverso per livello: i livelli sono infiniti, quindi non si disegna un boss
 * unico per livello ma si ruota su un roster fisso di 4 aspetti (BOSS_ROSTER), scelto
 * ciclicamente da bossConfigForLevel(level) — stesso principio di ZOMBIE_TYPES per la
 * varieta' dei nemici normali. Tutti e 4 restano sulla stessa griglia 10x14 di
 * SPRITES.zombie cosi' this.w/this.h (Boss) non cambiano formula in base all'aspetto.
 */

const BOSS_PALETTE_COLOSSO = { G: "#8a2a2a", R: "#ffcf4a", K: "#2a0f0f", V: "#c96a1f", D: "#5a1a1a" };

/** Testa enorme e bulbosa, corpo piccolo sotto: il classico "bobble head" mutante. */
SPRITES.bossTestone = [
  "..KKKKKK..",
  ".KWWWWWWK.",
  "KWWRWWRWWK",
  "KWWWWWWWWK",
  "KWWJJJJWWK",
  ".KWWWWWWK.",
  "..KKKKKK..",
  ".BBBBBBBB.",
  "BBBBBBBBBB",
  "ABBBBBBBBA",
  ".BBBBBBBB.",
  "..BB..BB..",
  "..BB..BB..",
  ".BBB..BBB.",
];
const BOSS_PALETTE_TESTONE = { K: "#1a0d05", W: "#d8d0b8", R: "#ff3a2a", J: "#f4e6b8", B: "#3a2418", A: "#5a3420" };

/** Testa e gambe riuse da SPRITES.zombie (coerenza "di famiglia"), torso corazzato con spuntoni. */
SPRITES.bossCorazzato = [
  "..GGGGGG..",
  ".GGGGGGGG.",
  ".GRGGGGRG.",
  ".GGGGGGGG.",
  ".GGKKKKGG.",
  "..SVVVVS..",
  "PPVVVVVVPP",
  "PPVVVVVVPP",
  "..VVVVVV..",
  "..DDDDDD..",
  "..DD..DD..",
  "..DD..DD..",
  "..GG..GG..",
  ".GGG..GGG.",
];
const BOSS_PALETTE_CORAZZATO = {
  G: "#4a6b3a",
  R: "#ff3a2a",
  K: "#101a10",
  V: "#5a7a49",
  D: "#2a3a1a",
  P: "#7a8290",
  S: "#e8ecf0",
};

/** Sagoma allampanata, braccia lunghe e sottili con punte affilate alle mani. */
SPRITES.bossFalce = [
  "...KKKK...",
  "..KGGGGK..",
  "..GRGGRG..",
  "..GGGGGG..",
  "...KKKK...",
  ".V.VVVV.V.",
  "V..VVVV..V",
  "F..VVVV..F",
  "..VVVVVV..",
  "..DDDDDD..",
  "..DD..DD..",
  "..DD..DD..",
  "..GG..GG..",
  ".GGG..GGG.",
];
const BOSS_PALETTE_FALCE = { K: "#141a10", G: "#7a8a6a", R: "#ff3a2a", V: "#2a3a1a", D: "#20280f", F: "#e8e4d0" };

/** Roster a rotazione: (level-1) % length sceglie l'aspetto, ciclico all'infinito. */
const BOSS_ROSTER = [
  { name: "COLOSSO", sprite: "zombie", palette: BOSS_PALETTE_COLOSSO },
  { name: "TESTONE", sprite: "bossTestone", palette: BOSS_PALETTE_TESTONE },
  { name: "CORAZZATO", sprite: "bossCorazzato", palette: BOSS_PALETTE_CORAZZATO },
  { name: "FALCE", sprite: "bossFalce", palette: BOSS_PALETTE_FALCE },
];

/** Crescita per livello, con cap espliciti: punto di partenza per il bilanciamento, non definitivo. */
function bossConfigForLevel(level) {
  const appearance = BOSS_ROSTER[(level - 1) % BOSS_ROSTER.length];
  return {
    name: appearance.name,
    sprite: appearance.sprite,
    palette: appearance.palette,
    hp: Math.round(50 + (level - 1) * 18),
    speed: Math.min(1.1, 0.55 + (level - 1) * 0.05),
    points: 200 + (level - 1) * 60,
    scale: Math.min(3.2, 2.4 + (level - 1) * 0.06),
    chargeSpeedMult: Math.min(3.5, 2.2 + (level - 1) * 0.08),
    summonInterval: Math.max(180, 420 - (level - 1) * 20),
    summonCount: level >= 4 ? 2 : 1,
  };
}

class Boss {
  constructor(cfg, fromLeft) {
    this.cfg = cfg;
    this.scale = cfg.scale;
    this.w = Math.round(10 * this.scale);
    this.h = Math.round(14 * this.scale);
    this.x = fromLeft ? -this.w : GAME_W + this.w;
    this.y = GROUND_Y - this.h;
    this.dir = fromLeft ? 1 : -1;
    this.baseSpeed = cfg.speed;
    this.hp = cfg.hp;
    this.maxHp = cfg.hp;
    // Forma compatibile con game.registerKill(zombie), che legge solo zombie.type.points
    // e zombie.x/y/w/h — il boss non ha bisogno di essere un vero Zombie per questo.
    this.type = { points: cfg.points };
    this.phase = "entering"; // "entering" | "patrol" | "charge"
    this.chargeTimer = 0;
    this.chargeCooldown = 200;
    this.summonTimer = cfg.summonInterval;
    this.hitFlash = 0;
    this.animTimer = 0;
    this.dead = false;
  }

  get hitbox() {
    return { x: this.x + this.w * 0.1, y: this.y, w: this.w * 0.8, h: this.h };
  }

  // Zona di pattuglia: il boss non esce mai dallo schermo, resta un fight focalizzato.
  get patrolMinX() {
    return 40;
  }

  get patrolMaxX() {
    return GAME_W - 40 - this.w;
  }

  update(game) {
    this.animTimer++;
    if (this.hitFlash > 0) this.hitFlash--;

    if (this.phase === "entering") {
      this.x += this.dir * (this.baseSpeed + 0.6);
      const targetX = GAME_W / 2 - this.w / 2;
      if ((this.dir === 1 && this.x >= targetX) || (this.dir === -1 && this.x <= targetX)) {
        this.phase = "patrol";
      }
    } else if (this.phase === "charge") {
      this.x += this.dir * this.baseSpeed * this.cfg.chargeSpeedMult;
      if (--this.chargeTimer <= 0) this.phase = "patrol";
    } else {
      this.x += this.dir * this.baseSpeed;
      if (this.x <= this.patrolMinX) {
        this.x = this.patrolMinX;
        this.dir = 1;
      }
      if (this.x >= this.patrolMaxX) {
        this.x = this.patrolMaxX;
        this.dir = -1;
      }

      if (--this.chargeCooldown <= 0 && game.player) {
        this.phase = "charge";
        this.dir = game.player.x < this.x ? -1 : 1;
        this.chargeTimer = 30;
        this.chargeCooldown = 240 + Math.floor(Math.random() * 120);
      }
    }

    // Stesso "barcollamento" degli zombie normali (entities.js, Zombie.update).
    this.y = GROUND_Y - this.h + Math.sin(this.animTimer * 0.12) * 1.4;

    if (--this.summonTimer <= 0) {
      this.summonTimer = this.cfg.summonInterval;
      for (let i = 0; i < this.cfg.summonCount; i++) {
        game.zombies.push(new Zombie("walker", Math.random() < 0.5, 0.2));
      }
    }
  }

  /** Stessa firma di Zombie.prototype.takeDamage (entities.js): scala hp, ritorna true se ucciso. */
  takeDamage(amount) {
    this.hp -= amount;
    this.hitFlash = 8;
    if (this.hp <= 0) this.dead = true;
    return this.hp <= 0;
  }

  draw(ctx) {
    const sprite = SPRITES[this.cfg.sprite];
    if (this.hitFlash > 5) {
      drawSpriteTinted(ctx, sprite, this.x, this.y, "#ffffff", this.dir === -1, this.scale);
      return;
    }
    drawSprite(ctx, sprite, this.x, this.y, this.cfg.palette, this.dir === -1, this.scale);
  }
}
