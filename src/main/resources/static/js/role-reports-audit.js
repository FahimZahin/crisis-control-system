const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

const pageRoleMap = {
    "pump-reports-audit.html": "PUMP_AUTHORITY",
    "utility-reports-audit.html": "UTILITY_AUTHORITY",
    "hospital-reports-audit.html": "HOSPITAL_AUTHORITY",
    "building-reports-audit.html": "BUILDING_MANAGER",
    "emergency-reports-audit.html": "EMERGENCY_VEHICLE_AUTHORITY"
};

const endpointMap = {
    "pump-reports-audit.html": "pump",
    "utility-reports-audit.html": "utility",
    "hospital-reports-audit.html": "hospital",
    "building-reports-audit.html": "building",
    "emergency-reports-audit.html": "emergency"
};

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    const page = getCurrentPage();
    const requiredRole = pageRoleMap[page];

    if (!requiredRole) {
        showMessage("Invalid report page.", "error-text");
        return;
    }

    if (loggedInUser.role !== requiredRole) {
        showMessage(
            "Access denied. This page is only for " +
            formatEnumText(requiredRole) +
            ". You are logged in as " +
            formatEnumText(loggedInUser.role) +
            ".",
            "error-text"
        );

        setTimeout(function () {
            window.location.href = "dashboard.html";
        }, 1800);

        return;
    }

    setupLogout();
    setupAuditFilterEvents();
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

