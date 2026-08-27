/**
 * Primo prototipo boss per Zombie Snack.
 * Tutto e' isolato qui per poter rimuovere/bilanciare il fight senza toccare
 * la logica base del gioco.
 */
(() => {
  const BOSS_TRIGGER_FRAME = 60 * 40; // ~40 secondi: placeholder finche' non esistono vere ondate
  const MAX_HP = 36;
  const BRAIN_OPEN_FRAMES = 150;
  const BRAIN_CLOSED_FRAMES = 210;

  class BossRock {
    constructor(x, y, targetX, targetY) {
      this.x = x;
      this.y = y;
      this.w = 7;
      this.h = 7;
      const dx = targetX - x;
      this.vx = dx / 55;
      this.vy = -4.7;
      this.gravity = 0.16;
      this.dead = false;
    }

    get hitbox() {
      return { x: this.x, y: this.y, w: this.w, h: this.h };
    }

    update() {
      this.vy += this.gravity;
      this.x += this.vx;
      this.y += this.vy;
      if (this.y > GROUND_Y + 12 || this.x < -20 || this.x > GAME_W + 20) this.dead = true;
    }

    draw(ctx) {
      ctx.fillStyle = "#5c4b3b";
      ctx.fillRect(Math.round(this.x), Math.round(this.y), this.w, this.h);
      ctx.fillStyle = "#8a745d";
      ctx.fillRect(Math.round(this.x + 1), Math.round(this.y + 1), 3, 2);
    }
  }

  class SnackBoss {
    constructor() {
      this.w = 54;
      this.h = 92;
      this.x = GAME_W - this.w - 8;
      this.y = GROUND_Y - this.h;
      this.maxHp = MAX_HP;
      this.hp = MAX_HP;
      this.dead = false;
      this.timer = 0;
      this.brainOpen = false;
      this.attackTimer = 95;
      this.hitFlash = 0;
      this.rocks = [];
      this.platforms = [
        { x: 182, y: 128, w: 38, h: 5 },
        { x: 224, y: 101, w: 34, h: 5 },
        { x: 265, y: 74, w: 31, h: 5 },
      ];
    }

    get bodyHitbox() {
      return { x: this.x + 6, y: this.y + 22, w: this.w - 12, h: this.h - 22 };
    }

    get brainHitbox() {
      return { x: this.x + 15, y: this.y + 5, w: 24, h: 18 };
    }

    get platformsVisible() {
      const cycle = BRAIN_CLOSED_FRAMES + BRAIN_OPEN_FRAMES;
      const phase = this.timer % cycle;
      return phase >= BRAIN_CLOSED_FRAMES - 55;
    }

    update(game) {
      this.timer++;
      if (this.hitFlash > 0) this.hitFlash--;

      const cycle = BRAIN_CLOSED_FRAMES + BRAIN_OPEN_FRAMES;
      const phase = this.timer % cycle;
      this.brainOpen = phase >= BRAIN_CLOSED_FRAMES;

      this.attackTimer--;
      if (this.attackTimer <= 0) {
        const p = game.player;
        this.rocks.push(new BossRock(this.x + 12, this.y + 28, p.x + p.w / 2, p.y + p.h / 2));
        this.attackTimer = this.brainOpen ? 78 : 105;
      }

      this.rocks.forEach((r) => r.update());
      this.rocks = this.rocks.filter((r) => !r.dead);

      for (const rock of this.rocks) {
        if (!rock.dead && rectsOverlap(rock.hitbox, game.player.hitbox)) {
          if (game.player.takeHit(rock.x)) {
            rock.dead = true;
            game.screenShake = 9;
          }
        }
      }

      if (rectsOverlap(this.bodyHitbox, game.player.hitbox)) {
        if (game.player.takeHit(this.x)) game.screenShake = 10;
      }
    }

    takeBrainDamage(amount, game) {
      if (!this.brainOpen || this.dead) return false;
      this.hp -= amount;
      this.hitFlash = 7;
      game.screenShake = 5;
      game.spawnGore(this.x + 27, this.y + 13);
      if (this.hp <= 0) {
        this.dead = true;
        this.rocks = [];
        game.score += 1000;
        game.screenShake = 28;
        for (let i = 0; i < 5; i++) game.spawnGore(this.x + 12 + i * 8, this.y + 22 + i * 11);
        return true;
      }
      return false;
    }

    draw(ctx) {
      // corpo gigante
      ctx.fillStyle = this.hitFlash > 0 ? "#d8efb4" : "#628f48";
      ctx.fillRect(Math.round(this.x + 8), Math.round(this.y + 25), 38, 63);
      ctx.fillRect(Math.round(this.x + 2), Math.round(this.y + 43), 10, 34);
      ctx.fillRect(Math.round(this.x + 42), Math.round(this.y + 38), 10, 39);

      // testa
      ctx.fillStyle = this.hitFlash > 0 ? "#efffd8" : "#78a958";
      ctx.fillRect(Math.round(this.x + 9), Math.round(this.y + 4), 36, 28);
      ctx.fillStyle = "#182018";
      ctx.fillRect(Math.round(this.x + 15), Math.round(this.y + 17), 5, 4);
      ctx.fillRect(Math.round(this.x + 35), Math.round(this.y + 17), 5, 4);
      ctx.fillRect(Math.round(this.x + 23), Math.round(this.y + 25), 13, 3);

      // cervello: nessuna scritta, quando lo vedi puoi colpire
      if (this.brainOpen) {
        ctx.fillStyle = "#f06a9b";
        ctx.fillRect(Math.round(this.x + 15), Math.round(this.y + 2), 24, 10);
        ctx.fillStyle = "#ff9bbb";
        ctx.fillRect(Math.round(this.x + 18), Math.round(this.y), 7, 5);
        ctx.fillRect(Math.round(this.x + 28), Math.round(this.y + 1), 8, 5);
        ctx.fillStyle = "#b93f70";
        ctx.fillRect(Math.round(this.x + 23), Math.round(this.y + 3), 2, 6);
        ctx.fillRect(Math.round(this.x + 32), Math.round(this.y + 2), 2, 7);
      } else {
        // cranio chiuso
        ctx.fillStyle = "#4f7a3c";
        ctx.fillRect(Math.round(this.x + 14), Math.round(this.y + 1), 26, 8);
      }

      this.rocks.forEach((r) => r.draw(ctx));
    }

    drawPlatforms(ctx) {
      if (!this.platformsVisible || this.dead) return;
      for (const p of this.platforms) {
        ctx.fillStyle = "#536544";
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = "#82966c";
        ctx.fillRect(p.x, p.y, p.w, 2);
      }
    }

    drawHealth(ctx) {
      if (this.dead) return;
      const x = 74;
      const y = 8;
      const w = 172;
      const ratio = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = "#111";
      ctx.fillRect(x - 2, y - 2, w + 4, 8);
      ctx.fillStyle = "#642f2b";
      ctx.fillRect(x, y, w, 4);
      ctx.fillStyle = "#d95745";
      ctx.fillRect(x, y, Math.round(w * ratio), 4);
    }
  }

  function landPlayerOnPlatforms(player, boss, oldBottom) {
    if (!boss || !boss.platformsVisible || player.vy < 0) return;
    const newBottom = player.y + player.h;
    for (const platform of boss.platforms) {
      const horizontal = player.x + player.w - 2 > platform.x && player.x + 2 < platform.x + platform.w;
      const crossedTop = oldBottom <= platform.y + 2 && newBottom >= platform.y;
      if (horizontal && crossedTop) {
        player.y = platform.y - player.h;
        player.vy = 0;
        player.onGround = true;
        player.jumpsLeft = 2;
        return;
      }
    }
  }

  const originalStartGame = game.startGame.bind(game);
  game.startGame = function () {
    originalStartGame();
    this.boss = null;
    this.bossDefeated = false;
  };

  const originalPlayerUpdate = Player.prototype.update;
  Player.prototype.update = function (currentGame) {
    const oldBottom = this.y + this.h;
    originalPlayerUpdate.call(this, currentGame);
    if (currentGame.boss && !currentGame.boss.dead) landPlayerOnPlatforms(this, currentGame.boss, oldBottom);
  };

  const originalUpdatePlaying = game.updatePlaying.bind(game);
  game.updatePlaying = function () {
    originalUpdatePlaying();
    if (this.state !== "playing") return;

    if (!this.boss && !this.bossDefeated && this.frame >= BOSS_TRIGGER_FRAME) {
      this.boss = new SnackBoss();
      this.zombies = [];
      this.spawnTimer = 180;
      this.screenShake = 18;
    }

    if (!this.boss || this.boss.dead) return;

    this.boss.update(this);

    // Durante il boss limitiamo drasticamente gli zombie normali.
    if (this.zombies.length > 2) this.zombies.splice(0, this.zombies.length - 2);

    // I proiettili fanno danno solo al cervello esposto. Il corpo del boss e' immune.
    for (const projectile of this.projectiles) {
      if (projectile.dead) continue;
      if (rectsOverlap(projectile.hitbox, this.boss.brainHitbox)) {
        projectile.dead = true;
        if (this.boss.brainOpen) {
          const killed = this.boss.takeBrainDamage(projectile.config.damage, this);
          if (killed) {
            this.bossDefeated = true;
            this.boss = null;
            this.spawnTimer = 90;
          }
        } else {
          this.spawnImpact(projectile.x, projectile.y);
        }
      }
    }
  };

  const originalDraw = game.draw.bind(game);
  game.draw = function () {
    originalDraw();
    if (!this.boss || this.boss.dead || this.state === "menu") return;

    // Il draw originale ripristina la trasformazione del mondo; la rimettiamo esplicitamente.
    ctx.setTransform(SCALE, 0, 0, SCALE, this.shakeX * SCALE, this.shakeY * SCALE);
    this.boss.drawPlatforms(ctx);
    this.boss.draw(ctx);
    this.boss.drawHealth(ctx);
  };
})();
