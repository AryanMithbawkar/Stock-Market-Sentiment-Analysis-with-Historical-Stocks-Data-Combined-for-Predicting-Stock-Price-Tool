import { firebaseAuth , initializeFirebase } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", async function () {
    // Always initialize Firebase first!
    await initializeFirebase();
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Create feedback containers
    const emailFeedback = document.createElement("div");
    const passwordFeedback = document.createElement("div");
    emailFeedback.style.color = "red";
    passwordFeedback.style.color = "red";
    emailInput.insertAdjacentElement("afterend", emailFeedback);
    passwordInput.insertAdjacentElement("afterend", passwordFeedback);

    // Email validation
    emailInput.addEventListener("input", () => {
        const emailValue = emailInput.value;
        if (!emailRegex.test(emailValue)) {
            emailFeedback.textContent = "Invalid email format";
            emailInput.style.border = "2px solid red";
        } else if (emailValue.length < 5 || emailValue.length > 50) {
            emailFeedback.textContent = "Email must be between 5 and 50 characters";
            emailInput.style.border = "2px solid orange";
        } else {
            emailFeedback.textContent = "";
            emailInput.style.border = "2px solid #0FFF50";
        }
    });

    // Password strength checker
    passwordInput.addEventListener("input", () => {
        const pwd = passwordInput.value;
        let strength = 0;
        if (pwd.length >= 8) strength++;
        if (/[A-Z]/.test(pwd)) strength++;
        if (/[a-z]/.test(pwd)) strength++;
        if (/\d/.test(pwd)) strength++;
        if (/[@$!%*?&]/.test(pwd)) strength++;

        if (pwd.length < 8 || pwd.length > 20) {
            passwordFeedback.textContent = "Password must be 8–20 characters";
            passwordInput.style.border = "2px solid red";
            passwordFeedback.style.color = "red";
        } else if (strength <= 2) {
            passwordFeedback.textContent = "Weak password";
            passwordInput.style.border = "2px solid red";
            passwordFeedback.style.color = "red";
        } else if (strength === 3 || strength === 4) {
            passwordFeedback.textContent = "Moderate password";
            passwordInput.style.border = "2px solid orange";
            passwordFeedback.style.color = "orange";
        } else {
            passwordFeedback.textContent = "Strong password";
            passwordInput.style.border = "2px solid #0FFF50";
            passwordFeedback.style.color = "#0FFF50";
        }
    });
});

document.addEventListener("DOMContentLoaded", function () {
    const darkModeToggle = document.getElementById("theme-toggle-checkbox");

    // Set the toggle to checked (on) by default
    darkModeToggle.checked = true;

    // Apply dark mode on page load
    document.body.classList.add("dark-mode");

    // Add the existing event listener for toggling
    darkModeToggle.addEventListener("change", function () {
        document.body.classList.toggle("dark-mode");

        // Update chart colors if charts exist
        updateChartColors(this.checked);
    });
});

