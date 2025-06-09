import { doc, getDoc, setDoc, collection } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { db, getUserIdAsync, initializeFirebase } from './firebase-config.js';

// To get a collection reference:
let favoritesCollection;
document.addEventListener("DOMContentLoaded", async function() {
    await initializeFirebase(); // Ensure Firebase is initialized
    favoritesCollection = collection(db, "Bookmarks"); // Now db is valid

});
document.addEventListener("DOMContentLoaded", function() {
    // Dark mode toggle
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

    // Populate the dropdown with company options
    fetch("/get-companies")
        .then(res => res.json())
        .then(companies => {
            const select = document.getElementById("fundamentals-symbol");
            if (!select) return;
            companies.forEach(company => {
                const option = document.createElement("option");
                option.value = company["Yahoo Finance Ticker"];
                option.textContent = `${company["Company Name"]} (${company["Yahoo Finance Ticker"]})`;
                select.appendChild(option);
            });
        });

    // Fade-in pge on load
    document.body.classList.add("loaded");
});

// Smooth page transitions for internal links
document.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", function (event) {
        if (this.getAttribute("target") === "_blank") return;
        event.preventDefault();
        let href = this.href;
        let overlay = document.createElement("div");
        overlay.classList.add("transition-overlay");
        document.body.appendChild(overlay);
        setTimeout(() => { overlay.classList.add("active"); }, 90);
        setTimeout(() => { overlay.remove(); }, 1000);
        setTimeout(() => { window.location.href = href; }, 890);
    });
});

// --- GRAPH MODE ONLY ---

document.addEventListener("DOMContentLoaded", function () {
    const fetchBtn = document.getElementById('fetch');
    const symbolSelect = document.getElementById('fundamentals-symbol');
    const startInput = document.getElementById('start-date');
    const endInput = document.getElementById('end-date');
    const chartDiv = document.getElementById('stockChart');
    const messageContainer = document.getElementById('message-container');

    if (fetchBtn) {
        fetchBtn.addEventListener('click', async function () {
            const symbol = symbolSelect.value;
            const start = startInput.value;
            const end = endInput.value;
            if (!symbol) {
                showMessage("Please select a company from the dropdown.", true);
                return;
            }
            if (!start || !end) {
                showMessage("Please select both start and end dates.", true);
                return;
            }
            messageContainer.style.display = "none";
            if (chartDiv) chartDiv.innerHTML = "<div class='loading-spinner'></div>";

            let url = `/api/historical?symbol=${encodeURIComponent(symbol)}`;
            if (start && end) url += `&start=${start}&end=${end}`;
            try {
                const res = await fetch(url);
                const data = await res.json();
                if (data.error) {
                    showMessage(data.error, true);
                    return;
                }
                if (!data.history || !Array.isArray(data.history) || !data.history.length) {
                    if (chartDiv) chartDiv.innerHTML = "<p>No data available for the selected range.</p>";
                    return;
                }
                renderStockChart(data.history, symbol);
                renderStockChart(currentView);
            } catch (e) {
                showMessage("Failed to fetch stock data.", true);
            }
        });
    }
    fetch('/api/market-movers')
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            document.getElementById('top-gainers').innerHTML = "<li>Error loading gainers</li>";
            document.getElementById('top-losers').innerHTML = "<li>Error loading losers</li>";
            return;
        }
        // Gainers
        const gainersList = document.getElementById('top-gainers');
        gainersList.innerHTML = "";
        data.gainers.forEach(g => {
            const pct = (g.pct_change !== undefined && g.pct_change !== null) ? g.pct_change + "%" : "N/A";
            const price = (g.last_close !== undefined && g.last_close !== null) ? "₹" + g.last_close : "N/A";
            gainersList.innerHTML += `<li>
                <span>${g.symbol}</span>
                <span class="up">▲ ${pct}</span>
                <span>${price}</span>
            </li>`;
        });
        // Losers
        const losersList = document.getElementById('top-losers');
        losersList.innerHTML = "";
        data.losers.forEach(l => {
            const pct = (l.pct_change !== undefined && l.pct_change !== null) ? l.pct_change + "%" : "N/A";
            const price = (l.last_close !== undefined && l.last_close !== null) ? "₹" + l.last_close : "N/A";
            losersList.innerHTML += `<li>
                <span>${l.symbol}</span> 
                <span class="down">▼ ${pct}</span> 
                <span>${price}</span>
            </li>`;
        });
    })
    .catch(() => {
        document.getElementById('top-gainers').innerHTML = "<li>Error loading gainers</li>";
        document.getElementById('top-losers').innerHTML = "<li>Error loading losers</li>";
    });
});

