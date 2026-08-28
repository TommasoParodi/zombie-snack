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
  KeyX: "dodge",
  KeyY: "super",
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

    const releaseAll = () => this.releaseAllTouchControls();
    window.addEventListener("blur", releaseAll);
    window.addEventListener("pagehide", releaseAll);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) releaseAll();
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

  releaseAllTouchControls() {
    this.down.clear();
    this.pressed.clear();
    document.querySelectorAll("#touch-pad .is-held").forEach((button) => {
      button.classList.remove("is-held");
    });
  },

  bindTouchPad() {
    const pad = document.getElementById("touch-pad");
    if (!pad) return;

    // Evita selezione testo / menu contestuale da pressione prolungata su tutto il pad,
    // comprese le label sotto i pulsanti.
    pad.addEventListener("contextmenu", (event) => event.preventDefault());
    pad.addEventListener("selectstart", (event) => event.preventDefault());
    pad.addEventListener("dragstart", (event) => event.preventDefault());

    pad.querySelectorAll("[data-action]").forEach((button) => {
      const action = button.getAttribute("data-action");

      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        try {
          button.setPointerCapture(event.pointerId);
        } catch (_) {
          // Alcuni browser mobili possono rifiutare la capture: il fail-safe globale
          // rilascera' comunque tutti i comandi se il puntatore viene perso.
        }
        button.classList.add("is-held");
        this.press(action);
      });

      const stop = (event) => {
        if (event?.cancelable) event.preventDefault();
        button.classList.remove("is-held");
        this.release(action);
      };

      button.addEventListener("pointerup", stop);
      button.addEventListener("pointercancel", stop);
      button.addEventListener("lostpointercapture", stop);
      button.addEventListener("contextmenu", (event) => event.preventDefault());
    });

    // Se il browser perde un pointerup per una gesture/long-press, questi eventi globali
    // impediscono che un comando rimanga incastrato fino al tocco successivo.
    window.addEventListener("pointerup", (event) => {
      if (event.pointerType === "touch" || event.pointerType === "pen") {
        this.releaseAllTouchControls();
      }
    });
    window.addEventListener("pointercancel", (event) => {
      if (event.pointerType === "touch" || event.pointerType === "pen") {
        this.releaseAllTouchControls();
      }
    });
  },

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

  endFrame() {
    this.pressed.clear();
  },
};
