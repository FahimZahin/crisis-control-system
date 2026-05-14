const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

let emergencyProfile = null;
let fuelSettings = null;
let canRequestEmergencyFuel = false;

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
    loadInitialData();
});

function setupEvents() {
    document.getElementById("fuelType").addEventListener("change", updateCostPreview);
    document.getElementById("requestedLiter").addEventListener("input", updateCostPreview);

    document.getElementById("emergencyFuelRequestForm").addEventListener("submit", function (event) {
        event.preventDefault();
        submitEmergencyFuelRequest();
    });
}

async function loadInitialData() {
    await loadEmergencyProfile();
    await loadFuelSettings();
    updateCostPreview();
}

async function loadEmergencyProfile() {
    const userId = loggedInUser.userId || localStorage.getItem("userId");

    try {
        const response = await fetch("http://localhost:8081/api/emergency-vehicles/user/" + userId);
        const profile = await response.json();

        if (response.ok) {
            emergencyProfile = profile;
            fillEmergencyProfile(profile);
            renderAccessStatus(profile);
        } else {
            blockEmergencyFuelRequest("No emergency vehicle profile found. Submit emergency vehicle profile first.");
        }

    } catch (error) {
        blockEmergencyFuelRequest("Server connection failed while checking emergency profile.");
    }
}

async function loadFuelSettings() {
    try {
        const response = await fetch("http://localhost:8081/api/admin/fuel-settings");
        fuelSettings = await response.json();

        if (!response.ok) {
            showMessage("emergencyFuelRequestMessage", "Failed to load fuel settings.", "error-text");
        }

    } catch (error) {
        showMessage("emergencyFuelRequestMessage", "Server connection failed while loading fuel settings.", "error-text");
    }
}

function fillEmergencyProfile(profile) {
    document.getElementById("emergencyOrganizationName").innerText = profile.organizationName || "-";
    document.getElementById("emergencyVehicleType").innerText = profile.emergencyVehicleType || "-";
    document.getElementById("emergencyVehicleNumber").innerText = profile.vehicleNumber || "-";
    document.getElementById("priorityAccessStatus").innerText = profile.priorityFuelAccess ? "Unlocked" : "Locked";
}

function renderAccessStatus(profile) {
    const box = document.getElementById("emergencyFuelAccessBox");
    const title = document.getElementById("emergencyFuelAccessTitle");
    const text = document.getElementById("emergencyFuelAccessText");
    const submitBtn = document.getElementById("submitEmergencyFuelRequestBtn");

    box.className = "emergency-status-box";

    if (profile.approvalStatus === "APPROVED" && profile.priorityFuelAccess === true) {
        canRequestEmergencyFuel = true;
        submitBtn.disabled = false;

        box.classList.add("emergency-approved-box");
        title.innerText = "Priority Fuel Access Unlocked";
        text.innerText = "Your emergency vehicle profile is approved. Fuel requests will auto-approve and assign an available pump.";
        return;
    }

    canRequestEmergencyFuel = false;
    submitBtn.disabled = true;

    if (profile.approvalStatus === "REJECTED") {
        box.classList.add("emergency-rejected-box");
        title.innerText = "Emergency Profile Rejected";
        text.innerText = "You cannot request emergency fuel until your profile is updated and approved.";
        return;
    }

    box.classList.add("emergency-pending-box");
    title.innerText = "Waiting for Admin Approval";
    text.innerText = "You cannot request priority emergency fuel until admin approves your emergency vehicle profile.";
}

function blockEmergencyFuelRequest(message) {
    canRequestEmergencyFuel = false;
    document.getElementById("submitEmergencyFuelRequestBtn").disabled = true;

    const box = document.getElementById("emergencyFuelAccessBox");
    document.getElementById("emergencyFuelAccessTitle").innerText = "Priority Fuel Access Locked";
    document.getElementById("emergencyFuelAccessText").innerText = message;

    box.className = "emergency-status-box emergency-rejected-box";
}

function updateCostPreview() {
    const fuelType = document.getElementById("fuelType").value;
    const requestedLiter = Number(document.getElementById("requestedLiter").value);

    const price = getPriceByFuelType(fuelType);
    const estimatedCost = requestedLiter > 0 ? requestedLiter * price : 0;

    document.getElementById("pricePerUnit").value = price ? price + " BDT" : "";
    document.getElementById("estimatedCost").value = estimatedCost ? estimatedCost.toFixed(2) + " BDT" : "";
}

function getPriceByFuelType(fuelType) {
    if (!fuelSettings || !fuelType) {
        return 0;
    }

    if (fuelType === "PETROL") {
        return Number(fuelSettings.petrolPrice || 0);
    }

    if (fuelType === "OCTANE") {
        return Number(fuelSettings.octanePrice || 0);
    }

    if (fuelType === "DIESEL") {
        return Number(fuelSettings.dieselPrice || 0);
    }

    if (fuelType === "CNG") {
        return Number(fuelSettings.cngPrice || 0);
    }

    return 0;
}

async function submitEmergencyFuelRequest() {
    if (!canRequestEmergencyFuel) {
        showMessage("emergencyFuelRequestMessage", "Priority fuel access is locked. Admin approval is required first.", "error-text");
        return;
    }

    const fuelType = document.getElementById("fuelType").value;
    const requestedLiter = Number(document.getElementById("requestedLiter").value);
    const emergencyReason = document.getElementById("emergencyReason").value.trim();

    if (!fuelType) {
        showMessage("emergencyFuelRequestMessage", "Please select fuel type.", "error-text");
        return;
    }

    if (!requestedLiter || requestedLiter <= 0) {
        showMessage("emergencyFuelRequestMessage", "Requested amount must be greater than 0.", "error-text");
        return;
    }

    if (!emergencyReason) {
        showMessage("emergencyFuelRequestMessage", "Emergency reason is required.", "error-text");
        return;
    }

    const data = {
        userId: Number(loggedInUser.userId || localStorage.getItem("userId")),
        fuelType: fuelType,
        requestedLiter: requestedLiter,
        emergencyReason: emergencyReason
    };

    try {
        const response = await fetch("http://localhost:8081/api/emergency-fuel-requests", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            showMessage(
                "emergencyFuelRequestMessage",
                "Emergency fuel request auto-approved. Collection code generated.",
                "success-text"
            );

            setTimeout(function () {
                window.location.href = "emergency-fuel-request-history.html";
            }, 1000);
        } else {
            showMessage("emergencyFuelRequestMessage", getErrorMessage(result), "error-text");
        }

    } catch (error) {
        showMessage("emergencyFuelRequestMessage", "Server connection failed while submitting emergency fuel request.", "error-text");
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
        });
    }
}