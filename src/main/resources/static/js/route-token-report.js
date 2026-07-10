const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;
let currentStatusFilter = "ALL";

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    if (
        loggedInUser.role !== "ADMIN" &&
        loggedInUser.role !== "GOVERNMENT_AUTHORITY" &&
        loggedInUser.role !== "LOCAL_AUTHORITY"
    ) {
        alert("You are not allowed to view route token reports.");
        window.location.href = "dashboard.html";
        return;
    }

    setupLogout();
    setupEvents();
    loadRouteTokenReport();
});

function setupEvents() {
    const refreshBtn = document.getElementById("refreshRouteTokenReportBtn");

    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadRouteTokenReport);
    }

    const filterCards = document.querySelectorAll(".route-token-filter-card");

    filterCards.forEach(function (card) {
        card.addEventListener("click", function (event) {
            event.preventDefault();

            currentStatusFilter = card.getAttribute("data-status") || "ALL";
            loadRouteTokenList();
        });
    });
}

async function loadRouteTokenReport() {
    await loadRouteTokenSummary();
    await loadRouteTokenList();
}

async function loadRouteTokenSummary() {
    try {
        const response = await fetch("http://localhost:8081/api/route-fuel-tokens/summary?time=" + Date.now());
        const data = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(data), "error-text");
            return;
        }

        setText("totalRouteTokens", data.totalTokens || 0);
        setText("activeRouteTokens", data.activeTokens || 0);
        setText("usedRouteTokens", data.usedTokens || 0);
        setText("expiredRouteTokens", data.expiredTokens || 0);

        setText("totalReservedLiter", formatNumber(data.totalReservedLiter));
        setText("totalCollectedLiter", formatNumber(data.totalCollectedLiter));
        setText("totalEstimatedCost", formatNumber(data.totalEstimatedCost));
        setText("totalCollectedAmount", formatNumber(data.totalCollectedAmount));

    } catch (error) {
        showMessage("Server connection failed while loading route token summary.", "error-text");
    }
}

async function loadRouteTokenList() {
    const body = document.getElementById("routeTokenReportBody");

    if (body) {
        body.innerHTML = `<tr><td colspan="9">Loading...</td></tr>`;
    }

    let url = "http://localhost:8081/api/route-fuel-tokens/all?time=" + Date.now();

    if (currentStatusFilter !== "ALL") {
        url = "http://localhost:8081/api/route-fuel-tokens/status/"
            + currentStatusFilter
            + "?time="
            + Date.now();
    }

    try {
        const response = await fetch(url);
        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");
            return;
        }

        const tokens = Array.isArray(result) ? result : [];

        updateReportTitle();
        renderTokens(tokens);

        showMessage("Route token report loaded successfully.", "success-text");

    } catch (error) {
        showMessage("Server connection failed while loading route token report.", "error-text");

        if (body) {
            body.innerHTML = `<tr><td colspan="9">Server connection failed.</td></tr>`;
        }
    }
}

function updateReportTitle() {
    const title = document.getElementById("routeTokenReportTitle");

    if (!title) {
        return;
    }

    if (currentStatusFilter === "ALL") {
        title.innerText = "All Route Fuel Tokens";
        return;
    }

    title.innerText = currentStatusFilter.replaceAll("_", " ") + " Route Fuel Tokens";
}

function renderTokens(tokens) {
    const body = document.getElementById("routeTokenReportBody");

    if (!body) {
        return;
    }

    if (!tokens.length) {
        body.innerHTML = `<tr><td colspan="9">No route fuel token found.</td></tr>`;
        return;
    }

    body.innerHTML = "";

    tokens.forEach(function (token) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>
                <strong>${safeText(token.tokenCode)}</strong><br>
                <small>ID: ${safeText(token.id)}</small>
            </td>

            <td>
                <strong>${safeText(token.userName)}</strong><br>
                <small>${safeText(token.phoneNumber)}</small><br>
                <small>${safeText(token.vehicleName)} | ${safeText(token.numberPlate)}</small>
            </td>

            <td>
                ${safeText(token.sourceCity)} → ${safeText(token.destinationCity)}<br>
                <small>Stop: ${safeText(token.stopCity)}</small>
            </td>

            <td>
                <strong>${safeText(token.pumpName)}</strong><br>
                <small>${safeText(token.pumpAddress)}</small>
            </td>

            <td>
                ${safeText(token.fuelType)}<br>
                <small>${formatNumber(token.reservedLiter)} L</small>
            </td>

            <td>
                ${formatNumber(token.estimatedCost)} BDT<br>
                <small>Paid: ${formatNumber(token.paidAmountBdt)} BDT</small>
            </td>

            <td>${renderStatusBadge(token.status)}</td>

            <td>
                Created: ${formatDateTime(token.createdAt)}<br>
                <small>Valid: ${formatDateTime(token.validUntil)}</small>
            </td>

            <td>${formatDateTime(token.usedAt)}</td>
        `;

        body.appendChild(row);
    });
}

function renderStatusBadge(status) {
    const cleanStatus = safeText(status);

    if (cleanStatus === "ACTIVE") {
        return `<span class="law-type-badge law-type-payment">ACTIVE</span>`;
    }

    if (cleanStatus === "USED") {
        return `<span class="law-type-badge law-type-stock">USED</span>`;
    }

    if (cleanStatus === "EXPIRED") {
        return `<span class="law-type-badge law-type-critical">EXPIRED</span>`;
    }

    if (cleanStatus === "CANCELLED") {
        return `<span class="law-type-badge law-type-refusal">CANCELLED</span>`;
    }

    return `<span class="law-type-badge law-type-default">${cleanStatus}</span>`;
}

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function (event) {
            event.preventDefault();
            localStorage.clear();
            window.location.href = "login.html";
        });
    }
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.innerText = value;
    }
}

function showMessage(message, className) {
    const element = document.getElementById("routeTokenReportMessage");

    if (element) {
        element.className = className || "";
        element.innerText = message || "";
    }
}

function formatNumber(value) {
    const numberValue = Number(value);

    if (Number.isNaN(numberValue)) {
        return "0.00";
    }

    return numberValue.toFixed(2);
}

function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    return String(value).replace("T", " ").substring(0, 16);
}

function safeText(value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    return String(value);
}

function getErrorMessage(result) {
    if (!result) {
        return "Request failed.";
    }

    if (result.message) {
        return result.message;
    }

    if (result.error) {
        return result.error;
    }

    if (result.messages) {
        return JSON.stringify(result.messages);
    }

    return JSON.stringify(result);
}