function renderStockChart(history, symbol) {
    const chartDiv = document.getElementById('stockChart');
    if (!chartDiv || !Array.isArray(history) || !history.length) return;
    const plotBg = document.body.classList.contains("dark-mode") ? '#1e2a38' : '#fff';
    const paperBg = plotBg;
    const gridColor = document.body.classList.contains("dark-mode") ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
    const fontColor = document.body.classList.contains("dark-mode") ? "#fff" : "#333";
    const dates = history.map(d => d.Date || d.date);
    const closes = history.map(d => d.Close ?? d.close);
    const trace = {
        x: dates,
        y: closes,
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Close Price',
        fill: 'tozeroy',
        line: { color: '#2196F3' }
    };
    const layout = {
        title: `${symbol} Price Chart`,
        xaxis: { title: 'Date', gridcolor: gridColor },
        yaxis: { title: 'Close Price', gridcolor: gridColor },
        margin: { t: 40, l: 40, r: 40, b: 40 },
        plot_bgcolor: plotBg,
        paper_bgcolor: paperBg,
        font: { color: fontColor }
    };
    Plotly.newPlot(chartDiv, [trace], layout, {responsive: true});
}


function showMessage(message, isError = false) {
    const messageContainer = document.getElementById("message-container");
    if (!messageContainer) return;
    messageContainer.textContent = message;
    messageContainer.style.display = "block";
    messageContainer.style.backgroundColor = isError ? "#ffebee" : "#e8f5e9";
    messageContainer.style.color = isError ? "#c62828" : "#2e7d32";
    messageContainer.style.border = isError ? "1px solid #c62828" : "1px solid #2e7d32";
    setTimeout(() => {
        messageContainer.style.display = "none";
    }, 5000);
}
let gainersChart, losersChart;

function showGainersPlotly(gainers) {
    const symbols = gainers.map(g => g.symbol);
    const changes = gainers.map(g => g.pct_change);
    const trace = {
        x: symbols,
        y: changes,
        type: 'bar',
        marker: { color: 'rgba(34,197,94,0.7)' }
    };
    const layout = {
        title: 'Top Gainers (% Change)',
        xaxis: { title: 'Symbol' },
        yaxis: { title: '% Change' },
        margin: { t: 40, l: 40, r: 40, b: 40 },
        plot_bgcolor: document.body.classList.contains("dark-mode") ? '#1e2a38' : '#fff',
        paper_bgcolor: document.body.classList.contains("dark-mode") ? '#1e2a38' : '#fff',
        font: { color: document.body.classList.contains("dark-mode") ? "#fff" : "#333" }
    };
    Plotly.newPlot('gainers-plotly', [trace], layout, {responsive: true});
}
window.showGainersPlotly = showGainersPlotly; 
function showLosersPlotly(losers) {
    const symbols = losers.map(l => l.symbol);
    const changes = losers.map(l => l.pct_change);

    const trace = {
        x: symbols,
        y: changes,
        type: 'bar',
        marker: { color: 'rgba(239,68,68,0.7)' }
    };
    const layout = {
        title: 'Top Losers (% Change)',
        xaxis: { title: 'Symbol' },
        yaxis: { title: '% Change' },
        margin: { t: 40, l: 40, r: 40, b: 40 },
        plot_bgcolor: document.body.classList.contains("dark-mode") ? '#1e2a38' : '#fff',
        paper_bgcolor: document.body.classList.contains("dark-mode") ? '#1e2a38' : '#fff',
        font: { color: document.body.classList.contains("dark-mode") ? "#fff" : "#333" }
    };
    Plotly.newPlot('losers-plotly', [trace], layout, {responsive: true});
}
window.showLosersPlotly = showLosersPlotly; 

