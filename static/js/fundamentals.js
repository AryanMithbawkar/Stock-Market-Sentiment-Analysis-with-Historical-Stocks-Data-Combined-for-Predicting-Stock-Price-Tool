import { initializeNewsletterForm } from './newsletter.js';
// --- Variables ---
let comparisonChart = null;
const peers = [];
let currentView = 'table';

// --- Page transition and dark mode ---
document.addEventListener("DOMContentLoaded", async function () {
    document.body.classList.add("loaded");

    // Dark mode toggle with sun/moon icon in toggle circle
    const darkModeToggle = document.getElementById("darkModeToggle");
    const toggleIcon = document.querySelector('.toggle-circle .toggle-icon');

    function updateToggleIcon() {
        if (darkModeToggle && toggleIcon) {
            if (darkModeToggle.checked) {
                toggleIcon.innerHTML = '&#9790;'; // Moon
                toggleIcon.style.color = "#4a8fdf";
            } else {
                toggleIcon.innerHTML = '&#9728;'; // Sun
                toggleIcon.style.color = "#FFD600";
            }
        }
    }

    if (darkModeToggle) {
        // Set the toggle to checked (on) by default
        darkModeToggle.checked = true;
        // Apply dark mode on page load
        document.body.classList.add("dark-mode");
        // Initial icon state
        updateToggleIcon();

        darkModeToggle.addEventListener("change", function () {
            document.body.classList.toggle("dark-mode");
            updateToggleIcon();
            updateAllPlotlyChartColors();
            if (window.lastChartData) showChart(window.lastChartData.history, window.lastChartData.symbol);
            if (window.lastFundamentalsHistory) updateFundamentalsHistoryChart(window.lastFundamentalsHistory.history, window.lastFundamentalsHistory.symbol);
            if (typeof updateComparisonChart === "function") updateComparisonChart();
        });
    }

    // Page transition for links
    document.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", function (event) {
            if (this.getAttribute("target") === "_blank") return;
            event.preventDefault();
            let href = this.href;
            let overlay = document.createElement("div");
            overlay.classList.add("transition-overlay");
            document.body.appendChild(overlay);
            setTimeout(() => { overlay.classList.add("expand"); }, 90);
            setTimeout(() => { overlay.remove(); }, 1000);
            setTimeout(() => { window.location.href = href; }, 890);
        });
    });

    // Populate dropdown
    fetch("/get-companies")
        .then(res => res.json())
        .then(companies => {
            const selects = [
                document.getElementById("fundamentals-symbol"),
                document.getElementById("fundamentals-search-bar")
            ];
            selects.forEach(select => {
                if (!select) return;
                select.innerHTML = '<option value="">Select a company...</option>';
                companies.forEach(company => {
                    const option = document.createElement("option");
                    option.value = company["Yahoo Finance Ticker"];
                    option.textContent = `${company["Company Name"]} (${company["Yahoo Finance Ticker"]})`;
                    select.appendChild(option);
                });
            });

            // Pre-select if a company was chosen on home
            const selectedCompany = localStorage.getItem('selectedCompany');
            if (selectedCompany) {
                companies.forEach(company => {
                    const displayName = company.name || company["Company Name"] || company.ticker || company["Yahoo Finance Ticker"];
                    if (
                        displayName === selectedCompany ||
                        `${company["Company Name"]} (${company["Yahoo Finance Ticker"]})` === selectedCompany
                    ) {
                        selects.forEach(select => {
                            if (select) select.value = company["Yahoo Finance Ticker"];
                        });
                    }
                });
                // Optionally clear the selection after use
                // localStorage.removeItem('selectedCompany');
            }
        });

    // Load default stock if present
    const params = new URLSearchParams(window.location.search);
    const userInput = params.get("symbol");
    const searchBar = document.getElementById("fundamentals-search-bar");
    if (searchBar && userInput) searchBar.value = userInput;
    if (userInput) {
        try {
            const res = await fetch(`/api/lookup-symbol?query=${encodeURIComponent(userInput)}`);
            const data = await res.json();
            if (data.symbol) fetchFundamentals(data.symbol);
            else showMessage("Company not found", true);
        } catch {
            showMessage("Error looking up symbol", true);
        }
    }

    // Attach fetch button event for historical data (if present)
    const fetchBtn = document.getElementById('fetch');
    const symbolSelect = document.getElementById('fundamentals-symbol');
    const startInput = document.getElementById('start-date');
    const endInput = document.getElementById('end-date');
    if (fetchBtn && symbolSelect && startInput && endInput) {
        fetchBtn.addEventListener('click', async function () {
            const symbol = symbolSelect.value;
            const start = startInput.value;
            const end = endInput.value;
            if (!symbol) {
                showMessage("Please select a company from the dropdown.", true);
                return;
            }
            let url = `/api/historical?symbol=${encodeURIComponent(symbol)}`;
            if (start && end) url += `&start=${start}&end=${end}`;
            try {
                const res = await fetch(url);
                const data = await res.json();
                if (data.error) {
                    showMessage(data.error, true);
                    return;
                }
                showTable(data.history);
                showChart(data.history, symbol);
                showView(currentView);
            } catch (e) {
                showMessage("Failed to fetch stock data.", true);
            }
        });
    }
});
document.addEventListener("DOMContentLoaded", function () {
    document.body.classList.add("loaded"); // Fade-in page on load
});

