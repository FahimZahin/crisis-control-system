document.addEventListener("DOMContentLoaded", function () {
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || {};

    if (loggedInUser.role !== "ADMIN") {
        alert("Only admin can access weekly allocation requests.");
        window.location.href = "dashboard.html";
        return;
    }

    setupLogout();
    loadAllocationRequests();

    const refreshBtn = document.getElementById("refreshAllocationRequestsBtn");

    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadAllocationRequests);
    }
});

async function loadAllocationRequests() {
    const tableBody = document.getElementById("allocationRequestsBody");

    tableBody.innerHTML = `
        <tr>
            <td colspan="9">Loading allocation requests...</td>
        </tr>
    `;

    try {
        const response = await fetch("http://localhost:8081/api/admin/fuel-requests");
        const requests = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(requests), "error-text");
            return;
        }

        const buildingRequests = requests.filter(function (request) {
            return request.requestSource === "BUILDING_GENERATOR"
                && request.requestStatus === "PENDING";
        });

        document.getElementById("pendingBuildingRequests").innerText = buildingRequests.length;
        renderAllocationRequests(buildingRequests);

    } catch (error) {
        showMessage("Server connection failed while loading allocation requests.", "error-text");
        tableBody.innerHTML = `
            <tr>
                <td colspan="9">Server connection failed.</td>
            </tr>
        `;
    }
}

function renderAllocationRequests(requests) {
    const tableBody = document.getElementById("allocationRequestsBody");

    if (!requests || requests.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9">No pending building allocation request found.</td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = "";

    requests.forEach(function (request) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${valueOrDash(request.id)}</td>
            <td>
                <strong>${valueOrDash(request.buildingName)}</strong><br>
                <small>Holding: ${valueOrDash(request.buildingHoldingNumber)}</small><br>
                <small>Thana: ${valueOrDash(request.buildingThana)}</small>
            </td>
            <td>
                <strong>${valueOrDash(request.userName)}</strong><br>
                <small>${valueOrDash(request.phoneNumber)}</small>
            </td>
            <td>${formatNumber(request.requestedLiter)} L</td>
            <td>
                <strong>Allocation:</strong> ${formatNumber(request.buildingWeeklyAllocationLiter)} L/week<br>
                <strong>Current Stock:</strong> ${formatNumber(request.buildingCurrentFuel)} L<br>
                <strong>Tank:</strong> ${formatNumber(request.buildingDieselTankCapacity)} L<br>
                <strong>Low Stock:</strong> ${request.buildingLowStockAlert ? "YES" : "NO"}
            </td>
            <td>${formatNumber(request.estimatedCost)} BDT</td>
            <td><span class="status-badge status-pending">${valueOrDash(request.requestStatus)}</span></td>
            <td>${valueOrDash(request.adminNote)}</td>
            <td>
                <button class="btn primary small-btn" onclick="approveRequest(${request.id})">Approve</button>
                <button class="btn danger small-btn" onclick="rejectRequest(${request.id})">Reject</button>
            </td>
        `;

        tableBody.appendChild(row);
    });
}

async function approveRequest(requestId) {
    const pumpIdInput = prompt(
        "Enter pump ID for this approval.\n\n" +
        "The approved request needs an assigned pump for collection."
    );

    if (!pumpIdInput) {
        return;
    }

    const pumpId = Number(pumpIdInput);

    if (!pumpId || pumpId <= 0) {
        showMessage("Valid pump ID is required for approval.", "error-text");
        return;
    }

    const adminNote = prompt("Write approval note:", "Approved extra diesel above weekly allocation.") || "Approved extra diesel above weekly allocation.";

    try {
        const response = await fetch("http://localhost:8081/api/admin/fuel-requests/" + requestId + "/approve", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                pumpId: pumpId,
                adminNote: adminNote
            })
        });

        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");
            return;
        }

        showMessage("Request approved successfully.", "success-text");
        loadAllocationRequests();

    } catch (error) {
        showMessage("Server connection failed while approving request.", "error-text");
    }
}

async function rejectRequest(requestId) {
    const adminNote = prompt("Write rejection reason:", "Rejected extra diesel above weekly allocation.");

    if (!adminNote) {
        return;
    }

    try {
        const response = await fetch("http://localhost:8081/api/admin/fuel-requests/" + requestId + "/reject", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                adminNote: adminNote
            })
        });

        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");
            return;
        }

        showMessage("Request rejected successfully.", "success-text");
        loadAllocationRequests();

    } catch (error) {
        showMessage("Server connection failed while rejecting request.", "error-text");
    }
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

function showMessage(message, className) {
    const messageElement = document.getElementById("allocationRequestsMessage");

    if (messageElement) {
        messageElement.className = className;
        messageElement.innerText = message;
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

function formatNumber(value) {
    const numberValue = Number(value);

    if (Number.isNaN(numberValue)) {
        return "0.00";
    }

    return numberValue.toFixed(2);
}