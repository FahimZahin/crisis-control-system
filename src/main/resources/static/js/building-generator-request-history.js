let loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;
let buildingRequests = [];

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    if (loggedInUser.role !== "BUILDING_MANAGER") {
        alert("Only Building Manager can access this page.");
        window.location.href = "dashboard.html";
        return;
    }

    setupLogout();
    loadBuildingHistory();

    const refreshBtn = document.getElementById("refreshBuildingHistoryBtn");

    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadBuildingHistory);
    }
});

async function loadBuildingHistory() {
    const userId = loggedInUser.userId || localStorage.getItem("userId");
    const tableBody = document.getElementById("buildingHistoryBody");

    if (!userId) {
        tableBody.innerHTML = `<tr><td colspan="16">User ID not found. Please login again.</td></tr>`;
        return;
    }

    try {
        const response = await fetch(
            "http://localhost:8081/api/building-generator-fuel-requests/user/" + userId + "?time=" + Date.now()
        );

        const data = await response.json();

        if (!response.ok) {
            tableBody.innerHTML = `<tr><td colspan="16">Failed to load history.</td></tr>`;
            showMessage(getErrorMessage(data), "error-text");
            return;
        }

        buildingRequests = data || [];

        updateSummaryCards();
        renderHistoryTable();
        showMessage("Building request history loaded successfully.", "success-text");

    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="16">Server connection failed.</td></tr>`;
        showMessage("Server connection failed while loading building history.", "error-text");
    }
}

function updateSummaryCards() {
    setTextIfExists("totalBuildingRequests", buildingRequests.length);

    const pending = buildingRequests.filter(r => r.requestStatus === "PENDING").length;
    const approved = buildingRequests.filter(r => r.requestStatus === "APPROVED").length;
    const collected = buildingRequests.filter(r => r.requestStatus === "COLLECTED").length;
    const lowStock = buildingRequests.filter(r => r.buildingLowStockAlert === true).length;

    setTextIfExists("pendingBuildingRequests", pending);
    setTextIfExists("approvedBuildingRequests", approved);
    setTextIfExists("collectedBuildingRequests", collected);
    setTextIfExists("lowStockRequestCount", lowStock);

    if (buildingRequests.length > 0) {
        const latest = buildingRequests[0];
        setTextIfExists("latestBuildingStock", formatNumber(latest.buildingCurrentFuel));
    } else {
        setTextIfExists("latestBuildingStock", "0.00");
    }
}

function renderHistoryTable() {
    const tableBody = document.getElementById("buildingHistoryBody");

    if (!buildingRequests || buildingRequests.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="16">No generator diesel requests found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = "";

    buildingRequests.forEach(function (req, index) {
        const row = document.createElement("tr");

        const collectionCodeDisplay = req.collectionCode
            ? `<span class="collection-code-badge">${req.collectionCode}</span>`
            : "-";

        const lowStockDisplay = req.buildingLowStockAlert
            ? `<span class="status-badge status-rejected">LOW</span>`
            : `<span class="status-badge status-approved">NORMAL</span>`;

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${valueOrDash(req.buildingName)}</td>
            <td>${valueOrDash(req.buildingThana)}</td>
            <td>${formatNumber(req.requestedLiter)} L</td>
            <td>${formatNumber(req.buildingDieselTankCapacity)} L</td>
            <td>${formatNumber(req.buildingWeeklyAllocationLiter)} L</td>
            <td>${formatNumber(req.buildingCurrentFuel)} L</td>
            <td>${formatNumber(req.buildingEstimatedBackupHours)} hrs</td>
            <td>${lowStockDisplay}</td>
            <td>${formatCost(req.estimatedCost)}</td>
            <td><span class="status-badge ${getStatusClass(req.requestStatus)}">${req.requestStatus}</span></td>
            <td>${valueOrDash(req.pumpName)}</td>
            <td>${collectionCodeDisplay}</td>
            <td class="muted-text">${valueOrDash(req.adminNote)}</td>
            <td>${formatDateTime(req.createdAt)}</td>
            <td>${req.collectedAt ? formatDateTime(req.collectedAt) : "-"}</td>
        `;

        tableBody.appendChild(row);
    });
}

function getStatusClass(status) {
    const map = {
        "PENDING": "status-pending",
        "APPROVED": "status-approved",
        "REJECTED": "status-rejected",
        "COLLECTED": "status-collected"
    };

    return map[status] || "";
}

function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    return String(value).replace("T", " ").substring(0, 16);
}

function formatCost(value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    return "৳ " + parseFloat(value).toFixed(2);
}

function formatNumber(value) {
    if (value === null || value === undefined || value === "") {
        return "0.00";
    }

    const numberValue = Number(value);

    if (Number.isNaN(numberValue)) {
        return "0.00";
    }

    return numberValue.toFixed(2);
}

function valueOrDash(value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    return value;
}

function setTextIfExists(id, value) {
    const el = document.getElementById(id);

    if (el) {
        el.innerText = value;
    }
}

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            localStorage.clear();
        });
    }
}

function showMessage(message, className) {
    const element = document.getElementById("buildingHistoryMessage");

    if (element) {
        element.className = className;
        element.innerText = message;
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