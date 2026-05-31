const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;
let publicPumps = [];

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    if (!isAllowedRole()) {
        alert("You are not allowed to view public pump transparency.");
        window.location.href = "dashboard.html";
        return;
    }

    setupLogout();
    setupEvents();
    adjustNavigationForRole();
    loadPublicPumpTransparency();
});

function isAllowedRole() {
    const role = getRole();

    return role === "ADMIN"
        || role === "GOVERNMENT_AUTHORITY"
        || role === "LOCAL_AUTHORITY"
        || role === "VEHICLE_OWNER"
        || role === "EMERGENCY_VEHICLE_AUTHORITY"
        || role === "PUMP_AUTHORITY";
}

function setupEvents() {
    const refreshBtn = document.getElementById("refreshPublicPumpBtn");
    const searchInput = document.getElementById("pumpSearchInput");
    const statusFilter = document.getElementById("pumpStatusFilter");
    const fuelTypeFilter = document.getElementById("pumpFuelTypeFilter");
    const closeBtn = document.getElementById("closePumpDetailsBtn");

    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadPublicPumpTransparency);
    }

    if (searchInput) {
        searchInput.addEventListener("input", renderPublicPumps);
    }

    if (statusFilter) {
        statusFilter.addEventListener("change", renderPublicPumps);
    }

    if (fuelTypeFilter) {
        fuelTypeFilter.addEventListener("change", renderPublicPumps);
    }

    if (closeBtn) {
        closeBtn.addEventListener("click", function () {
            const section = document.getElementById("pumpDetailsSection");

            if (section) {
                section.style.display = "none";
            }
        });
    }
}

async function loadPublicPumpTransparency() {
    await loadSummary();
    await loadPumps();
}

async function loadSummary() {
    try {
        const response = await fetch(
            "http://localhost:8081/api/public-pump-transparency/summary"
            + buildRoleQuery()
            + "&time="
            + Date.now()
        );

        const data = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(data), "error-text");
            return;
        }

        setText("publicTotalPumps", data.totalPumps || 0);
        setText("publicOpenPumps", (data.openPumps || 0) + (data.openWithDebtPumps || 0));
        setText("publicLowStockPumps", data.lowStockPumps || 0);
        setText("publicTotalUsableFuel", formatNumber(data.totalUsableStock));

        setText("publicRouteReservedFuel", formatNumber(data.totalRouteReservedStock));
        setText("publicTodayFuelSold", formatNumber(data.todayFuelSold));
        setText("publicTodayCash", formatNumber(data.todayCashCollection));
        setText("publicTodayBkash", formatNumber(data.todayBkashCollection));

    } catch (error) {
        showMessage("Server connection failed while loading pump transparency summary.", "error-text");
    }
}

async function loadPumps() {
    const body = document.getElementById("publicPumpBody");

    if (body) {
        body.innerHTML = `<tr><td colspan="10">Loading...</td></tr>`;
    }

    try {
        const response = await fetch(
            "http://localhost:8081/api/public-pump-transparency/pumps"
            + buildRoleQuery()
            + "&time="
            + Date.now()
        );

        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");
            return;
        }

        publicPumps = Array.isArray(result) ? result : [];
        renderPublicPumps();

        showMessage("Pump transparency loaded successfully.", "success-text");

    } catch (error) {
        showMessage("Server connection failed while loading pump transparency.", "error-text");

        if (body) {
            body.innerHTML = `<tr><td colspan="10">Server connection failed.</td></tr>`;
        }
    }
}

