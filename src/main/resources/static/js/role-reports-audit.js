const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    setupLogout();
    loadRoleReport();
});

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            localStorage.clear();
        });
    }
}

async function loadRoleReport() {
    const page = getCurrentPage();
    const userId = loggedInUser.userId || loggedInUser.id || localStorage.getItem("userId");

    const endpointMap = {
        "pump-reports-audit.html": "pump",
        "utility-reports-audit.html": "utility",
        "hospital-reports-audit.html": "hospital",
        "building-reports-audit.html": "building",
        "emergency-reports-audit.html": "emergency"
    };

    const reportType = endpointMap[page];

    if (!reportType || !userId) {
        showMessage("Report type or user ID not found.", "error-text");
        return;
    }

    try {
        const response = await fetch("http://localhost:8081/api/reports/role/" + reportType + "/" + userId + "?time=" + Date.now());
        const data = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(data), "error-text");
            return;
        }

        renderHeader(data);
        renderSummary(data);
        renderStatusBox(data);
        renderFuelRequests(data.fuelRequests || []);
        renderPumpStocks(data.pumpStocks || []);
        renderPowerOutages(data.powerOutages || []);
        renderAuditLogs(data.auditLogs || []);

        showMessage("Report loaded successfully.", "success-text");

    } catch (error) {
        showMessage("Server connection failed while loading report.", "error-text");
    }
}

function renderHeader(data) {
    setText("roleReportTitle", data.title || "Reports & Audit Logs");
    setText("roleReportSubtitle", data.subtitle || "Role-specific report records.");
}

function renderSummary(data) {
    const summary = data.summary || {};
    const stockSummary = data.stockSummary || {};
    const outageSummary = data.outageSummary || {};

    setText("totalRequests", summary.totalRequests || 0);
    setText("pendingRequests", summary.pendingRequests || 0);
    setText("approvedRequests", summary.approvedRequests || 0);
    setText("collectedRequests", summary.collectedRequests || 0);
    setText("rejectedRequests", summary.rejectedRequests || 0);
    setText("totalRequestedLiter", formatNumber(summary.totalRequestedLiter));
    setText("totalEstimatedCost", formatNumber(summary.totalEstimatedCost));

    setText("totalFuelTypes", stockSummary.totalFuelTypes || 0);
    setText("totalCurrentStock", formatNumber(stockSummary.totalCurrentStock));
    setText("totalCapacity", formatNumber(stockSummary.totalCapacity));
    setText("availableSpace", formatNumber(stockSummary.availableSpace));

    setText("totalOutages", outageSummary.totalNotices || 0);
    setText("ongoingOutages", outageSummary.ongoingOutages || 0);
    setText("scheduledOutages", outageSummary.scheduledOutages || 0);
    setText("restoredOutages", outageSummary.restoredOutages || 0);
}

