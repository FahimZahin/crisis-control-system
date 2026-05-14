const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    setupLogout();
    loadFuelRequestHistory();

    document.getElementById("refreshRequestsBtn").addEventListener("click", function () {
        loadFuelRequestHistory();
    });
});

async function loadFuelRequestHistory() {
    const userId = loggedInUser.userId || localStorage.getItem("userId");
    const tableBody = document.getElementById("fuelRequestHistoryBody");

    try {
        const response = await fetch("http://localhost:8081/api/fuel-requests/user/" + userId);
        const requests = await response.json();

        if (!response.ok) {
            tableBody.innerHTML = `<tr><td colspan="10">Failed to load fuel requests.</td></tr>`;
            return;
        }

        if (requests.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="10">No fuel request submitted yet.</td></tr>`;
            return;
        }

        tableBody.innerHTML = "";

        requests.forEach(function (request) {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${request.id}</td>
                <td>${request.vehicleBrand} ${request.vehicleModel}<br><small>${request.vehicleNumberPlate}</small></td>
                <td>${request.fuelType}</td>
                <td>${request.fuelLevelStatus || "-"}</td>
                <td>${request.requestedLiter}</td>
                <td>${request.estimatedCost} BDT</td>
                <td><span class="status-badge ${getStatusClass(request.requestStatus)}">${request.requestStatus}</span></td>
                <td>${request.pumpName}<br><small>${request.pumpAddress}</small></td>
                <td>${request.adminNote || "-"}</td>
                <td>${formatDate(request.createdAt)}</td>
            `;

            tableBody.appendChild(row);
        });

    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="10">Server connection failed.</td></tr>`;
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
        });
    }
}