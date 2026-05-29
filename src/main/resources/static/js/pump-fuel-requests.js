const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

let currentPump = null;
let verificationStates = {};

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

    document.getElementById("paymentMethod").addEventListener("change", function () {
        toggleBkashTransactionField();
    });

    toggleBkashTransactionField();
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
        window.assignedFuelRequests = requests;

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
                <td>${renderVerificationActionPanel(request)}</td>  
            `;

            tableBody.appendChild(row);
        });

    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="10">Server connection failed.</td></tr>`;
    }
}

function renderRequestFullInfo(request) {
    if (request.requestSource === "BUILDING_GENERATOR") {
        return `
            <strong>BUILDING AUTHORITY</strong><br>
            Building: ${valueOrDash(request.buildingName)}<br>
            Holding: ${valueOrDash(request.buildingHoldingNumber)}<br>
            Thana: ${valueOrDash(request.buildingThana)}<br>
            Generator: ${valueOrDash(request.buildingGeneratorPower)}<br>
            Current Stock: ${valueOrDash(request.buildingCurrentFuel)} L<br>
            Weekly Allocation: ${valueOrDash(request.buildingWeeklyAllocationLiter)} L
        `;
    }

    if (request.requestSource === "HOSPITAL_GENERATOR") {
        return `
            <strong>HOSPITAL AUTHORITY</strong><br>
            Hospital: ${valueOrDash(request.hospitalName)}<br>
            Thana: ${valueOrDash(request.affectedThana)}<br>
            Backup: ${valueOrDash(request.hospitalEstimatedBackupHours)} hrs<br>
            Reserve: ${valueOrDash(request.hospitalCurrentDieselReserve)} L
        `;
    }

    const isEmergencyRequest = request.requestSource === "EMERGENCY"
        && request.emergencyProfileId !== null
        && request.emergencyProfileId !== undefined;

    if (isEmergencyRequest) {
        return `
            <strong>EMERGENCY VEHICLE</strong><br>
            Vehicle: ${valueOrDash(request.emergencyVehicleNumber)}<br>
            Organization: ${valueOrDash(request.emergencyOrganizationName)}<br>
            Area: ${valueOrDash(request.emergencyAssignedArea)}
        `;
    }

    if (request.requestSource === "VEHICLE_OWNER") {
        return `
            <strong>NORMAL VEHICLE</strong><br>
            ${valueOrDash(request.vehicleBrand)} ${valueOrDash(request.vehicleModel)}<br>
            Plate: ${valueOrDash(request.vehicleNumberPlate)}<br>
            Odometer: ${valueOrDash(request.requestOdometerReading)} km<br>
            Remaining: ${valueOrDash(request.estimatedRemainingRangeKm)} km
        `;
    }

    return `
        <strong>${valueOrDash(request.requestSource)}</strong><br>
        Fuel request information unavailable.
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

    const collectionCode = document.getElementById("collectionCode").value.trim().toUpperCase();
    const verifiedNumberPlate = document.getElementById("verifiedNumberPlate").value.trim();
    const currentOdometerReading = document.getElementById("collectionOdometerReading").value;
    const paymentMethod = document.getElementById("paymentMethod").value;
    const bkashTransactionId = document.getElementById("bkashTransactionId").value.trim();

    if (!collectionCode) {
        showMessage("collectionMessage", "Please enter collection code.", "error-text");
        return;
    }

    if (!paymentMethod) {
        showMessage("collectionMessage", "Please select payment method.", "error-text");
        return;
    }

    if (paymentMethod === "BKASH" && !bkashTransactionId) {
        showMessage("collectionMessage", "bKash transaction ID is required for bKash payment.", "error-text");
        return;
    }

    const request = findRequestByCollectionCode(collectionCode);

    if (!request) {
        showMessage(
            "collectionMessage",
            "This code is not in your approved assigned request list. It may be invalid, already collected, or assigned to another pump.",
            "error-text"
        );
        return;
    }

    if (request.requestStatus !== "APPROVED") {
        showMessage("collectionMessage", "This request is not approved or already collected.", "error-text");
        return;
    }

    if (isNormalVehicleRequest(request)) {
        if (!verifiedNumberPlate) {
            showMessage("collectionMessage", "Verified number plate is required for normal vehicle fuel collection.", "error-text");
            return;
        }

        if (!currentOdometerReading) {
            showMessage("collectionMessage", "Current odometer reading is required for normal vehicle fuel collection.", "error-text");
            return;
        }
    }

    const confirmMessage =
        "Confirm one-time fuel collection?\n\n" +
        "Request ID: " + request.id + "\n" +
        "User: " + valueOrDash(request.userName) + "\n" +
        "Fuel: " + valueOrDash(request.fuelType) + "\n" +
        "Liter: " + valueOrDash(request.requestedLiter) + " L\n" +
        "Payment: " + paymentMethod + "\n" +
        "bKash Transaction ID: " + (paymentMethod === "BKASH" ? bkashTransactionId : "-") + "\n" +
        "Code: " + collectionCode + "\n\n" +
        "After confirmation, this code cannot be used again.";

    const confirmed = confirm(confirmMessage);

    if (!confirmed) {
        return;
    }

    const data = {
        pumpId: currentPump.id,
        collectionCode: collectionCode,
        verifiedNumberPlate: verifiedNumberPlate,
        currentOdometerReading: currentOdometerReading ? Number(currentOdometerReading) : null,
        paymentMethod: paymentMethod,
        bkashTransactionId: paymentMethod === "BKASH" ? bkashTransactionId : null
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
                "Fuel collection completed successfully. This collection code is now used and cannot be reused.",
                "success-text"
            );

            document.getElementById("collectionCode").value = "";
            document.getElementById("verifiedNumberPlate").value = "";
            document.getElementById("collectionOdometerReading").value = "";
            document.getElementById("paymentMethod").value = "";
            document.getElementById("bkashTransactionId").value = "";
            toggleBkashTransactionField();

            loadPumpAndRequests();
        } else {
            showMessage("collectionMessage", getErrorMessage(result), "error-text");
        }

    } catch (error) {
        showMessage("collectionMessage", "Server connection failed while verifying collection.", "error-text");
    }
}

function renderVerificationActionPanel(request) {
    const requestId = request.id;
    ensureVerificationState(requestId);

    const isNormalVehicle = isNormalVehicleRequest(request);

    return `
        <div class="pump-verification-panel">
            <div>
                <strong>Collection Token</strong><br>
                ${renderMatchButtons(requestId, "token")}
                <small id="tokenStatus-${requestId}">${getVerificationLabel(requestId, "token")}</small>
            </div>

            ${isNormalVehicle ? `
                <div style="margin-top: 8px;">
                    <strong>Number Plate</strong><br>
                    ${renderMatchButtons(requestId, "plate")}
                    <small id="plateStatus-${requestId}">${getVerificationLabel(requestId, "plate")}</small>
                </div>

                <div style="margin-top: 8px;">
                    <strong>Odometer</strong><br>
                    ${renderMatchButtons(requestId, "odometer")}
                    <small id="odometerStatus-${requestId}">${getVerificationLabel(requestId, "odometer")}</small>
                </div>
            ` : `
                <div style="margin-top: 8px;">
                    <small>
                        Only collection token is required for ${getRequestAuthorityLabel(request)} request.
                    </small>
                </div>
            `}

            <div style="margin-top: 10px;">
                <button class="btn primary tiny-btn" onclick="markEverythingOkay(${requestId})">
                    Everything Okay
                </button>

                <button class="btn danger tiny-btn" onclick="markEverythingMismatched(${requestId})">
                    Everything Mismatched
                </button>
            </div>

            <div style="margin-top: 8px;">
                <button class="btn primary tiny-btn" onclick="collectVerifiedRequest(${requestId})">
                    Use Code & Collect
                </button>
            </div>
        </div>
    `;
}

function getRequestAuthorityLabel(request) {
    if (!request || !request.requestSource) {
        return "this";
    }

    if (request.requestSource === "BUILDING_GENERATOR") {
        return "building authority";
    }

    if (request.requestSource === "HOSPITAL_GENERATOR") {
        return "hospital authority";
    }

    if (request.requestSource === "EMERGENCY") {
        return "emergency authority";
    }

    if (request.requestSource === "VEHICLE_OWNER") {
        return "vehicle owner";
    }

    return String(request.requestSource).replaceAll("_", " ").toLowerCase();
}

function renderMatchButtons(requestId, fieldName) {
    return `
        <button class="btn primary tiny-btn" onclick="setVerificationStatus(${requestId}, '${fieldName}', 'MATCHED')">
            Match
        </button>
        <button class="btn danger tiny-btn" onclick="setVerificationStatus(${requestId}, '${fieldName}', 'MISMATCHED')">
            Mismatch
        </button>
    `;
}

function ensureVerificationState(requestId) {
    if (!verificationStates[requestId]) {
        verificationStates[requestId] = {
            token: null,
            plate: null,
            odometer: null
        };
    }
}

function setVerificationStatus(requestId, fieldName, status) {
    ensureVerificationState(requestId);

    verificationStates[requestId][fieldName] = status;

    const statusElement = document.getElementById(fieldName + "Status-" + requestId);

    if (statusElement) {
        statusElement.innerText = getVerificationLabel(requestId, fieldName);
        statusElement.className = status === "MATCHED" ? "success-text" : "error-text";
    }
}

function getVerificationLabel(requestId, fieldName) {
    ensureVerificationState(requestId);

    const status = verificationStates[requestId][fieldName];

    if (status === "MATCHED") {
        return "Matched";
    }

    if (status === "MISMATCHED") {
        return "Mismatched";
    }

    return "Not checked";
}

function markEverythingOkay(requestId) {
    const request = findRequestById(requestId);

    if (!request) {
        showMessage("collectionMessage", "Request not found.", "error-text");
        return;
    }

    setVerificationStatus(requestId, "token", "MATCHED");

    if (isNormalVehicleRequest(request)) {
        setVerificationStatus(requestId, "plate", "MATCHED");
        setVerificationStatus(requestId, "odometer", "MATCHED");
    }

    fillCollectionFormFromRequest(request);
    showMessage("collectionMessage", "All verification items marked as matched.", "success-text");
}

function markEverythingMismatched(requestId) {
    const request = findRequestById(requestId);

    if (!request) {
        showMessage("collectionMessage", "Request not found.", "error-text");
        return;
    }

    setVerificationStatus(requestId, "token", "MISMATCHED");

    if (isNormalVehicleRequest(request)) {
        setVerificationStatus(requestId, "plate", "MISMATCHED");
        setVerificationStatus(requestId, "odometer", "MISMATCHED");
    }

    document.getElementById("collectionCode").value = "";
    document.getElementById("verifiedNumberPlate").value = "";
    document.getElementById("collectionOdometerReading").value = "";

    showMessage("collectionMessage", "All verification items marked as mismatched. Collection is blocked.", "error-text");
}

function collectVerifiedRequest(requestId) {
    const request = findRequestById(requestId);

    if (!request) {
        showMessage("collectionMessage", "Request not found.", "error-text");
        return;
    }

    ensureVerificationState(requestId);

    const state = verificationStates[requestId];

    if (state.token !== "MATCHED") {
        showMessage("collectionMessage", "Collection token must be matched first.", "error-text");
        return;
    }

    if (isNormalVehicleRequest(request)) {
        if (state.plate !== "MATCHED") {
            showMessage("collectionMessage", "Vehicle number plate must be matched first.", "error-text");
            return;
        }

        if (state.odometer !== "MATCHED") {
            showMessage("collectionMessage", "Odometer reading must be matched first.", "error-text");
            return;
        }
    }

    fillCollectionFormFromRequest(request);
    collectByManualCode();
}

function fillCollectionFormFromRequest(request) {
    document.getElementById("collectionCode").value = request.collectionCode || "";

    if (isNormalVehicleRequest(request)) {
        document.getElementById("verifiedNumberPlate").value = request.vehicleNumberPlate || "";
        document.getElementById("collectionOdometerReading").value = request.requestOdometerReading || "";
    } else {
        document.getElementById("verifiedNumberPlate").value = "";
        document.getElementById("collectionOdometerReading").value = "";
    }
}

function findRequestById(requestId) {
    return window.assignedFuelRequests.find(function (request) {
        return Number(request.id) === Number(requestId);
    });
}

function findRequestByCollectionCode(collectionCode) {
    if (!window.assignedFuelRequests || !collectionCode) {
        return null;
    }

    return window.assignedFuelRequests.find(function (request) {
        return String(request.collectionCode || "").trim().toUpperCase() === collectionCode.trim().toUpperCase();
    }) || null;
}

function isNormalVehicleRequest(request) {
    return request && request.requestSource === "VEHICLE_OWNER";
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


function renderRequestTime(request) {
    if (!request.createdAt) {
        return "-";
    }

    return formatDateTime(request.createdAt) + " (" + timeAgo(request.createdAt) + ")";
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

function toggleBkashTransactionField() {
    const paymentMethod = document.getElementById("paymentMethod");
    const bkashTransactionBox = document.getElementById("bkashTransactionBox");
    const bkashTransactionId = document.getElementById("bkashTransactionId");

    if (!paymentMethod || !bkashTransactionBox || !bkashTransactionId) {
        return;
    }

    if (paymentMethod.value === "BKASH") {
        bkashTransactionBox.style.display = "block";
        bkashTransactionId.required = true;
    } else {
        bkashTransactionBox.style.display = "none";
        bkashTransactionId.required = false;
        bkashTransactionId.value = "";
    }
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