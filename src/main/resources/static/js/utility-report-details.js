const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    setupLogout();
    loadDetailsPage();
});

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            localStorage.clear();
            window.location.href = "login.html";
        });
    }
}

async function loadDetailsPage() {
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type");

    if (!type) {
        showMessage("No report type selected.", "error-text");
        return;
    }

    if (type.startsWith("outages")) {
        await loadOutageDetails(type);
        return;
    }

    if (type.startsWith("users")) {
        await loadUserDetails(type);
        return;
    }

    if (type === "low-stock-pumps") {
        await loadLowStockPumpDetails();
        return;
    }

    showMessage("Unknown report type.", "error-text");
}

async function loadOutageDetails(type) {
    updateTitleByType(type);
    setLoadingTable();

    try {
        const response = await fetch(
            "http://localhost:8081/api/reports/power-outage-details?type="
            + encodeURIComponent(type)
            + "&time="
            + Date.now()
        );

        const outages = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(outages), "error-text");
            renderOutageTable([]);
            return;
        }

        renderOutageTable(Array.isArray(outages) ? outages : []);
        showMessage("Power outage details loaded successfully.", "success-text");

    } catch (error) {
        showMessage("Server connection failed while loading outage details.", "error-text");
        renderOutageTable([]);
    }
}

async function loadUserDetails(type) {
    updateTitleByType(type);
    setLoadingTable();

    try {
        const response = await fetch("http://localhost:8081/api/admin/users?time=" + Date.now());
        const users = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(users), "error-text");
            renderUserTable([]);
            return;
        }

        let filtered = Array.isArray(users) ? users : [];

        if (type === "users-active") {
            filtered = filtered.filter(user => user.status === "ACTIVE");
        } else if (type === "users-inactive") {
            filtered = filtered.filter(user => user.status === "INACTIVE");
        }

        renderUserTable(filtered);
        showMessage("User details loaded successfully.", "success-text");

    } catch (error) {
        showMessage("Server connection failed while loading user details.", "error-text");
        renderUserTable([]);
    }
}

async function loadLowStockPumpDetails() {
    updateTitleByType("low-stock-pumps");
    setLoadingTable();

    try {
        const response = await fetch("http://localhost:8081/api/reports/pump-stock-details?time=" + Date.now());
        const stocks = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(stocks), "error-text");
            renderPumpStockTable([]);
            return;
        }

        const lowStocks = Array.isArray(stocks)
            ? stocks.filter(stock => stock.lowStock === true)
            : [];

        renderPumpStockTable(lowStocks);
        showMessage("Low stock pump details loaded successfully.", "success-text");

    } catch (error) {
        showMessage("Server connection failed while loading low stock pump details.", "error-text");
        renderPumpStockTable([]);
    }
}

function renderOutageTable(outages) {
    setTableHead(`
        <tr>
            <th>ID</th>
            <th>Provider</th>
            <th>City Corporation</th>
            <th>Thana</th>
            <th>Outage Type</th>
            <th>Cause</th>
            <th>Status</th>
            <th>Expected Restore</th>
            <th>Created At</th>
        </tr>
    `);

    const body = document.getElementById("detailsTableBody");

    if (!outages || outages.length === 0) {
        body.innerHTML = `<tr><td colspan="9">No outage record found.</td></tr>`;
        return;
    }

    body.innerHTML = "";

    outages.forEach(function (outage) {
        const row = document.createElement("tr");
        row.className = getOutageRowClass(outage.provider, outage.cityCorporation);

        row.innerHTML = `
            <td>${valueOrDash(outage.id)}</td>
            <td>${renderProviderBadge(outage.provider)}</td>
            <td>${renderCityCorporationBadge(outage.cityCorporation)}</td>
            <td>${valueOrDash(outage.thanaName)}</td>
            <td>${formatEnumText(outage.outageType)}</td>
            <td>${valueOrDash(outage.cause)}</td>
            <td>${formatEnumText(outage.status)}</td>
            <td>${formatDateTime(outage.expectedRestorationDateTime)}</td>
            <td>${formatDateTime(outage.createdAt)}</td>
        `;

        body.appendChild(row);
    });
}

function renderUserTable(users) {
    setTableHead(`
        <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Phone</th>
            <th>Role</th>
            <th>Status</th>
            <th>Address</th>
        </tr>
    `);

    const body = document.getElementById("detailsTableBody");

    if (!users || users.length === 0) {
        body.innerHTML = `<tr><td colspan="6">No user record found.</td></tr>`;
        return;
    }

    body.innerHTML = "";

    users.forEach(function (user) {
        const row = document.createElement("tr");
        row.className = getUserRoleRowClass(user.role);

        row.innerHTML = `
            <td>${valueOrDash(user.id)}</td>
            <td>${valueOrDash(user.fullName)}</td>
            <td>${valueOrDash(user.phoneNumber)}</td>
            <td>${renderRoleBadge(user.role)}</td>
            <td>${formatEnumText(user.status)}</td>
            <td>${valueOrDash(user.address)}</td>
        `;

        body.appendChild(row);
    });
}

