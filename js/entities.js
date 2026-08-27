/** Costanti del mondo di gioco (in pixel "interni", non pixel dello schermo). */
const GAME_W = 320;
const GAME_H = 180;
const GROUND_Y = 152; // altezza del terreno: i piedi appoggiano qui
const GRAVITY = 0.42;

/** Tipi di zombie: colore, velocita', vita e punti. */
const ZOMBIE_TYPES = {
  walker: { speed: 0.45, hp: 1, points: 10, scale: 1, palette: ZOMBIE_PALETTE },
  runner: { speed: 1.05, hp: 1, points: 15, scale: 1, palette: ZOMBIE_PALETTE_FAST },
  brute: { speed: 0.3, hp: 4, points: 40, scale: 1.4, palette: ZOMBIE_PALETTE_BIG },
};

/** Controlla se due rettangoli si sovrappongono. */
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

class Player {
  constructor(character) {
    this.character = character;
    this.w = 10;
    this.h = 14;
    this.x = 40;
    this.y = GROUND_Y - this.h;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1; // 1 = destra, -1 = sinistra
    this.onGround = true;
    this.jumpsLeft = 2;
    this.crouching = false;
    this.lives = 3;
    this.invulnerable = 0; // frame di invulnerabilita' dopo un colpo
    this.attackCooldown = 0;
    this.dodgeTimer = 0;
    this.dodgeCooldown = 0;
    this.animTimer = 0;
  }

  /** Rettangolo di collisione: piu' basso quando il personaggio e' accovacciato. */
  get hitbox() {
    const h = this.crouching ? 9 : this.h;
    return { x: this.x + 1, y: this.y + (this.h - h), w: this.w - 2, h };
  }

  update(game) {
    this.animTimer++;
    if (this.invulnerable > 0) this.invulnerable--;
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.dodgeCooldown > 0) this.dodgeCooldown--;

    const wantsLeft = Input.isDown("left");
    const wantsRight = Input.isDown("right");
    this.crouching = Input.isDown("down") && this.onGround && this.dodgeTimer === 0;

    // --- Schivata (dash) ---
    if (Input.wasPressed("dodge") && this.dodgeCooldown === 0) {
      this.dodgeTimer = 12;
      this.dodgeCooldown = 45;
      this.invulnerable = Math.max(this.invulnerable, 14);
      game.spawnDust(this.x + this.w / 2, GROUND_Y);
    }

    if (this.dodgeTimer > 0) {
      this.dodgeTimer--;
      this.vx = this.facing * 4.2;
    } else {
      const speed = this.crouching ? 0.7 : 1.6;
      this.vx = 0;
      if (wantsLeft) this.vx -= speed;
      if (wantsRight) this.vx += speed;
      if (this.vx !== 0) this.facing = this.vx > 0 ? 1 : -1;
    }

    // --- Salto (doppio salto) ---
    if ((Input.wasPressed("jump") || Input.wasPressed("up")) && this.jumpsLeft > 0) {
      this.vy = -6.4;
      this.jumpsLeft--;
      this.onGround = false;
    }

    // --- Attacco: lancio dell'oggetto ---
    if (Input.isDown("attack") && this.attackCooldown === 0) {
      this.throwProjectile(game);
    }

    // --- Fisica ---
    this.vy += GRAVITY;
    this.x += this.vx;
    this.y += this.vy;

    // Limiti laterali dello schermo
    this.x = Math.max(0, Math.min(GAME_W - this.w, this.x));

