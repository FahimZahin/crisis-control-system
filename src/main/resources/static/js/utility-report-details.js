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

    try {
        const response = await fetch("http://localhost:8081/api/power-outages?time=" + Date.now());
        const outages = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(outages), "error-text");
            return;
        }

        let filtered = outages;

        if (type === "outages-ongoing") {
            filtered = outages.filter(item => item.status === "ONGOING");
        } else if (type === "outages-scheduled") {
            filtered = outages.filter(item => item.status === "SCHEDULED");
        } else if (type === "outages-restored") {
            filtered = outages.filter(item => item.status === "RESTORED");
        }

        renderOutageTable(filtered);

    } catch (error) {
        showMessage("Server connection failed while loading outage details.", "error-text");
    }
}

async function loadUserDetails(type) {
    updateTitleByType(type);

    try {
        const response = await fetch("http://localhost:8081/api/admin/users?time=" + Date.now());
        const users = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(users), "error-text");
            return;
        }

        let filtered = users;

        if (type === "users-active") {
            filtered = users.filter(user => user.status === "ACTIVE");
        } else if (type === "users-inactive") {
            filtered = users.filter(user => user.status === "INACTIVE");
        }

        renderUserTable(filtered);

    } catch (error) {
        showMessage("Server connection failed while loading user details.", "error-text");
    }
}

async function loadLowStockPumpDetails() {
    updateTitleByType("low-stock-pumps");

    try {
        const response = await fetch("http://localhost:8081/api/reports/pump-stock-details?time=" + Date.now());
        const stocks = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(stocks), "error-text");
            return;
        }

        const lowStocks = stocks.filter(stock => stock.lowStock === true);

        renderPumpStockTable(lowStocks);

    } catch (error) {
        showMessage("Server connection failed while loading low stock pump details.", "error-text");
    }
}

function renderOutageTable(outages) {
    setTableHead(`
        <tr>
            <th>ID</th>
            <th>Provider</th>
            <th>City Corporation</th>
            <th>Thana</th>
            <th>Type</th>
            <th>Cause</th>
            <th>Status</th>
            <th>Expected Restore</th>
        </tr>
    `);

    const body = document.getElementById("detailsTableBody");

    if (!outages || outages.length === 0) {
        body.innerHTML = `<tr><td colspan="8">No outage record found.</td></tr>`;
        return;
    }

    body.innerHTML = "";

    outages.forEach(function (outage) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${valueOrDash(outage.id)}</td>
            <td>${valueOrDash(outage.provider)}</td>
            <td>${valueOrDash(outage.cityCorporation)}</td>
            <td>${valueOrDash(outage.thanaName)}</td>
            <td>${valueOrDash(outage.outageType)}</td>
            <td>${valueOrDash(outage.cause)}</td>
            <td>${valueOrDash(outage.status)}</td>
            <td>${formatDateTime(outage.expectedRestorationDateTime)}</td>
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

        row.innerHTML = `
            <td>${valueOrDash(user.id)}</td>
            <td>${valueOrDash(user.fullName)}</td>
            <td>${valueOrDash(user.phoneNumber)}</td>
            <td>${valueOrDash(user.role)}</td>
            <td>${valueOrDash(user.status)}</td>
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

function setTableHead(html) {
    document.getElementById("detailsTableHead").innerHTML = html;
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
    if (result.message) {
        return result.message;
    }

    if (result.messages) {
        return JSON.stringify(result.messages);
    }

    return "Request failed.";
}