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
// Page transition 
document.addEventListener("DOMContentLoaded", function () {
document.body.classList.add("loaded"); // Fade-in page on load
});

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
            overlay.classList.add("active");
        }, 90);
        setTimeout(() => {
            overlay.remove();
        }, 1000);    

        // Navigate after transition
        setTimeout(() => {
            window.location.href = href;
        }, 890);
    });
});

document.addEventListener("DOMContentLoaded", function () {
    const apiUrl = `/api/news?query`;
    const newsContainer = document.getElementById("news-container");
    const refreshBtn = document.getElementById("refresh-news-btn");

    function loadNews() {
        // Clear previous news
        newsContainer.innerHTML = "";
        // Add loading spinner
        const loadingSpinner = document.createElement("div");
        loadingSpinner.classList.add("loading-spinner");
        newsContainer.appendChild(loadingSpinner);

        fetch(apiUrl)
            .then(response => response.text())
            .then(str => {
                newsContainer.removeChild(loadingSpinner);
                const parser = new window.DOMParser();
                const xml = parser.parseFromString(str, "text/xml");
                const items = xml.querySelectorAll("item");
                if (items.length === 0) {
                    newsContainer.innerHTML = "<p>No news found for this query.</p>";
                    return;
                }
                items.forEach(item => {
                    const title = item.querySelector("title")?.textContent || "No title";
                    const link = item.querySelector("link")?.textContent || "#";
                    const description = item.querySelector("description")?.textContent || "No description available.";
                    const pubDate = item.querySelector("pubDate")?.textContent || "";

                    const newsArticle = document.createElement("div");
                    newsArticle.classList.add("news-article");
                    newsArticle.innerHTML = `
                        <h3>${title}</h3>
                        <p>${description}</p>
                        <small>${pubDate}</small><br>
                        <a href="${link}" target="_blank">Read more</a>
                    `;
                    newsContainer.appendChild(newsArticle);
                });
            })
            .catch((error) => {
                console.error("Error fetching news:", error);
                newsContainer.innerHTML = "<p>Failed to load news. Please try again later.</p>";
            });
    }

    // Initial load
    loadNews();

    // Refresh button handler
    if (refreshBtn) {
        refreshBtn.addEventListener("click", function () {
            loadNews();
        });
    }
});
document.addEventListener("DOMContentLoaded", function() {
    if (!localStorage.getItem('news_tutorial_shown')) {
        introJs().setOptions({
            nextLabel: 'Next',
            prevLabel: 'Back',
            doneLabel: 'Done',
            skipLabel: 'Skip',
            showProgress: true,
            showBullets: false,
            exitOnOverlayClick: false,
            tooltipClass: 'custom-introjs-tooltip'
        }).oncomplete(function() {
            localStorage.setItem('news_tutorial_shown', 'yes');
        }).onexit(function() {
            localStorage.setItem('news_tutorial_shown', 'yes');
        }).start();
    }
});
import { initializeNewsletterForm } from './newsletter.js';
document.addEventListener("DOMContentLoaded", function () {
    initializeNewsletterForm();
    // Other page-specific code...
});