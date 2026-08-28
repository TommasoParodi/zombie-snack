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

/** Istantanea dei tasti di fabbrica, usata solo per il "ripristina predefiniti" della
 * schermata impostazioni: KEY_MAP resta l'unica mappa "viva" letta dai listener sotto. */
const DEFAULT_KEY_MAP = { ...KEY_MAP };

/** Le 4 azioni permutabili tra i pulsanti volto A/B/X/Y sul touch pad (vedi TOUCH_MAP sotto). */
const TOUCH_CYCLE_ACTIONS = ["jump", "attack", "dodge", "super"];

const DEFAULT_TOUCH_MAP = { btnA: "jump", btnB: "attack", btnX: "dodge", btnY: "super" };
/** Mappa "viva" pulsante-volto -> azione, letta da bindTouchPad(). Solo i 4 pulsanti
 * A/B/X/Y sono riassegnabili (vedi CLAUDE.md, sezione impostazioni): croce direzionale,
 * SELECT e START restano fissi cosi' la navigazione dei menu (compresa la schermata
 * impostazioni stessa) non puo' mai restare bloccata da una rimappatura sbagliata. */
const TOUCH_MAP = { ...DEFAULT_TOUCH_MAP };

/** Etichette italiane condivise tra la schermata impostazioni (desktop e touch). */
const ACTION_LABELS = {
  left: "SINISTRA",
  right: "DESTRA",
  up: "SALTA (SU)",
  down: "ABBASSATI",
  jump: "SALTO",
  attack: "ATTACCA",
  dodge: "SCATTO",
  super: "SUPER",
  pause: "PAUSA",
  confirm: "CONFERMA",
  back: "INDIETRO/ESCI",
};

/** Ordine di visualizzazione delle azioni rimappabili da tastiera nella schermata impostazioni. */
const SETTINGS_ACTIONS = [
  "left",
  "right",
  "up",
  "down",
  "jump",
  "attack",
  "dodge",
  "super",
  "pause",
  "confirm",
  "back",
].map((id) => ({ id, label: ACTION_LABELS[id] }));

/** Ordine di visualizzazione dei 4 pulsanti volto nella schermata impostazioni touch. */
const SETTINGS_TOUCH_SLOTS = [
  { id: "btnA", label: "PULSANTE A" },
  { id: "btnB", label: "PULSANTE B" },
  { id: "btnX", label: "PULSANTE X" },
  { id: "btnY", label: "PULSANTE Y" },
];

