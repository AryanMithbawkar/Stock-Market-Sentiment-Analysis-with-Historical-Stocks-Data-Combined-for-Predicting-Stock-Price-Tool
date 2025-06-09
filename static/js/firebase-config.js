import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js';
import { getFirestore, collection } from 'https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js';
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    OAuthProvider,
    onAuthStateChanged,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js';

// Fetch Firebase configuration from the backend
export async function getFirebaseConfig() {
    try {
        const res = await fetch('/firebase-config');
        if (!res.ok) {
            throw new Error(`Failed to fetch Firebase config: ${res.statusText}`);
        }
        return await res.json();
    } catch (error) {
        console.error("Error fetching Firebase configuration:", error);
        throw error;
    }
}

// Initialize Firebase app, auth, and Firestore
let app, auth, db;

export async function initializeFirebase() {
    try {
        const res = await fetch('/firebase-config');
        const firebaseConfig = await res.json();
        if (!firebaseConfig.apiKey) {
            throw new Error("Invalid Firebase configuration: Missing API key.");
        }
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        console.log("Firebase initialized successfully.");
    } catch (error) {
        console.error("Error initializing Firebase:", error);
        throw error;
    }
}

// Firebase authentication helper functions
const firebaseAuth = {
    signUp: (email, password) =>
        createUserWithEmailAndPassword(auth, email, password),

    signIn: (email, password) =>
        signInWithEmailAndPassword(auth, email, password),

    signInWithGoogle: () => {
        const provider = new GoogleAuthProvider();
        return signInWithPopup(auth, provider);
    },

    signInWithApple: () => {
        const provider = new OAuthProvider('apple.com');
        return signInWithPopup(auth, provider);
    },

    signOut: () =>
        signOut(auth),

    onAuthStateChanged: (callback) =>
        onAuthStateChanged(auth, callback),
};

// Helper function to get the user ID (or generate a guest ID)
export function getUserIdAsync() {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                resolve(user.uid);
            } else {
                let guestId = localStorage.getItem('guestUserId');
                if (!guestId) {
                    guestId = 'guest_' + Math.random().toString(36).substr(2, 9);
                    localStorage.setItem('guestUserId', guestId);
                }
                resolve(guestId);
            }
        });
    });
}

// Export initialized Firebase services and helper functions
export { auth, db, collection, firebaseAuth };