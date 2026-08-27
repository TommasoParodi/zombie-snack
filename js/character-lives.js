// Vite personalizzate per personaggio.
const CHARACTER_LIVES = {
  berto: 5,
  tommen: 4,
  pruzzo: 5,
};

const baseLivesStartGame = game.startGame.bind(game);
game.startGame = function () {
  baseLivesStartGame();
  const configuredLives = CHARACTER_LIVES[this.player.character.id] ?? 3;
  this.player.lives = configuredLives;
};

const baseLivesDrawHud = game.drawHud.bind(game);
game.drawHud = function () {
  baseLivesDrawHud();

  const maxLives = CHARACTER_LIVES[this.player.character.id] ?? 3;
  if (maxLives <= 3) return;

  // Il HUD base disegna gia' i primi 3 cuori: aggiungiamo solo quelli extra.
  for (let i = 3; i < maxLives; i++) {
    const x = GAME_W - 12 - i * 12;
    const alive = i < this.player.lives;
    drawSprite(ctx, SPRITES.heart, x, 4, alive ? HEART_PALETTE : HEART_PALETTE_EMPTY);
  }
};
