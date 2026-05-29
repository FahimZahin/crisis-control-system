let loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

let hospitalRequests = [];

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    if (loggedInUser.role !== "HOSPITAL_AUTHORITY") {
        alert("Only Hospital Authority can access this page.");
        window.location.href = "dashboard.html";
        return;
    }

    setupLogout();
    loadHospitalHistory();

    const refreshBtn = document.getElementById("refreshHospitalHistoryBtn");

    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadHospitalHistory);
    }
});

async function refreshHospitalProfileOnly() {
    const userId = loggedInUser.userId || localStorage.getItem("userId");

    if (!userId) {
        return;
    }

    try {
        const response = await fetch("http://localhost:8081/api/hospital-authority/profile/" + userId + "?time=" + Date.now());
        const profile = await response.json();

        if (response.ok) {
            mergeHospitalProfile(profile);
        }

    } catch (error) {
        // History table will still try to load below.
    }
}

function mergeHospitalProfile(profile) {
    loggedInUser.userId = profile.userId || profile.id || loggedInUser.userId || localStorage.getItem("userId");
    loggedInUser.id = profile.id || profile.userId || loggedInUser.id;
    loggedInUser.fullName = profile.fullName || loggedInUser.fullName;
    loggedInUser.phoneNumber = profile.phoneNumber || loggedInUser.phoneNumber;
    loggedInUser.address = profile.address || loggedInUser.address;
    loggedInUser.role = profile.role || loggedInUser.role;
    loggedInUser.status = profile.status || loggedInUser.status;

    loggedInUser.hospitalName = profile.hospitalName || loggedInUser.hospitalName;
    loggedInUser.hospitalRegistrationNumber = profile.hospitalRegistrationNumber || loggedInUser.hospitalRegistrationNumber;
    loggedInUser.hospitalAddress = profile.hospitalAddress || loggedInUser.hospitalAddress;
    loggedInUser.hospitalUnderThana = profile.hospitalUnderThana || profile.thanaOrUpazila || loggedInUser.hospitalUnderThana;
    loggedInUser.thanaOrUpazila = profile.thanaOrUpazila || profile.hospitalUnderThana || loggedInUser.thanaOrUpazila;
    loggedInUser.hospitalGeneratorCapacity = profile.hospitalGeneratorCapacity ?? loggedInUser.hospitalGeneratorCapacity;
    loggedInUser.hospitalDieselTankCapacity = profile.hospitalDieselTankCapacity ?? loggedInUser.hospitalDieselTankCapacity;
    loggedInUser.hospitalCurrentDieselReserve = profile.hospitalCurrentDieselReserve ?? loggedInUser.hospitalCurrentDieselReserve;
    loggedInUser.hospitalEstimatedBackupHours = profile.hospitalEstimatedBackupHours ?? loggedInUser.hospitalEstimatedBackupHours;
    loggedInUser.hospitalDieselStatus = profile.hospitalDieselStatus || loggedInUser.hospitalDieselStatus;
    loggedInUser.emergencyContactNumber = profile.emergencyContactNumber || loggedInUser.emergencyContactNumber;

    loggedInUser.totalIcuUnits = profile.totalIcuUnits ?? loggedInUser.totalIcuUnits ?? 0;
    loggedInUser.acPatientCapacity = profile.acPatientCapacity ?? loggedInUser.acPatientCapacity ?? 0;
    loggedInUser.nonAcPatientCapacity = profile.nonAcPatientCapacity ?? loggedInUser.nonAcPatientCapacity ?? 0;

    localStorage.setItem("loggedInUser", JSON.stringify(loggedInUser));
    localStorage.setItem("userId", loggedInUser.userId || "");
    localStorage.setItem("totalIcuUnits", loggedInUser.totalIcuUnits || "");
    localStorage.setItem("acPatientCapacity", loggedInUser.acPatientCapacity || "");
    localStorage.setItem("nonAcPatientCapacity", loggedInUser.nonAcPatientCapacity || "");
}

