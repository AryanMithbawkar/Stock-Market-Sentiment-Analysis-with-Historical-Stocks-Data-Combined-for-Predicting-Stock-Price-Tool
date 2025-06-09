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


// Page transition & dark mode toggle
document.addEventListener("DOMContentLoaded", function () {
    document.body.classList.add("loaded");

    const darkToggle = document.getElementById("darkModeToggle");
    const toggleIcon = document.querySelector('.toggle-circle .toggle-icon');

    function updateToggleIcon() {
        if (darkToggle && toggleIcon) {
            if (darkToggle.checked) {
                toggleIcon.innerHTML = '&#9790;'; // Moon
                toggleIcon.style.color = "#4a8fdf";
            } else {
                toggleIcon.innerHTML = '&#9728;'; // Sun
                toggleIcon.style.color = "#FFD600";
            }
        }
    }

    if (darkToggle) {
        darkToggle.checked = true;
        document.body.classList.add("dark-mode");
        updateToggleIcon();

        darkToggle.addEventListener("change", () => {
            document.body.classList.toggle("dark-mode");
            updateToggleIcon();
            updatePredictionChartColors();
            
        });
    }

    document.querySelectorAll("a").forEach(link => {
        if (link.getAttribute("target") === "_blank") return;

        link.addEventListener("click", function (event) {
            event.preventDefault();
            const overlay = document.createElement("div");
            overlay.classList.add("transition-overlay");
            document.body.appendChild(overlay);

            setTimeout(() => overlay.classList.add("active"), 90);
            setTimeout(() => overlay.remove(), 1000);
            setTimeout(() => window.location.href = this.href, 890);
        });
    });
    // Set min date for prediction input
    const today = new Date();
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + 6);
    const maxDate = new Date(today);
    maxDate.setMonth(today.getMonth() + 1);

    function formatDate(d) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    const predictionDateInput = document.getElementById('prediction-date');
    predictionDateInput.min = formatDate(minDate);
    predictionDateInput.max = formatDate(maxDate);
});

document.addEventListener("DOMContentLoaded", function () {
    fetch("/get-companies")
      .then(response => response.json())
      .then(data => {
        const select = document.getElementById("stock-select");
        const seen = new Set(); // Track unique tickers
        data.forEach(company => {
          const ticker = company["Yahoo Finance Ticker"];
          const name = company["Company Name"];
          // Exclude NIFTY and SENSEX tickers and duplicates
          if (ticker !== "^NSEI" && ticker !== "^BSESN" && !seen.has(ticker)) {
            const option = document.createElement("option");
            option.value = ticker;
            option.textContent = name;
            select.appendChild(option);
            seen.add(ticker);
          }
        });
      })
      .catch(error => console.error("Error fetching companies:", error));
});

let predictionChart = null;
function handleEpochsChange(select) {
  const customInput = document.getElementById('custom-epochs');
  if (select.value === 'custom') {
    customInput.style.display = 'block';
    customInput.focus();
  } else {
    customInput.style.display = 'none';
  }
}window.handleEpochsChange = handleEpochsChange;

