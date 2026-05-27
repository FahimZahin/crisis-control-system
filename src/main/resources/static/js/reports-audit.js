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
    setupMainAuditFilterEvents();
    setupShowAllAuditButtons();

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

function setupShowAllAuditButtons() {
    const fuelBtn = document.getElementById("showAllFuelAuditBtn");
    const utilityBtn = document.getElementById("showAllUtilityAuditBtn");

    if (fuelBtn) {
        fuelBtn.addEventListener("click", function () {
            window.location.href = "audit-log-details.html?type=fuel";
        });
    }

    if (utilityBtn) {
        utilityBtn.addEventListener("click", function () {
            window.location.href = "audit-log-details.html?type=utility";
        });
    }
}

function setupMainAuditFilterEvents() {
    setupSingleAuditFilter("fuel");
    setupSingleAuditFilter("utility");
}

function setupSingleAuditFilter(type) {
    const capitalized = type.charAt(0).toUpperCase() + type.slice(1);

    const period = document.getElementById(type + "AuditPeriod");
    const applyBtn = document.getElementById("apply" + capitalized + "AuditFilterBtn");
    const clearBtn = document.getElementById("clear" + capitalized + "AuditFilterBtn");

    if (period) {
        period.addEventListener("change", function () {
            updateMainAuditFilterInputs(type);
        });
    }

    if (applyBtn) {
        applyBtn.addEventListener("click", function () {
            if (type === "fuel") {
                loadFuelAuditLogs();
            } else {
                loadUtilityAuditLogs();
            }
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener("click", function () {
            clearMainAuditFilter(type);

            if (type === "fuel") {
                loadFuelAuditLogs();
            } else {
                loadUtilityAuditLogs();
            }
        });
    }

    updateMainAuditFilterInputs(type);
}

function updateMainAuditFilterInputs(type) {
    const period = document.getElementById(type + "AuditPeriod");
    const dateBox = document.getElementById(type + "AuditDateBox");
    const monthBox = document.getElementById(type + "AuditMonthBox");
    const yearBox = document.getElementById(type + "AuditYearBox");

    if (!period || !dateBox || !monthBox || !yearBox) {
        return;
    }

    dateBox.style.display = period.value === "DAILY" ? "block" : "none";
    monthBox.style.display = period.value === "MONTHLY" ? "block" : "none";
    yearBox.style.display = period.value === "YEARLY" ? "block" : "none";
}

function clearMainAuditFilter(type) {
    const period = document.getElementById(type + "AuditPeriod");
    const date = document.getElementById(type + "AuditDate");
    const month = document.getElementById(type + "AuditMonth");
    const year = document.getElementById(type + "AuditYear");

    if (period) period.value = "";
    if (date) date.value = "";
    if (month) month.value = "";
    if (year) year.value = "";

    updateMainAuditFilterInputs(type);
}

function buildMainAuditFilterQuery(type) {
    const period = document.getElementById(type + "AuditPeriod");
    const date = document.getElementById(type + "AuditDate");
    const month = document.getElementById(type + "AuditMonth");
    const year = document.getElementById(type + "AuditYear");

    const params = new URLSearchParams();
    params.append("time", Date.now());

    if (period && period.value) {
        params.append("auditPeriod", period.value);
    }

    if (date && date.value) {
        params.append("auditDate", date.value);
    }

    if (month && month.value) {
        params.append("auditMonth", month.value);
    }

    if (year && year.value) {
        params.append("auditYear", year.value);
    }

    return params.toString();
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
    const tableBodyId = "fuelAuditLogsBody";

    try {
        setTableLoading(tableBodyId, "Loading fuel audit logs...");

        const response = await fetch(
            "http://localhost:8081/api/reports/audit-logs/fuel?" + buildMainAuditFilterQuery("fuel")
        );

        const logs = await safeReadJson(response);

        if (!response.ok) {
            renderAuditLogs(tableBodyId, []);
            showReportsMessage(getErrorMessage(logs), "error-text");
            return;
        }

        renderAuditLogs(tableBodyId, logs);

    } catch (error) {
        console.error("Fuel audit loading error:", error);
        setTableError(tableBodyId, "Server connection failed while loading fuel audit logs.");
    }
}

async function loadUtilityAuditLogs() {
    const tableBodyId = "utilityAuditLogsBody";

    try {
        setTableLoading(tableBodyId, "Loading utility audit logs...");

        const response = await fetch(
            "http://localhost:8081/api/reports/audit-logs/utility?" + buildMainAuditFilterQuery("utility")
        );

        const logs = await safeReadJson(response);

        if (!response.ok) {
            renderAuditLogs(tableBodyId, []);
            showReportsMessage(getErrorMessage(logs), "error-text");
            return;
        }

        renderAuditLogs(tableBodyId, logs);

    } catch (error) {
        console.error("Utility audit loading error:", error);
        setTableError(tableBodyId, "Server connection failed while loading utility audit logs.");
    }
}

async function safeReadJson(response) {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
        return await response.json();
    }

    const text = await response.text();
    return { message: text || "Request failed." };
}

function renderAuditLogs(tableId, logs) {
    const body = document.getElementById(tableId);

    if (!body) {
        return;
    }

    if (!logs || logs.length === 0) {
        body.innerHTML = `<tr><td colspan="6">No audit log found.</td></tr>`;
        return;
    }

    body.innerHTML = "";

    logs.forEach(function (log) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${valueOrDash(log.id)}</td>
            <td>${formatDateTime(log.createdAt)}</td>
            <td>
              ${valueOrDash(log.actorName)}<br>
              <small>${formatEnumText(log.actorDisplayRole || log.utilityProvider || log.actorRole)}</small>
            </td>
            <td>${formatEnumText(log.action)}</td>
            <td>
                ${formatEnumText(log.entityType)}<br>
                <small>ID: ${valueOrDash(log.entityId)}</small>
            </td>
            <td>${formatAuditDescription(log)}</td>
        `;

        body.appendChild(row);
    });
}

function formatAuditDescription(log) {
    if (!log) {
        return "-";
    }

    let description = valueOrDash(log.description);

    if (isPowerOutageAuditLog(log) && log.currentStatus) {
        description = description
            .replace(/,\s*Status:\s*[A-Z_ ]+/i, "")
            .replace(/Status:\s*[A-Z_ ]+/i, "")
            .trim();

        return `
            ${description}
            <br>
            <small><strong>Current Status:</strong> ${formatEnumText(log.currentStatus)}</small>
        `;
    }

    return description;
}

function isPowerOutageAuditLog(log) {
    const entityType = String(log.entityType || "").toUpperCase();
    const action = String(log.action || "").toUpperCase();

    return entityType.includes("POWER_OUTAGE") ||
        entityType.includes("OUTAGE") ||
        action.includes("POWER_OUTAGE") ||
        action.includes("OUTAGE");
}

function setTableLoading(tableId, message) {
    const body = document.getElementById(tableId);

    if (body) {
        body.innerHTML = `<tr><td colspan="6">${message}</td></tr>`;
    }
}

function setTableError(tableId, message) {
    const body = document.getElementById(tableId);

    if (body) {
        body.innerHTML = `<tr><td colspan="6">${message}</td></tr>`;
    }
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

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value).replace("T", " ").substring(0, 16);
    }

    return date.toLocaleString();
}

function formatEnumText(value) {
    if (!value) {
        return "-";
    }

    return String(value)
        .replaceAll("_", " ")
        .replaceAll("-", " ")
        .toLowerCase()
        .replace(/\b\w/g, function (char) {
            return char.toUpperCase();
        });
}

function valueOrDash(value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    return value;
}

function getErrorMessage(result) {
    if (!result) {
        return "Request failed.";
    }

    if (typeof result === "string") {
        return result;
    }

    if (result.message) {
        return result.message;
    }

    if (result.error) {
        return result.error;
    }

    if (result.details) {
        return result.details;
    }

    if (result.messages) {
        return JSON.stringify(result.messages);
    }

    return "Request failed.";
}