function setupAuditFilterEvents() {
    const applyBtn = document.getElementById("applyAuditFilterBtn");
    const clearBtn = document.getElementById("clearAuditFilterBtn");
    const periodSelect = document.getElementById("auditPeriod");

    if (periodSelect) {
        periodSelect.addEventListener("change", updateAuditFilterInputs);
    }

    if (applyBtn) {
        applyBtn.addEventListener("click", function () {
            loadRoleReport();
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
            loadRoleReport();
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

async function loadRoleReport() {
    const page = getCurrentPage();
    const userId = loggedInUser.userId || loggedInUser.id || localStorage.getItem("userId");
    const reportType = endpointMap[page];

    if (!reportType || !userId) {
        showMessage("Report type or user ID not found. Please login again.", "error-text");
        return;
    }

    try {
        const url =
            "http://localhost:8081/api/reports/role/" +
            reportType +
            "/" +
            userId +
            "?" +
            buildAuditFilterQuery();

        const response = await fetch(url);

        let data;

        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            data = await response.json();
        } else {
            const text = await response.text();
            data = { message: text || "Request failed." };
        }

        if (!response.ok) {
            showMessage(getErrorMessage(data), "error-text");
            console.error("Role report request failed:", {
                status: response.status,
                url: url,
                data: data
            });
            return;
        }

        renderHeader(data);
        renderSummary(data, reportType);
        controlVisibleSections(reportType, data);
        renderStatusBox(data);
        renderFuelRequests(data.fuelRequests || []);
        renderPumpStocks(data.pumpStocks || []);
        renderPowerOutages(data.powerOutages || []);
        renderAuditLogs(data.auditLogs || []);

        showMessage("Report loaded successfully.", "success-text");

    } catch (error) {
        console.error("Role report loading error:", error);
        showMessage("Server connection failed while loading report. Check console/network for exact error.", "error-text");
    }
}

function renderHeader(data) {
    setText("roleReportTitle", data.title || "Reports & Audit Logs");
    setText("roleReportSubtitle", data.subtitle || "Role-specific report records.");
}

function renderSummary(data, reportType) {
    const summary = data.summary || {};
    const stockSummary = data.stockSummary || {};
    const outageSummary = data.outageSummary || {};
    const hospitalStatus = data.hospitalStatus || null;

    setText("totalRequests", summary.totalRequests || 0);
    setText("pendingRequests", summary.pendingRequests || 0);
    setText("approvedRequests", summary.approvedRequests || 0);
    setText("collectedRequests", summary.collectedRequests || 0);
    setText("rejectedRequests", summary.rejectedRequests || 0);
    setText("totalRequestedLiter", formatNumber(summary.totalRequestedLiter));
    setText("totalEstimatedCost", formatNumber(summary.totalEstimatedCost));

    if (hospitalStatus) {
        setText("totalCurrentStock", formatNumber(hospitalStatus.currentDieselReserve));
        setText("totalCapacity", formatNumber(hospitalStatus.totalDieselCapacity));
        setText("availableSpace", formatNumber(hospitalStatus.availableDieselSpace));
        setText("totalFuelTypes", outageSummary.ongoingOutages || 0);
    } else {
        setText("totalFuelTypes", stockSummary.totalFuelTypes || 0);
        setText("totalCurrentStock", formatNumber(stockSummary.totalCurrentStock));
        setText("totalCapacity", formatNumber(stockSummary.totalCapacity));
        setText("availableSpace", formatNumber(stockSummary.availableSpace));
    }

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
            <td>
               ${valueOrDash(log.actorName)}<br>
               <small>${formatEnumText(log.actorDisplayRole || log.utilityProvider || log.actorRole)}</small>
            </td>
            <td>${formatEnumText(log.action)}</td>
            <td>${formatEnumText(log.entityType)}<br><small>ID: ${valueOrDash(log.entityId)}</small></td>
            <td>${valueOrDash(log.description)}</td>
        `;

        body.appendChild(row);
    });
}

function controlVisibleSections(reportType, data) {
    const pumpStockSection = document.getElementById("pumpStockSection");
    const powerOutageSection = document.getElementById("powerOutageSection");
    const fuelRequestSection = getSectionByHeading("Fuel Request Records");

    const totalFuelTypesCard = document.getElementById("totalFuelTypesCard");
    const totalCurrentStockCard = document.getElementById("totalCurrentStockCard");
    const totalCapacityCard = document.getElementById("totalCapacityCard");
    const availableSpaceCard = document.getElementById("availableSpaceCard");

    const totalCurrentStockTitle = document.getElementById("totalCurrentStockTitle");
    const totalCapacityTitle = document.getElementById("totalCapacityTitle");
    const availableSpaceTitle = document.getElementById("availableSpaceTitle");

    const originalOngoingOutageCard = getSummaryCardByValueId("ongoingOutages");

    const outageCards = [
        getSummaryCardByValueId("totalOutages"),
        getSummaryCardByValueId("ongoingOutages"),
        getSummaryCardByValueId("scheduledOutages"),
        getSummaryCardByValueId("restoredOutages")
    ];

    if (pumpStockSection) {
        pumpStockSection.style.display = reportType === "pump" ? "block" : "none";
    }

    if (fuelRequestSection) {
        fuelRequestSection.style.display = reportType === "utility" ? "none" : "block";
    }

    if (powerOutageSection) {
        const showOutageSection =
            reportType === "utility" ||
            reportType === "hospital" ||
            reportType === "building";

        powerOutageSection.style.display = showOutageSection ? "block" : "none";
    }

    if (reportType === "utility") {
        arrangeUtilitySummaryCardsInOneLine();

        if (totalFuelTypesCard) totalFuelTypesCard.style.display = "none";
        if (totalCurrentStockCard) totalCurrentStockCard.style.display = "none";
        if (totalCapacityCard) totalCapacityCard.style.display = "none";
        if (availableSpaceCard) availableSpaceCard.style.display = "none";

        return;
    }

    outageCards.forEach(function (card) {
        if (card) {
            card.style.display = reportType === "emergency" ? "none" : "block";
        }
    });

    if (reportType === "hospital") {
        if (totalFuelTypesCard) {
            totalFuelTypesCard.style.display = "block";

            const title = totalFuelTypesCard.querySelector("h3");
            if (title) {
                title.innerText = "Ongoing Outages";
            }
        }

        if (originalOngoingOutageCard) {
            originalOngoingOutageCard.style.display = "none";
        }

        if (totalCurrentStockTitle) {
            totalCurrentStockTitle.innerText = "Current Diesel Reserve";
        }

        if (totalCapacityTitle) {
            totalCapacityTitle.innerText = "Total Diesel Capacity";
        }

        if (availableSpaceTitle) {
            availableSpaceTitle.innerText = "Available Diesel Space";
        }

        return;
    }

    if (reportType === "pump") {
        if (totalFuelTypesCard) totalFuelTypesCard.style.display = "block";
        if (totalCurrentStockCard) totalCurrentStockCard.style.display = "block";
        if (totalCapacityCard) totalCapacityCard.style.display = "block";
        if (availableSpaceCard) availableSpaceCard.style.display = "block";

        if (totalCurrentStockTitle) totalCurrentStockTitle.innerText = "Total Current Stock";
        if (totalCapacityTitle) totalCapacityTitle.innerText = "Total Capacity";
        if (availableSpaceTitle) availableSpaceTitle.innerText = "Available Space";

        return;
    }

    if (reportType === "building" || reportType === "emergency") {
        if (totalFuelTypesCard) totalFuelTypesCard.style.display = "none";
        if (totalCurrentStockCard) totalCurrentStockCard.style.display = "none";
        if (totalCapacityCard) totalCapacityCard.style.display = "none";
        if (availableSpaceCard) availableSpaceCard.style.display = "none";
    }
}

function arrangeUtilitySummaryCardsInOneLine() {
    const summarySection = getSectionByHeading("Summary");

    if (!summarySection) {
        return;
    }

    const grids = summarySection.querySelectorAll(".role-summary-grid");

    if (!grids || grids.length === 0) {
        return;
    }

    const firstGrid = grids[0];

    const fuelCardIds = [
        "totalRequests",
        "pendingRequests",
        "approvedRequests",
        "collectedRequests",
        "rejectedRequests",
        "totalRequestedLiter",
        "totalEstimatedCost",
        "totalFuelTypes",
        "totalCurrentStock",
        "totalCapacity",
        "availableSpace"
    ];

    fuelCardIds.forEach(function (id) {
        const card = getSummaryCardByValueId(id);
        if (card) {
            card.style.display = "none";
        }
    });

    const outageCardIds = [
        "totalOutages",
        "ongoingOutages",
        "scheduledOutages",
        "restoredOutages"
    ];

    outageCardIds.forEach(function (id) {
        const card = getSummaryCardByValueId(id);
        if (card) {
            card.style.display = "block";
            firstGrid.appendChild(card);
        }
    });

    grids.forEach(function (grid, index) {
        if (index === 0) {
            grid.style.display = "grid";
            return;
        }

        const visibleCards = Array.from(grid.children).filter(function (child) {
            return child.style.display !== "none";
        });

        grid.style.display = visibleCards.length === 0 ? "none" : "grid";
    });
}

function getSectionByHeading(headingText) {
    const sections = document.querySelectorAll(".role-dashboard-section");

    for (const section of sections) {
        const heading = section.querySelector("h2");

        if (heading && heading.innerText.trim().toLowerCase() === headingText.toLowerCase()) {
            return section;
        }
    }

    return null;
}

function hideFuelSummaryCards() {
    const fuelCards = [
        getSummaryCardByValueId("totalRequests"),
        getSummaryCardByValueId("pendingRequests"),
        getSummaryCardByValueId("approvedRequests"),
        getSummaryCardByValueId("collectedRequests"),
        getSummaryCardByValueId("rejectedRequests"),
        getSummaryCardByValueId("totalRequestedLiter"),
        getSummaryCardByValueId("totalEstimatedCost")
    ];

    fuelCards.forEach(function (card) {
        if (card) {
            card.style.display = "none";
        }
    });
}

function getSummaryCardByValueId(id) {
    const valueElement = document.getElementById(id);

    if (!valueElement) {
        return null;
    }

    return valueElement.closest(".summary-card");
}

function getFuelRequestSourceRowClass(source) {
    if (!source) {
        return "";
    }

    const normalized = String(source).toUpperCase();

    if (normalized.includes("HOSPITAL")) {
        return "row-soft-red";
    }

    if (normalized.includes("BUILDING")) {
        return "row-soft-orange";
    }

    if (normalized.includes("EMERGENCY")) {
        return "row-soft-purple";
    }

    if (normalized.includes("VEHICLE")) {
        return "row-soft-blue";
    }

    return "";
}

function getOutageRowClass(provider, cityCorporation) {
    const normalizedProvider = String(provider || "").toUpperCase();
    const normalizedCity = String(cityCorporation || "").toUpperCase();

    if (normalizedProvider.includes("DESCO") || normalizedCity.includes("NORTH")) {
        return "row-soft-blue";
    }

    if (normalizedProvider.includes("DPDC") || normalizedCity.includes("SOUTH")) {
        return "row-soft-orange";
    }

    return "";
}

function getCurrentPage() {
    return window.location.pathname.split("/").pop();
}

function showMessage(message, className) {
    const messageElement = document.getElementById("roleReportMessage");

    if (!messageElement) {
        return;
    }

    messageElement.className = className || "";
    messageElement.innerText = message || "";
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.innerText = valueOrDash(value);
    }
}

function valueOrDash(value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    return value;
}

function formatNumber(value) {
    if (value === null || value === undefined || value === "") {
        return "0";
    }

    const number = Number(value);

    if (Number.isNaN(number)) {
        return value;
    }

    return number.toFixed(2);
}

function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
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

function getErrorMessage(error) {
    if (!error) {
        return "Request failed.";
    }

    if (typeof error === "string") {
        return error;
    }

    return error.message || error.error || error.details || "Request failed.";
}