function renderPumpStockTable(stocks) {
    setTableHead(`
        <tr>
            <th>Pump</th>
            <th>Address</th>
            <th>Fuel Type</th>
            <th>Current Stock</th>
            <th>Capacity</th>
            <th>Status</th>
        </tr>
    `);

    const body = document.getElementById("detailsTableBody");

    if (!stocks || stocks.length === 0) {
        body.innerHTML = `<tr><td colspan="6">No low stock pump found.</td></tr>`;
        return;
    }

    body.innerHTML = "";

    stocks.forEach(function (stock) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${valueOrDash(stock.pumpName)}</td>
            <td>${valueOrDash(stock.pumpAddress)}</td>
            <td>${valueOrDash(stock.fuelType)}</td>
            <td>${valueOrDash(stock.currentStock)} L</td>
            <td>${valueOrDash(stock.fuelCapacity)} L</td>
            <td>LOW STOCK</td>
        `;

        body.appendChild(row);
    });
}

function updateTitleByType(type) {
    const title = document.getElementById("detailsTitle");
    const subtitle = document.getElementById("detailsSubtitle");

    const titles = {
        "outages-all": "All Power Outage Notices",
        "outages-ongoing": "Ongoing Outage Details",
        "outages-scheduled": "Scheduled Outage Details",
        "outages-restored": "Restored Outage Details",
        "users-all": "All User Details",
        "users-active": "Active User Details",
        "users-inactive": "Inactive User Details",
        "low-stock-pumps": "Low Stock Pump Details"
    };

    title.innerText = titles[type] || "Report Details";
    subtitle.innerText = "Detailed records for " + (titles[type] || "selected report") + ".";
}

function setLoadingTable() {
    setTableHead(`
        <tr>
            <th>Loading</th>
        </tr>
    `);

    const body = document.getElementById("detailsTableBody");

    if (body) {
        body.innerHTML = `<tr><td>Loading...</td></tr>`;
    }
}

function setTableHead(html) {
    const head = document.getElementById("detailsTableHead");

    if (head) {
        head.innerHTML = html;
    }
}

function showMessage(message, className) {
    const element = document.getElementById("detailsMessage");

    if (element) {
        element.className = className;
        element.innerText = message;
    }
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

function renderProviderBadge(provider) {
    const value = valueOrDash(provider);
    const className = getProviderClass(value);

    return `<span class="soft-badge ${className}">${formatEnumText(value)}</span>`;
}

function renderCityCorporationBadge(cityCorporation) {
    const value = valueOrDash(cityCorporation);
    const className = getCityCorporationClass(value);

    return `<span class="soft-badge ${className}">${formatEnumText(value)}</span>`;
}

function renderRoleBadge(role) {
    const value = valueOrDash(role);
    const className = getRoleClass(value);

    return `<span class="soft-badge ${className}">${formatEnumText(value)}</span>`;
}

function getProviderClass(provider) {
    if (provider === "DESCO") {
        return "badge-desco";
    }

    if (provider === "DPDC") {
        return "badge-dpdc";
    }

    return "badge-neutral";
}

function getCityCorporationClass(cityCorporation) {
    if (cityCorporation === "DHAKA_NORTH_CITY_CORPORATION") {
        return "badge-dncc";
    }

    if (cityCorporation === "DHAKA_SOUTH_CITY_CORPORATION") {
        return "badge-dscc";
    }

    return "badge-neutral";
}

function getRoleClass(role) {
    if (role === "VEHICLE_OWNER") {
        return "badge-vehicle-owner";
    }

    if (role === "PUMP_AUTHORITY") {
        return "badge-pump-authority";
    }

    if (role === "BUILDING_MANAGER") {
        return "badge-building-manager";
    }

    if (role === "HOSPITAL_AUTHORITY") {
        return "badge-hospital-authority";
    }

    if (role === "UTILITY_AUTHORITY") {
        return "badge-utility-authority";
    }

    if (role === "EMERGENCY_VEHICLE_AUTHORITY") {
        return "badge-emergency-authority";
    }

    if (role === "GOVERNMENT_AUTHORITY") {
        return "badge-government-authority";
    }

    if (role === "LOCAL_AUTHORITY") {
        return "badge-local-authority";
    }

    if (role === "ADMIN") {
        return "badge-admin";
    }

    return "badge-neutral";
}

function formatEnumText(value) {
    if (!value || value === "-") {
        return "-";
    }

    return String(value)
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, function (letter) {
            return letter.toUpperCase();
        });
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

function getUserRoleRowClass(role) {
    if (role === "VEHICLE_OWNER") {
        return "user-row-vehicle-owner";
    }

    if (role === "PUMP_AUTHORITY") {
        return "user-row-pump-authority";
    }

    if (role === "BUILDING_MANAGER") {
        return "user-row-building-manager";
    }

    if (role === "HOSPITAL_AUTHORITY") {
        return "user-row-hospital-authority";
    }

    if (role === "UTILITY_AUTHORITY") {
        return "user-row-utility-authority";
    }

    if (role === "EMERGENCY_VEHICLE_AUTHORITY") {
        return "user-row-emergency-authority";
    }

    if (role === "GOVERNMENT_AUTHORITY") {
        return "user-row-government-authority";
    }

    if (role === "LOCAL_AUTHORITY") {
        return "user-row-local-authority";
    }

    if (role === "ADMIN") {
        return "user-row-admin";
    }

    return "user-row-neutral";
}
