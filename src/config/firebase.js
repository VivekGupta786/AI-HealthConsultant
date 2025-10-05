import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBtYWHOfAGiO0sWEAZ3TuVWvrqJ1zi1Zt0",
  authDomain: "aihealthconsultant-a65b0.firebaseapp.com",
  projectId: "aihealthconsultant-a65b0",
  storageBucket: "aihealthconsultant-a65b0.firebasestorage.app",
  messagingSenderId: "867293291776",
  appId: "1:867293291776:web:42994d5870eb768e27ffe5",
  measurementId: "G-1QZYTZCEBY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;