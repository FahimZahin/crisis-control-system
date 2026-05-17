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
                <td>${request.collectionCode || "-"}</td>
                <td>${request.userName || "-"}</td>
                <td>${request.phoneNumber || request.hospitalContactNumber || "-"}</td>
                <td>${renderRequestFullInfo(request)}</td>
                <td>${request.fuelType || "-"}</td>
                <td>${request.requestedLiter || "-"} L</td>
                <td>${request.estimatedCost || "-"} BDT</td>
                <td>${request.requestStatus || "-"}</td>
                <td>
                    <button class="btn primary tiny-btn" onclick="fillCodeAndCollect('${request.collectionCode}')">
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

function renderRequestFullInfo(request) {
    if (request.requestSource === "HOSPITAL_GENERATOR") {
        return `
            <strong>HOSPITAL GENERATOR DIESEL</strong><br>
            Hospital: ${valueOrDash(request.hospitalName)}<br>
            Registration: ${valueOrDash(request.hospitalRegistrationNumber)}<br>
            Address: ${valueOrDash(request.hospitalAddress)}<br>
            Affected Thana: ${valueOrDash(request.affectedThana)}<br>
            Generator: ${valueOrDash(request.generatorCapacity)}<br>
            Urgency: ${valueOrDash(request.hospitalUrgencyLevel)}<br>
            Reason: ${valueOrDash(request.hospitalReason)}<br>
            Contact: ${valueOrDash(request.hospitalContactNumber)}
        `;
    }

    const isEmergencyRequest = request.requestSource === "EMERGENCY"
        && request.emergencyProfileId !== null
        && request.emergencyProfileId !== undefined;

    if (isEmergencyRequest) {
        return `
            <strong>EMERGENCY VEHICLE</strong><br>
            Type: ${valueOrDash(request.emergencyVehicleType)}<br>
            Vehicle No: ${valueOrDash(request.emergencyVehicleNumber)}<br>
            Organization: ${valueOrDash(request.emergencyOrganizationName)}<br>
            Authority: ${valueOrDash(request.emergencyAuthorityName || request.userName)}<br>
            Driver: ${valueOrDash(request.emergencyDriverName)}<br>
            Driver License: ${valueOrDash(request.emergencyDriverLicenseNumber)}<br>
            Assigned Area: ${valueOrDash(request.emergencyAssignedArea)}<br>
            Verification ID: ${valueOrDash(request.emergencyVerificationId)}<br>
            Reason: ${valueOrDash(request.emergencyReason)}
        `;
    }

    return `
        <strong>NORMAL VEHICLE</strong><br>
        Brand: ${valueOrDash(request.vehicleBrand)}<br>
        Model: ${valueOrDash(request.vehicleModel)}<br>
        Plate: ${valueOrDash(request.vehicleNumberPlate)}<br>
        Vehicle Type: ${valueOrDash(request.vehicleType)}<br>
        Owner: ${valueOrDash(request.userName)}<br>
        Phone: ${valueOrDash(request.phoneNumber)}
    `;
}

function fillCodeAndCollect(collectionCode) {
    if (!collectionCode || collectionCode === "null" || collectionCode === "undefined" || collectionCode === "-") {
        showMessage("collectionMessage", "This request has no collection code.", "error-text");
        return;
    }

    document.getElementById("collectionCode").value = collectionCode;
}

async function collectByManualCode() {
    if (!currentPump) {
        showMessage("collectionMessage", "Pump profile not loaded.", "error-text");
        return;
    }

    const collectionCode = document.getElementById("collectionCode").value.trim();

    if (!collectionCode) {
        showMessage("collectionMessage", "Please enter collection code.", "error-text");
        return;
    }

    const confirmed = confirm("Verify this collection code and mark fuel as collected?");

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
            showMessage("collectionMessage", "Fuel collection verified successfully. Stock deducted.", "success-text");
            document.getElementById("collectionCode").value = "";
            loadPumpAndRequests();
        } else {
            showMessage("collectionMessage", getErrorMessage(result), "error-text");
        }

    } catch (error) {
        showMessage("collectionMessage", "Server connection failed while verifying collection.", "error-text");
    }
}

function valueOrDash(value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    return value;
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

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            localStorage.clear();
            window.location.href = "login.html";
        });
    }
}