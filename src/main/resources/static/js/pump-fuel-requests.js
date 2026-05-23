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
    if (request.requestSource === "HOSPITAL_GENERATOR") {
        return `
            <strong>HOSPITAL GENERATOR</strong><br>
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

    return `
        <strong>NORMAL VEHICLE</strong><br>
        ${valueOrDash(request.vehicleBrand)} ${valueOrDash(request.vehicleModel)}<br>
        Plate: ${valueOrDash(request.vehicleNumberPlate)}<br>
        Odometer: ${valueOrDash(request.requestOdometerReading)} km<br>
        Remaining: ${valueOrDash(request.estimatedRemainingRangeKm)} km
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
    const verifiedNumberPlate = document.getElementById("verifiedNumberPlate").value.trim();
    const currentOdometerReading = document.getElementById("collectionOdometerReading").value;

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
        collectionCode: collectionCode,
        verifiedNumberPlate: verifiedNumberPlate,
        currentOdometerReading: currentOdometerReading ? Number(currentOdometerReading) : null
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
            showMessage("collectionMessage", "Fuel collection verified successfully. Stock deducted and odometer updated if vehicle request.", "success-text");
            document.getElementById("collectionCode").value = "";
            document.getElementById("verifiedNumberPlate").value = "";
            document.getElementById("collectionOdometerReading").value = "";
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
                <strong>Token</strong><br>
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
                <small>Only collection token is required for this request type.</small>
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
                    Collect Now
                </button>
            </div>
        </div>
    `;
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

function isNormalVehicleRequest(request) {
    return request.requestSource === "VEHICLE_OWNER"
        || request.vehicleNumberPlate !== null
        && request.vehicleNumberPlate !== undefined
        && request.vehicleNumberPlate !== "";
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
function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            localStorage.clear();
            window.location.href = "login.html";
        });
    }
}