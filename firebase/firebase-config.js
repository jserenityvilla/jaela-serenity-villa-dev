const firebaseConfig = {
  apiKey: "AIzaSyAQDpiDDdV5mBsSlRmK4IfKV5gBriYt3xw"Clipboard is empty. Copy the new TEST Browser API key first." }  if (-not $newKey.StartsWith("AIza")) { throw "The clipboard value does not look like a Firebase Web API key." }  $file = ".\firebase\firebase-config.js" $content = Get-Content $file -Raw  $newContent = [regex]::Replace( $content, 'apiKey:\s*"[^"]*"', 'apiKey: "AIzaSyAQDpiDDdV5mBsSlRmK4IfKV5gBriYt3xw"', 1 )  Set-Content -Path $file -Value $newContent -NoNewline  Write-Host "TEST firebase-config.js API key updated successfully."",
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
