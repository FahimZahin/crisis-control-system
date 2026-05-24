const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    setupLogout();
    loadFuelReportDetails();
});

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            localStorage.clear();
        });
    }
}

async function loadFuelReportDetails() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const type = params.get("type");

    updateTitle(status, type);

    try {
        const response = await fetch("http://localhost:8081/api/admin/fuel-requests?time=" + Date.now());
        const requests = await response.json();

        if (!response.ok) {
            showMessage("Failed to load fuel report details.", "error-text");
            return;
        }

        let filteredRequests = requests;

        if (status) {
            filteredRequests = requests.filter(function (request) {
                return request.requestStatus === status;
            });
        }

        renderFuelReportDetails(filteredRequests);

    } catch (error) {
        showMessage("Server connection failed while loading fuel report details.", "error-text");
    }
}

function updateTitle(status, type) {
    let title = "Fuel Report Details";

    if (status === "PENDING") {
        title = "Pending Admin Review Details";
    } else if (status === "APPROVED") {
        title = "Approved / Assigned by Admin Details";
    } else if (status === "COLLECTED") {
        title = "Collected by Pump Details";
    } else if (status === "REJECTED") {
        title = "Rejected by Admin Details";
    } else if (type === "estimated-cost") {
        title = "Total Estimated Fuel Cost Details";
    } else if (type === "liter") {
        title = "Total Requested Fuel Details";
    } else if (type === "stock") {
        title = "Pump Fuel Stock Details";
    }

    document.getElementById("fuelReportTitle").innerText = title;
}

function renderFuelReportDetails(requests) {
    const tableBody = document.getElementById("fuelReportDetailsBody");

    if (!requests || requests.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8">No fuel request found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = "";

    requests.forEach(function (request) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${valueOrDash(request.id)}</td>
            <td>
                <strong>${valueOrDash(request.userName)}</strong><br>
                <small>${valueOrDash(request.phoneNumber)}</small>
            </td>
            <td>${valueOrDash(request.requestSource)}</td>
            <td>${valueOrDash(request.fuelType)}</td>
            <td>${valueOrDash(request.requestedLiter)} L</td>
            <td>${valueOrDash(request.estimatedCost)} BDT</td>
            <td>${valueOrDash(request.requestStatus)}</td>
            <td>
                ${valueOrDash(request.pumpName || request.assignedPumpName)}<br>
                <small>${valueOrDash(request.adminNote)}</small>
            </td>
        `;

        tableBody.appendChild(row);
    });
}

function showMessage(message, className) {
    const messageBox = document.getElementById("fuelReportMessage");

    if (messageBox) {
        messageBox.className = className;
        messageBox.innerText = message;
    }
}

function valueOrDash(value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    return value;
}