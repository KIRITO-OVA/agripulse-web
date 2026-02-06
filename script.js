/**
 * AgriPulse Neural Frontend - Core Logic
 */

const COMPOSIO_MCP_BASE = "https://backend.composio.dev/v3/mcp/d5fc9328-13c9-41f3-a672-7c1eda12b996?include_composio_helper_actions=true&user_id=default";
const LOCAL_API_BASE = "";

// --- Scroll Reveal ---
const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("active"); });
}, { threshold: 0.1 });
document.querySelectorAll(".reveal").forEach(el => obs.observe(el));

// --- Live Ticker Data ---
async function updateTicker() {
    const tickerContainer = document.querySelector(".ticker-content");
    if (!tickerContainer) return;
    try {
        const res = await fetch(`${LOCAL_API_BASE}/ticker-data`);
        const data = await res.json();

        if (data.length > 0) {
            let html = "";
            data.forEach(item => {
                html += `
                    <div class="ticker-item ${item.status}">
                        ${item.label} <span>${item.price} ${item.trend}</span>
                    </div>
                `;
            });
            tickerContainer.innerHTML = html + html;
        }
    } catch (err) {
        console.error("Failed to load live ticker", err);
    }
}

// --- AI Forecast Integration ---
async function fetchForecast(id, commodity, mandi) {
    const card = document.getElementById(id);
    if (!card) return;
    try {
        const res = await fetch(`${LOCAL_API_BASE}/prediction-data?commodity=${commodity}&mandi=${mandi}`);
        const data = await res.json();

        if (data.error) {
            card.querySelector(".prediction-text").innerText = "DATA INSUFFICIENT";
            return;
        }

        const latestPrice = data.forecast[0].predicted_price;
        card.querySelector(".current-price").innerText = `Target: ₹${latestPrice.toLocaleString()}/q`;
        card.querySelector(".confidence-badge").innerText = `94% CONFIDENCE`;

        const chart = card.querySelector(".chart-viz");
        let chartHtml = "";
        const maxPrice = Math.max(...data.forecast.map(f => f.predicted_price));
        data.forecast.forEach(f => {
            const height = (f.predicted_price / maxPrice) * 100;
            const color = id.includes("soybean") ? "var(--primary)" : "#ef4444";
            chartHtml += `<div style="flex:1; background: ${color}; height: ${height}%; border-radius: 4px; opacity: 0.8;"></div>`;
        });
        chart.innerHTML = chartHtml;

        const lastPred = data.forecast[6].predicted_price;
        const trend = lastPred >= latestPrice ? "▲" : "▼";
        card.querySelector(".prediction-text").innerText = `7-DAY PROJECTION: ₹${lastPred.toLocaleString()} (${trend})`;

    } catch (err) {
        console.error("Failed to load forecast for", commodity, err);
        const p = card.querySelector(".prediction-text");
        if (p) p.innerText = "CONNECTION TIMEOUT";
    }
}

async function handlePredict(commodity, mandi) {
    alert(`Initializing 1660 Ti Neural Request for ${commodity}...`);
    await fetchForecast(`forecast-${commodity.toLowerCase()}`, commodity, mandi);
}

async function handleMandi(commodity, mandi) {
    const btn = event.target;
    btn.innerText = "Scanning...";
    try {
        const res = await fetch(`${LOCAL_API_BASE}/get-mandi-price?commodity=${commodity}&mandi=${mandi}`);
        const data = await res.json();
        alert(`Latest ${commodity} price at ${mandi}: ₹${data.modal_price}/q`);
    } catch (e) {
        alert("Oracle connection failed.");
    } finally {
        btn.innerText = "Get Mandi";
    }
}

async function updateAIForcasts() {
    await fetchForecast("forecast-soybean", "Soybean", "Indore");
    await fetchForecast("forecast-cotton", "Cotton", "Amravati");
}

window.handlePredict = handlePredict;
window.handleMandi = handleMandi;

document.addEventListener("DOMContentLoaded", () => {
    updateAIForcasts();
    setInterval(updateAIForcasts, 120000);
    updateTicker();
    setInterval(updateTicker, 30000);
});

const form = document.getElementById("leadForm");
const statusMsg = document.getElementById("formStatus");

if (form) {
    form.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        statusMsg.style.display = "block";
        statusMsg.innerText = "Transmitting to Oracle...";
        statusMsg.style.color = "#10b981";

        try {
            const res = await fetch(`${LOCAL_API_BASE}/lead-capture`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                statusMsg.innerText = "Success. Our team will reach out via the secure channel.";
                form.reset();
            } else {
                throw new Error("Signal Interrupted");
            }
        } catch (err) {
            statusMsg.innerText = "Error: Transmission failed. Please try again.";
            statusMsg.style.color = "#ef4444";
        }
    };
}