async function loadHospitalHistory() {
    const userId = loggedInUser.userId || localStorage.getItem("userId");
    const tableBody = document.getElementById("hospitalHistoryBody");

    if (!userId) {
        tableBody.innerHTML = `<tr><td colspan="16">User ID not found. Please login again.</td></tr>`;
        return;
    }

    await refreshHospitalProfileOnly();

    try {
        const response = await fetch("http://localhost:8081/api/hospital-generator-fuel-requests/user/" + userId + "?time=" + Date.now());
        const data = await response.json();

        if (!response.ok) {
            tableBody.innerHTML = `<tr><td colspan="16">Failed to load request history.</td></tr>`;
            showMessage(getErrorMessage(data), "error-text");
            return;
        }

        hospitalRequests = data || [];

        updateSummary();
        renderHistoryTable();
        showMessage("Hospital generator request history refreshed.", "success-text");

    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="16">Server connection failed.</td></tr>`;
        showMessage("Server connection failed while loading hospital history.", "error-text");
    }
}

function updateSummary() {
    setTextIfExists("totalHospitalRequests", hospitalRequests.length);

    const pending = hospitalRequests.filter(r => r.requestStatus === "PENDING").length;
    const approved = hospitalRequests.filter(r => r.requestStatus === "APPROVED").length;
    const collected = hospitalRequests.filter(r => r.requestStatus === "COLLECTED").length;

    setTextIfExists("pendingHospitalRequests", pending);
    setTextIfExists("approvedHospitalRequests", approved);
    setTextIfExists("collectedHospitalRequests", collected);

    setTextIfExists("historyCurrentReserve", formatNumber(loggedInUser.hospitalCurrentDieselReserve));
    setTextIfExists("historyBackupHours", formatNumber(loggedInUser.hospitalEstimatedBackupHours) + " hours");
    setTextIfExists("historyDieselStatus", valueOrDash(loggedInUser.hospitalDieselStatus));
    setTextIfExists("historyPriorityLevel", resolveCurrentHospitalPriority());
}

function renderHistoryTable() {
    const tableBody = document.getElementById("hospitalHistoryBody");

    if (!hospitalRequests || hospitalRequests.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="16">No generator diesel request found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = "";

    hospitalRequests.forEach(function (request) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${valueOrDash(request.id)}</td>
            <td>${valueOrDash(request.affectedThana)}</td>
            <td>${valueOrDash(request.generatorCapacity)}</td>
            <td>${valueOrDash(request.hospitalUrgencyLevel)}</td>
            <td>${formatPriority(request.hospitalPriorityLevel)}</td>
            <td>${valueOrDash(request.hospitalTotalIcuUnits)}</td>
            <td>${valueOrDash(request.hospitalAcPatientCapacity)}</td>
            <td>${valueOrDash(request.hospitalNonAcPatientCapacity)}</td>
            <td>${formatNumber(request.requestedLiter)} L</td>
            <td>${formatNumber(request.estimatedCost)} BDT</td>
            <td><span class="status-badge ${getStatusClass(request.requestStatus)}">${request.requestStatus}</span></td>
            <td>
                <strong>${valueOrDash(request.pumpName)}</strong><br>
                ${valueOrDash(request.pumpAddress)}
            </td>
            <td><span class="collection-code">${valueOrDash(request.collectionCode)}</span></td>
            <td>
                <strong>Reserve:</strong> ${formatNumber(request.hospitalCurrentDieselReserve)} L<br>
                <strong>Backup:</strong> ${formatNumber(request.hospitalEstimatedBackupHours)} hours<br>
                <strong>Status:</strong> ${valueOrDash(request.hospitalDieselStatus)}
            </td>
            <td>${valueOrDash(request.adminNote)}</td>
            <td>${request.collectedAt ? formatDateTime(request.collectedAt) : "-"}</td>
        `;

        tableBody.appendChild(row);
    });
}

function resolveCurrentHospitalPriority() {
    const dieselStatus = valueOrDash(loggedInUser.hospitalDieselStatus);
    const icu = cleanNumber(loggedInUser.totalIcuUnits);
    const acPatients = cleanNumber(loggedInUser.acPatientCapacity);
    const nonAcPatients = cleanNumber(loggedInUser.nonAcPatientCapacity);
    const totalPatients = acPatients + nonAcPatients;

    if (dieselStatus === "CRITICAL" && icu > 0) {
        return "CRITICAL ICU PRIORITY";
    }

    if (dieselStatus === "CRITICAL" && totalPatients >= 50) {
        return "CRITICAL HIGH PATIENT PRIORITY";
    }

    if (dieselStatus === "CRITICAL") {
        return "CRITICAL STANDARD PRIORITY";
    }

    if (icu > 0 || totalPatients >= 50) {
        return "PATIENT SAFETY PRIORITY";
    }

    return "STANDARD PRIORITY";
}

function formatPriority(priority) {
    if (!priority || priority === "-") {
        return "-";
    }

    return String(priority).replaceAll("_", " ");
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

function setTextIfExists(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.innerText = value;
    }
}

function formatNumber(value) {
    if (value === null || value === undefined || value === "" || value === "-") {
        return "0.00";
    }

    const numberValue = Number(value);

    if (Number.isNaN(numberValue)) {
        return "0.00";
    }

    return numberValue.toFixed(2);
}

function cleanNumber(value) {
    if (value === null || value === undefined || value === "" || value === "-") {
        return 0;
    }

    return Number(String(value).replace("L", "").replace("hours", "").replace("kVA", "").replace("KVA", "").trim()) || 0;
}

function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    return String(value).replace("T", " ").substring(0, 16);
}

function showMessage(message, className) {
    const element = document.getElementById("hospitalHistoryMessage");

    if (element) {
        element.className = className;
        element.innerText = message;
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

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (!logoutBtn) {
        return;
    }

    logoutBtn.addEventListener("click", function () {
        localStorage.clear();
    });
}