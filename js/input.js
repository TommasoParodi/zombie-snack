/**
 * Gestione comandi (tastiera + tocco).
 * - isDown("left")  -> il tasto/pulsante e' premuto in questo momento (movimento continuo)
 * - wasPressed("jump") -> e' stato premuto in QUESTO frame (azione singola)
 *
 * I pulsanti virtuali del telefono usano le STESSE azioni della tastiera:
 * il resto del gioco non deve sapere se stai usando le dita o la tastiera.
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
  /** True se il dispositivo ha uno schermo tattile (telefono/tablet). */
  touch: false,

  init() {
    const touchQuery = window.matchMedia(
      "(max-width: 820px), (hover: none) and (pointer: coarse) and (max-width: 1024px)"
    );
    const syncTouch = () => {
      this.touch = touchQuery.matches;
      document.body.classList.toggle("is-touch", this.touch);
    };
    syncTouch();
    touchQuery.addEventListener("change", syncTouch);

    window.addEventListener("keydown", (event) => {
      const action = KEY_MAP[event.code];
      if (!action) return;
      event.preventDefault();
      this.press(action);
    });

    window.addEventListener("keyup", (event) => {
      const action = KEY_MAP[event.code];
      if (!action) return;
      event.preventDefault();
      this.release(action);
    });

    // Se la finestra perde il focus, "rilasciamo" tutti i tasti.
    window.addEventListener("blur", () => {
      this.down.clear();
      this.pressed.clear();
    });

    this.bindTouchPad();
    this.preventPageScroll();
  },

  press(action) {
    if (!this.down.has(action)) this.pressed.add(action);
    this.down.add(action);
  },

  release(action) {
    this.down.delete(action);
  },

  /**
   * Collega i pulsanti HTML (data-action="jump") al sistema di input.
   * pointerdown/up funziona sia col dito sia col mouse, e ogni dito e'
   * indipendente: puoi tenere SINISTRA e toccare SALTA nello stesso momento.
   */
  bindTouchPad() {
    const pad = document.getElementById("touch-pad");
    if (!pad) return;

    pad.querySelectorAll("[data-action]").forEach((button) => {
      const action = button.getAttribute("data-action");

      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        button.classList.add("is-held");
        this.press(action);
      });

      const stop = (event) => {
        event.preventDefault();
        button.classList.remove("is-held");
        this.release(action);
      };

      button.addEventListener("pointerup", stop);
      button.addEventListener("pointercancel", stop);
      button.addEventListener("lostpointercapture", () => {
        button.classList.remove("is-held");
        this.release(action);
      });

      // Evita il menu "copia/incolla" se tieni premuto un pulsante.
      button.addEventListener("contextmenu", (event) => event.preventDefault());
    });
  },

  /** Sul telefono, uno swipe sul gioco non deve far scorrere la pagina. */
  preventPageScroll() {
    const block = (event) => {
      if (event.target.closest(".handheld, .touch-pad, .screen, canvas")) {
        event.preventDefault();
      }
    };
    document.addEventListener("touchmove", block, { passive: false });
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
