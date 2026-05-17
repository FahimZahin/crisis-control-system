let loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

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
    setupFormEvents();
    refreshHospitalProfile();
});

function setupFormEvents() {
    const form = document.getElementById("hospitalGeneratorRequestForm");

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        submitHospitalGeneratorRequest();
    });

    const refreshBtn = document.getElementById("refreshHospitalProfileBtn");

    if (refreshBtn) {
        refreshBtn.addEventListener("click", refreshHospitalProfile);
    }

    document.getElementById("outageSituation").addEventListener("change", generateCrisisReason);
    document.getElementById("criticalUnit").addEventListener("change", generateCrisisReason);
    document.getElementById("backupHoursNeeded").addEventListener("input", generateCrisisReason);
    document.getElementById("requiredDieselLiter").addEventListener("input", generateCrisisReason);
    document.getElementById("contactNumber").addEventListener("input", generateCrisisReason);
}

async function refreshHospitalProfile() {
    const userId = loggedInUser.userId || localStorage.getItem("userId");

    if (!userId) {
        showMessage("User ID not found. Please login again.", "error-text");
        return;
    }

    try {
        const response = await fetch("http://localhost:8081/api/hospital-authority/profile/" + userId + "?time=" + Date.now());
        const profile = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(profile), "error-text");
            return;
        }

        loggedInUser = profile;
        localStorage.setItem("loggedInUser", JSON.stringify(profile));

        fillHospitalData();
        updateRequestAvailability();
        generateCrisisReason();

        showMessage("Hospital profile refreshed successfully.", "success-text");

    } catch (error) {
        showMessage("Server connection failed while refreshing hospital profile.", "error-text");
    }
}

function fillHospitalData() {
    const hospitalName = loggedInUser.hospitalName || "-";
    const hospitalUnderThana = loggedInUser.hospitalUnderThana || "-";
    const generatorCapacity = loggedInUser.hospitalGeneratorCapacity || "-";
    const currentDieselReserve = loggedInUser.hospitalCurrentDieselReserve ?? "-";
    const backupHours = loggedInUser.hospitalEstimatedBackupHours ?? 0;
    const dieselStatus = loggedInUser.hospitalDieselStatus || "CRITICAL";
    const contactNumber = loggedInUser.emergencyContactNumber || loggedInUser.phoneNumber || "";

    document.getElementById("hospitalNameInfo").innerText = hospitalName;
    document.getElementById("hospitalUnderThanaInfo").innerText = hospitalUnderThana;
    document.getElementById("generatorCapacityInfo").innerText = generatorCapacity;
    document.getElementById("contactInfo").innerText = contactNumber || "-";

    document.getElementById("backupHoursSummary").innerText = backupHours + " hours";
    document.getElementById("dieselStatusSummary").innerText = dieselStatus;
    document.getElementById("currentDieselReserveSummary").innerText = currentDieselReserve;

    document.getElementById("contactNumber").value = contactNumber;
    document.getElementById("urgencyLevel").value = dieselStatus;
}

function updateRequestAvailability() {
    const backupHours = Number(loggedInUser.hospitalEstimatedBackupHours || 0);
    const dieselStatus = loggedInUser.hospitalDieselStatus || "CRITICAL";
    const canApply = backupHours < 6 && dieselStatus === "CRITICAL";

    document.getElementById("canApplySummary").innerText = canApply ? "YES" : "NO";

    const formElements = [
        "outageSituation",
        "criticalUnit",
        "backupHoursNeeded",
        "requiredDieselLiter",
        "contactNumber",
        "submitHospitalGeneratorRequestBtn"
    ];

    formElements.forEach(function (id) {
        const element = document.getElementById(id);

        if (element) {
            element.disabled = !canApply;
        }
    });

    if (!canApply) {
        showMessage(
            "Generator diesel request is disabled because current backup is "
            + backupHours
            + " hours and status is "
            + dieselStatus
            + ". Hospital can apply only when backup is less than 6 hours and status is CRITICAL.",
            "error-text"
        );
    }
}

