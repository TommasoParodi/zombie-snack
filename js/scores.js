/**
 * Archivio punteggi condiviso: ogni salvataggio crea un nuovo documento nella
 * collection Firestore "scores" (mai una sovrascrittura, append naturale). Se la
 * scrittura fallisce (offline, config segnaposto non ancora compilata, dominio
 * Firebase bloccato...) si fa fallback silenzioso su localStorage, cosi' il punteggio
 * non si perde e il resto del game over funziona comunque. Vedi docs/punteggi-persistenza.md.
 */
const db = firebase.firestore();

const Scores = {
  async save(entry) {
    try {
      await db.collection("scores").add({
        ...entry,
        date: firebase.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.warn("Salvataggio su Firestore non riuscito, uso localStorage.", err);
      this._saveLocal(entry);
    }
  },

  _saveLocal(entry) {
    const KEY = "zombie-snack-scores";
    const list = JSON.parse(localStorage.getItem(KEY) || "[]");
    list.push({ ...entry, date: new Date().toISOString() });
    localStorage.setItem(KEY, JSON.stringify(list));
  },
};