// Toggle logic for list/graph view
document.getElementById('list-view-btn').addEventListener('click', function() {
    document.getElementById('top-gainers').style.display = '';
    document.getElementById('top-losers').style.display = '';
    document.getElementById('gainers-plotly').style.display = 'none';
    document.getElementById('losers-plotly').style.display = 'none';
    this.classList.add('active');
    document.getElementById('graph-view-btn').classList.remove('active');
});
document.getElementById('graph-view-btn').addEventListener('click', function() {
    document.getElementById('top-gainers').style.display = 'none';
    document.getElementById('top-losers').style.display = 'none';
    document.getElementById('gainers-plotly').style.display = '';
    document.getElementById('losers-plotly').style.display = '';
    this.classList.add('active');
    document.getElementById('list-view-btn').classList.remove('active');
    // Draw charts with latest data
    if (window.latestGainers && window.latestLosers) {
        showGainersPlotly(window.latestGainers);
        showLosersPlotly(window.latestLosers);
    }
});

// After fetching market movers, store for chart use
fetch('/api/market-movers')
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            document.getElementById('top-gainers').innerHTML = "<li>Error loading gainers</li>";
            document.getElementById('top-losers').innerHTML = "<li>Error loading losers</li>";
            return;
        }
        window.latestGainers = data.gainers;
        window.latestLosers = data.losers;
        // ...existing list rendering code...
        const gainersList = document.getElementById('top-gainers');
        gainersList.innerHTML = "";
        data.gainers.forEach(g => {
            const pct = (g.pct_change !== undefined && g.pct_change !== null) ? g.pct_change + "%" : "N/A";
            const price = (g.last_close !== undefined && g.last_close !== null) ? "₹" + g.last_close : "N/A";
            gainersList.innerHTML += `<li>
                <span>${g.symbol}</span>
                <span class="up">▲ ${pct}</span>
                <span>${price}</span>
            </li>`;
        });
        const losersList = document.getElementById('top-losers');
        losersList.innerHTML = "";
        data.losers.forEach(l => {
            const pct = (l.pct_change !== undefined && l.pct_change !== null) ? l.pct_change + "%" : "N/A";
            const price = (l.last_close !== undefined && l.last_close !== null) ? "₹" + l.last_close : "N/A";
            losersList.innerHTML += `<li>
                <span>${l.symbol}</span> 
                <span class="down">▼ ${pct}</span> 
                <span>${price}</span>
            </li>`;
        });
    })
    .catch(() => {
        document.getElementById('top-gainers').innerHTML = "<li>Error loading gainers</li>";
        document.getElementById('top-losers').innerHTML = "<li>Error loading losers</li>";
    });
document.addEventListener("DOMContentLoaded", function () {
    fetch('/api/market-movers')
        .then(res => res.json())
        .then(data => {
            const tickerDiv = document.getElementById('ticker-content-indian');
            if (!tickerDiv) return;
            let tickerHTML = '';

            if (data.gainers && data.gainers.length) {
                tickerHTML += `<span class="ticker-label gainers-label">Top Gainers:</span> `;
                tickerHTML += data.gainers.map(g =>
                    `<span class="ticker-item">
                        ${g.symbol} 
                        <span class="up">▲${g.pct_change}%</span> 
                        <span class="gainer-price">₹${g.last_close}</span>
                    </span>`
                ).join(' <span class="ticker-sep">|</span>');
                tickerHTML += ' &nbsp; ';
            }

            if (data.losers && data.losers.length) {
                tickerHTML += `<span class="ticker-label losers-label">Top Losers:</span> `;
                tickerHTML += data.losers.map(l =>
                    `<span class="ticker-item">
                        ${l.symbol} 
                        <span class="down">▼${l.pct_change}%</span> 
                        <span class="loser-price">₹${l.last_close}</span>
                    </span>`
                ).join(' <span class="ticker-sep">|</span> ');
            }

            tickerDiv.innerHTML = tickerHTML;
        })
        .catch(() => {
            const tickerDiv = document.getElementById('ticker-content-indian');
            if (tickerDiv) tickerDiv.textContent = "Unable to load market movers.";
        });
});

