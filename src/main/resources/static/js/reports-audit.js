const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    setupReportsEvents();
    loadReportsDashboard();
});

function setupReportsEvents() {
    const refreshBtn = document.getElementById("refreshReportsBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    if (refreshBtn) {
        refreshBtn.addEventListener("click", function () {
            loadReportsDashboard();
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            localStorage.clear();
        });
    }
}

async function loadReportsDashboard() {
    await loadFuelSummary();
    await loadPumpStockSummary();
    await loadPowerOutageSummary();
    await loadUserSummary();
    await loadFuelAuditLogs();
    await loadUtilityAuditLogs();

    showReportsMessage("Reports loaded successfully.", "success-text");
}

async function loadFuelSummary() {
    try {
        const response = await fetch("http://localhost:8081/api/reports/fuel-summary?time=" + Date.now());
        const data = await response.json();

        if (!response.ok) {
            showReportsMessage(getErrorMessage(data), "error-text");
            return;
        }

        setText("reportTotalFuelRequests", data.totalRequests);
        setText("reportTotalRequestedLiter", formatNumber(data.totalRequestedLiter));
        setText("reportTotalEstimatedCost", formatNumber(data.totalEstimatedCost));
        setText("reportPendingRequests", data.pendingRequests);
        setText("reportApprovedRequests", data.approvedRequests);
        setText("reportCollectedRequests", data.collectedRequests);
        setText("reportRejectedRequests", data.rejectedRequests);

    } catch (error) {
        showReportsMessage("Server connection failed while loading fuel summary.", "error-text");
    }
}

async function loadPumpStockSummary() {
    try {
        const response = await fetch("http://localhost:8081/api/reports/pump-stock-summary?time=" + Date.now());
        const data = await response.json();

        if (!response.ok) {
            showReportsMessage(getErrorMessage(data), "error-text");
            return;
        }

        setText("reportTotalCurrentStock", formatNumber(data.totalCurrentStock));
        setText("reportLowStockCount", data.lowStockCount);

    } catch (error) {
        showReportsMessage("Server connection failed while loading pump stock summary.", "error-text");
    }
}

async function loadPowerOutageSummary() {
    try {
        const response = await fetch("http://localhost:8081/api/reports/power-outage-summary?time=" + Date.now());
        const data = await response.json();

        if (!response.ok) {
            showReportsMessage(getErrorMessage(data), "error-text");
            return;
        }

        setText("reportTotalOutages", data.totalNotices);
        setText("reportOngoingOutages", data.ongoingOutages);
        setText("reportScheduledOutages", data.scheduledOutages);
        setText("reportRestoredOutages", data.restoredOutages);

    } catch (error) {
        showReportsMessage("Server connection failed while loading utility outage summary.", "error-text");
    }
}

async function loadUserSummary() {
    try {
        const response = await fetch("http://localhost:8081/api/reports/user-summary?time=" + Date.now());
        const data = await response.json();

        if (!response.ok) {
            showReportsMessage(getErrorMessage(data), "error-text");
            return;
        }

        setText("reportTotalUsers", data.totalUsers);
        setText("reportActiveUsers", data.activeUsers);
        setText("reportInactiveUsers", data.inactiveUsers);

    } catch (error) {
        showReportsMessage("Server connection failed while loading user summary.", "error-text");
    }
}

async function loadFuelAuditLogs() {
    try {
        const response = await fetch("http://localhost:8081/api/reports/audit-logs/fuel?time=" + Date.now());
        const logs = await response.json();

        if (!response.ok) {
            renderAuditLogs("fuelAuditLogsBody", []);
            showReportsMessage(getErrorMessage(logs), "error-text");
            return;
        }

        renderAuditLogs("fuelAuditLogsBody", logs);

    } catch (error) {
        const tableBody = document.getElementById("fuelAuditLogsBody");
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="6">Server connection failed.</td></tr>`;
        }
    }
}

async function loadUtilityAuditLogs() {
    try {
        const response = await fetch("http://localhost:8081/api/reports/audit-logs/utility?time=" + Date.now());
        const logs = await response.json();

        if (!response.ok) {
            renderAuditLogs("utilityAuditLogsBody", []);
            showReportsMessage(getErrorMessage(logs), "error-text");
            return;
        }

        renderAuditLogs("utilityAuditLogsBody", logs);

    } catch (error) {
        const tableBody = document.getElementById("utilityAuditLogsBody");
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="6">Server connection failed.</td></tr>`;
        }
    }
}

function renderAuditLogs(tableId, logs) {
    const tableBody = document.getElementById(tableId);

    if (!tableBody) {
        return;
    }

    if (!logs || logs.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6">No audit log found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = "";

    logs.slice(0, 20).forEach(function (log) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${valueOrDash(log.id)}</td>
            <td>${formatDateTime(log.createdAt)}</td>
            <td>
                <strong>${valueOrDash(log.actorName)}</strong><br>
                <small>${valueOrDash(log.actorRole)}</small>
            </td>
            <td>${valueOrDash(log.action)}</td>
            <td>
                ${valueOrDash(log.entityType)}<br>
                <small>ID: ${valueOrDash(log.entityId)}</small>
            </td>
            <td>${valueOrDash(log.description)}</td>
        `;

        tableBody.appendChild(row);
    });
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.innerText = value === null || value === undefined ? "0" : value;
    }
}

function showReportsMessage(message, className) {
    const element = document.getElementById("reportsMessage");

    if (element) {
        element.className = className;
        element.innerText = message;
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

function valueOrDash(value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    return value;
}

function getErrorMessage(result) {
    if (result.message) {
        return result.message;
    }

    if (result.messages) {
        return JSON.stringify(result.messages);
    }

    return "Request failed.";
}