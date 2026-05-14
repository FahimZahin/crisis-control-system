const emergencyLoggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

document.addEventListener("DOMContentLoaded", function () {
    if (!emergencyLoggedInUser) {
        window.location.href = "login.html";
        return;
    }

    loadEmergencyDashboardProfile();
});

async function loadEmergencyDashboardProfile() {
    const userId = emergencyLoggedInUser.userId || localStorage.getItem("userId");

    try {
        const response = await fetch("http://localhost:8081/api/emergency-vehicles/user/" + userId);
        const profile = await response.json();

        if (response.ok) {
            fillEmergencyDashboard(profile);
        } else {
            showNoEmergencyProfile();
        }

    } catch (error) {
        showNoEmergencyProfile();
    }
}

function fillEmergencyDashboard(profile) {
    setEmergencyText("emergencyApprovalStatus", profile.approvalStatus || "-");
    setEmergencyText("priorityFuelAccess", profile.priorityFuelAccess ? "Unlocked" : "Locked");

    setEmergencyText("emergencyOrganizationName", profile.organizationName || "-");
    setEmergencyText("emergencyVehicleType", profile.emergencyVehicleType || "-");
    setEmergencyText("emergencyVehicleNumber", profile.vehicleNumber || "-");
    setEmergencyText("emergencyAssignedArea", profile.assignedArea || "-");
    setEmergencyText("emergencyVerificationId", profile.verificationId || "-");
    setEmergencyText("emergencyAdminNote", profile.adminNote || "-");

    const box = document.getElementById("emergencyDashboardStatusBox");
    const title = document.getElementById("emergencyDashboardStatusTitle");
    const text = document.getElementById("emergencyDashboardStatusText");

    box.className = "emergency-status-box";

    if (profile.approvalStatus === "APPROVED") {
        box.classList.add("emergency-approved-box");
        title.innerText = "APPROVED - Priority Fuel Access Unlocked";
        text.innerText = "Your emergency vehicle profile is approved. You can use higher/priority emergency fuel access without another approval.";
        return;
    }

    if (profile.approvalStatus === "REJECTED") {
        box.classList.add("emergency-rejected-box");
        title.innerText = "REJECTED - Please Update Profile";
        text.innerText = profile.adminNote || "Your profile was rejected. Update and resubmit your emergency vehicle details.";
        return;
    }

    box.classList.add("emergency-pending-box");
    title.innerText = "PENDING APPROVAL";
    text.innerText = "Your profile is waiting for admin approval. Priority fuel access is locked until approval.";
}

function showNoEmergencyProfile() {
    setEmergencyText("emergencyApprovalStatus", "Not Submitted");
    setEmergencyText("priorityFuelAccess", "Locked");

    const box = document.getElementById("emergencyDashboardStatusBox");
    const title = document.getElementById("emergencyDashboardStatusTitle");
    const text = document.getElementById("emergencyDashboardStatusText");

    box.className = "emergency-status-box emergency-pending-box";
    title.innerText = "NO EMERGENCY PROFILE SUBMITTED";
    text.innerText = "Submit emergency vehicle details to request admin verification.";
}

function setEmergencyText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.innerText = value;
    }
}