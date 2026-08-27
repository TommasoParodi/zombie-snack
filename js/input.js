/**
 * Gestione tastiera.
 * - isDown("left")  -> il tasto e' premuto in questo momento (movimento continuo)
 * - wasPressed("jump") -> il tasto e' stato premuto in QUESTO frame (azione singola)
 */

const KEY_MAP = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowDown: "down",
  KeyS: "down",
  ArrowUp: "up",
  KeyW: "up",
  Space: "jump",
  ShiftLeft: "dodge",
  ShiftRight: "dodge",
  KeyF: "attack",
  KeyJ: "attack",
  Enter: "confirm",
  KeyP: "pause",
  Escape: "back",
};

const Input = {
  down: new Set(),
  pressed: new Set(),

  init() {
    window.addEventListener("keydown", (event) => {
      const action = KEY_MAP[event.code];
      if (!action) return;
      event.preventDefault();
      if (!this.down.has(action)) this.pressed.add(action);
      this.down.add(action);
    });

    window.addEventListener("keyup", (event) => {
      const action = KEY_MAP[event.code];
      if (!action) return;
      event.preventDefault();
      this.down.delete(action);
    });

    // Se la finestra perde il focus, "rilasciamo" tutti i tasti.
    window.addEventListener("blur", () => {
      this.down.clear();
      this.pressed.clear();
    });
  },

  isDown(action) {
    return this.down.has(action);
  },

  wasPressed(action) {
    return this.pressed.has(action);
  },

  /** Da chiamare a fine frame: azzera i tasti "appena premuti". */
  endFrame() {
    this.pressed.clear();
  },
};
