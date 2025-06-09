import { initializeFirebase, auth } from './firebase-config.js';
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", async () => {
  // Initialize Firebase
  await initializeFirebase();

  const logoutLink = document.getElementById("logout");

  // Monitor auth state
  onAuthStateChanged(auth, (user) => {
    if (user) {
      logoutLink.textContent = "Logout";
      logoutLink.href = ""; // Prevent navigation
      logoutLink.addEventListener("click", handleLogout);
    } else {
      logoutLink.textContent = "Login";
      logoutLink.href = "/login"; // Use your actual login route
      logoutLink.removeEventListener("click", handleLogout);
    }
  });

  function handleLogout(e) {
    e.preventDefault();
    signOut(auth).then(() => {
      window.location.href = "/"; // Redirect after logout
    }).catch((error) => {
      console.error("Logout Error:", error);
    });
  }
});

// ✅ Function to protect page access
export async function requireLogin() {
  await initializeFirebase();
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "/login"; // 🔒 Redirect if not logged in
    }
  });
}