function generateCrisisReason() {
    const hospitalName = loggedInUser.hospitalName || "Hospital";
    const hospitalUnderThana = loggedInUser.hospitalUnderThana || "-";
    const generatorCapacity = loggedInUser.hospitalGeneratorCapacity || "-";
    const currentReserve = loggedInUser.hospitalCurrentDieselReserve ?? "-";
    const backupHours = loggedInUser.hospitalEstimatedBackupHours ?? 0;
    const dieselStatus = loggedInUser.hospitalDieselStatus || "CRITICAL";

    const situation = document.getElementById("outageSituation").value;
    const criticalUnit = document.getElementById("criticalUnit").value;
    const backupHoursNeeded = document.getElementById("backupHoursNeeded").value;
    const requiredDiesel = document.getElementById("requiredDieselLiter").value;

    let message = hospitalName + " requests generator DIESEL support";
    message += " for hospital under " + hospitalUnderThana + " thana.";
    message += " Current diesel reserve: " + currentReserve + " liter(s).";
    message += " Registered generator capacity: " + generatorCapacity + ".";
    message += " Current estimated backup: " + backupHours + " hour(s).";
    message += " Current diesel status: " + dieselStatus + ".";

    if (situation) {
        message += " Situation: " + formatEnum(situation) + ".";
    }

    if (criticalUnit) {
        message += " Critical unit affected: " + formatEnum(criticalUnit) + ".";
    }

    if (backupHoursNeeded) {
        message += " Expected backup needed: " + backupHoursNeeded + " hour(s).";
    }

    if (requiredDiesel) {
        message += " Requested diesel: " + requiredDiesel + " liter(s).";
    }

    document.getElementById("generatedReasonPreview").value = message;
}

async function submitHospitalGeneratorRequest() {
    const backupHours = Number(loggedInUser.hospitalEstimatedBackupHours || 0);
    const dieselStatus = loggedInUser.hospitalDieselStatus || "CRITICAL";

    if (backupHours >= 6 || dieselStatus !== "CRITICAL") {
        showMessage(
            "Request blocked. Hospital can apply only when backup is less than 6 hours and status is CRITICAL.",
            "error-text"
        );
        return;
    }

    const data = {
        userId: Number(loggedInUser.userId || localStorage.getItem("userId")),
        affectedThana: loggedInUser.hospitalUnderThana,
        hospitalName: loggedInUser.hospitalName,
        generatorCapacity: loggedInUser.hospitalGeneratorCapacity,
        requiredDieselLiter: Number(document.getElementById("requiredDieselLiter").value),
        urgencyLevel: dieselStatus,
        reason: document.getElementById("generatedReasonPreview").value.trim(),
        contactNumber: document.getElementById("contactNumber").value.trim()
    };

    if (!data.userId) {
        showMessage("User ID not found. Please login again.", "error-text");
        return;
    }

    if (!data.requiredDieselLiter || data.requiredDieselLiter <= 0) {
        showMessage("Please enter a valid required diesel liter.", "error-text");
        return;
    }

    if (!document.getElementById("outageSituation").value || !document.getElementById("criticalUnit").value || !document.getElementById("backupHoursNeeded").value) {
        showMessage("Please fill outage situation, critical unit, and expected backup hours needed.", "error-text");
        return;
    }

    try {
        const response = await fetch("http://localhost:8081/api/hospital-generator-fuel-requests", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            if (result.requestStatus === "APPROVED") {
                showMessage(
                    "Request submitted and approved. Collection code: " + result.collectionCode,
                    "success-text"
                );
            } else {
                showMessage(
                    "Request submitted. Status: " + result.requestStatus + ". " + (result.adminNote || ""),
                    "success-text"
                );
            }

            document.getElementById("hospitalGeneratorRequestForm").reset();
            refreshHospitalProfile();
        } else {
            showMessage(getErrorMessage(result), "error-text");
        }

    } catch (error) {
        showMessage("Server connection failed while submitting request.", "error-text");
    }
}

function formatEnum(value) {
    if (!value) {
        return "-";
    }

    return value.replaceAll("_", " ");
}

function showMessage(message, className) {
    const element = document.getElementById("hospitalGeneratorRequestMessage");

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

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            localStorage.clear();
        });
    }
}