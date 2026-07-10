const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

let emergencyProfiles = [];

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    if (loggedInUser.role !== "ADMIN") {
        alert("Only admin should access emergency vehicle approvals.");
    }

    setupLogout();
    loadEmergencyProfiles();

    document.getElementById("refreshEmergencyProfilesBtn").addEventListener("click", function () {
        loadEmergencyProfiles();
    });
});

async function loadEmergencyProfiles() {
    const tableBody = document.getElementById("emergencyProfilesTableBody");

    try {
        const response = await fetch("http://localhost:8081/api/admin/emergency-vehicles");
        emergencyProfiles = await response.json();

        if (!response.ok) {
            tableBody.innerHTML = `<tr><td colspan="11">Failed to load profiles.</td></tr>`;
            return;
        }

        updateSummary();
        renderProfiles();

    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="11">Server connection failed.</td></tr>`;
    }
}

function updateSummary() {
    document.getElementById("totalProfiles").innerText = emergencyProfiles.length;

    document.getElementById("pendingProfiles").innerText = emergencyProfiles.filter(function (profile) {
        return profile.approvalStatus === "PENDING_APPROVAL";
    }).length;

    document.getElementById("approvedProfiles").innerText = emergencyProfiles.filter(function (profile) {
        return profile.approvalStatus === "APPROVED";
    }).length;

    document.getElementById("rejectedProfiles").innerText = emergencyProfiles.filter(function (profile) {
        return profile.approvalStatus === "REJECTED";
    }).length;
}

function renderProfiles() {
    const tableBody = document.getElementById("emergencyProfilesTableBody");

    if (emergencyProfiles.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="11">No emergency vehicle profiles found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = "";

    emergencyProfiles.forEach(function (profile) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${profile.id}</td>
            <td>${profile.authorityName}<br><small>${profile.phoneNumber}</small></td>
            <td>${profile.organizationName}</td>
            <td>${profile.emergencyVehicleType}</td>
            <td>${profile.vehicleNumber}</td>
            <td>${profile.driverName}<br><small>${profile.driverLicenseNumber}</small></td>
            <td>${profile.assignedArea}</td>
            <td>${profile.verificationId}</td>
            <td><span class="status-badge ${getEmergencyStatusClass(profile.approvalStatus)}">${profile.approvalStatus}</span></td>
            <td>${profile.priorityFuelAccess ? "Unlocked" : "Locked"}</td>
            <td>${renderActionButtons(profile)}</td>
        `;

        tableBody.appendChild(row);
    });
}

function renderActionButtons(profile) {
    if (profile.approvalStatus === "APPROVED") {
        return `<span class="success-text">Approved</span>`;
    }

    return `
        <button class="btn primary tiny-btn" onclick="approveEmergencyProfile(${profile.id})">
            Approve
        </button>
        <button class="btn danger tiny-btn" onclick="rejectEmergencyProfile(${profile.id})">
            Reject
        </button>
    `;
}

async function approveEmergencyProfile(profileId) {
    const confirmed = confirm("Approve this emergency vehicle profile? Priority fuel access will unlock automatically.");

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch("http://localhost:8081/api/admin/emergency-vehicles/" + profileId + "/approve", {
            method: "PUT"
        });

        const result = await response.json();

        if (response.ok) {
            showMessage("Emergency vehicle profile approved. Priority fuel access unlocked.", "success-text");
            loadEmergencyProfiles();
        } else {
            showMessage(getErrorMessage(result), "error-text");
        }

    } catch (error) {
        showMessage("Server connection failed while approving profile.", "error-text");
    }
}

async function rejectEmergencyProfile(profileId) {
    const confirmed = confirm("Reject this emergency vehicle profile?");

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch("http://localhost:8081/api/admin/emergency-vehicles/" + profileId + "/reject", {
            method: "PUT"
        });

        const result = await response.json();

        if (response.ok) {
            showMessage("Emergency vehicle profile rejected.", "success-text");
            loadEmergencyProfiles();
        } else {
            showMessage(getErrorMessage(result), "error-text");
        }

    } catch (error) {
        showMessage("Server connection failed while rejecting profile.", "error-text");
    }
}

function getEmergencyStatusClass(status) {
    if (status === "APPROVED") {
        return "status-approved";
    }

    if (status === "REJECTED") {
        return "status-rejected";
    }

    return "status-pending";
}

function showMessage(message, className) {
    const element = document.getElementById("adminEmergencyMessage");
    element.className = className;
    element.innerText = message;
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