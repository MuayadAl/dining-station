import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from 'firebase/functions';


const firebaseConfig = {
  apiKey: "AIzaSyCg61jnJA38d7__PgKwdc7kvGf-k29yqNc",
  authDomain: "dinging-station.firebaseapp.com",
  projectId: "dinging-station",
  storageBucket: "dinging-station.firebasestorage.app",
  messagingSenderId: "113072864772",
  appId: "1:113072864772:web:5548786d2993bb0950bf51",
  measurementId: "G-LLFTSQXZQP",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// export default app;
export default app;