document.addEventListener("DOMContentLoaded", function () {
    fetch("/get-companies")
        .then(res => res.json())
        .then(companies => {
            const selects = [
                document.getElementById("fundamentals-symbol"),
                document.getElementById("fundamentals-search-bar")
            ];
            selects.forEach(select => {
                if (!select) return;
                select.innerHTML = '<option value="">Select a company...</option>';
                companies.forEach(company => {
                    const option = document.createElement("option");
                    option.value = company["Yahoo Finance Ticker"];
                    option.textContent = `${company["Company Name"]} (${company["Yahoo Finance Ticker"]})`;
                    select.appendChild(option);
                });
            });

            // Pre-select if a company was chosen on home
            const selectedCompany = localStorage.getItem('selectedCompany');
            if (selectedCompany) {
                companies.forEach(company => {
                    const displayName = company.name || company["Company Name"] || company.ticker || company["Yahoo Finance Ticker"];
                    if (
                        displayName === selectedCompany ||
                        `${company["Company Name"]} (${company["Yahoo Finance Ticker"]})` === selectedCompany
                    ) {
                        selects.forEach(select => {
                            if (select) select.value = company["Yahoo Finance Ticker"];
                        });
                    }
                });
                // Optionally clear the selection after use
                // localStorage.removeItem('selectedCompany');
            }
        });
});

// --- Show messages ---
function showMessage(message, isError = false) {
    const messageContainer = document.getElementById("message-container");
    if (!messageContainer) return;
    messageContainer.textContent = message;
    messageContainer.style.display = "block";
    messageContainer.style.backgroundColor = isError ? "#ffebee" : "#e8f5e9";
    messageContainer.style.color = isError ? "#c62828" : "#2e7d32";
    messageContainer.style.border = isError ? "1px solid #c62828" : "1px solid #2e7d32";
    setTimeout(() => { messageContainer.style.display = "none"; }, 5000);
}

// --- Fetch and display fundamentals ---
async function fetchFundamentals(symbol) {
    if (!symbol || symbol.trim() === '') {
        showMessage("Please select a stock symbol", true);
        return;
    }
    try {
        document.querySelectorAll('.ratio-value').forEach(el => {
            el.textContent = '...';
            el.classList.add('loading');
        });
        const response = await fetch(`/api/fundamentals?symbol=${encodeURIComponent(symbol)}`);
        const data = await response.json();
        if (data.error) {
            showMessage(data.error, true);
            return;
        }
        updateFundamentalsUI(data);
        showRiskMetricsChart(data);
        showBetaGauge(data.beta);
        if (data.history) {
            updateFundamentalsHistoryChart(data.history, symbol);
            showRollingVolatilityChart(data.history);
        } else {
            Plotly.purge('fundamentals-chart');
        }
    } catch (error) {
        showMessage("Failed to fetch fundamentals data.", true);
    }
}window.fetchFundamentals = fetchFundamentals; // Expose function globally

