const firebaseConfig = {
  apiKey: "AIzaSyCEgrfFn0zEw2dDwvPuTsYsT61p_SbGehs",
  authDomain: "ja-ela-serenity-villa.firebaseapp.com",
  projectId: "ja-ela-serenity-villa",
  storageBucket: "ja-ela-serenity-villa.firebasestorage.app",
  messagingSenderId: "353301654839",
  appId: "1:353301654839:web:01fb5fc78ac1ced5fabeb2"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firestore reference
const db = firebase.firestore();