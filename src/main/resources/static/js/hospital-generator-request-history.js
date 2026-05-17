const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

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

async function loadHospitalHistory() {
    const userId = loggedInUser.userId || localStorage.getItem("userId");
    const tableBody = document.getElementById("hospitalHistoryBody");

    if (!userId) {
        tableBody.innerHTML = `<tr><td colspan="10">User ID not found. Please login again.</td></tr>`;
        return;
    }

    try {
        const response = await fetch("http://localhost:8081/api/hospital-generator-fuel-requests/user/" + userId);
        hospitalRequests = await response.json();

        if (!response.ok) {
            tableBody.innerHTML = `<tr><td colspan="10">Failed to load request history.</td></tr>`;
            return;
        }

        updateSummary();
        renderHistoryTable();

    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="10">Server connection failed.</td></tr>`;
    }
}

function updateSummary() {
    document.getElementById("totalHospitalRequests").innerText = hospitalRequests.length;

    document.getElementById("pendingHospitalRequests").innerText = hospitalRequests.filter(function (request) {
        return request.requestStatus === "PENDING";
    }).length;

    document.getElementById("approvedHospitalRequests").innerText = hospitalRequests.filter(function (request) {
        return request.requestStatus === "APPROVED";
    }).length;

    document.getElementById("collectedHospitalRequests").innerText = hospitalRequests.filter(function (request) {
        return request.requestStatus === "COLLECTED";
    }).length;
}

function renderHistoryTable() {
    const tableBody = document.getElementById("hospitalHistoryBody");

    if (hospitalRequests.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="10">No generator diesel request found.</td></tr>`;
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

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            localStorage.clear();
        });
    }
}