// --- Update UI with ratios and risk metrics ---
function updateFundamentalsUI(data) {
    document.getElementById('pe-ratio').textContent = data.pe ? data.pe.toFixed(2) : 'N/A';
    document.getElementById('pb-ratio').textContent = data.pb ? data.pb.toFixed(2) : 'N/A';
    document.getElementById('ps-ratio').textContent = data.ps ? data.ps.toFixed(2) : 'N/A';
    document.getElementById('div-yield').textContent = data.divYield ? (data.divYield.toFixed(2) + '%') : 'N/A';
    document.getElementById('roe').textContent = data.roe ? (data.roe.toFixed(2) + '%') : 'N/A';
    document.getElementById('roa').textContent = data.roa ? (data.roa.toFixed(2) + '%') : 'N/A';
    document.getElementById('gross-margin').textContent = data.grossMargin ? (data.grossMargin.toFixed(2) + '%') : 'N/A';
    document.getElementById('op-margin').textContent = data.opMargin ? (data.opMargin.toFixed(2) + '%') : 'N/A';
    document.getElementById('current-ratio').textContent = data.currentRatio ? data.currentRatio.toFixed(2) : 'N/A';
    document.getElementById('quick-ratio').textContent = data.quickRatio ? data.quickRatio.toFixed(2) : 'N/A';
    document.getElementById('debt-equity').textContent = data.debtEquity ? data.debtEquity.toFixed(2) : 'N/A';
    document.getElementById('ebitda-margin').textContent = data.ebitdaMargin ? (data.ebitdaMargin.toFixed(2) + '%') : 'N/A';
    document.getElementById('volatility').textContent =
        data.volatility !== null && data.volatility !== undefined ? (data.volatility * 100).toFixed(2) + '%' : 'N/A';
    document.getElementById('beta').textContent =
        data.beta !== null && data.beta !== undefined ? data.beta.toFixed(2) : 'N/A';
    document.getElementById('var95').textContent =
        data.var95 !== null && data.var95 !== undefined ? (data.var95 * 100).toFixed(2) + '%' : 'N/A';
    document.querySelectorAll('.ratio-value').forEach(el => el.classList.remove('loading'));
}

// --- Plotly chart for price/volume history ---
function updateFundamentalsHistoryChart(history, symbol) {
    window.lastFundamentalsHistory = { history, symbol };
    const chartDiv = document.getElementById('fundamentals-chart');
    if (!history || !history.length) {
        Plotly.purge(chartDiv);
        return;
    }
    const { years, avgCloses, totalVolumes } = groupByYear(history);
    const plotBg = getBgColor();
    const paperBg = getBgColor();
    const gridColor = getGridColor();
    const fontColor = getTextColor();
    // Calculate 3-year and 5-year moving averages for yearly data
    const dma3 = movingAverage(avgCloses, 3);
    const dma5 = movingAverage(avgCloses, 5);
    const priceTrace = {
        x: years,
        y: avgCloses,
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Avg Closing Price (₹)',
        line: { color: '#2196F3' },
        yaxis: 'y1',
        fill: 'tozeroy',
        fillcolor: 'rgba(33,150,243,0.15)'
    };
    const volumeTrace = {
        x: years,
        y: totalVolumes,
        type: 'bar',
        name: 'Total Volume',
        marker: { color: '#4caf50', opacity: 0.4 },
        yaxis: 'y2'
    };
    const dma3Trace = {
        x: years,
        y: dma3,
        type: 'scatter',
        mode: 'lines',
        name: '3-Year MA',
        line: { color: '#ff9800', width: 2, dash: 'dot' },
        yaxis: 'y1'
    };
    const dma5Trace = {
        x: years,
        y: dma5,
        type: 'scatter',
        mode: 'lines',
        name: '5-Year MA',
        line: { color: '#FF00FF', width: 2, dash: 'dash' },
        yaxis: 'y1'
    };
    const layout = {
        title: `${symbol} Yearly Stock Performance`,
        xaxis: { title: 'Year', gridcolor: gridColor },
        yaxis: { title: 'Avg Price (₹)', side: 'left', gridcolor: gridColor },
        yaxis2: {
            title: 'Total Volume',
            overlaying: 'y',
            side: 'right',
            showgrid: false
        },
        legend: { x: 0, y: 1.1, orientation: 'h' },
        margin: { t: 40, l: 40, r: 40, b: 40 },
        plot_bgcolor: plotBg,
        paper_bgcolor: paperBg,
        font: { color: fontColor }
    };
    Plotly.newPlot(chartDiv, [priceTrace, dma3Trace, dma5Trace, volumeTrace], layout, {responsive: true});
}

