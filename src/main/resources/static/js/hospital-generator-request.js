const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

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
    fillHospitalDefaults();
    setupFormEvents();
});

function setupFormEvents() {
    const form = document.getElementById("hospitalGeneratorRequestForm");

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        submitHospitalGeneratorRequest();
    });

    document.getElementById("outageSituation").addEventListener("change", generateCrisisReason);
    document.getElementById("criticalUnit").addEventListener("change", generateCrisisReason);
    document.getElementById("backupHoursNeeded").addEventListener("input", generateCrisisReason);
    document.getElementById("requiredDieselLiter").addEventListener("input", generateCrisisReason);
    document.getElementById("urgencyLevel").addEventListener("change", generateCrisisReason);
}

function fillHospitalDefaults() {
    const hospitalName = loggedInUser.hospitalName || "";
    const hospitalUnderThana = loggedInUser.hospitalUnderThana || "";
    const generatorCapacity = loggedInUser.hospitalGeneratorCapacity || "";
    const currentDieselReserve = loggedInUser.hospitalCurrentDieselReserve ?? "";
    const contactNumber = loggedInUser.emergencyContactNumber || loggedInUser.phoneNumber || "";

    document.getElementById("hospitalNameSummary").innerText = hospitalName || "-";
    document.getElementById("hospitalUnderThanaSummary").innerText = hospitalUnderThana || "-";
    document.getElementById("generatorCapacitySummary").innerText = generatorCapacity || "-";
    document.getElementById("currentDieselReserveSummary").innerText =
        currentDieselReserve === "" ? "-" : currentDieselReserve;

    document.getElementById("hospitalNameInput").value = hospitalName;
    document.getElementById("hospitalUnderThanaInput").value = hospitalUnderThana;
    document.getElementById("generatorCapacity").value = generatorCapacity;
    document.getElementById("currentDieselReserve").value = currentDieselReserve;
    document.getElementById("contactNumber").value = contactNumber;

    if (!hospitalUnderThana || !generatorCapacity || currentDieselReserve === "") {
        showMessage(
            "Hospital under thana, generator capacity, and current diesel reserve are missing. Please update/re-register hospital information.",
            "error-text"
        );
    }

    generateCrisisReason();
}

function generateCrisisReason() {
    const hospitalName = document.getElementById("hospitalNameInput").value.trim();
    const hospitalUnderThana = document.getElementById("hospitalUnderThanaInput").value.trim();
    const situation = document.getElementById("outageSituation").value;
    const criticalUnit = document.getElementById("criticalUnit").value;
    const generatorCapacity = document.getElementById("generatorCapacity").value.trim();
    const backupHours = document.getElementById("backupHoursNeeded").value;
    const currentReserve = document.getElementById("currentDieselReserve").value;
    const requiredDiesel = document.getElementById("requiredDieselLiter").value;
    const urgency = document.getElementById("urgencyLevel").value;

    let message = "";

    if (hospitalName) {
        message += hospitalName + " requests generator DIESEL support";
    } else {
        message += "Hospital requests generator DIESEL support";
    }

    if (hospitalUnderThana) {
        message += " for hospital under " + hospitalUnderThana + " thana";
    }

    if (situation) {
        message += ". Situation: " + formatEnum(situation);
    }

    if (criticalUnit) {
        message += ". Critical unit affected: " + formatEnum(criticalUnit);
    }

    if (generatorCapacity) {
        message += ". Registered generator capacity: " + generatorCapacity;
    }

    if (backupHours) {
        message += ". Expected backup needed: " + backupHours + " hour(s)";
    }

    if (currentReserve !== "") {
        message += ". Current registered diesel reserve: " + currentReserve + " liter(s)";
    }

    if (requiredDiesel) {
        message += ". Requested diesel: " + requiredDiesel + " liter(s)";
    }

    if (urgency) {
        message += ". Urgency: " + urgency;
    }

    document.getElementById("generatedReasonPreview").value = message;
}

async function submitHospitalGeneratorRequest() {
    const hospitalUnderThana = document.getElementById("hospitalUnderThanaInput").value.trim();
    const generatorCapacity = document.getElementById("generatorCapacity").value.trim();
    const currentDieselReserve = document.getElementById("currentDieselReserve").value;
    const generatedReason = document.getElementById("generatedReasonPreview").value.trim();

    const data = {
        userId: Number(loggedInUser.userId || localStorage.getItem("userId")),
        affectedThana: hospitalUnderThana,
        hospitalName: document.getElementById("hospitalNameInput").value.trim(),
        generatorCapacity: generatorCapacity,
        requiredDieselLiter: Number(document.getElementById("requiredDieselLiter").value),
        urgencyLevel: document.getElementById("urgencyLevel").value,
        reason: generatedReason,
        contactNumber: document.getElementById("contactNumber").value.trim()
    };

    if (!hospitalUnderThana || !generatorCapacity || currentDieselReserve === "") {
        showMessage(
            "Hospital registration data is incomplete. Hospital under thana, generator capacity, and current diesel reserve must exist first.",
            "error-text"
        );
        return;
    }

    if (!data.userId) {
        showMessage("User ID not found. Please login again.", "error-text");
        return;
    }

    if (!data.requiredDieselLiter || data.requiredDieselLiter <= 0) {
        showMessage("Please enter a valid required diesel liter.", "error-text");
        return;
    }

    if (!data.urgencyLevel || !generatedReason || !data.contactNumber) {
        showMessage("Please fill all required request fields before submitting.", "error-text");
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
            fillHospitalDefaults();
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