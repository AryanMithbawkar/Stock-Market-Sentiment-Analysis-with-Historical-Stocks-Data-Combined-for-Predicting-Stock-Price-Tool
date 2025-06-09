document.addEventListener("DOMContentLoaded", function() {
    const darkModeToggle = document.getElementById("darkModeToggle");
    const toggleIcon = document.querySelector('.toggle-circle .toggle-icon');

    // Set dark mode on by default
    darkModeToggle.checked = true;
    document.body.classList.add("dark-mode");
    updateToggleIcon();

    function updateToggleIcon() {
        if (darkModeToggle.checked) {
            toggleIcon.innerHTML = '&#9790;'; // Moon
        } else {
            toggleIcon.innerHTML = '&#9728;'; // Sun
        }
    }

    darkModeToggle.addEventListener("change", function() {
        document.body.classList.toggle("dark-mode");
        updateToggleIcon();
    });
});