document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const authForm = document.getElementById('auth-form');
    const nameFields = document.getElementById('name-fields');
    const firstNameInput = document.getElementById('first-name');
    const lastNameInput = document.getElementById('last-name');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const submitBtn = document.getElementById('submit-btn');
    const messageDiv = document.getElementById('message');
    const formTitle = document.getElementById('form-title');
    const formSubtitle = document.getElementById('form-subtitle');
    const toggleFormLink = document.getElementById('toggle-form');
    const separatorText = document.getElementById('separator-text');
    // const googleBtn = document.getElementById('google-btn');
    // const appleBtn = document.getElementById('apple-btn');
    const loadingSpinner = document.getElementById('loading-spinner');

    // Flag to track current form mode (signup or login)
    let isSignupMode = true;

    // Toggle between signup and login forms
    function toggleForm(e) {
        if (e) e.preventDefault();
        isSignupMode = !isSignupMode;

        if (isSignupMode) {
            formTitle.textContent = 'Create an account';
            formSubtitle.innerHTML = 'Already have an account? <a href="#" id="toggle-form">Log in</a>';
            submitBtn.textContent = 'Create account';
            nameFields.style.display = 'flex';
            separatorText.textContent = 'Or Register With';
        } else {
            formTitle.textContent = 'Welcome back';
            formSubtitle.innerHTML = 'New user? <a href="#" id="toggle-form">Sign up</a>';
            submitBtn.textContent = 'Login';
            nameFields.style.display = 'none';
            separatorText.textContent = 'Or Login With';
        }

        // Reattach event listener to the new toggle link
        document.getElementById('toggle-form').addEventListener('click', toggleForm);

        // Clear form and messages
        authForm.reset();
        messageDiv.textContent = '';
        messageDiv.className = 'error-message';
    }

    // Initial toggle link setup
    toggleFormLink.addEventListener('click', toggleForm);

    // Show loading spinner
    function showLoading() {
        loadingSpinner.style.display = 'inline-block';
        submitBtn.disabled = true;
    }

    // Hide loading spinner
    function hideLoading() {
        loadingSpinner.style.display = 'none';
        submitBtn.disabled = false;
    }

    // Display error message
    function showError(message) {
        messageDiv.textContent = message;
        messageDiv.className = 'error-message';
    }

    // Display success message
    function showSuccess(message) {
        messageDiv.textContent = message;
        messageDiv.className = 'success-message';
    }

    // Handle redirection after successful authentication
    function handleSuccessfulAuth() {
        showSuccess('Authentication successful! Redirecting...');
        setTimeout(() => {
            // Redirect to home page
            window.location.href = '/';
        }, 2000);
    }

    // Form submission handler
    authForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        // Validate form
        if (!email || !password) {
            showError('Please fill in all required fields');
            return;
        }

        if (isSignupMode && (!firstNameInput.value.trim() || !lastNameInput.value.trim())) {
            showError('Please provide both first and last name');
            return;
        }

        showLoading();

        if (isSignupMode) {
            // Signup with email and password
            const firstName = firstNameInput.value.trim();
            const lastName = lastNameInput.value.trim();

            firebaseAuth.signUp(email, password, firstName, lastName)
                .then(() => {
                    hideLoading();
                    handleSuccessfulAuth();
                })
                .catch((error) => {
                    hideLoading();

                    switch (error.code) {
                        case 'auth/email-already-in-use':
                            showError('Email is already in use. Try logging in instead.');
                            break;
                        case 'auth/invalid-email':
                            showError('Please enter a valid email address.');
                            break;
                        case 'auth/weak-password':
                            showError('Password is too weak. Use at least 6 characters.');
                            break;
                        default:
                            showError('An error occurred during signup. Please try again.');
                    }
                });
        } else {
            // Login with email and password
            firebaseAuth.signIn(email, password)
                .then(() => {
                    hideLoading();
                    handleSuccessfulAuth();
                })
                .catch((error) => {
                    hideLoading();

                    switch (error.code) {
                        case 'auth/user-not-found':
                        case 'auth/wrong-password':
                            showError('Invalid email or password.');
                            break;
                        case 'auth/too-many-requests':
                            showError('Too many failed login attempts. Try again later.');
                            break;
                        default:
                            showError('Login failed. Please try again.');
                    }
                });
        }
    });

//     // Google Sign-In
//     googleBtn.addEventListener('click', function () {
//     showLoading();

//     firebaseAuth.signInWithGoogle()
//         .then(() => {
//             hideLoading();
//             handleSuccessfulAuth();
//         })
//         .catch((error) => {
//             hideLoading();

//             if (error.code === 'auth/popup-closed-by-user') {
//                 showError('Sign-in popup was closed. Please try again.');
//             } else if (error.code === 'auth/account-exists-with-different-credential') {
//                 showError('An account already exists with the same email address but different sign-in credentials.');
//             } else if (error.code === 'auth/unauthorized-domain') {
//                 showError('Unauthorized domain. Please check your Firebase redirect URI settings.');
//             } else {
//                 showError('An error occurred during Google sign-in. Please try again.');
//             }
//         });
// });

//     // Apple Sign-In
//     appleBtn.addEventListener('click', function () {
//         showLoading();

//         firebaseAuth.signInWithApple()
//             .then(() => {
//                 hideLoading();
//                 handleSuccessfulAuth();
//             })
//             .catch((error) => {
//                 hideLoading();

//                 if (error.code === 'auth/popup-closed-by-user') {
//                     showError('Sign-in popup was closed. Please try again.');
//                 } else {
//                     showError('An error occurred during Apple sign-in. Please try again.');
//                 }
//             });
//     });

    // Monitor auth state
    onAuthStateChanged(firebaseAuth.auth, (user) => {
        const messageDiv = document.getElementById('loginMessage');
        if (user) {
            if (window.location.pathname === '/login') {
                messageDiv.textContent = 'You are already logged in. Please return to the home page.';
            }
        } else {
            messageDiv.textContent = '';
        }
    });
});