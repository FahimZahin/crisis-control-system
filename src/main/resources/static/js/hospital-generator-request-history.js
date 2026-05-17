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
            loggedInUser = profile;
            localStorage.setItem("loggedInUser", JSON.stringify(profile));
        }

    } catch (error) {
        // History table will still try to load below.
    }
}

async function loadHospitalHistory() {
    const userId = loggedInUser.userId || localStorage.getItem("userId");
    const tableBody = document.getElementById("hospitalHistoryBody");

    if (!userId) {
        tableBody.innerHTML = `<tr><td colspan="11">User ID not found. Please login again.</td></tr>`;
        return;
    }

    await refreshHospitalProfileOnly();

    try {
        const response = await fetch("http://localhost:8081/api/hospital-generator-fuel-requests/user/" + userId + "?time=" + Date.now());
        hospitalRequests = await response.json();

        if (!response.ok) {
            tableBody.innerHTML = `<tr><td colspan="11">Failed to load request history.</td></tr>`;
            return;
        }

        updateSummary();
        renderHistoryTable();
        showMessage("History refreshed.", "success-text");

    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="11">Server connection failed.</td></tr>`;
    }
}

function updateSummary() {
    document.getElementById("totalHospitalRequests").innerText = hospitalRequests.length;
    document.getElementById("historyCurrentReserve").innerText = valueOrDash(loggedInUser.hospitalCurrentDieselReserve);
    document.getElementById("historyBackupHours").innerText = valueOrDash(loggedInUser.hospitalEstimatedBackupHours) + " hours";
    document.getElementById("historyDieselStatus").innerText = valueOrDash(loggedInUser.hospitalDieselStatus);
}

function renderHistoryTable() {
    const tableBody = document.getElementById("hospitalHistoryBody");

    if (hospitalRequests.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="11">No generator diesel request found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = "";

    hospitalRequests.forEach(function (request) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${request.id}</td>
            <td>${valueOrDash(request.affectedThana)}</td>
            <td>${valueOrDash(request.generatorCapacity)}</td>
            <td>${valueOrDash(request.hospitalUrgencyLevel)}</td>
            <td>${valueOrDash(request.requestedLiter)} L</td>
            <td>${valueOrDash(request.estimatedCost)} BDT</td>
            <td><span class="status-badge ${getStatusClass(request.requestStatus)}">${request.requestStatus}</span></td>
            <td>
                <strong>${valueOrDash(request.pumpName)}</strong><br>
                ${valueOrDash(request.pumpAddress)}
            </td>
            <td><span class="collection-code">${valueOrDash(request.collectionCode)}</span></td>
            <td>
                <strong>Reserve:</strong> ${valueOrDash(request.hospitalCurrentDieselReserve)} L<br>
                <strong>Backup:</strong> ${valueOrDash(request.hospitalEstimatedBackupHours)} hours<br>
                <strong>Status:</strong> ${valueOrDash(request.hospitalDieselStatus)}
            </td>
            <td>${valueOrDash(request.adminNote)}</td>
        `;

        tableBody.appendChild(row);
    });
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
    const element = document.getElementById("hospitalHistoryMessage");

    if (element) {
        element.className = className;
        element.innerText = message;
    }
}

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            localStorage.clear();
        });
    }
}