// --- Risk Metrics Bar Chart ---
function showRiskMetricsChart(data) {
    window.lastRiskMetricsData = data;
    const chartDiv = document.getElementById('risk-metrics-chart');
    if (!chartDiv) return;
    const plotBg = getBgColor();
    const paperBg = getBgColor();
    const gridColor = getGridColor();
    const fontColor = getTextColor();
    const labels = ['Volatility (%)', 'Beta', 'VaR 95% (%)'];
    const values = [
        data.volatility !== null && data.volatility !== undefined ? data.volatility * 100 : null,
        data.beta !== null && data.beta !== undefined ? data.beta : null,
        data.var95 !== null && data.var95 !== undefined ? data.var95 * 100 : null
    ];
    const trace = {
        x: labels,
        y: values,
        type: 'bar',
        marker: {
            color: ['rgba(54,162,235,0.6)', 'rgba(255,99,132,0.6)', 'rgba(255,167,38,0.6)'], // semi-transparent fill
            line: {
                color: ['#36a2eb', '#ff6384', '#ffa726'], // opaque border
                width: 2
            }
        }
    };
    const layout = {
        title: 'Risk Metrics',
        xaxis: { title: '', gridcolor: gridColor },
        yaxis: { title: '', rangemode: 'tozero', gridcolor: gridColor },
        margin: { t: 40, l: 40, r: 40, b: 40 },
        plot_bgcolor: plotBg,
        paper_bgcolor: paperBg,
        font: { color: fontColor }
    };
    Plotly.newPlot(chartDiv, [trace], layout, {responsive: true});
}

// --- Utility functions ---
function groupByYear(history) {
    const yearly = {};
    history.forEach(d => {
        const dateStr = d.Date || d.date;
        const year = new Date(dateStr).getFullYear();
        if (!yearly[year]) yearly[year] = { closeSum: 0, volumeSum: 0, count: 0 };
        yearly[year].closeSum += Number(d.Close ?? d.close);
        yearly[year].volumeSum += Number(d.Volume ?? d.volume);
        yearly[year].count += 1;
    });
    const years = Object.keys(yearly).sort();
    const avgCloses = years.map(y => yearly[y].closeSum / yearly[y].count);
    const totalVolumes = years.map(y => yearly[y].volumeSum);
    return { years, avgCloses, totalVolumes };
}

function getGridColor() {
    return document.body.classList.contains("dark-mode") ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
}
function getBgColor() {
    return document.body.classList.contains("dark-mode") ? '#1e2a38' : '#fff';
}
function getTextColor() {
    return document.body.classList.contains("dark-mode") ? "#fff" : "#333";
}

function updateAllPlotlyChartColors() {
    const layoutUpdate = {
        paper_bgcolor: getBgColor(),
        plot_bgcolor: getBgColor(),
        font: { color: getTextColor() },
        xaxis: { color: getTextColor(), gridcolor: getGridColor() },
        yaxis: { color: getTextColor(), gridcolor: getGridColor() }
    };
    [
        'stockChart',
        'fundamentals-chart',
        'comparison-chart',
        'prediction-chart',
        'beta-gauge-chart'
    ].forEach(id => {
        const chartDiv = document.getElementById(id);
        if (chartDiv && chartDiv.data) {
            Plotly.relayout(chartDiv, layoutUpdate);
        }
        // For risk-metrics and rolling-vol, redraw with latest data
    if (window.lastRiskMetricsData) showRiskMetricsChart(window.lastRiskMetricsData);
    if (window.lastFundamentalsHistory) showRollingVolatilityChart(window.lastFundamentalsHistory.history);
    });
}

