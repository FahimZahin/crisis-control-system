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
        tableBody.innerHTML = `<tr><td colspan="11">No fuel request found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = "";

    allRequests.forEach(function (request) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${request.id}</td>
            <td>${request.userName}<br><small>${request.phoneNumber}</small></td>
            <td>${request.vehicleBrand} ${request.vehicleModel}<br><small>${request.vehicleNumberPlate}</small></td>
            <td>${request.fuelType}</td>
            <td>${request.fuelLevelStatus || "-"}</td>
            <td>${request.requestedLiter}</td>
            <td>${request.estimatedCost} BDT</td>
            <td><span class="status-badge ${getStatusClass(request.requestStatus)}">${request.requestStatus}</span></td>
            <td>${request.pumpName}<br><small>${request.pumpAddress}</small></td>
            <td>
                <textarea id="adminNote-${request.id}" placeholder="Admin note">${request.adminNote || ""}</textarea>
            </td>
            <td>${getActionButtons(request)}</td>
        `;

        tableBody.appendChild(row);

        if (request.requestStatus === "PENDING") {
            const pumpSelectCell = document.createElement("div");
            pumpSelectCell.innerHTML = getPumpSelect(request.id);

            const actionCell = row.children[9];
            actionCell.insertBefore(pumpSelectCell, actionCell.firstChild);
        }
    });
}

function getPumpSelect(requestId) {
    let html = `<select id="pumpSelect-${requestId}" class="table-select">`;
    html += `<option value="">Select Pump</option>`;

    availablePumps.forEach(function (pump) {
        html += `<option value="${pump.id}">${pump.pumpName} - ${pump.fuelTypes}</option>`;
    });

    html += `</select>`;

    return html;
}

function getActionButtons(request) {
    if (request.requestStatus !== "PENDING") {
        return `<span class="muted-text">No action</span>`;
    }

    return `
        <button class="btn primary tiny-btn" onclick="approveRequest(${request.id})">Approve</button>
        <button class="btn danger tiny-btn" onclick="rejectRequest(${request.id})">Reject</button>
    `;
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
        });
    }
}