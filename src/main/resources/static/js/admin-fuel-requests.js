const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

let allRequests = [];
let availablePumps = [];

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    setupLogout();
    loadAdminPageData();

    const refreshBtn = document.getElementById("refreshAdminRequestsBtn");

    if (refreshBtn) {
        refreshBtn.addEventListener("click", function () {
            loadAdminPageData();
        });
    }

    setInterval(renderFuelRequests, 60000);
});

async function loadAdminPageData() {
    await loadAvailablePumps();
    await loadFuelRequests();
}

async function loadAvailablePumps() {
    try {
        const response = await fetch("http://localhost:8081/api/pumps/available?time=" + Date.now());
        availablePumps = await response.json();

        if (!response.ok) {
            availablePumps = [];
        }

    } catch (error) {
        availablePumps = [];
    }
}

async function loadFuelRequests() {
    const tableBody = document.getElementById("adminFuelRequestsBody");

    try {
        const response = await fetch("http://localhost:8081/api/admin/fuel-requests?time=" + Date.now());
        allRequests = await response.json();

        if (!response.ok) {
            tableBody.innerHTML = `<tr><td colspan="11">Failed to load fuel requests.</td></tr>`;
            return;
        }

        updateSummaryCards();
        renderFuelRequests();

    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="11">Server connection failed.</td></tr>`;
    }
}

function updateSummaryCards() {
    setTextIfExists("totalRequests", allRequests.length);

    setTextIfExists("pendingRequests", allRequests.filter(function (request) {
        return request.requestStatus === "PENDING";
    }).length);

    setTextIfExists("approvedRequests", allRequests.filter(function (request) {
        return request.requestStatus === "APPROVED";
    }).length);

    setTextIfExists("rejectedRequests", allRequests.filter(function (request) {
        return request.requestStatus === "REJECTED";
    }).length);
}

function renderFuelRequests() {
    const tableBody = document.getElementById("adminFuelRequestsBody");

    if (!tableBody) {
        return;
    }

    if (allRequests.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="11">No fuel request found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = "";

    allRequests.forEach(function (request) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${request.id}</td>
            <td>
                <strong>${valueOrDash(request.userName)}</strong><br>
                ${valueOrDash(request.phoneNumber || request.hospitalContactNumber)}<br>
                <small>${valueOrDash(request.requestSource)}</small><br>
                <small>${renderRequestTime(request)}</small>
            </td>
            <td>${renderRequestInfo(request)}</td>
            <td>${valueOrDash(request.fuelType)}</td>
            <td>${valueOrDash(request.fuelLevelStatus)}</td>
            <td>${valueOrDash(request.requestedLiter)} L</td>
            <td>
                ${valueOrDash(request.estimatedCost)} BDT<br>
                <small>Requested BDT: ${valueOrDash(request.requestedAmountBdt)}</small>
            </td>
            <td><span class="${getStatusClass(request.requestStatus)}">${valueOrDash(request.requestStatus)}</span></td>
            <td>
                <strong>${valueOrDash(request.pumpName)}</strong><br>
                ${valueOrDash(request.pumpAddress)}
            </td>
            <td>${renderAdminNote(request)}</td>
            <td>${getActionArea(request)}</td>
        `;

        tableBody.appendChild(row);
    });
}

function renderRequestInfo(request) {
    if (request.requestSource === "HOSPITAL_GENERATOR") {
        return `
            <strong>Hospital Generator</strong><br>
            ${valueOrDash(request.hospitalName)}<br>
            Thana: ${valueOrDash(request.affectedThana)}<br>
            Backup: ${valueOrDash(request.hospitalEstimatedBackupHours)} hrs<br>
            Reserve: ${valueOrDash(request.hospitalCurrentDieselReserve)} L
        `;
    }

    if (request.requestSource === "EMERGENCY") {
        return `
            <strong>Emergency Vehicle</strong><br>
            ${valueOrDash(request.emergencyOrganizationName)}<br>
            Vehicle: ${valueOrDash(request.emergencyVehicleNumber)}<br>
            Area: ${valueOrDash(request.emergencyAssignedArea)}
        `;
    }

    return `
        <strong>Normal Vehicle</strong><br>
        ${valueOrDash(request.vehicleBrand)} ${valueOrDash(request.vehicleModel)}<br>
        Plate: ${valueOrDash(request.vehicleNumberPlate)}<br>
        Type: ${valueOrDash(request.vehicleType)}<br>
        Odometer: ${valueOrDash(request.previousOdometerReading)} → ${valueOrDash(request.requestOdometerReading)} km<br>
        Remaining: ${valueOrDash(request.estimatedRemainingRangeKm)} km
        ${renderExtraFuelInfo(request)}
    `;
}