    // Terreno
    if (this.y + this.h >= GROUND_Y) {
      this.y = GROUND_Y - this.h;
      this.vy = 0;
      if (!this.onGround) game.spawnDust(this.x + this.w / 2, GROUND_Y);
      this.onGround = true;
      this.jumpsLeft = 2;
    } else {
      this.onGround = false;
    }
  }

  throwProjectile(game) {
    const config = this.character.projectile;
    this.attackCooldown = config.cooldown;

    const originX = this.x + (this.facing === 1 ? this.w - 2 : -4);
    const originY = this.y + (this.crouching ? 8 : 4);

    game.projectiles.push(
      new Projectile({
        x: originX,
        y: originY,
        vx: this.facing * config.speed,
        vy: -1.1,
        config,
      })
    );
  }

  /** Applica un colpo. Ritorna true se il danno e' stato subito davvero. */
  takeHit(fromX) {
    if (this.invulnerable > 0 || this.dodgeTimer > 0) return false;
    this.lives--;
    this.invulnerable = 90;
    this.vy = -3.2;
    this.vx = this.x < fromX ? -2.5 : 2.5;
    return true;
  }

  draw(ctx) {
    // Lampeggio quando si e' invulnerabili: 3 frame visibile, 3 nascosto.
    if (this.invulnerable > 0 && Math.floor(this.invulnerable / 3) % 2 === 1) return;

    let sprite = SPRITES.hero;
    if (this.crouching) sprite = SPRITES.heroCrouch;
    else if (!this.onGround) sprite = SPRITES.heroJump;

    if (this.dodgeTimer > 0) {
      // Scia della schivata
      drawSpriteTinted(ctx, sprite, this.x - this.facing * 4, this.y, "rgba(255,255,255,0.25)", this.facing === -1);
    }

    drawSprite(ctx, sprite, this.x, this.y, this.character.palette, this.facing === -1);
  }
}

class Projectile {
  constructor({ x, y, vx, vy, config }) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.config = config;
    this.w = 8;
    this.h = 7;
    this.bouncesLeft = config.bounces;
    this.spin = 0;
    this.dead = false;
  }

  get hitbox() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  update() {
    this.spin++;
    this.vy += this.config.gravity;
    this.x += this.vx;
    this.y += this.vy;

    if (this.y + this.h >= GROUND_Y) {
      if (this.bouncesLeft > 0) {
        this.bouncesLeft--;
        this.y = GROUND_Y - this.h;
        this.vy = -Math.abs(this.vy) * 0.7 - 1.2;
      } else {
        this.dead = true;
      }
    }

    if (this.x < -12 || this.x > GAME_W + 12) this.dead = true;
  }

  draw(ctx) {
    drawSprite(ctx, SPRITES[this.config.sprite], this.x, this.y, this.config.palette, this.vx < 0);
  }
}

class Zombie {
  constructor(typeName, fromLeft, speedBonus = 0) {
    const type = ZOMBIE_TYPES[typeName];
    this.typeName = typeName;
    this.type = type;
    this.scale = type.scale;
    this.w = Math.round(10 * this.scale);
    this.h = Math.round(14 * this.scale);
    this.x = fromLeft ? -this.w : GAME_W + this.w;
    this.y = GROUND_Y - this.h;
    this.dir = fromLeft ? 1 : -1;
    this.speed = type.speed + speedBonus;
    this.hp = type.hp;
    this.hitFlash = 0;
    this.animTimer = Math.floor(Math.random() * 40);
    this.dead = false;
  }

  get hitbox() {
    return { x: this.x + 1, y: this.y, w: this.w - 2, h: this.h };
  }

  update() {
    this.animTimer++;
    if (this.hitFlash > 0) this.hitFlash--;

    const stagger = this.hitFlash > 0 ? 0.3 : 1; // rallenta quando viene colpito
    this.x += this.dir * this.speed * stagger;

    // Ondeggia camminando (effetto zombie barcollante)
    const bob = Math.sin(this.animTimer * 0.18) * 1;
    this.y = GROUND_Y - this.h + bob;

    if (this.x < -40 || this.x > GAME_W + 40) this.dead = true;
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.hitFlash = 8;
    if (this.hp <= 0) this.dead = true;
    return this.hp <= 0;
  }

  draw(ctx) {
    if (this.hitFlash > 5) {
      drawSpriteTinted(ctx, SPRITES.zombie, this.x, this.y, "#ffffff", this.dir === -1, this.scale);
      return;
    }
    drawSprite(ctx, SPRITES.zombie, this.x, this.y, this.type.palette, this.dir === -1, this.scale);
  }
}

class Particle {
  constructor(x, y, vx, vy, color, life) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.life = life;
    this.dead = false;
  }

  update() {
    this.vy += 0.18;
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
    if (this.life <= 0) this.dead = true;
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.fillRect(Math.round(this.x), Math.round(this.y), 1, 1);
  }
}

class FloatingText {
  constructor(x, y, text, color = "#ffe066") {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.life = 40;
    this.dead = false;
  }

  update() {
    this.y -= 0.4;
    this.life--;
    if (this.life <= 0) this.dead = true;
  }

  draw() {
    text(this.text, this.x, this.y, { size: 7, color: this.color, align: "center" });
  }
}
