import { initializeApp } from "firebase/app";
import { browserLocalPersistence, connectAuthEmulator, getAuth, setPersistence } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

const firebaseApp = initializeApp(firebaseConfig);

const auth = getAuth(firebaseApp);
const authPersistenceReady = setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Firebase auth persistence could not be enabled:", error.message);
});
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

if (
  process.env.NODE_ENV !== "production" &&
  process.env.REACT_APP_USE_FIREBASE_EMULATORS === "true"
) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
}

export { firebaseApp, auth, authPersistenceReady, db, storage };