function renderExtraFuelInfo(request) {
    if (!request.extraFuelRequested) {
        return "";
    }

    return `
        <br><strong>Extra Fuel</strong><br>
        Reason: ${valueOrDash(request.extraFuelReasonType)}
    `;
}

function renderAdminNote(request) {
    if (request.extraFuelRequested) {
        return `
            Extra fuel request.<br>
            Reason: ${valueOrDash(request.extraFuelReasonType)}<br>
            Limit exceeded. Admin approval required.
        `;
    }

    if (request.requestSource === "HOSPITAL_GENERATOR") {
        if (request.requestStatus === "PENDING") {
            return "Hospital diesel request pending.";
        }

        if (request.requestStatus === "APPROVED") {
            return "Hospital diesel request approved.";
        }

        if (request.requestStatus === "COLLECTED") {
            return "Hospital diesel collected.";
        }

        if (request.requestStatus === "REJECTED") {
            return "Hospital diesel request rejected.";
        }
    }

    return valueOrDash(request.adminNote);
}

function getActionArea(request) {
    if (request.requestStatus !== "PENDING") {
        return `No action`;
    }

    return `
        ${getPumpSelect(request.id)}
        <textarea id="adminNote-${request.id}" rows="2" placeholder="Admin note"></textarea>
        <button class="btn primary tiny-btn" onclick="approveRequest(${request.id})">Approve</button>
        <button class="btn danger tiny-btn" onclick="rejectRequest(${request.id})">Reject</button>
    `;
}

function getPumpSelect(requestId) {
    let html = `<select id="pumpSelect-${requestId}">`;
    html += `<option value="">Select Pump</option>`;

    availablePumps.forEach(function (pump) {
        html += `<option value="${pump.id}">${pump.pumpName} - ${pump.fuelTypes}</option>`;
    });

    html += `</select>`;

    return html;
}

async function approveRequest(requestId) {
    const pumpId = document.getElementById("pumpSelect-" + requestId).value;
    const adminNote = document.getElementById("adminNote-" + requestId).value;

    if (!pumpId) {
        showMessage("Please select a pump before approving.", "error-text");
        return;
    }

    const confirmed = confirm("Approve this fuel request?");

    if (!confirmed) {
        return;
    }

    const data = {
        pumpId: Number(pumpId),
        adminNote: adminNote
    };

    try {
        const response = await fetch("http://localhost:8081/api/admin/fuel-requests/" + requestId + "/approve", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            showMessage("Fuel request approved.", "success-text");
            loadAdminPageData();
        } else {
            showMessage(getErrorMessage(result), "error-text");
        }

    } catch (error) {
        showMessage("Server connection failed while approving request.", "error-text");
    }
}

async function rejectRequest(requestId) {
    const adminNote = document.getElementById("adminNote-" + requestId).value;
    const confirmed = confirm("Reject this fuel request?");

    if (!confirmed) {
        return;
    }

    const data = {
        pumpId: 1,
        adminNote: adminNote || "Rejected by admin"
    };

    try {
        const response = await fetch("http://localhost:8081/api/admin/fuel-requests/" + requestId + "/reject", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            showMessage("Fuel request rejected.", "success-text");
            loadAdminPageData();
        } else {
            showMessage(getErrorMessage(result), "error-text");
        }

    } catch (error) {
        showMessage("Server connection failed while rejecting request.", "error-text");
    }
}

function renderRequestTime(request) {
    if (!request.createdAt) {
        return "Requested: -";
    }

    return "Requested: " + formatDateTime(request.createdAt) + " (" + timeAgo(request.createdAt) + ")";
}

function timeAgo(dateValue) {
    const date = new Date(dateValue);
    const now = new Date();

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) {
        return "just now";
    }

    if (diffMinutes < 60) {
        return diffMinutes + " min ago";
    }

    const diffHours = Math.floor(diffMinutes / 60);

    if (diffHours < 24) {
        return diffHours + " hr ago";
    }

    const diffDays = Math.floor(diffHours / 24);
    return diffDays + " day(s) ago";
}

function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    return value.replace("T", " ").substring(0, 16);
}

function getStatusClass(status) {
    if (status === "APPROVED") {
        return "status-approved";
    }

    if (status === "REJECTED") {
        return "status-rejected";
    }

    if (status === "COLLECTED") {
        return "status-collected";
    }

    return "status-pending";
}

function setTextIfExists(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.innerText = value;
    }
}

function valueOrDash(value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    return value;
}

function showMessage(message, className) {
    const element = document.getElementById("adminFuelRequestMessage");

    if (element) {
        element.className = className;
        element.innerText = message;
    }
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

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            localStorage.clear();
        });
    }
}