// Collisioni speciali per la frustata di Boledj: puo' colpire piu' zombie nella stessa oscillazione,
// ma ogni zombie viene danneggiato al massimo una volta per singola frustata.
const boledjBaseResolveCollisions = game.resolveCollisions.bind(game);

game.resolveCollisions = function () {
  const whipProjectiles = this.projectiles.filter((projectile) => projectile.config && projectile.config.whip && !projectile.dead);

  // Gestiamo separatamente le frustate, evitando che la collisione standard le distrugga al primo impatto.
  for (const projectile of whipProjectiles) {
    if (!projectile.hitZombies) projectile.hitZombies = new Set();

    for (const zombie of this.zombies) {
      if (zombie.dead || projectile.hitZombies.has(zombie)) continue;
      if (!rectsOverlap(projectile.hitbox, zombie.hitbox)) continue;

      projectile.hitZombies.add(zombie);
      const killed = zombie.takeDamage(projectile.config.damage);
      this.spawnImpact(zombie.x + zombie.w / 2, zombie.y + zombie.h / 2);
      this.screenShake = Math.max(this.screenShake, 3);

      if (killed) this.registerKill(zombie);
    }
  }

  // Nascondiamo temporaneamente le frustate alla collisione standard, che altrimenti
  // imposterebbe projectile.dead = true al primo zombie colpito.
  const originalProjectiles = this.projectiles;
  this.projectiles = originalProjectiles.filter((projectile) => !projectile.config?.whip);
  boledjBaseResolveCollisions();
  this.projectiles = originalProjectiles;
};
