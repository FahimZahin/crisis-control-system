let loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;
let usageHistory = [];

document.addEventListener("DOMContentLoaded", async function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    if (loggedInUser.role !== "BUILDING_MANAGER" && loggedInUser.role !== "HOSPITAL_AUTHORITY") {
        alert("Only Building Manager or Hospital Authority can access generator usage.");
        window.location.href = "dashboard.html";
        return;
    }

    setupLogout();
    fillSummary();

    const refreshBtn = document.getElementById("refreshUsageBtn");

    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadUsageHistory);
    }

    await loadUsageHistory();
});

function fillSummary() {
    if (loggedInUser.role === "BUILDING_MANAGER") {
        setText("organizationName", loggedInUser.buildingName || "-");
        setText("currentDieselStock", formatNumber(cleanNumber(loggedInUser.buildingCurrentFuel)));
        return;
    }

    setText("organizationName", loggedInUser.hospitalName || "-");
    setText("currentDieselStock", formatNumber(cleanNumber(loggedInUser.hospitalCurrentDieselReserve)));
}

async function loadUsageHistory() {
    const userId = getLoggedInUserId();
    const body = document.getElementById("usageHistoryBody");

    if (!userId) {
        if (body) {
            body.innerHTML = `<tr><td colspan="7">User ID not found.</td></tr>`;
        }
        return;
    }

    try {
        const response = await fetch("http://localhost:8081/api/generator-usages/user/" + userId + "?time=" + Date.now());
        const result = await response.json();

        if (!response.ok) {
            if (body) {
                body.innerHTML = `<tr><td colspan="7">${getErrorMessage(result)}</td></tr>`;
            }
            return;
        }

        usageHistory = Array.isArray(result) ? result : [];
        renderUsageHistory();
        refreshCurrentStockFromLatestUsage();

    } catch (error) {
        if (body) {
            body.innerHTML = `<tr><td colspan="7">Server connection failed.</td></tr>`;
        }
    }
}

function renderUsageHistory() {
    const body = document.getElementById("usageHistoryBody");

    if (!body) {
        return;
    }

    setText("totalUsageRecords", usageHistory.length);

    if (!usageHistory.length) {
        body.innerHTML = `<tr><td colspan="7">No generator usage history found.</td></tr>`;
        return;
    }

    body.innerHTML = "";

    usageHistory.forEach(function (usage) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${formatDateTime(usage.outageStartTime)}</td>
            <td>${formatDateTime(usage.outageEndTime)}</td>
            <td>${safeText(usage.outageThana)}</td>
            <td>${formatNumber(usage.usedHours)} hours</td>
            <td>${formatNumber(usage.dieselDeducted)} L</td>
            <td>${formatNumber(usage.dieselAfterUsage)} L</td>
            <td>${safeText(usage.finalReason)}</td>
        `;

        body.appendChild(row);
    });
}

function refreshCurrentStockFromLatestUsage() {
    if (!usageHistory.length) {
        fillSummary();
        return;
    }

    const latest = usageHistory[0];

    if (loggedInUser.role === "BUILDING_MANAGER") {
        loggedInUser.buildingCurrentFuel = latest.dieselAfterUsage;
    }

    if (loggedInUser.role === "HOSPITAL_AUTHORITY") {
        loggedInUser.hospitalCurrentDieselReserve = latest.dieselAfterUsage;
        loggedInUser.hospitalEstimatedBackupHours = latest.estimatedBackupAfterUsage;
    }

    localStorage.setItem("loggedInUser", JSON.stringify(loggedInUser));
    setText("currentDieselStock", formatNumber(latest.dieselAfterUsage));
}

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (!logoutBtn) {
        return;
    }

    logoutBtn.addEventListener("click", function () {
        localStorage.clear();
    });
}

function getLoggedInUserId() {
    return loggedInUser.userId || loggedInUser.id || localStorage.getItem("userId");
}

function cleanNumber(value) {
    if (value === null || value === undefined || value === "" || value === "-") {
        return 0;
    }

    return Number(String(value).replace("L", "").replace("hours", "").replace("kVA", "").replace("KVA", "").trim()) || 0;
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

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.innerText = value;
    }
}

function getErrorMessage(result) {
    if (!result) {
        return "Request failed.";
    }

    if (result.message) {
        return result.message;
    }

    if (result.messages) {
        return JSON.stringify(result.messages);
    }

    if (result.error) {
        return result.error;
    }

    return "Request failed.";
}