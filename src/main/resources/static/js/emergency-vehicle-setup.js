const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;
let existingProfile = null;

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    if (loggedInUser.role !== "EMERGENCY_VEHICLE_AUTHORITY") {
        alert("Only Emergency Vehicle Authority can access this page.");
    }

    setupLogout();
    setupEvents();
    prefillUserData();
    loadEmergencyVehicleProfile();
});

function setupEvents() {
    document.getElementById("emergencyVehicleForm").addEventListener("submit", function (event) {
        event.preventDefault();
        submitEmergencyVehicleProfile();
    });
}

function prefillUserData() {
    document.getElementById("authorityName").value = loggedInUser.fullName || "";
    document.getElementById("phoneNumber").value = loggedInUser.phoneNumber || "";
    document.getElementById("organizationName").value = loggedInUser.organizationName || "";
    document.getElementById("assignedArea").value = loggedInUser.assignedArea || "";
    document.getElementById("verificationId").value = loggedInUser.officialVerificationId || "";
}

async function loadEmergencyVehicleProfile() {
    const userId = loggedInUser.userId || localStorage.getItem("userId");

    try {
        const response = await fetch("http://localhost:8081/api/emergency-vehicles/user/" + userId);
        const profile = await response.json();

        if (response.ok) {
            existingProfile = profile;
            fillProfileForm(profile);
            renderApprovalStatus(profile);
        } else {
            renderNoProfileStatus();
        }

    } catch (error) {
        renderNoProfileStatus();
    }
}

function fillProfileForm(profile) {
    document.getElementById("authorityName").value = profile.authorityName || "";
    document.getElementById("phoneNumber").value = profile.phoneNumber || "";
    document.getElementById("organizationName").value = profile.organizationName || "";
    document.getElementById("emergencyVehicleType").value = profile.emergencyVehicleType || "";
    document.getElementById("vehicleNumber").value = profile.vehicleNumber || "";
    document.getElementById("driverName").value = profile.driverName || "";
    document.getElementById("driverLicenseNumber").value = profile.driverLicenseNumber || "";
    document.getElementById("assignedArea").value = profile.assignedArea || "";
    document.getElementById("verificationId").value = profile.verificationId || "";
    document.getElementById("reason").value = profile.reason || "";

    if (profile.approvalStatus === "APPROVED") {
        document.getElementById("submitEmergencyProfileBtn").disabled = true;
        document.getElementById("submitEmergencyProfileBtn").innerText = "Profile Approved - Editing Locked";
    }

    if (profile.approvalStatus === "REJECTED") {
        document.getElementById("submitEmergencyProfileBtn").innerText = "Resubmit Emergency Vehicle Profile";
    }
}

function renderApprovalStatus(profile) {
    const box = document.getElementById("approvalStatusBox");
    const title = document.getElementById("approvalStatusTitle");
    const text = document.getElementById("approvalStatusText");

    box.className = "emergency-status-box";

    if (profile.approvalStatus === "APPROVED") {
        box.classList.add("emergency-approved-box");
        title.innerText = "APPROVED - Priority Fuel Access Unlocked";
        text.innerText = "Admin approved this emergency vehicle profile. Higher/priority fuel access is automatically enabled. No second approval is needed.";
        return;
    }

    if (profile.approvalStatus === "REJECTED") {
        box.classList.add("emergency-rejected-box");
        title.innerText = "REJECTED - Update and Resubmit";
        text.innerText = profile.adminNote || "Admin rejected this profile. Please update details and resubmit.";
        return;
    }

    box.classList.add("emergency-pending-box");
    title.innerText = "PENDING APPROVAL";
    text.innerText = "Your emergency vehicle profile is waiting for admin approval.";
}

function renderNoProfileStatus() {
    const box = document.getElementById("approvalStatusBox");
    const title = document.getElementById("approvalStatusTitle");
    const text = document.getElementById("approvalStatusText");

    box.className = "emergency-status-box emergency-pending-box";
    title.innerText = "NO PROFILE SUBMITTED";
    text.innerText = "Submit emergency vehicle details to request admin verification.";
}

async function submitEmergencyVehicleProfile() {
    const userId = loggedInUser.userId || localStorage.getItem("userId");

    const data = {
        userId: Number(userId),
        authorityName: document.getElementById("authorityName").value.trim(),
        phoneNumber: document.getElementById("phoneNumber").value.trim(),
        organizationName: document.getElementById("organizationName").value.trim(),
        emergencyVehicleType: document.getElementById("emergencyVehicleType").value,
        vehicleNumber: document.getElementById("vehicleNumber").value.trim(),
        driverName: document.getElementById("driverName").value.trim(),
        driverLicenseNumber: document.getElementById("driverLicenseNumber").value.trim(),
        assignedArea: document.getElementById("assignedArea").value.trim(),
        verificationId: document.getElementById("verificationId").value.trim(),
        reason: document.getElementById("reason").value.trim()
    };

    try {
        const response = await fetch("http://localhost:8081/api/emergency-vehicles", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            showMessage("emergencyVehicleMessage", "Emergency vehicle profile submitted successfully.", "success-text");
            existingProfile = result;
            renderApprovalStatus(result);
        } else {
            showMessage("emergencyVehicleMessage", getErrorMessage(result), "error-text");
        }

    } catch (error) {
        showMessage("emergencyVehicleMessage", "Server connection failed while submitting profile.", "error-text");
    }
}

function showMessage(id, message, className) {
    const element = document.getElementById(id);
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