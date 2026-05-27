const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    setupLogout();
    setupAuditFilterEvents();
    setupBackButton();
    setupPageTitle();
    loadAllAuditLogs();
});

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            localStorage.clear();
        });
    }
}

function setupBackButton() {
    const backBtn = document.getElementById("backToReportsBtn");

    if (backBtn) {
        backBtn.addEventListener("click", function () {
            window.location.href = "reports-audit.html";
        });
    }
}

function setupPageTitle() {
    const type = getAuditType();

    if (type === "fuel") {
        setText("auditDetailsTitle", "Fuel Audit Log Details");
        setText("auditDetailsSubtitle", "All fuel request, pump stock, approval, rejection, and collection audit records.");
        setText("auditTableTitle", "All Fuel Audit Logs");
        return;
    }

    if (type === "utility") {
        setText("auditDetailsTitle", "Utility Audit Log Details");
        setText("auditDetailsSubtitle", "All utility outage creation, update, restore, and provider audit records.");
        setText("auditTableTitle", "All Utility Audit Logs");
        return;
    }

    setText("auditDetailsTitle", "Audit Log Details");
    setText("auditDetailsSubtitle", "Invalid audit type.");
}

function setupAuditFilterEvents() {
    const applyBtn = document.getElementById("applyAuditFilterBtn");
    const clearBtn = document.getElementById("clearAuditFilterBtn");
    const periodSelect = document.getElementById("auditPeriod");

    if (periodSelect) {
        periodSelect.addEventListener("change", updateAuditFilterInputs);
    }

    if (applyBtn) {
        applyBtn.addEventListener("click", function () {
            loadAllAuditLogs();
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener("click", function () {
            const auditPeriod = document.getElementById("auditPeriod");
            const auditDate = document.getElementById("auditDate");
            const auditMonth = document.getElementById("auditMonth");
            const auditYear = document.getElementById("auditYear");

            if (auditPeriod) auditPeriod.value = "";
            if (auditDate) auditDate.value = "";
            if (auditMonth) auditMonth.value = "";
            if (auditYear) auditYear.value = "";

            updateAuditFilterInputs();
            loadAllAuditLogs();
        });
    }

    updateAuditFilterInputs();
}

function updateAuditFilterInputs() {
    const period = document.getElementById("auditPeriod");
    const dateBox = document.getElementById("auditDateBox");
    const monthBox = document.getElementById("auditMonthBox");
    const yearBox = document.getElementById("auditYearBox");

    if (!period || !dateBox || !monthBox || !yearBox) {
        return;
    }

    dateBox.style.display = period.value === "DAILY" ? "block" : "none";
    monthBox.style.display = period.value === "MONTHLY" ? "block" : "none";
    yearBox.style.display = period.value === "YEARLY" ? "block" : "none";
}

function buildAuditFilterQuery() {
    const auditPeriod = document.getElementById("auditPeriod");
    const auditDate = document.getElementById("auditDate");
    const auditMonth = document.getElementById("auditMonth");
    const auditYear = document.getElementById("auditYear");

    const params = new URLSearchParams();
    params.append("time", Date.now());

    if (auditPeriod && auditPeriod.value) {
        params.append("auditPeriod", auditPeriod.value);
    }

    if (auditDate && auditDate.value) {
        params.append("auditDate", auditDate.value);
    }

    if (auditMonth && auditMonth.value) {
        params.append("auditMonth", auditMonth.value);
    }

    if (auditYear && auditYear.value) {
        params.append("auditYear", auditYear.value);
    }

    return params.toString();
}

async function loadAllAuditLogs() {
    const type = getAuditType();
    const body = document.getElementById("auditDetailsBody");

    if (!body) {
        return;
    }

    if (type !== "fuel" && type !== "utility") {
        body.innerHTML = `<tr><td colspan="6">Invalid audit type.</td></tr>`;
        showMessage("Invalid audit type.", "error-text");
        return;
    }

    try {
        body.innerHTML = `<tr><td colspan="6">Loading audit logs...</td></tr>`;

        const response = await fetch(
            "http://localhost:8081/api/reports/audit-logs/" +
            type +
            "/all?" +
            buildAuditFilterQuery()
        );

        const logs = await safeReadJson(response);

        if (!response.ok) {
            body.innerHTML = `<tr><td colspan="6">Failed to load audit logs.</td></tr>`;
            showMessage(getErrorMessage(logs), "error-text");
            return;
        }

        renderAuditLogs(logs);
        showMessage("Audit logs loaded successfully.", "success-text");

    } catch (error) {
        console.error("Audit details loading error:", error);
        body.innerHTML = `<tr><td colspan="6">Server connection failed while loading audit logs.</td></tr>`;
        showMessage("Server connection failed while loading audit logs.", "error-text");
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

function renderAuditLogs(logs) {
    const body = document.getElementById("auditDetailsBody");

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
                <strong>${formatEnumText(log.actorDisplayRole || log.pumpName || log.utilityProvider || log.actorRole)}</strong>
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

    return valueOrDash(log.description);
}

function getAuditType() {
    const params = new URLSearchParams(window.location.search);
    return (params.get("type") || "").toLowerCase();
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.innerText = valueOrDash(value);
    }
}

function showMessage(message, className) {
    const messageElement = document.getElementById("auditDetailsMessage");

    if (!messageElement) {
        return;
    }

    messageElement.className = className || "";
    messageElement.innerText = message || "";
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

    return result.message || result.error || result.details || "Request failed.";
}