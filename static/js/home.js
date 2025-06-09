import { initializeNewsletterForm } from './newsletter.js';
// Dark Mode Toggle
// Update dark mode toggle to be on by default
document.addEventListener("DOMContentLoaded", function() {
    const darkModeToggle = document.getElementById("darkModeToggle");
    const toggleIcon = document.querySelector('.toggle-circle .toggle-icon');

    function updateToggleIcon() {
        if (darkModeToggle.checked) {
            toggleIcon.innerHTML = '&#9790;'; // Moon
        } else {
            toggleIcon.innerHTML = '&#9728;'; // Sun
        }
    }

    // Initial state
    

    // Set the toggle to checked (on) by default
    darkModeToggle.checked = true;
    updateToggleIcon();
    // Apply dark mode on page load
    document.body.classList.add("dark-mode");

    darkModeToggle.addEventListener("change", function() {
      document.body.classList.toggle("dark-mode");
      if (typeof updateChartColors === "function") updateChartColors(this.checked);
      updateToggleIcon();
    });
});

// Logout Functionality
document.getElementById("logout").addEventListener("click", function(event) {
    event.preventDefault(); // Prevent default link behavior
    // Clear session storage or local storage if needed
    sessionStorage.clear();
    localStorage.clear();
    // Redirect to login page
    window.location.href = "login";
});


// Ensure Three.js scene initializes properly
const container = document.getElementById("three-container");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);

// Zoom in slightly by moving camera closer
camera.position.z = 3;  // default is usually 5

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5; // lower exposure for less brightness
container.appendChild(renderer.domElement);

// Add Ambient & Directional Lighting (low intensity)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
directionalLight.position.set(2, 2, 5);
scene.add(directionalLight);

// Load GLTF Model
const loader = new THREE.GLTFLoader();
loader.load(modelpath, function(gltf) {
    const model = gltf.scene;
    model.position.set(0, -1, 0);
    model.scale.set(1.9, 1.5, 0.8);
    scene.add(model);
}, undefined, function(error) {
    console.error('Error loading model:', error);
});

// Set Camera Position
camera.position.set(0, 4.2, 4.9);
camera.lookAt(0, 0, 0); 

// Animation Loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

// Resize Event Listener
window.addEventListener('resize', () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
});

// Page Transition
document.addEventListener("DOMContentLoaded", function () {
    document.body.classList.add("loaded"); // Fade-in page on load
});

// Handle link clicks for page transitions
document.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", function (event) {
        if (this.getAttribute("target") === "_blank") return;

        event.preventDefault(); // Stop instant navigation
        let href = this.href;

        // Create transition element
        let overlay = document.createElement("div");
        overlay.classList.add("transition-overlay");
        document.body.appendChild(overlay);

        // Trigger expanding circle effect
        setTimeout(() => {
            overlay.classList.add("expand");
        }, 90);
        // Optional: Clean up the overlay after the animation duration
        setTimeout(() => {
            overlay.remove();
        }, 1000);

        // Navigate after transition
        setTimeout(() => {
            window.location.href = href;
        }, 890);
    });
});



// Fade-In Animation on Scroll
document.addEventListener("DOMContentLoaded", function () {
    const fadeElements = document.querySelectorAll(".fade-in");

    const checkVisibility = () => {
        fadeElements.forEach((element) => {
            const elementTop = element.getBoundingClientRect().top;
            const elementBottom = element.getBoundingClientRect().bottom;
            const isVisible = elementTop < window.innerHeight && elementBottom >= 0;

            if (isVisible) {
                element.classList.add("visible");
            }
        });
    };

    window.addEventListener("scroll", checkVisibility);
    checkVisibility(); // Check on page load
});
document.addEventListener("DOMContentLoaded", function() {
    let companies = [];
    // Fetch company list for autocomplete and suggestions
    fetch("/get-companies")
      .then(res => res.json())
      .then(data => {
        companies = data;

        // Show 8 random suggestions from the company list
        const suggestionsDiv = document.querySelector('.suggestions-list');
        if (suggestionsDiv) {
            suggestionsDiv.innerHTML = '';
            const shuffled = companies.sort(() => 0.5 - Math.random());
            const randomSuggestions = shuffled.slice(0, 8);
            randomSuggestions.forEach(company => {
                const span = document.createElement('span');
                span.className = 'suggestion';
                // Use company name or ticker as needed
                span.textContent = company.name || company["Company Name"] || company.ticker || company["Yahoo Finance Ticker"];
                span.addEventListener('click', function() {
                    const searchBox = document.getElementById("home-search-box");
                    if (searchBox) {
                        searchBox.value = this.textContent;
                        searchBox.focus();
                    }
                });
                suggestionsDiv.appendChild(span);
            });
        }
      });

    const searchBox = document.getElementById("home-search-box");
    if (searchBox) {
        searchBox.addEventListener("keydown", async function(e) {
            if (e.key === "Enter") {
                const query = searchBox.value.trim();
                localStorage.setItem('selectedCompany', query);
                try {
                    const res = await fetch(`/api/lookup-symbol?query=${encodeURIComponent(query)}`);
                    const data = await res.json();
                    if (data.symbol) {
                        window.location.href = `/fundamentals?symbol=${encodeURIComponent(data.symbol)}`;
                    } else {
                        showMessage("Company not found", true);
                    }
                } catch {
                    showMessage("Error looking up symbol", true);
                }
            }
        });
    }
});
document.addEventListener("DOMContentLoaded", function() {
    if (!localStorage.getItem('marketmind_tutorial_shown')) {
        introJs().setOptions({
            nextLabel: 'Next',
            prevLabel: 'Back',
            doneLabel: 'Done',
            skipLabel: 'Skip',
            showProgress: true,
            showBullets: false,
            exitOnOverlayClick: false,
            tooltipClass: 'custom-introjs-tooltip',
        }).oncomplete(function() {
            localStorage.setItem('marketmind_tutorial_shown', 'yes');
        }).onexit(function() {
            localStorage.setItem('marketmind_tutorial_shown', 'yes');
        }).start();
    }
});

document.addEventListener("DOMContentLoaded", function () {
    initializeNewsletterForm();
    // Other page-specific code...
});
span.addEventListener('click', function() {
    const searchBox = document.getElementById("home-search-box");
    if (searchBox) {
        searchBox.value = this.textContent;
        searchBox.focus();
        // Store the selected company in localStorage
        localStorage.setItem('selectedCompany', this.textContent);
    }
});
