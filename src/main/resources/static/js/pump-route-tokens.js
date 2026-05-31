const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    if (loggedInUser.role !== "PUMP_AUTHORITY") {
        alert("Only pump authority can access route fuel tokens.");
        window.location.href = "dashboard.html";
        return;
    }

    setupLogout();
    setupEvents();
    loadPumpRouteTokens();
});

function setupEvents() {
    const refreshBtn = document.getElementById("refreshPumpRouteTokensBtn");
    const form = document.getElementById("routeTokenCollectForm");
    const paymentMethod = document.getElementById("paymentMethod");

    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadPumpRouteTokens);
    }

    if (form) {
        form.addEventListener("submit", function (event) {
            event.preventDefault();
            collectRouteToken();
        });
    }

    if (paymentMethod) {
        paymentMethod.addEventListener("change", toggleBkashBox);
    }

    toggleBkashBox();
}

async function loadPumpRouteTokens() {
    const userId = getLoggedInUserId();
    const body = document.getElementById("pumpRouteTokenBody");

    if (body) {
        body.innerHTML = `<tr><td colspan="8">Loading...</td></tr>`;
    }

    try {
        const response = await fetch("http://localhost:8081/api/route-fuel-tokens/pump-user/" + userId + "?time=" + Date.now());
        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");
            return;
        }

        renderTokens(Array.isArray(result) ? result : []);
        showMessage("Route tokens loaded successfully.", "success-text");

    } catch (error) {
        showMessage("Server connection failed while loading pump route tokens.", "error-text");
    }
}

function renderTokens(tokens) {
    const body = document.getElementById("pumpRouteTokenBody");

    if (!body) {
        return;
    }

    if (!tokens.length) {
        body.innerHTML = `<tr><td colspan="8">No route token assigned to this pump.</td></tr>`;
        return;
    }

    body.innerHTML = "";

    tokens.forEach(function (token) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td><strong>${safeText(token.tokenCode)}</strong></td>
            <td>
                ${safeText(token.userName)}<br>
                <small>${safeText(token.vehicleName)} | ${safeText(token.numberPlate)}</small>
            </td>
            <td>${safeText(token.sourceCity)} → ${safeText(token.destinationCity)}</td>
            <td>${safeText(token.fuelType)}<br><small>${formatNumber(token.reservedLiter)} L</small></td>
            <td>${formatNumber(token.estimatedCost)} BDT</td>
            <td>${safeText(token.status)}</td>
            <td>${formatDateTime(token.validUntil)}</td>
            <td>
                ${
            token.status === "ACTIVE"
                ? `<button class="btn primary small-btn" onclick="fillTokenForm('${token.tokenCode}', '${token.numberPlate}')">Use</button>`
                : "-"
        }
            </td>
        `;

        body.appendChild(row);
    });
}

function fillTokenForm(tokenCode, numberPlate) {
    setValue("tokenCode", tokenCode);
    setValue("verifiedNumberPlate", numberPlate);
    showMessage("Token loaded into verification form.", "success-text");
}

async function collectRouteToken() {
    const tokenCode = getValue("tokenCode").trim().toUpperCase();
    const verifiedNumberPlate = getValue("verifiedNumberPlate").trim().toUpperCase();
    const actualOdometerAtCollection = getValue("actualOdometerAtCollection");
    const paymentMethod = getValue("paymentMethod");
    const bkashTransactionId = getValue("bkashTransactionId").trim();

    if (!tokenCode || !verifiedNumberPlate || !actualOdometerAtCollection || !paymentMethod) {
        showMessage("Please complete all required fields.", "error-text");
        return;
    }

    if (paymentMethod === "BKASH" && !bkashTransactionId) {
        showMessage("bKash transaction ID is required for bKash payment.", "error-text");
        return;
    }

    const confirmed = confirm(
        "Confirm route token collection?\n\n" +
        "Token: " + tokenCode + "\n" +
        "Plate: " + verifiedNumberPlate + "\n" +
        "Payment: " + paymentMethod + "\n\n" +
        "After confirmation, this token cannot be used again."
    );

    if (!confirmed) {
        return;
    }

    const data = {
        pumpUserId: Number(getLoggedInUserId()),
        tokenCode: tokenCode,
        verifiedNumberPlate: verifiedNumberPlate,
        actualOdometerAtCollection: Number(actualOdometerAtCollection),
        paymentMethod: paymentMethod,
        bkashTransactionId: paymentMethod === "BKASH" ? bkashTransactionId : null
    };

    try {
        const response = await fetch("http://localhost:8081/api/route-fuel-tokens/collect", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");
            return;
        }

        showMessage(
            "Route token completed. "
            + formatNumber(result.reservedLiter)
            + " L "
            + result.fuelType
            + " deducted from stock.",
            "success-text"
        );

        clearForm();
        loadPumpRouteTokens();

    } catch (error) {
        showMessage("Server connection failed while collecting route token.", "error-text");
    }
}

function toggleBkashBox() {
    const method = getValue("paymentMethod");
    const box = document.getElementById("bkashBox");
    const input = document.getElementById("bkashTransactionId");

    if (!box || !input) {
        return;
    }

    if (method === "BKASH") {
        box.style.display = "block";
        input.required = true;
    } else {
        box.style.display = "none";
        input.required = false;
        input.value = "";
    }
}

function clearForm() {
    setValue("tokenCode", "");
    setValue("verifiedNumberPlate", "");
    setValue("actualOdometerAtCollection", "");
    setValue("paymentMethod", "");
    setValue("bkashTransactionId", "");
    toggleBkashBox();
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

function getValue(id) {
    const element = document.getElementById(id);
    return element ? element.value : "";
}

function setValue(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.value = value;
    }
}

function showMessage(message, className) {
    const element = document.getElementById("pumpRouteTokenMessage");

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