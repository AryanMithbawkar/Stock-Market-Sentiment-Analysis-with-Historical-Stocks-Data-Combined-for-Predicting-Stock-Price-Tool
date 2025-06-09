import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { db, getUserIdAsync } from './firebase-config.js';

export function initializeNewsletterForm() {
    const newsletterForm = document.getElementById("newsletter-form");
    const newsletterEmail = document.getElementById("newsletter-email");

    if (newsletterForm) {
        newsletterForm.addEventListener("submit", async function (e) {
            e.preventDefault(); // Prevent form from refreshing the page

            const email = newsletterEmail.value.trim();
            if (!email) {
                alert("Please enter a valid email address.");
                return;
            }

            try {
                // Get the user ID
                const userId = await getUserIdAsync();

                // Save the email to Firebase under the user's document
                const docRef = doc(db, "NewsletterSubscriptions", userId);
                await setDoc(docRef, { email: email }, { merge: true });

                alert("Thank you for subscribing to our newsletter!");
                newsletterEmail.value = ""; // Clear the input field
            } catch (error) {
                console.error("Error saving email to Firebase:", error);
                alert("Failed to subscribe. Please try again later.");
            }
        });
    }
}