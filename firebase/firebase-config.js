const firebaseConfig = {
  apiKey: "AIzaSyAQDpiDDv5mBsSlRmK4IfKV5gBriYt3xw",
  authDomain: "ja-ela-serenity-villa-test.firebaseapp.com",
  projectId: "ja-ela-serenity-villa-test",
  storageBucket: "ja-ela-serenity-villa-test.firebasestorage.app",
  messagingSenderId: "856400323421",
  appId: "1:856400323421:web:6de6da50bcdda9af2dfeb4"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firestore reference
const db = firebase.firestore();
