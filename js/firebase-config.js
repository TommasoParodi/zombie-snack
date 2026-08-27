/**
 * Configurazione del progetto Firebase usato per salvare i punteggi (vedi js/scores.js).
 *
 * Sostituisci questi valori segnaposto con quelli del tuo progetto Firebase:
 * Console Firebase -> Impostazioni progetto -> Le tue app -> Configurazione SDK.
 * Vedi docs/punteggi-persistenza.md per la guida passo-passo alla creazione del progetto.
 *
 * Questi valori NON sono segreti: identificano il progetto, non autenticano nessuno.
 * La sicurezza dei dati e' garantita dalle Firestore Security Rules (vedi docs/), non
 * dal nascondere apiKey/projectId. E' normale e atteso che questo file sia committato.
 */
const FIREBASE_CONFIG = {
  apiKey: "SOSTITUISCI",
  authDomain: "SOSTITUISCI.firebaseapp.com",
  projectId: "SOSTITUISCI",
  storageBucket: "SOSTITUISCI.appspot.com",
  messagingSenderId: "SOSTITUISCI",
  appId: "SOSTITUISCI",
};

firebase.initializeApp(FIREBASE_CONFIG);
