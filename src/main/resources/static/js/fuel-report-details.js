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

        if (type === "hospital-critical") {
            filteredRequests = requests.filter(function (request) {
                return request.requestSource === "HOSPITAL_GENERATOR"
                    && (
                        containsText(request.hospitalPriorityLevel, "CRITICAL")
                        || containsText(request.hospitalUrgencyLevel, "CRITICAL")
                        || containsText(request.fuelLevelStatus, "CRITICAL")
                    );
            });
        }

        if (type === "building-low-stock") {
            filteredRequests = requests.filter(function (request) {
                return request.requestSource === "BUILDING_GENERATOR"
                    && (
                        request.buildingLowStockAlert === true
                        || containsText(request.fuelLevelStatus, "LOW_STOCK")
                    );
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
    else if (type === "hospital-critical") {
        title = "Hospital Critical Request Details";
    } else if (type === "building-low-stock") {
        title = "Building Low Stock Request Details";
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
        row.className = getFuelRequestSourceRowClass(request.requestSource);

        row.innerHTML = `
            <td>${valueOrDash(request.id)}</td>
            <td>
                <strong>${valueOrDash(request.userName)}</strong><br>
                <small>${valueOrDash(request.phoneNumber)}</small>
            </td>
            <td>${formatEnumText(request.requestSource)}</td>
            <td>${formatEnumText(request.fuelType)}</td>
            <td>${valueOrDash(request.requestedLiter)} L</td>
            <td>${valueOrDash(request.estimatedCost)} BDT</td>
            <td>${formatEnumText(request.requestStatus)}</td>
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


function getFuelRequestSourceRowClass(source) {
    if (source === "VEHICLE_OWNER") {
        return "fuel-row-vehicle-owner";
    }

    if (source === "HOSPITAL_GENERATOR") {
        return "fuel-row-hospital-generator";
    }

    if (source === "BUILDING_GENERATOR") {
        return "fuel-row-building-generator";
    }

    if (source === "EMERGENCY") {
        return "fuel-row-emergency";
    }

    return "fuel-row-neutral";
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
function valueOrDash(value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    return value;
}

function containsText(value, text) {
    if (!value || !text) {
        return false;
    }

    return String(value).toLowerCase().includes(String(text).toLowerCase());
}