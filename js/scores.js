/**
 * Archivio punteggi condiviso: ogni salvataggio crea un nuovo documento nella
 * collection Firestore "scores" (mai una sovrascrittura, append naturale). Se la
 * scrittura fallisce (offline, config segnaposto non ancora compilata, dominio
 * Firebase bloccato...) si fa fallback silenzioso su localStorage, cosi' il punteggio
 * non si perde e il resto del game over funziona comunque. Vedi docs/punteggi-persistenza.md.
 */
const db = firebase.firestore();

const SCORES_LOCAL_KEY = "zombie-snack-scores";

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

  /** Migliori punteggi (default i primi 10) per la classifica: stesso fallback silenzioso
   * su localStorage del salvataggio, cosi' la classifica funziona anche senza un progetto
   * Firebase configurato (vedi docs/punteggi-persistenza.md) o offline. Nota: leggere da
   * Firestore richiede una security rule "allow read" sulla collection "scores" (di
   * default e' bloccata in lettura) — finche' non viene allargata, ogni lettura fallisce e
   * si vedono solo i punteggi salvati localmente su questo browser.
   * A differenza di add() (che fallisce/rifiuta rapidamente su un progetto inesistente),
   * get() nell'SDK compat instrada attraverso il canale di streaming di Firestore: contro
   * un projectId segnaposto quel canale ritenta all'infinito senza mai rifiutare la
   * Promise, quindi senza un timeout esplicito la schermata resterebbe bloccata su
   * "CARICAMENTO..." per sempre invece di ripiegare su localStorage. */
  async fetchTop(limit = 10) {
    try {
      const snapshot = await Promise.race([
        db.collection("scores").orderBy("score", "desc").limit(limit).get(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout lettura Firestore")), 4000)),
      ]);
      return snapshot.docs.map((doc) => doc.data());
    } catch (err) {
      console.warn("Lettura classifica da Firestore non riuscita, uso localStorage.", err);
      return this._loadLocalTop(limit);
    }
  },

  _saveLocal(entry) {
    const list = JSON.parse(localStorage.getItem(SCORES_LOCAL_KEY) || "[]");
    list.push({ ...entry, date: new Date().toISOString() });
    localStorage.setItem(SCORES_LOCAL_KEY, JSON.stringify(list));
  },

  _loadLocalTop(limit) {
    const list = JSON.parse(localStorage.getItem(SCORES_LOCAL_KEY) || "[]");
    return list.sort((a, b) => b.score - a.score).slice(0, limit);
  },
};
