const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    if (loggedInUser.role !== "VEHICLE_OWNER") {
        alert("Only vehicle owner can view route token history.");
        window.location.href = "dashboard.html";
        return;
    }

    setupLogout();

    const refreshBtn = document.getElementById("refreshRouteTokenHistoryBtn");

    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadRouteTokens);
    }

    loadRouteTokens();
});

async function loadRouteTokens() {
    const userId = getLoggedInUserId();
    const body = document.getElementById("routeTokenHistoryBody");

    if (body) {
        body.innerHTML = `<tr><td colspan="8">Loading...</td></tr>`;
    }

    try {
        const response = await fetch("http://localhost:8081/api/route-fuel-tokens/user/" + userId + "?time=" + Date.now());
        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");
            return;
        }

        renderTokens(Array.isArray(result) ? result : []);
        showMessage("Route tokens loaded successfully.", "success-text");

    } catch (error) {
        showMessage("Server connection failed while loading route tokens.", "error-text");
    }
}

function renderTokens(tokens) {
    const body = document.getElementById("routeTokenHistoryBody");

    if (!body) {
        return;
    }

    if (!tokens.length) {
        body.innerHTML = `<tr><td colspan="8">No route fuel token found.</td></tr>`;
        return;
    }

    body.innerHTML = "";

    tokens.forEach(function (token) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td><strong>${safeText(token.tokenCode)}</strong></td>
            <td>${safeText(token.sourceCity)} → ${safeText(token.destinationCity)}</td>
            <td>${safeText(token.vehicleName)}<br><small>${safeText(token.numberPlate)}</small></td>
            <td>${safeText(token.pumpName)}<br><small>${safeText(token.pumpAddress)}</small></td>
            <td>${safeText(token.fuelType)}<br><small>${formatNumber(token.reservedLiter)} L</small></td>
            <td>${formatNumber(token.estimatedCost)} BDT</td>
            <td>${safeText(token.status)}</td>
            <td>${formatDateTime(token.validUntil)}</td>
        `;

        body.appendChild(row);
    });
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

function getLoggedInUserId() {
    return loggedInUser.userId || loggedInUser.id || localStorage.getItem("userId");
}

function showMessage(message, className) {
    const element = document.getElementById("routeTokenHistoryMessage");

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

    return result.message || result.error || JSON.stringify(result);
}