// --- Tab switching ---
function openTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
    // Remove 'active' from all tab buttons
    document.querySelectorAll('.fundamentals-tabs .tab-button').forEach(btn => btn.classList.remove('active'));
    // Show the selected tab content
    document.getElementById(tabName).style.display = 'block';
    // Add 'active' to the clicked tab button
    document.querySelectorAll('.fundamentals-tabs .tab-button').forEach(btn => {
        if (btn.getAttribute('onclick') === `openTab('${tabName}')`) {
            btn.classList.add('active');
        }
    });
    

    // --- Force Plotly to resize charts in the now-visible tab ---
    setTimeout(() => {
        if (tabName === 'chart') {
            const chartDiv = document.getElementById('fundamentals-chart');
            if (chartDiv) Plotly.Plots.resize(chartDiv);
        }
        if (tabName === 'compare') {
            ['risk-metrics-chart', 'rolling-vol-chart', 'beta-gauge-chart'].forEach(id => {
                const chartDiv = document.getElementById(id);
                if (chartDiv) Plotly.Plots.resize(chartDiv);
            });
        }
    }, 100); // Delay ensures the tab is visible before resizing
}

window.openTab = openTab; 
function showRollingVolatilityChart(history) {
    if (!history || !history.length) return;
    const plotBg = getBgColor();
    const paperBg = getBgColor();
    const gridColor = getGridColor();
    const fontColor = getTextColor();
    const returns = history.map((d, i, arr) => i > 0 ? (d.Close - arr[i-1].Close) / arr[i-1].Close : null).slice(1);
    const windowSize = 30;
    const rollingVol = [];
    for (let i = windowSize; i < returns.length; i++) {
        const window = returns.slice(i - windowSize, i);
        const std = Math.sqrt(window.reduce((sum, r) => sum + Math.pow(r - (window.reduce((a, b) => a + b, 0) / window.length), 2), 0) / window.length);
        rollingVol.push(std * Math.sqrt(252) * 100); // annualized %
    }
    const dates = history.slice(windowSize + 1).map(d => d.Date || d.date);
    const trace = {
        x: dates,
        y: rollingVol,
        type: 'scatter',
        mode: 'lines',
        name: '30-day Rolling Volatility (%)',
        fill: 'tozeroy',
        line: { color: '#36a2eb' }
    };
    const layout = {
        title: 'Rolling Volatility (30-day, Annualized)',
        xaxis: { title: 'Date', gridcolor: gridColor },
        yaxis: { title: 'Volatility (%)', rangemode: 'tozero', gridcolor: gridColor },
        margin: { t: 40, l: 40, r: 40, b: 40 },
        plot_bgcolor: plotBg,
        paper_bgcolor: paperBg,
        font: { color: fontColor }
    };
    Plotly.newPlot('rolling-vol-chart', [trace], layout, {responsive: true});
}
// --- Beta Gauge Chart ---
function showBetaGauge(beta) {
    window.lastBeta = beta; // <-- Add this line
    const chartDiv = document.getElementById('beta-gauge-chart');
    if (!chartDiv || beta === null || beta === undefined) return;
    const plotBg = getBgColor();
    const paperBg = getBgColor();
    const fontColor = getTextColor();
    // Get the actual width of the container
    const containerWidth = chartDiv.parentElement ? chartDiv.parentElement.offsetWidth : 400;
    Plotly.newPlot(chartDiv, [{
        type: "indicator",
        mode: "gauge+number",
        value: beta,
        title: { text: "Beta", font: { color: fontColor } },
        gauge: {
            axis: { 
                range: [0, 2], 
                tickcolor: fontColor,
                linecolor: "#ff6384", // Opaque axis line
                linewidth: 3
            },
            bar: { 
                color: "rgba(255,99,132,0.6)", // semi-transparent fill
                line: { color: "#ff6384", width: 3 } // opaque border
            },
            steps: [
                { range: [0, 1], color: "rgba(174,229,113,0.5)", line: {color: "rgba(175, 229, 113,1)", width: 4} },   // semi-transparent green with opaque edge
                { range: [1, 2], color: "rgba(255,224,130,0.5)", line: {color: "rgba(255, 224, 130,1)", width: 4} }    // semi-transparent yellow with opaque edge
            ],
            bgcolor: plotBg,
            bordercolor: paperBg
        }
    }], {
        width: containerWidth, // <-- Force width to match container
        margin: { t: 40, l: 40, r: 40, b: 40 },
        paper_bgcolor: paperBg,
        plot_bgcolor: plotBg,
        font: { color: fontColor }
    });
}

