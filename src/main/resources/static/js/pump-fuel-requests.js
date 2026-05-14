const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

let currentPump = null;

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    if (loggedInUser.role !== "PUMP_AUTHORITY") {
        alert("Only pump authority should access this page.");
    }

    setupLogout();
    setupEvents();
    loadPumpAndRequests();
});

function setupEvents() {
    document.getElementById("collectionCodeForm").addEventListener("submit", function (event) {
        event.preventDefault();
        collectByManualCode();
    });

    document.getElementById("refreshAssignedRequestsBtn").addEventListener("click", function () {
        loadPumpAndRequests();
    });
}

async function loadPumpAndRequests() {
    const userId = loggedInUser.userId || localStorage.getItem("userId");

    try {
        let response = await fetch("http://localhost:8081/api/pumps/user/" + userId);
        let pump = await response.json();

        if (!response.ok) {
            response = await fetch("http://localhost:8081/api/pumps/create-from-user/" + userId, {
                method: "POST"
            });

            pump = await response.json();
        }

        if (!response.ok) {
            showMessage("collectionMessage", getErrorMessage(pump), "error-text");
            return;
        }

        currentPump = pump;
        fillPumpSummary(pump);
        loadAssignedRequests();

    } catch (error) {
        showMessage("collectionMessage", "Server connection failed while loading pump profile.", "error-text");
    }
}

function fillPumpSummary(pump) {
    document.getElementById("pumpNameSummary").innerText = valueOrDash(pump.pumpName);
    document.getElementById("pumpStatusSummary").innerText = valueOrDash(pump.pumpStatus);
    document.getElementById("totalStockSummary").innerText = valueOrDash(pump.totalCurrentStock);
}

async function loadAssignedRequests() {
    const tableBody = document.getElementById("assignedRequestsTableBody");

    if (!currentPump) {
        tableBody.innerHTML = `<tr><td colspan="10">Pump profile not loaded.</td></tr>`;
        return;
    }

    try {
        const response = await fetch("http://localhost:8081/api/pumps/" + currentPump.id + "/assigned-fuel-requests");
        const requests = await response.json();

        if (!response.ok) {
            tableBody.innerHTML = `<tr><td colspan="10">Failed to load assigned requests.</td></tr>`;
            return;
        }

        document.getElementById("approvedRequestCount").innerText = requests.length;

        if (requests.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="10">No approved fuel requests assigned to this pump.</td></tr>`;
            return;
        }

        tableBody.innerHTML = "";

        requests.forEach(function (request) {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${request.id}</td>
                <td><strong>${request.collectionCode || "-"}</strong></td>
                <td>${request.userName || "-"}</td>
                <td>${request.phoneNumber || "-"}</td>
                <td>${renderRequestVehicleFullInfo(request)}</td>
                <td>${request.fuelType || "-"}</td>
                <td>${request.requestedLiter || "-"}</td>
                <td>${request.estimatedCost || "-"} BDT</td>
                <td><span class="status-badge status-approved">${request.requestStatus || "-"}</span></td>
                <td>
                    <button class="btn primary tiny-btn" onclick="fillCodeAndCollect('${request.collectionCode || ""}')">
                        Collect
                    </button>
                </td>
            `;

            tableBody.appendChild(row);
        });

    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="10">Server connection failed.</td></tr>`;
    }
}

function renderRequestVehicleFullInfo(request) {
    const isEmergencyRequest =
        request.requestSource === "EMERGENCY" &&
        request.emergencyProfileId !== null &&
        request.emergencyProfileId !== undefined;

    if (isEmergencyRequest) {
        return `
            <span class="emergency-source-badge">EMERGENCY VEHICLE</span><br>
            <strong>Type:</strong> ${valueOrDash(request.emergencyVehicleType)}<br>
            <strong>Vehicle No:</strong> ${valueOrDash(request.emergencyVehicleNumber)}<br>
            <strong>Organization:</strong> ${valueOrDash(request.emergencyOrganizationName)}<br>
            <strong>Authority:</strong> ${valueOrDash(request.emergencyAuthorityName || request.userName)}<br>
            <strong>Driver:</strong> ${valueOrDash(request.emergencyDriverName)}<br>
            <strong>Driver License:</strong> ${valueOrDash(request.emergencyDriverLicenseNumber)}<br>
            <strong>Assigned Area:</strong> ${valueOrDash(request.emergencyAssignedArea)}<br>
            <strong>Verification ID:</strong> ${valueOrDash(request.emergencyVerificationId)}<br>
            <strong>Reason:</strong> ${valueOrDash(request.emergencyReason)}
        `;
    }

    return `
        <span class="normal-source-badge">NORMAL VEHICLE</span><br>
        <strong>Brand:</strong> ${valueOrDash(request.vehicleBrand)}<br>
        <strong>Model:</strong> ${valueOrDash(request.vehicleModel)}<br>
        <strong>Plate:</strong> ${valueOrDash(request.vehicleNumberPlate)}<br>
        <strong>Vehicle Type:</strong> ${valueOrDash(request.vehicleType)}<br>
        <strong>Owner:</strong> ${valueOrDash(request.userName)}<br>
        <strong>Phone:</strong> ${valueOrDash(request.phoneNumber)}
    `;
}

function fillCodeAndCollect(collectionCode) {
    if (!collectionCode || collectionCode === "null" || collectionCode === "undefined" || collectionCode === "-") {
        showMessage("collectionMessage", "This request has no collection code. Create a new request or approve it again.", "error-text");
        return;
    }

    document.getElementById("collectionCode").value = collectionCode;
    collectByManualCode();
}

async function collectByManualCode() {
    if (!currentPump) {
        showMessage("collectionMessage", "Pump profile not loaded.", "error-text");
        return;
    }

    const collectionCode = document.getElementById("collectionCode").value.trim().toUpperCase();

    if (!collectionCode) {
        showMessage("collectionMessage", "Please enter collection code.", "error-text");
        return;
    }

    const confirmed = confirm("Verify and mark this fuel request as collected?");

    if (!confirmed) {
        return;
    }

    const data = {
        pumpId: currentPump.id,
        collectionCode: collectionCode
    };

    try {
        const response = await fetch("http://localhost:8081/api/pumps/fuel-requests/collect", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            showMessage(
                "collectionMessage",
                "Fuel collection successful. Stock deducted and request marked COLLECTED.",
                "success-text"
            );

            document.getElementById("collectionCode").value = "";
            loadPumpAndRequests();
        } else {
            showMessage("collectionMessage", getErrorMessage(result), "error-text");
        }

    } catch (error) {
        showMessage("collectionMessage", "Server connection failed while verifying collection code.", "error-text");
    }
}

function showMessage(id, message, className) {
    const element = document.getElementById(id);

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

function valueOrDash(value) {
    if (
        value === null ||
        value === undefined ||
        value === "" ||
        value === "null" ||
        value === "undefined"
    ) {
        return "-";
    }

    return value;
}

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            localStorage.clear();
        });
    }
}