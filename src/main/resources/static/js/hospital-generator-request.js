let loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;
let lastEditedInput = null;

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
    document.getElementById("contactNumber").addEventListener("input", generateCrisisReason);

    document.getElementById("backupHoursNeeded").addEventListener("input", function () {
        lastEditedInput = "BACKUP_HOURS";
        calculateDieselFromBackupHours();
        generateCrisisReason();
    });

    document.getElementById("requiredDieselLiter").addEventListener("input", function () {
        lastEditedInput = "DIESEL_LITER";
        calculateBackupHoursFromDiesel();
        generateCrisisReason();
    });
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
        updateApprovalMode();
        updateHourlyConsumptionBox();

        if (lastEditedInput === "BACKUP_HOURS") {
            calculateDieselFromBackupHours();
        } else if (lastEditedInput === "DIESEL_LITER") {
            calculateBackupHoursFromDiesel();
        }

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

function updateApprovalMode() {
    const backupHours = Number(loggedInUser.hospitalEstimatedBackupHours || 0);
    const dieselStatus = loggedInUser.hospitalDieselStatus || "CRITICAL";
    const isCritical = backupHours < 6 && dieselStatus === "CRITICAL";

    if (isCritical) {
        document.getElementById("approvalModeSummary").innerText = "AUTO APPROVAL POSSIBLE";
        showMessage(
            "Hospital is CRITICAL. Request may auto-approve if an open pump has enough DIESEL stock.",
            "success-text"
        );
    } else {
        document.getElementById("approvalModeSummary").innerText = "ADMIN REVIEW";
        showMessage(
            "Hospital can request diesel, but it will wait for admin approval because current status is " + dieselStatus + ".",
            "success-text"
        );
    }

    const submitBtn = document.getElementById("submitHospitalGeneratorRequestBtn");

    if (submitBtn) {
        submitBtn.disabled = false;
    }
}

function calculateDieselFromBackupHours() {
    const backupHoursInput = document.getElementById("backupHoursNeeded");
    const dieselInput = document.getElementById("requiredDieselLiter");

    const backupHours = Number(backupHoursInput.value);
    const hourlyConsumption = calculateHourlyDieselConsumption();

    if (!backupHours || backupHours <= 0 || hourlyConsumption <= 0) {
        dieselInput.value = "";
        return;
    }

    const requiredDiesel = backupHours * hourlyConsumption;
    dieselInput.value = roundTwo(requiredDiesel);
}

function calculateBackupHoursFromDiesel() {
    const backupHoursInput = document.getElementById("backupHoursNeeded");
    const dieselInput = document.getElementById("requiredDieselLiter");

    const requiredDiesel = Number(dieselInput.value);
    const hourlyConsumption = calculateHourlyDieselConsumption();

    if (!requiredDiesel || requiredDiesel <= 0 || hourlyConsumption <= 0) {
        backupHoursInput.value = "";
        return;
    }

    const backupHours = requiredDiesel / hourlyConsumption;
    backupHoursInput.value = roundTwo(backupHours);
}

function updateHourlyConsumptionBox() {
    const hourlyConsumption = calculateHourlyDieselConsumption();
    const hourlyBox = document.getElementById("hourlyDieselConsumption");

    if (!hourlyBox) {
        return;
    }

    if (hourlyConsumption <= 0) {
        hourlyBox.value = "Could not calculate";
        return;
    }

    hourlyBox.value = roundTwo(hourlyConsumption) + " L/hour";
}

function calculateHourlyDieselConsumption() {
    const generatorCapacity = loggedInUser.hospitalGeneratorCapacity || "";
    const kva = extractKvaFromGeneratorCapacity(generatorCapacity);

    if (!kva || kva <= 0) {
        return 0;
    }

    return kva * 0.25;
}

function extractKvaFromGeneratorCapacity(generatorCapacity) {
    if (!generatorCapacity) {
        return 0;
    }

    const cleanedValue = generatorCapacity
        .toUpperCase()
        .replace("KVA", "")
        .replace("KW", "")
        .replace(",", "")
        .trim();

    let numberText = "";

    for (let i = 0; i < cleanedValue.length; i++) {
        const character = cleanedValue.charAt(i);

        if ((character >= "0" && character <= "9") || character === ".") {
            numberText += character;
        } else if (numberText.length > 0) {
            break;
        }
    }

    if (!numberText) {
        return 0;
    }

    const value = Number(numberText);

    if (Number.isNaN(value)) {
        return 0;
    }

    return value;
}

