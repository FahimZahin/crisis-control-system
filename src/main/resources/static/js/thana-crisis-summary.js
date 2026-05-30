let loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || {};

document.addEventListener("DOMContentLoaded", function () {
    setupLogout();

    const refreshBtn = document.getElementById("refreshThanaSummaryBtn");

    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadAllThanaSummary);
    }

    loadAllThanaSummary();
});

async function loadAllThanaSummary() {
    const body = document.getElementById("allThanaSummaryBody");

    if (body) {
        body.innerHTML = `<tr><td colspan="8">Loading...</td></tr>`;
    }

    try {
        const url = resolveDashboardUrl();

        if (!url) {
            showMessage("User role is not valid for this page.", "error-text");
            return;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(data), "error-text");
            return;
        }

        renderAllThanaSummary(data.thanaCrisisSummary || []);
        showMessage("Thana crisis summary loaded successfully.", "success-text");

    } catch (error) {
        showMessage("Server connection failed while loading thana summary.", "error-text");
    }
}

function resolveDashboardUrl() {
    const page = window.location.pathname;

    if (page.includes("government-thana-crisis-summary")) {
        return "http://localhost:8081/api/authority/government/dashboard?time=" + Date.now();
    }

    if (page.includes("local-thana-crisis-summary")) {
        const userId = getLoggedInUserId();

        if (!userId) {
            return null;
        }

        return "http://localhost:8081/api/authority/local/dashboard/" + userId + "?time=" + Date.now();
    }

    return null;
}

function renderAllThanaSummary(rows) {
    const body = document.getElementById("allThanaSummaryBody");

    if (!body) {
        return;
    }

    if (!rows || rows.length === 0) {
        body.innerHTML = `<tr><td colspan="8">No thana crisis summary found.</td></tr>`;
        return;
    }

    const sortedRows = rows.slice().sort(function (first, second) {
        const firstOngoing = Number(first.ongoingOutages || 0);
        const secondOngoing = Number(second.ongoingOutages || 0);

        if (secondOngoing !== firstOngoing) {
            return secondOngoing - firstOngoing;
        }

        const firstDemand = Number(first.totalDieselDemand || 0);
        const secondDemand = Number(second.totalDieselDemand || 0);

        return secondDemand - firstDemand;
    });

    body.innerHTML = "";

    sortedRows.forEach(function (rowData) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td><strong>${valueOrDash(rowData.thana)}</strong></td>
            <td>${valueOrDash(rowData.ongoingOutages)}</td>
            <td>${valueOrDash(rowData.scheduledOutages)}</td>
            <td>${valueOrDash(rowData.pendingRequests)}</td>
            <td>${valueOrDash(rowData.criticalHospitals)}</td>
            <td>${valueOrDash(rowData.lowStockBuildings)}</td>
            <td>${valueOrDash(rowData.lowStockPumps)}</td>
            <td>${valueOrDash(rowData.totalDieselDemand)} L</td>
        `;

        body.appendChild(row);
    });
}

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (!logoutBtn) {
        return;
    }

    logoutBtn.addEventListener("click", function () {
        localStorage.clear();
    });
}

function getLoggedInUserId() {
    return loggedInUser.userId || loggedInUser.id || localStorage.getItem("userId");
}

function showMessage(message, className) {
    const element = document.getElementById("thanaSummaryMessage");

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

function valueOrDash(value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    return value;
}