// Listen for the "Predict" button click and route prediction request based on radio button
document.getElementById('predict-btn').addEventListener('click', async function (e) {
    e.preventDefault();
    const stockSymbol = document.getElementById('stock-select').value;
    const predictionType = document.querySelector('input[name="data-source"]:checked').value;
    const predictionDate = document.getElementById('prediction-date').value;

    if (!stockSymbol) {
        showMessage("Please select a stock", true);
        return;
    }

    if (!predictionDate) {
        showMessage("Please select a prediction date", true);
        return;
    }
    // Date validation
    const selected = new Date(predictionDate);
    const today = new Date();
    const min = new Date(today);
    min.setDate(today.getDate() + 6); // 6 days minimum
    const max = new Date(today);
    max.setMonth(today.getMonth() + 1);

    selected.setHours(0,0,0,0);
    min.setHours(0,0,0,0);
    max.setHours(0,0,0,0);

    if (selected < min || selected > max) {
        showMessage("Prediction date must be at least 6 days from today and at most 1 month from today.", true);
        return;
    }
    let epochs;
    const epochsSelect = document.getElementById('epochs');
    if (epochsSelect.value === 'custom') {
        epochs = document.getElementById('custom-epochs').value || 100;
    } else {
        epochs = epochsSelect.value;
    }

    // Show loading overlay and start progress
    document.getElementById('loading-overlay').style.display = "flex";
    updateProgress(0);

    this.disabled = true;
    this.textContent = "Predicting...";

    let payload = {
        ticker: stockSymbol,
        type: predictionType,
        prediction_date: predictionDate,
        epochs: epochs
    };

    // Set progress duration based on prediction type
    let progress = 0;
    let intervalMs;
    let maxProgress = 95;
    if (predictionType === "both") {
        // Double the time for both pipelines (~130 seconds)
        intervalMs = 51000; // 100% / 130s = ~1% per 1.3s
    } else if (predictionType === "news-sentiment") {
        // About 79 seconds for sentiment pipeline
        intervalMs = 27000; // 100% / 79s = ~1% per 0.79s
    } else {
        intervalMs = 18000; // ~65 seconds for single pipeline
    }
    let progressInterval = setInterval(() => {
        if (progress < maxProgress) {
            progress += 1;
            updateProgress(progress);
        }
    }, intervalMs);

    try {
        const response = await fetch('/predict-result', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        clearInterval(progressInterval);
        updateProgress(100);

        const result = await response.json();

        setTimeout(() => {
            document.getElementById('loading-overlay').style.display = "none";
        }, 400);

        if (response.ok) {
            displayPredictionResults(result);
        } else {
            showMessage(result.error || "Prediction failed", true);
        }
    } catch (error) {
        clearInterval(progressInterval);
        document.getElementById('loading-overlay').style.display = "none";
        showMessage("An error occurred", true);
    }

    this.disabled = false;
    this.textContent = "Predict Stock Price";
});

function updateProgress(percent) {
    document.getElementById('progress-text').textContent = `Loading... ${percent}%`;
}
function displayPredictionResults(prediction) {
    // If both, render two graphs in separate areas with space
    if (prediction.historical && prediction.sentiment) {
        document.getElementById('result-section').style.display = "block";
        document.getElementById('result-stock-name').textContent = prediction.historical.stock;
        document.getElementById('predicted-price').textContent = prediction.historical.predictedPrice;

        // Clear and create two separate chart areas with spacing
        const chartContainer = document.querySelector('.chart-container');
        chartContainer.innerHTML = `
            <div class="graph-area" id="graph-area-historical">
                <h4 style="margin-bottom:12px;">Historical Only</h4>
                <div id="prediction-chart-historical" style="height: 450px;"></div>
            </div>
            <div class="graph-area" id="graph-area-sentiment">
                <h4 style="margin-bottom:12px;">With Sentiment</h4>
                <div id="prediction-chart-sentiment" style="height: 450px;"></div>
            </div>
        `;

        renderPredictionChart(prediction.historical, 'prediction-chart-historical', 'Historical Only');
        renderPredictionChart(prediction.sentiment, 'prediction-chart-sentiment', 'With Sentiment');
    } else {
        // Single pipeline as before
        document.getElementById('result-stock-name').textContent = prediction.stock;
        document.getElementById('predicted-price').textContent = prediction.predictedPrice;
        document.getElementById('result-section').style.display = "block";
        renderPredictionChart(prediction, 'prediction-chart');
    }
}

function renderPredictionChart(prediction, chartId = 'prediction-chart', customTitle = null) {
    const data = [];

    // Train data (from historicalData)
    const trainLabels = prediction.historicalData.map(d => d.date);
    const trainValues = prediction.historicalData.map(d => d.price);
    data.push({
        x: trainLabels,
        y: trainValues,
        mode: 'lines',
        name: 'Train Data',
        fill: 'tozeroy',
        line: { color: 'rgba(74,143,223,1)' }
    });

    // Actual price (validation/test) from actualVsPredicted
    const validLabels = prediction.actualVsPredicted.map(d => d.date);
    const actualValues = prediction.actualVsPredicted.map(d => d.actual);
    data.push({
        x: validLabels,
        y: actualValues,
        mode: 'lines',
        name: 'Actual Price',
        fill: 'tozeroy',
        line: { color: 'green', width: 2 }
    });

    // Predicted price (validation/test) from actualVsPredicted
    const predictedValues = prediction.actualVsPredicted.map(d => d.predicted);
    data.push({
        x: validLabels,
        y: predictedValues,
        mode: 'lines',
        name: 'Predicted Price',
        fill: 'tozeroy',
        line: { color: 'red', width: 3, dash: 'dot' }
    });

    // Future predictions
    if (prediction.futureDates && prediction.futurePrices) {
        data.push({
            x: prediction.futureDates,
            y: prediction.futurePrices,
            mode: 'lines+markers',
            name: 'Future Predictions',
            fill: 'tozeroy',
            line: { color: 'orange', width: 2, dash: 'dash' },
            marker: { size: 8, color: 'orange' }
        });
    }

    // Buy signals
    if (prediction.buySignals && prediction.buySignals.points) {
        const buyPoints = prediction.buySignals.points;
        const buyReasons = prediction.buySignals.reasons || [];
        const buyIndices = prediction.buyIndices || Array.from({length: buyPoints.length}, (_, i) => i);
        const buyDates = buyIndices.map(idx => prediction.futureDates[idx] || '');

        data.push({
            x: buyDates,
            y: buyPoints,
            mode: 'markers',
            name: 'Buy Signals',
            marker: {
                color: 'cyan',
                size: 12,
                symbol: 'star',
                line: { width: 2, color: 'black' }
            },
            text: buyReasons,
            hovertemplate: '<b>Buy Signal</b><br>Date: %{x}<br>Price: ₹%{y:,.2f}<br>Reason: %{text}<extra></extra>'
        });
    }

    // Layout (unchanged)
    const getTextColor = () => '#A0AEC0';
    const getGridColor = () => 'rgba(105,123,147,0.4)';
    const getBgColor = () => 'rgba(19,27,43,0.0)';
    const layout = {
        title: customTitle || 'Stock Price Prediction with Future Forecast & Buy Signals',
        xaxis: {
            title: 'Date',
            color: getTextColor(),
            gridcolor: getGridColor(),
            spikecolor: "rgba(105,123,147,255)",
            spikedash: "solid",
            spikethickness: -2
        },
        yaxis: {
            title: 'Stock Price',
            color: getTextColor(),
            gridcolor: getGridColor(),
            tickprefix: '₹',
            tickformat: ',',
            spikecolor: "rgba(105,123,149,255)",
            spikedash: "solid",
            spikethickness: -2,
            zeroline: false
        },
        paper_bgcolor: getBgColor(),
        plot_bgcolor: getBgColor(),
        font: { color: getTextColor() },
        margin: { t: 50, b: 50, l: 50, r: 20 },
        legend: { x: 0, y: 1 },
        hovermode: "closest"
    };
    

    Plotly.newPlot(chartId, data, layout, { responsive: true });
}
window.renderPredictionChart = renderPredictionChart; 
function updatePredictionChartColors() {
    const layoutUpdate = {
        paper_bgcolor: getBgColor(),
        plot_bgcolor: getBgColor(),
        font: { color: getTextColor() },
        xaxis: { color: getTextColor(), gridcolor: getGridColor() },
        yaxis: { color: getTextColor(), gridcolor: getGridColor() }
    };
    Plotly.relayout('prediction-chart', layoutUpdate);
}
function getTextColor() {
    return document.body.classList.contains("dark-mode") ? '#fff' : '#333';
}

function getGridColor() {
    return document.body.classList.contains("dark-mode") ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
}

function getBgColor() {
    return document.body.classList.contains("dark-mode") ? '#1e2a38' : '#fff';
}

function showMessage(message, isError = false) {
    let box = document.getElementById("message-box");
    if (!box) {
        box = document.createElement("div");
        box.id = "message-box";
        // Place above the Predict button
        const btn = document.getElementById('predict-btn');
        btn.parentNode.insertBefore(box, btn);
    }
    box.style.position = "static";
    box.style.marginBottom = "16px";
    box.style.padding = "10px 18px";
    box.style.borderRadius = "6px";
    box.style.zIndex = "1";
    box.style.fontSize = "15px";
    box.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
    box.style.backgroundColor = isError ? "#ffe6e6" : "#e0f7fa";
    box.style.color = isError ? "#c62828" : "#00796b";
    box.style.border = `1px solid ${isError ? "#c62828" : "#00796b"}`;
    box.style.display = "inline-block";
    box.style.maxWidth = "320px";
    box.style.textAlign = "center";
    box.style.whiteSpace = "normal";
    box.style.wordBreak = "break-word";
    box.style.marginLeft = "auto";
    box.style.marginRight = "auto";
    box.textContent = message;

    setTimeout(() => { box.style.display = "none"; }, 4000);
}


// Disclaimer close logic
document.addEventListener("DOMContentLoaded", function() {
  const closeBtn = document.getElementById("close-disclaimer");
  if (closeBtn) {
    closeBtn.onclick = function() {
      document.getElementById("disclaimer-overlay").style.display = "none";
    };
  }
});
document.addEventListener("DOMContentLoaded", function () {
    // Hide disclaimer by default
    document.getElementById("disclaimer-overlay").style.display = "none";

    function showDisclaimer() {
        document.getElementById("disclaimer-overlay").style.display = "flex";
    }

    // Only show tutorial if not seen before
    if (!localStorage.getItem("predictorTutorialSeen")) {
        setTimeout(() => {
            introJs().setOptions({
                nextLabel: 'Next',
                prevLabel: 'Back',
                skipLabel: 'Skip',
                doneLabel: 'Done',
                overlayOpacity: 0.7,
                showProgress: true,
                tooltipClass: 'custom-introjs-tooltip'
            }).oncomplete(function() {
                localStorage.setItem("predictorTutorialSeen", "yes");
                showDisclaimer();
            }).onexit(function() {
                localStorage.setItem("predictorTutorialSeen", "yes");
                showDisclaimer();
            }).start();
        }, 600); // Wait for page to load
    } else {
        // If tutorial already seen, show disclaimer immediately
        showDisclaimer();
    }

    // Disclaimer close logic
    const closeBtn = document.getElementById("close-disclaimer");
    if (closeBtn) {
        closeBtn.onclick = function() {
            document.getElementById("disclaimer-overlay").style.display = "none";
        };
    }
});

document.addEventListener('DOMContentLoaded', function () {
    const sentimentContainer = document.getElementById('news-sentiment');
    const sentimentText = document.getElementById('sentiment-text');
    const radioButtons = document.querySelectorAll('input[name="data-source"]');

    // Function to map sentiment values to text
    function mapSentimentValueToText(value) {
        switch (value) {
            case 0:
                return "Negative";
            case 1:
                return "Neutral";
            case 2:
                return "Positive";
            default:
                return "Unknown";
        }
    }

    // Function to fetch and display news sentiment
    async function fetchNewsSentiment(stockSymbol) {
        try {
            const response = await fetch(`/api/news-sentiment?ticker=${stockSymbol}`);
            const data = await response.json();
            if (response.ok && data.sentiment !== undefined) {
                const sentimentTextValue = mapSentimentValueToText(data.sentiment);
                sentimentText.textContent = `Sentiment: ${sentimentTextValue}`;
            } else {
                sentimentText.textContent = 'No sentiment data available.';
            }
        } catch (error) {
            sentimentText.textContent = 'Error fetching sentiment data.';
            console.error('Error fetching sentiment:', error);
        }
    }

    // Event listener for radio button changes
    radioButtons.forEach(radio => {
        radio.addEventListener('change', function () {
            const stockSymbol = document.getElementById('stock-select').value;
            if ((this.value === 'news-sentiment' || this.value === 'both') && stockSymbol) {
                sentimentContainer.style.display = 'block';
                fetchNewsSentiment(stockSymbol);
            } else {
                sentimentContainer.style.display = 'none';
            }
        });
    });

    // Trigger sentiment fetch after prediction
    document.getElementById('predict-btn').addEventListener('click', function () {
        const selectedRadio = document.querySelector('input[name="data-source"]:checked');
        const stockSymbol = document.getElementById('stock-select').value;
        if (selectedRadio && (selectedRadio.value === 'news-sentiment' || selectedRadio.value === 'both')) {
            sentimentContainer.style.display = 'block';
            fetchNewsSentiment(stockSymbol);
        } else {
            sentimentContainer.style.display = 'none';
        }
    });
});

import { initializeNewsletterForm } from './newsletter.js';
document.addEventListener("DOMContentLoaded", function () {
    initializeNewsletterForm();
    // Other page-specific code...
});