function generateCrisisReason() {
    const hospitalName = loggedInUser.hospitalName || "Hospital";
    const hospitalUnderThana = loggedInUser.hospitalUnderThana || "-";
    const generatorCapacity = loggedInUser.hospitalGeneratorCapacity || "-";
    const currentReserve = loggedInUser.hospitalCurrentDieselReserve ?? "-";
    const currentBackupHours = loggedInUser.hospitalEstimatedBackupHours ?? 0;
    const dieselStatus = loggedInUser.hospitalDieselStatus || "CRITICAL";
    const hourlyConsumption = calculateHourlyDieselConsumption();

    const situation = document.getElementById("outageSituation").value;
    const backupHoursNeeded = document.getElementById("backupHoursNeeded").value;
    const requiredDiesel = document.getElementById("requiredDieselLiter").value;

    let message = hospitalName + " requests generator DIESEL support";
    message += " for hospital under " + hospitalUnderThana + " thana.";
    message += " Current diesel reserve: " + currentReserve + " liter(s).";
    message += " Registered generator capacity: " + generatorCapacity + ".";
    message += " Estimated diesel consumption: " + roundTwo(hourlyConsumption) + " liter(s)/hour.";
    message += " Current estimated backup: " + currentBackupHours + " hour(s).";
    message += " Current diesel status: " + dieselStatus + ".";

    if (dieselStatus === "CRITICAL" && Number(currentBackupHours) < 6) {
        message += " Approval mode: auto approval possible if an open pump has enough DIESEL stock.";
    } else {
        message += " Approval mode: admin review required because hospital is not currently CRITICAL.";
    }

    if (situation) {
        message += " Situation: " + formatEnum(situation) + ".";
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
    const outageSituation = document.getElementById("outageSituation").value;
    const backupHoursNeeded = document.getElementById("backupHoursNeeded").value;
    const requiredDieselLiter = document.getElementById("requiredDieselLiter").value;
    const contactNumber = document.getElementById("contactNumber").value.trim();

    const data = {
        userId: Number(loggedInUser.userId || localStorage.getItem("userId")),
        affectedThana: loggedInUser.hospitalUnderThana,
        hospitalName: loggedInUser.hospitalName,
        generatorCapacity: loggedInUser.hospitalGeneratorCapacity,
        requiredDieselLiter: Number(requiredDieselLiter),
        urgencyLevel: loggedInUser.hospitalDieselStatus || "UNKNOWN",
        reason: document.getElementById("generatedReasonPreview").value.trim(),
        contactNumber: contactNumber
    };

    if (!data.userId) {
        showMessage("User ID not found. Please login again.", "error-text");
        return;
    }

    if (!outageSituation) {
        showMessage("Please select outage situation.", "error-text");
        return;
    }

    if (!backupHoursNeeded && !requiredDieselLiter) {
        showMessage("Please enter either expected backup hours needed or required diesel liter.", "error-text");
        return;
    }

    if (!data.requiredDieselLiter || data.requiredDieselLiter <= 0) {
        showMessage("Please enter a valid required diesel liter.", "error-text");
        return;
    }

    if (!contactNumber) {
        showMessage("Please enter contact number.", "error-text");
        return;
    }

    const currentBackupHours = loggedInUser.hospitalEstimatedBackupHours ?? 0;
    const dieselStatus = loggedInUser.hospitalDieselStatus || "UNKNOWN";
    const approvalMode = dieselStatus === "CRITICAL" && Number(currentBackupHours) < 6
        ? "Auto approval possible if an open pump has enough DIESEL stock"
        : "Admin approval required";

    const confirmationMessage =
        "Confirm Generator Diesel Request\n\n" +
        "Hospital: " + valueOrDash(loggedInUser.hospitalName) + "\n" +
        "Hospital Under Thana: " + valueOrDash(loggedInUser.hospitalUnderThana) + "\n" +
        "Generator Capacity: " + valueOrDash(loggedInUser.hospitalGeneratorCapacity) + "\n" +
        "Current Diesel Reserve: " + valueOrDash(loggedInUser.hospitalCurrentDieselReserve) + " L\n" +
        "Current Backup: " + valueOrDash(currentBackupHours) + " hours\n" +
        "Current Status: " + dieselStatus + "\n\n" +
        "Outage Situation: " + formatEnum(outageSituation) + "\n" +
        "Expected Backup Needed: " + valueOrDash(backupHoursNeeded) + " hours\n" +
        "Requested Diesel: " + data.requiredDieselLiter + " L\n" +
        "Contact: " + contactNumber + "\n\n" +
        "Approval Mode: " + approvalMode + "\n\n" +
        "Do you want to submit this request?";

    const confirmed = confirm(confirmationMessage);

    if (!confirmed) {
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
                alert(
                    "Request submitted and auto-approved.\n\n" +
                    "Collection Code: " + result.collectionCode + "\n" +
                    "Assigned Pump: " + result.pumpName + "\n" +
                    "Pump Address: " + result.pumpAddress
                );

                showMessage(
                    "Request submitted and auto-approved. Collection code: " + result.collectionCode,
                    "success-text"
                );
            } else {
                alert(
                    "Request submitted successfully.\n\n" +
                    "Status: " + result.requestStatus + "\n" +
                    "Admin Note: " + (result.adminNote || "-")
                );

                showMessage(
                    "Request submitted. Status: " + result.requestStatus + ". " + (result.adminNote || ""),
                    "success-text"
                );
            }

            document.getElementById("hospitalGeneratorRequestForm").reset();
            lastEditedInput = null;
            refreshHospitalProfile();
        } else {
            showMessage(getErrorMessage(result), "error-text");
        }

    } catch (error) {
        showMessage("Server connection failed while submitting request.", "error-text");
    }
}

function roundTwo(value) {
    return Math.round(Number(value) * 100) / 100;
}

function formatEnum(value) {
    if (!value) {
        return "-";
    }

    return value.replaceAll("_", " ");
}

function valueOrDash(value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    return value;
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