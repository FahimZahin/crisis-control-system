const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    setupLogout();
    loadEmergencyFuelRequestHistory();

    document.getElementById("refreshEmergencyFuelRequestsBtn").addEventListener("click", function () {
        loadEmergencyFuelRequestHistory();
    });
});

async function loadEmergencyFuelRequestHistory() {
    const userId = loggedInUser.userId || localStorage.getItem("userId");
    const tableBody = document.getElementById("emergencyFuelHistoryBody");

    try {
        const response = await fetch("http://localhost:8081/api/emergency-fuel-requests/user/" + userId);
        const requests = await response.json();

        if (!response.ok) {
            tableBody.innerHTML = `<tr><td colspan="12">Failed to load emergency fuel requests.</td></tr>`;
            return;
        }

        if (requests.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="12">No emergency fuel request submitted yet.</td></tr>`;
            return;
        }

        tableBody.innerHTML = "";

        requests.forEach(function (request) {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${request.id}</td>
                <td><span class="emergency-source-badge">${request.requestSource}</span></td>
                <td>${request.emergencyVehicleType}<br><small>${request.emergencyVehicleNumber}</small></td>
                <td>${request.fuelType}</td>
                <td>${request.requestedLiter}</td>
                <td>${request.estimatedCost} BDT</td>
                <td><span class="status-badge ${getStatusClass(request.requestStatus)}">${request.requestStatus}</span></td>
                <td>${renderCollectionCode(request)}</td>
                <td>${request.pumpName}<br><small>${request.pumpAddress}</small></td>
                <td>${request.emergencyReason || "-"}</td>
                <td>${formatDate(request.collectedAt)}</td>
                <td>${formatDate(request.createdAt)}</td>
            `;

            tableBody.appendChild(row);
        });

    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="12">Server connection failed.</td></tr>`;
    }
}

function renderCollectionCode(request) {
    if (request.requestStatus === "APPROVED" && request.collectionCode) {
        return `<strong class="collection-code">${request.collectionCode}</strong>`;
    }

    if (request.requestStatus === "COLLECTED" && request.collectionCode) {
        return `<strong class="collection-code used-code">${request.collectionCode}</strong><br><small>Used</small>`;
    }

    return "-";
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

function formatDate(dateValue) {
    if (!dateValue) {
        return "-";
    }

    return dateValue.replace("T", " ").substring(0, 19);
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