document.addEventListener("DOMContentLoaded", async function () {
    const tableBody = document.getElementById('favorites-tbody');
    let bookmarks = [];
    await initializeFirebase(); 
    // Get user ID
    const userId = await getUserIdAsync();

    // Fetch bookmarks from Firebase
    async function fetchBookmarks() {
        const docRef = doc(db, "Bookmarks", userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            bookmarks = docSnap.data().symbols || [];
        } else {
            bookmarks = [];
        }
    }

    // Save bookmarks to Firebase
    async function saveBookmarks() {
        const docRef = doc(db, "Bookmarks", userId);
        await setDoc(docRef, { symbols: bookmarks }, { merge: true });
    }

    // Fetch companies from MongoDB
    async function fetchCompanies() {
        const res = await fetch("/get-companies");
        return await res.json();
    }

    // Fetch current price for a ticker (implement this endpoint in your backend)
    async function fetchCurrentPrice(ticker) {
        try {
            const res = await fetch(`/api/price?ticker=${encodeURIComponent(ticker)}`);
            const data = await res.json();
            return data.price ?? "N/A";
        } catch {
            return "N/A";
        }
    }

    // Render the table
async function renderTable() {
    console.log("renderTable called");
    tableBody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
    const companies = await fetchCompanies();

    console.log("Companies fetched:", companies);
    if (!companies || !companies.length) {
        tableBody.innerHTML = '<tr><td colspan="4">No companies found.</td></tr>';
        return;
    }
    // Fetch all prices in parallel
    const prices = await Promise.all(companies.map(c =>
        fetchCurrentPrice(c["Yahoo Finance Ticker"])
    ));
    await fetchBookmarks();
    console.log("Prices fetched:", prices);

    // Combine companies and prices for easier sorting
    const companiesWithPrices = companies.map((company, idx) => ({
        ...company,
        price: prices[idx],
        isBookmarked: bookmarks.includes(company["Yahoo Finance Ticker"])
    }));

    // Sort: bookmarked first, then others
    companiesWithPrices.sort((a, b) => {
        if (a.isBookmarked === b.isBookmarked) return 0;
        return a.isBookmarked ? -1 : 1;
    });

    tableBody.innerHTML = '';
    companiesWithPrices.forEach((company) => {
        const ticker = company["Yahoo Finance Ticker"];
        const isBookmarked = company.isBookmarked;
        const price = company.price;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <button class="bookmark-btn${isBookmarked ? ' bookmarked' : ''}" data-ticker="${ticker}" title="Bookmark">
                    ${isBookmarked ? '★' : '☆'}
                </button>
            </td>
            <td>${company["Company Name"]}</td>
            <td>${ticker}</td>
            <td>${price !== undefined ? '₹' + price : 'N/A'}</td>
        `;
        tableBody.appendChild(row);
    });
} window.renderTable = renderTable; 

    // Handle bookmark click
    tableBody.addEventListener('click', async function (e) {
        if (e.target.classList.contains('bookmark-btn')) {
            const ticker = e.target.getAttribute('data-ticker');
            if (bookmarks.includes(ticker)) {
                bookmarks = bookmarks.filter(t => t !== ticker);
            } else {
                bookmarks.push(ticker);
            }
            await saveBookmarks();
            renderTable();
        }
    });

    renderTable();
});
document.addEventListener("DOMContentLoaded", function() {
    if (!localStorage.getItem('movers_tutorial_shown')) {
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
            localStorage.setItem('movers_tutorial_shown', 'yes');
        }).onexit(function() {
            localStorage.setItem('movers_tutorial_shown', 'yes');
        }).start();
    }
});

import { initializeNewsletterForm } from './newsletter.js';
document.addEventListener("DOMContentLoaded", function () {
    initializeNewsletterForm();
    // Other page-specific code...
});