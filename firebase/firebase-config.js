const firebaseConfig = {
  apiKey: "AIzaSyAQDpiDDdV5mBsSlRmK4IfKV5gBriYt3xw",
  authDomain: "ja-ela-serenity-villa-test.firebaseapp.com",
  projectId: "ja-ela-serenity-villa-test",
  storageBucket: "ja-ela-serenity-villa-test.firebasestorage.app",
  messagingSenderId: "856400323421",
  appId: "1:856400323421:web:6de6da50bcdda9af2dfeb4",
  measurementId: "G-NPY52ME41"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firestore reference
const db = firebase.firestore();

// Use the local Firestore emulator when running the DEV site locally.
if (
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost"
) {
    db.useEmulator("127.0.0.1", 8080);
}