document.addEventListener("DOMContentLoaded", function () {
    const fetchBtn = document.getElementById('fetch');
    const symbolSelect = document.getElementById('fundamentals-symbol');
    const startInput = document.getElementById('start-date');
    const endInput = document.getElementById('end-date');

    fetchBtn.addEventListener('click', async function () {
        const symbol = symbolSelect.value;
        const start = startInput.value;
        const end = endInput.value;
        if (!symbol) {
            showMessage("Please select a company from the dropdown.", true);
            return;
        }
        let url = `/api/historical?symbol=${encodeURIComponent(symbol)}`;
        if (start && end) url += `&start=${start}&end=${end}`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data.error) {
                showMessage(data.error, true);
                return;
            }
            // You need to implement showTable and showChart functions for your table/chart
            showTable(data.history);
            showChart(data.history, symbol);
            showView(currentView); // If you have tab switching for table/chart/both
        } catch (e) {
            showMessage("Failed to fetch stock data.", true);
        }
    });
});

function showTable(history) {
    // Simple table rendering for demonstration
    const tableDiv = document.getElementById('stock-data-table');
    if (!history || !history.length) {
        tableDiv.innerHTML = "<p>No data available.</p>";
        return;
    }
    let html = "<table><thead><tr>";
    Object.keys(history[0]).forEach(key => {
        html += `<th>${key}</th>`;
    });
    html += "</tr></thead><tbody>";
    history.forEach(row => {
        html += "<tr>";
        Object.values(row).forEach(val => {
            html += `<td>${val !== undefined ? val : ''}</td>`;
        });
        html += "</tr>";
    });
    html += "</tbody></table>";
    tableDiv.innerHTML = html;
}

// --- Stock Price Chart for /api/historical ---
function showChart(history, symbol) {
    const chartDiv = document.getElementById('stockChart');
    if (!history || !history.length) {
        Plotly.purge(chartDiv);
        return;
    }
    const plotBg = getBgColor();
    const paperBg = getBgColor();
    const gridColor = getGridColor();
    const fontColor = getTextColor();
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

function showView(view) {
    // Remove 'active' from all tab buttons
    document.querySelectorAll('.tab-container .tab-button').forEach(btn => btn.classList.remove('active'));
    // Add 'active' to the clicked tab button
    document.querySelectorAll('.tab-container .tab-button').forEach(btn => {
        if (btn.getAttribute('onclick') === `showView('${view}')`) {
            btn.classList.add('active');
        }
    });
    window.showView = showView; 
    // Show/hide table/chart views as needed
    document.getElementById('stock-data-table').style.display = (view === 'table' || view === 'both') ? 'block' : 'none';
    document.getElementById('chart-view').style.display = (view === 'chart' || view === 'both') ? 'block' : 'none';

    // Force Plotly to resize if chart is shown
    if (view === 'chart' || view === 'both') {
        setTimeout(() => {
            const chartDiv = document.getElementById('stockChart');
            if (chartDiv) Plotly.Plots.resize(chartDiv);
        }, 100);
    }
}
window.addEventListener('resize', () => {
    if (window.lastBeta !== undefined) {
        showBetaGauge(window.lastBeta);
    }
});
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

function movingAverage(arr, windowSize) {
    let result = [];
    for (let i = 0; i < arr.length; i++) {
        if (i < windowSize - 1) {
            result.push(null);
        } else {
            let sum = 0;
            for (let j = i - windowSize + 1; j <= i; j++) {
                sum += arr[j];
            }
            result.push(sum / windowSize);
        }
    }
    return result;
}
document.addEventListener("DOMContentLoaded", function() {
    if (!localStorage.getItem('fundamentals_tutorial_shown')) {
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
            localStorage.setItem('fundamentals_tutorial_shown', 'yes');
        }).onexit(function() {
            localStorage.setItem('fundamentals_tutorial_shown', 'yes');
        }).start();
    }
});

document.addEventListener("DOMContentLoaded", function () {
    initializeNewsletterForm();
    // Other page-specific code...
});