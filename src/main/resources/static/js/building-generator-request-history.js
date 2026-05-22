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
        tableBody.innerHTML = `<tr><td colspan="11">User ID not found. Please login again.</td></tr>`;
        return;
    }

    try {
        const response = await fetch(
            "http://localhost:8081/api/building-generator-fuel-requests/user/" + userId + "?time=" + Date.now()
        );

        const data = await response.json();

        if (!response.ok) {
            tableBody.innerHTML = `<tr><td colspan="11">Failed to load history.</td></tr>`;
            return;
        }

        buildingRequests = data;

        updateSummaryCards();
        renderHistoryTable();

    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="11">Server connection failed.</td></tr>`;
    }
}

function updateSummaryCards() {
    setTextIfExists("totalBuildingRequests", buildingRequests.length);

    const pending = buildingRequests.filter(r => r.requestStatus === "PENDING").length;
    const approved = buildingRequests.filter(r => r.requestStatus === "APPROVED").length;
    const collected = buildingRequests.filter(r => r.requestStatus === "COLLECTED").length;

    setTextIfExists("pendingBuildingRequests", pending);
    setTextIfExists("approvedBuildingRequests", approved);
    setTextIfExists("collectedBuildingRequests", collected);
}

function renderHistoryTable() {
    const tableBody = document.getElementById("buildingHistoryBody");

    if (!buildingRequests || buildingRequests.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="11">No generator diesel requests found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = "";

    buildingRequests.forEach(function (req, index) {
        const row = document.createElement("tr");

        const collectionCodeDisplay = req.collectionCode
            ? `<span class="collection-code-badge">${req.collectionCode}</span>`
            : "-";

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${valueOrDash(req.buildingName)}</td>
            <td>${valueOrDash(req.buildingThana)}</td>
            <td>${valueOrDash(req.requestedLiter)} L</td>
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
    if (!value) return "-";
    return value.replace("T", " ").substring(0, 16);
}

function formatCost(value) {
    if (value === null || value === undefined) return "-";
    return "৳ " + parseFloat(value).toFixed(2);
}

function valueOrDash(value) {
    if (value === null || value === undefined || value === "") return "-";
    return value;
}

function setTextIfExists(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
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