/** Traduce un KeyboardEvent.code in un'etichetta leggibile in italiano (fallback: il codice grezzo). */
function codeToLabel(code) {
  const table = {
    ArrowLeft: "◄", ArrowRight: "►", ArrowUp: "▲", ArrowDown: "▼",
    Space: "SPAZIO", Enter: "INVIO", Escape: "ESC", Tab: "TAB",
    ShiftLeft: "SHIFT SX", ShiftRight: "SHIFT DX",
    ControlLeft: "CTRL SX", ControlRight: "CTRL DX",
    AltLeft: "ALT SX", AltRight: "ALT DX",
    Backspace: "BACKSPACE", CapsLock: "BLOC MAIUSC",
  };
  if (table[code]) return table[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  return code;
}

const KEYMAP_STORAGE_KEY = "zombie-snack-keymap";
const TOUCHMAP_STORAGE_KEY = "zombie-snack-touchmap";

const Input = {
  down: new Set(),
  pressed: new Set(),
  /** True se il dispositivo ha uno schermo tattile (telefono/tablet). */
  touch: false,
  /** Azione in attesa di un nuovo tasto (schermata impostazioni), o null. */
  capturingAction: null,
  /** Pulsanti volto premuti in QUESTO frame, per identita' fisica (btnA/btnB/btnX/btnY) e non
   * per azione: vedi bindTouchPad() e wasSlotPressed(). */
  slotsPressed: new Set(),

  init() {
    this.loadMappings();

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
      if (this.capturingAction) {
        this.handleCapture(event.code);
        return;
      }

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

    window.addEventListener("blur", () => {
      this.down.clear();
      this.pressed.clear();
    });

    this.bindTouchPad();
    this.preventPageScroll();
    this.syncLegendLabels();
  },

  // ------------------------------------------------------- mapping tasti (schermata impostazioni)

  loadMappings() {
    try {
      const savedKeys = localStorage.getItem(KEYMAP_STORAGE_KEY);
      if (savedKeys) {
        Object.keys(KEY_MAP).forEach((code) => delete KEY_MAP[code]);
        Object.assign(KEY_MAP, JSON.parse(savedKeys));
      }
    } catch (_) {}

    try {
      const savedTouch = localStorage.getItem(TOUCHMAP_STORAGE_KEY);
      if (savedTouch) Object.assign(TOUCH_MAP, JSON.parse(savedTouch));
    } catch (_) {}
  },

  saveKeyMap() {
    localStorage.setItem(KEYMAP_STORAGE_KEY, JSON.stringify(KEY_MAP));
  },

  saveTouchMap() {
    localStorage.setItem(TOUCHMAP_STORAGE_KEY, JSON.stringify(TOUCH_MAP));
  },

  resetKeyMap() {
    Object.keys(KEY_MAP).forEach((code) => delete KEY_MAP[code]);
    Object.assign(KEY_MAP, DEFAULT_KEY_MAP);
    localStorage.removeItem(KEYMAP_STORAGE_KEY);
    this.syncLegendLabels();
  },

  resetTouchMap() {
    Object.assign(TOUCH_MAP, DEFAULT_TOUCH_MAP);
    localStorage.removeItem(TOUCHMAP_STORAGE_KEY);
    this.syncTouchLabels();
  },

  /** Riscrive le etichette stampate sotto i pulsanti volto (index.html, [data-slot-label])
   * cosi' restano corrette dopo un remap invece di continuare a mostrare l'azione di fabbrica. */
  syncTouchLabels() {
    document.querySelectorAll("[data-slot-label]").forEach((el) => {
      const slot = el.getAttribute("data-slot-label");
      el.textContent = ACTION_LABELS[TOUCH_MAP[slot]];
    });
  },

  /** Riscrive i tasti mostrati nella legenda desktop (index.html, [data-legend-key]) cosi'
   * restano corretti dopo un remap invece di continuare a mostrare il tasto di fabbrica. */
  syncLegendLabels() {
    document.querySelectorAll("[data-legend-key]").forEach((el) => {
      const action = el.getAttribute("data-legend-key");
      el.textContent = this.keyLabelFor(action);
    });
  },

  startCapture(action) {
    this.capturingAction = action;
  },

  cancelCapture() {
    this.capturingAction = null;
  },

  /** Riceve il prossimo keydown mentre si e' in attesa di un tasto per `capturingAction`. */
  handleCapture(code) {
    const action = this.capturingAction;
    this.capturingAction = null;
    // Escape annulla sempre senza modificare nulla: resta libero come via di fuga garantita.
    if (code === "Escape") return;
    // KeyM e' riservato al mute (bypass hardcoded in audio.js, fuori dal sistema di azioni):
    // assegnarlo a un'azione lo renderebbe ambiguo, quindi resta non assegnabile.
    if (code === "KeyM") return;
    this.applyRebind(action, code);
  },

  /** Un solo tasto per azione: rimappare un'azione ne sostituisce il tasto precedente e
   * libera `code` da qualunque altra azione lo usasse (un tasto non puo' controllarne due). */
  applyRebind(action, code) {
    Object.keys(KEY_MAP).forEach((c) => {
      if (KEY_MAP[c] === action) delete KEY_MAP[c];
    });
    delete KEY_MAP[code];
    KEY_MAP[code] = action;
    this.saveKeyMap();
    this.syncLegendLabels();
  },

  /** Etichetta leggibile del tasto attualmente assegnato a un'azione ("—" se nessuno). */
  keyLabelFor(action) {
    const code = Object.keys(KEY_MAP).find((c) => KEY_MAP[c] === action);
    return code ? codeToLabel(code) : "—";
  },

  /** Sposta il pulsante volto `slot` all'azione successiva del ciclo A/B/X/Y (wraparound). */
  cycleTouchSlot(slot) {
    const current = TOUCH_CYCLE_ACTIONS.indexOf(TOUCH_MAP[slot]);
    const next = TOUCH_CYCLE_ACTIONS[(current + 1) % TOUCH_CYCLE_ACTIONS.length];
    TOUCH_MAP[slot] = next;
    this.saveTouchMap();
    this.syncTouchLabels();
  },

  touchActionLabel(slot) {
    return ACTION_LABELS[TOUCH_MAP[slot]];
  },

  press(action) {
    if (!this.down.has(action)) this.pressed.add(action);
    this.down.add(action);
  },

  release(action) {
    this.down.delete(action);
  },

  bindTouchPad() {
    const pad = document.getElementById("touch-pad");
    if (!pad) return;

    // Azione risolta e "congelata" per bottone al pointerdown, non ri-risolta al rilascio:
    // i pulsanti volto (data-slot) possono essere rimappati mentre restano premuti (la stessa
    // schermata impostazioni touch si naviga proprio con A/B/X/Y), quindi risolvere l'azione
    // di nuovo al pointerup potrebbe rilasciare un'azione diversa da quella premuta e lasciarla
    // bloccata a "giu'" per sempre.
    const heldAction = new Map();

    pad.querySelectorAll("[data-action]").forEach((button) => {
      const slot = button.getAttribute("data-slot");
      const defaultAction = button.getAttribute("data-action");
      const resolveAction = () => (slot ? TOUCH_MAP[slot] || defaultAction : defaultAction);

      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        button.classList.add("is-held");
        const action = resolveAction();
        heldAction.set(button, action);
        this.press(action);
        // Segnale "fisico", indipendente dall'azione a cui il pulsante e' attualmente
        // assegnato: la UI impostazioni su touch lo usa per non dipendere da un'azione
        // logica (es. "jump") che potrebbe essere stata spostata via da questo pulsante
        // (vedi wasSlotPressed sotto e updateSettings in game.js).
        if (slot) this.slotsPressed.add(slot);
      });

      const stop = (event) => {
        event.preventDefault();
        button.classList.remove("is-held");
        this.release(heldAction.get(button) || resolveAction());
      };

      button.addEventListener("pointerup", stop);
      button.addEventListener("pointercancel", stop);
      button.addEventListener("lostpointercapture", () => {
        button.classList.remove("is-held");
        this.release(heldAction.get(button) || resolveAction());
      });
      button.addEventListener("contextmenu", (event) => event.preventDefault());
    });

    this.syncTouchLabels();
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

  /** True nel frame in cui il pulsante volto `slot` (es. "btnA") e' stato premuto, a
   * prescindere da quale azione gli sia attualmente assegnata in TOUCH_MAP. */
  wasSlotPressed(slot) {
    return this.slotsPressed.has(slot);
  },

  endFrame() {
    this.pressed.clear();
    this.slotsPressed.clear();
  },
};