function renderStatusBox(data) {
    const body = document.getElementById("roleStatusBody");

    if (!body) {
        return;
    }

    const status =
        data.hospitalStatus ||
        data.buildingStatus ||
        data.emergencyStatus ||
        data.utilityStatus ||
        null;

    if (!status) {
        body.innerHTML = `<tr><td colspan="2">No extra profile status for this report.</td></tr>`;
        return;
    }

    body.innerHTML = "";

    Object.keys(status).forEach(function (key) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${formatEnumText(key)}</td>
            <td>${valueOrDash(status[key])}</td>
        `;

        body.appendChild(row);
    });
}

function renderFuelRequests(requests) {
    const body = document.getElementById("fuelRequestsBody");

    if (!body) {
        return;
    }

    if (!requests || requests.length === 0) {
        body.innerHTML = `<tr><td colspan="9">No fuel request found.</td></tr>`;
        return;
    }

    body.innerHTML = "";

    requests.forEach(function (request) {
        const row = document.createElement("tr");
        row.className = getFuelRequestSourceRowClass(request.requestSource);

        row.innerHTML = `
            <td>${valueOrDash(request.id)}</td>
            <td>${formatEnumText(request.requestSource)}</td>
            <td>${valueOrDash(request.details)}</td>
            <td>${formatEnumText(request.fuelType)}</td>
            <td>${valueOrDash(request.requestedLiter)} L</td>
            <td>${valueOrDash(request.estimatedCost)} BDT</td>
            <td>${formatEnumText(request.requestStatus)}</td>
            <td>${valueOrDash(request.pumpName)}</td>
            <td>${formatDateTime(request.createdAt)}</td>
        `;

        body.appendChild(row);
    });
}

function renderPumpStocks(stocks) {
    const body = document.getElementById("pumpStocksBody");

    if (!body) {
        return;
    }

    if (!stocks || stocks.length === 0) {
        body.innerHTML = `<tr><td colspan="5">No pump stock record found.</td></tr>`;
        return;
    }

    body.innerHTML = "";

    stocks.forEach(function (stock) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${formatEnumText(stock.fuelType)}</td>
            <td>${valueOrDash(stock.currentStock)} L</td>
            <td>${valueOrDash(stock.fuelCapacity)} L</td>
            <td>${valueOrDash(stock.availableSpace)} L</td>
            <td>${formatDateTime(stock.updatedAt)}</td>
        `;

        body.appendChild(row);
    });
}

function renderPowerOutages(outages) {
    const body = document.getElementById("powerOutagesBody");

    if (!body) {
        return;
    }

    if (!outages || outages.length === 0) {
        body.innerHTML = `<tr><td colspan="7">No outage notice found.</td></tr>`;
        return;
    }

    body.innerHTML = "";

    outages.forEach(function (outage) {
        const row = document.createElement("tr");
        row.className = getOutageRowClass(outage.provider, outage.cityCorporation);

        row.innerHTML = `
            <td>${valueOrDash(outage.id)}</td>
            <td>${formatEnumText(outage.provider)}</td>
            <td>${formatEnumText(outage.cityCorporation)}</td>
            <td>${valueOrDash(outage.thanaName)}</td>
            <td>${formatEnumText(outage.cause)}</td>
            <td>${formatEnumText(outage.status)}</td>
            <td>${formatDateTime(outage.expectedRestorationDateTime)}</td>
        `;

        body.appendChild(row);
    });
}

function renderAuditLogs(logs) {
    const body = document.getElementById("auditLogsBody");

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
            <td>${valueOrDash(log.actorName)}<br><small>${valueOrDash(log.actorRole)}</small></td>
            <td>${formatEnumText(log.action)}</td>
            <td>${formatEnumText(log.entityType)}<br><small>ID: ${valueOrDash(log.entityId)}</small></td>
            <td>${valueOrDash(log.description)}</td>
        `;

        body.appendChild(row);
    });
}

function getCurrentPage() {
    const path = window.location.pathname;
    return path.substring(path.lastIndexOf("/") + 1);
}

function getFuelRequestSourceRowClass(source) {
    if (source === "VEHICLE_OWNER") return "fuel-row-vehicle-owner";
    if (source === "HOSPITAL_GENERATOR") return "fuel-row-hospital-generator";
    if (source === "BUILDING_GENERATOR") return "fuel-row-building-generator";
    if (source === "EMERGENCY") return "fuel-row-emergency";
    return "fuel-row-neutral";
}

function getOutageRowClass(provider, cityCorporation) {
    if (provider === "DESCO" || cityCorporation === "DHAKA_NORTH_CITY_CORPORATION") {
        return "outage-row-dncc-desco";
    }

    if (provider === "DPDC" || cityCorporation === "DHAKA_SOUTH_CITY_CORPORATION") {
        return "outage-row-dscc-dpdc";
    }

    return "outage-row-neutral";
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.innerText = value === null || value === undefined ? "0" : value;
    }
}

function showMessage(message, className) {
    const element = document.getElementById("roleReportMessage");

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

function formatEnumText(value) {
    if (!value || value === "-") {
        return "-";
    }

    return String(value)
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, function (letter) {
            return letter.toUpperCase();
        });
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