function renderPublicPumps() {
    const body = document.getElementById("publicPumpBody");

    if (!body) {
        return;
    }

    const filteredPumps = filterPumps(publicPumps);

    if (!filteredPumps.length) {
        body.innerHTML = `<tr><td colspan="10">No pump found.</td></tr>`;
        return;
    }

    body.innerHTML = "";

    filteredPumps.forEach(function (pump) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>
                <strong>${safeText(pump.pumpName)}</strong><br>
                <small>${safeText(pump.phoneNumber)}</small>
            </td>

            <td>
                ${safeText(pump.pumpAddress)}<br>
                <small>Thana: ${safeText(pump.pumpThana)}</small>
            </td>

            <td>${renderStatusBadge(pump)}</td>

            <td>${safeText(pump.fuelTypes)}</td>

            <td>${formatNumber(pump.totalCurrentStock)} L</td>

            <td>${formatNumber(pump.totalRouteReservedStock)} L</td>

            <td>
                <strong>${formatNumber(pump.totalUsableStock)} L</strong>
                ${pump.lowStock ? `<br><small class="error-text">LOW STOCK</small>` : ""}
            </td>

            <td>
                ${formatNumber(pump.todayTotalFuelSold)} L<br>
                <small>Route: ${formatNumber(pump.todayRouteTokenFuelSold)} L</small>
            </td>

            <td>
                ${formatNumber(pump.todayTotalCollection)} BDT<br>
                <small>Cash: ${formatNumber(pump.todayCashCollection)} | bKash: ${formatNumber(pump.todayBkashCollection)}</small>
            </td>

            <td>
                <button class="btn primary small-btn" onclick="viewPumpDetails(${pump.pumpId})">Details</button>
                ${getRole() === "VEHICLE_OWNER" ? `<a href="route-planning.html" class="btn secondary small-btn">Plan Route</a>` : ""}
            </td>
        `;

        body.appendChild(row);
    });
}

function filterPumps(pumps) {
    const search = getValue("pumpSearchInput").toLowerCase();
    const status = getValue("pumpStatusFilter");
    const fuelType = getValue("pumpFuelTypeFilter");

    return pumps.filter(function (pump) {
        const searchText = [
            pump.pumpName,
            pump.pumpAddress,
            pump.pumpThana,
            pump.fuelTypes,
            pump.displayStatus
        ].join(" ").toLowerCase();

        const matchesSearch = !search || searchText.includes(search);
        const matchesStatus = status === "ALL" || pump.pumpStatus === status;
        const matchesFuelType = fuelType === "ALL" || String(pump.fuelTypes || "").includes(fuelType);

        return matchesSearch && matchesStatus && matchesFuelType;
    });
}

async function viewPumpDetails(pumpId) {
    try {
        const response = await fetch(
            "http://localhost:8081/api/public-pump-transparency/pumps/"
            + pumpId
            + "?time="
            + Date.now()
        );

        const pump = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(pump), "error-text");
            return;
        }

        renderPumpDetails(pump);

    } catch (error) {
        showMessage("Server connection failed while loading pump details.", "error-text");
    }
}

function renderPumpDetails(pump) {
    const section = document.getElementById("pumpDetailsSection");

    if (section) {
        section.style.display = "block";
        section.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    setText("selectedPumpTitle", safeText(pump.pumpName));
    setText(
        "selectedPumpSubtitle",
        safeText(pump.pumpAddress)
        + " | "
        + safeText(pump.displayStatus)
        + " | "
        + (pump.open24Hours ? "Open 24 Hours" : safeText(pump.openingTime) + " - " + safeText(pump.closingTime))
    );

    setText("detailsCapacity", formatNumber(pump.totalCapacity));
    setText("detailsCurrentStock", formatNumber(pump.totalCurrentStock));
    setText("detailsReservedStock", formatNumber(pump.totalRouteReservedStock));
    setText("detailsUsableStock", formatNumber(pump.totalUsableStock));

    renderFuelStockDetails(pump.fuelStocks || []);
}

function renderFuelStockDetails(stocks) {
    const body = document.getElementById("pumpDetailsStockBody");

    if (!body) {
        return;
    }

    if (!stocks.length) {
        body.innerHTML = `<tr><td colspan="8">No fuel stock found.</td></tr>`;
        return;
    }

    body.innerHTML = "";

    stocks.forEach(function (stock) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${safeText(stock.fuelType)}</td>
            <td>${formatNumber(stock.fuelCapacity)} L</td>
            <td>${formatNumber(stock.currentStock)} L</td>
            <td>${formatNumber(stock.routeReservedStock)} L</td>
            <td><strong>${formatNumber(stock.usableStock)} L</strong></td>
            <td>${formatNumber(stock.emptySpace)} L</td>
            <td>${formatNumber(stock.stockPercentage)}%</td>
            <td>${stock.lowStock ? `<span class="error-text">LOW STOCK</span>` : `<span class="success-text">NORMAL</span>`}</td>
        `;

        body.appendChild(row);
    });
}

function renderStatusBadge(pump) {
    const status = safeText(pump.displayStatus);

    if (pump.pumpStatus === "OPEN") {
        return `<span class="success-text">${status}</span>`;
    }

    if (pump.pumpStatus === "OPEN_WITH_DEBT") {
        return `<span class="error-text">${status}</span>`;
    }

    if (pump.pumpStatus === "PENALTY_LOCKED") {
        return `<span class="error-text">${status}</span>`;
    }

    if (pump.pumpStatus === "CLOSED") {
        return `<span class="muted-text">${status}</span>`;
    }

    return status;
}

function buildRoleQuery() {
    const userId = getLoggedInUserId();
    const role = getRole();

    return "?userId=" + encodeURIComponent(userId || "")
        + "&role=" + encodeURIComponent(role || "");
}

function adjustNavigationForRole() {
    const routePlanningLink = document.getElementById("routePlanningNavLink");

    if (routePlanningLink && getRole() !== "VEHICLE_OWNER") {
        routePlanningLink.style.display = "none";
    }
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

function getRole() {
    return loggedInUser.role || localStorage.getItem("role") || "";
}

function getValue(id) {
    const element = document.getElementById(id);
    return element ? element.value : "";
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.innerText = value;
    }
}

function showMessage(message, className) {
    const element = document.getElementById("publicPumpMessage");

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

    if (result.message) {
        return result.message;
    }

    if (result.error) {
        return result.error;
    }

    if (result.messages) {
        return JSON.stringify(result.messages);
    }

    return JSON.stringify(result);
}