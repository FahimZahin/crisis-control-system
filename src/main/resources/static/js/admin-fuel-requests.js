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

    document.getElementById("refreshAdminRequestsBtn").addEventListener("click", function () {
        loadAdminPageData();
    });
});

async function loadAdminPageData() {
    await loadAvailablePumps();
    await loadFuelRequests();
}

async function loadAvailablePumps() {
    try {
        const response = await fetch("http://localhost:8081/api/pumps/available");
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
        const response = await fetch("http://localhost:8081/api/admin/fuel-requests");
        allRequests = await response.json();

        if (!response.ok) {
            tableBody.innerHTML = `<tr><td colspan="10">Failed to load fuel requests.</td></tr>`;
            return;
        }

        updateSummaryCards();
        renderFuelRequests();

    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="10">Server connection failed.</td></tr>`;
    }
}

function updateSummaryCards() {
    document.getElementById("totalRequests").innerText = allRequests.length;

    document.getElementById("pendingRequests").innerText = allRequests.filter(function (request) {
        return request.requestStatus === "PENDING";
    }).length;

    document.getElementById("approvedRequests").innerText = allRequests.filter(function (request) {
        return request.requestStatus === "APPROVED";
    }).length;

    document.getElementById("rejectedRequests").innerText = allRequests.filter(function (request) {
        return request.requestStatus === "REJECTED";
    }).length;
}

function renderFuelRequests() {
    const tableBody = document.getElementById("adminFuelRequestsBody");

    if (allRequests.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="10">No fuel request found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = "";

    allRequests.forEach(function (request) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${request.id}</td>
            <td>
                <strong>${request.userName}</strong><br>
                ${request.phoneNumber || request.hospitalContactNumber || "-"}<br>
                <small>${request.requestSource || "-"}</small>
            </td>
            <td>${renderRequestInfo(request)}</td>
            <td>${request.fuelType}</td>
            <td>${request.fuelLevelStatus || "-"}</td>
            <td>${request.requestedLiter} L</td>
            <td>${request.estimatedCost} BDT</td>
            <td><span class="${getStatusClass(request.requestStatus)}">${request.requestStatus}</span></td>
            <td>
                <strong>${request.pumpName}</strong><br>
                ${request.pumpAddress}
            </td>
            <td>${request.adminNote || ""}</td>
            <td>${getActionArea(request)}</td>
        `;

        tableBody.appendChild(row);
    });
}

function renderRequestInfo(request) {
    if (request.requestSource === "HOSPITAL_GENERATOR") {
        return `
            <strong>Hospital Generator Diesel</strong><br>
            Hospital: ${valueOrDash(request.hospitalName)}<br>
            Reg: ${valueOrDash(request.hospitalRegistrationNumber)}<br>
            Thana: ${valueOrDash(request.affectedThana)}<br>
            Generator: ${valueOrDash(request.generatorCapacity)}<br>
            Urgency: ${valueOrDash(request.hospitalUrgencyLevel)}<br>
            Reason: ${valueOrDash(request.hospitalReason)}
        `;
    }

    if (request.requestSource === "EMERGENCY") {
        return `
            <strong>Emergency Vehicle</strong><br>
            Organization: ${valueOrDash(request.emergencyOrganizationName)}<br>
            Vehicle No: ${valueOrDash(request.emergencyVehicleNumber)}<br>
            Type: ${valueOrDash(request.emergencyVehicleType)}<br>
            Area: ${valueOrDash(request.emergencyAssignedArea)}
        `;
    }

    return `
        <strong>Normal Vehicle</strong><br>
        ${valueOrDash(request.vehicleBrand)} ${valueOrDash(request.vehicleModel)}<br>
        Plate: ${valueOrDash(request.vehicleNumberPlate)}<br>
        Type: ${valueOrDash(request.vehicleType)}
    `;
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

function valueOrDash(value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    return value;
}

function showMessage(message, className) {
    const element = document.getElementById("adminFuelRequestMessage");
    element.className = className;
    element.innerText = message;
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
            window.location.href = "login.html";
        });
    }
}