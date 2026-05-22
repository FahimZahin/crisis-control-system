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
    fillHospitalData();
    updateApprovalMode();
    updateHourlyConsumptionBox();
    generateCrisisReason();
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
    const userId = getLoggedInUserId();

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

        mergeHospitalProfile(profile);

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

function mergeHospitalProfile(profile) {
    loggedInUser.userId = profile.userId || profile.id || loggedInUser.userId || localStorage.getItem("userId");
    loggedInUser.id = profile.id || profile.userId || loggedInUser.id;
    loggedInUser.fullName = profile.fullName || loggedInUser.fullName;
    loggedInUser.phoneNumber = profile.phoneNumber || loggedInUser.phoneNumber;
    loggedInUser.address = profile.address || loggedInUser.address;
    loggedInUser.role = profile.role || loggedInUser.role;
    loggedInUser.status = profile.status || loggedInUser.status;

    loggedInUser.hospitalName = profile.hospitalName || loggedInUser.hospitalName;
    loggedInUser.hospitalRegistrationNumber = profile.hospitalRegistrationNumber || loggedInUser.hospitalRegistrationNumber;
    loggedInUser.hospitalAddress = profile.hospitalAddress || loggedInUser.hospitalAddress;
    loggedInUser.hospitalUnderThana = profile.hospitalUnderThana || profile.thanaOrUpazila || loggedInUser.hospitalUnderThana;
    loggedInUser.thanaOrUpazila = profile.thanaOrUpazila || profile.hospitalUnderThana || loggedInUser.thanaOrUpazila;
    loggedInUser.hospitalGeneratorCapacity = profile.hospitalGeneratorCapacity ?? loggedInUser.hospitalGeneratorCapacity;
    loggedInUser.hospitalCurrentDieselReserve = profile.hospitalCurrentDieselReserve ?? loggedInUser.hospitalCurrentDieselReserve;
    loggedInUser.hospitalEstimatedBackupHours = profile.hospitalEstimatedBackupHours ?? calculateBackupHours(
        loggedInUser.hospitalGeneratorCapacity,
        loggedInUser.hospitalCurrentDieselReserve
    );
    loggedInUser.hospitalDieselStatus = profile.hospitalDieselStatus || resolveDieselStatus(
        cleanNumber(loggedInUser.hospitalEstimatedBackupHours)
    );
    loggedInUser.emergencyContactNumber = profile.emergencyContactNumber || loggedInUser.emergencyContactNumber;

    loggedInUser.totalIcuUnits = profile.totalIcuUnits ?? loggedInUser.totalIcuUnits ?? localStorage.getItem("totalIcuUnits") ?? 0;
    loggedInUser.acPatientCapacity = profile.acPatientCapacity ?? loggedInUser.acPatientCapacity ?? localStorage.getItem("acPatientCapacity") ?? 0;
    loggedInUser.nonAcPatientCapacity = profile.nonAcPatientCapacity ?? loggedInUser.nonAcPatientCapacity ?? localStorage.getItem("nonAcPatientCapacity") ?? 0;

    localStorage.setItem("loggedInUser", JSON.stringify(loggedInUser));
    localStorage.setItem("userId", loggedInUser.userId || "");
    localStorage.setItem("totalIcuUnits", loggedInUser.totalIcuUnits || "");
    localStorage.setItem("acPatientCapacity", loggedInUser.acPatientCapacity || "");
    localStorage.setItem("nonAcPatientCapacity", loggedInUser.nonAcPatientCapacity || "");
}

function fillHospitalData() {
    const hospitalName = loggedInUser.hospitalName || "-";
    const hospitalUnderThana = loggedInUser.hospitalUnderThana || loggedInUser.thanaOrUpazila || "-";
    const generatorCapacity = cleanNumber(loggedInUser.hospitalGeneratorCapacity);
    const currentDieselReserve = cleanNumber(loggedInUser.hospitalCurrentDieselReserve);
    const backupHours = calculateBackupHours(generatorCapacity, currentDieselReserve);
    const dieselStatus = resolveDieselStatus(backupHours);
    const contactNumber = loggedInUser.emergencyContactNumber || loggedInUser.phoneNumber || "";

    loggedInUser.hospitalEstimatedBackupHours = backupHours;
    loggedInUser.hospitalDieselStatus = dieselStatus;
    localStorage.setItem("loggedInUser", JSON.stringify(loggedInUser));

    document.getElementById("hospitalNameInfo").innerText = hospitalName;
    document.getElementById("hospitalUnderThanaInfo").innerText = hospitalUnderThana;
    document.getElementById("generatorCapacityInfo").innerText = generatorCapacity > 0 ? generatorCapacity.toFixed(2) : "-";
    document.getElementById("contactInfo").innerText = contactNumber || "-";

    document.getElementById("backupHoursSummary").innerText = backupHours.toFixed(2) + " hours";
    document.getElementById("dieselStatusSummary").innerText = dieselStatus;
    document.getElementById("currentDieselReserveSummary").innerText = currentDieselReserve.toFixed(2);

    document.getElementById("contactNumber").value = contactNumber;
    document.getElementById("urgencyLevel").value = dieselStatus;

    setTextIfExists("totalIcuUnitsInfo", getNumberOrZero(loggedInUser.totalIcuUnits));
    setTextIfExists("acPatientCapacityInfo", getNumberOrZero(loggedInUser.acPatientCapacity));
    setTextIfExists("nonAcPatientCapacityInfo", getNumberOrZero(loggedInUser.nonAcPatientCapacity));
}

function updateApprovalMode() {
    const generatorCapacity = cleanNumber(loggedInUser.hospitalGeneratorCapacity);
    const currentDieselReserve = cleanNumber(loggedInUser.hospitalCurrentDieselReserve);
    const backupHours = calculateBackupHours(generatorCapacity, currentDieselReserve);
    const dieselStatus = resolveDieselStatus(backupHours);
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
    const generatorCapacity = cleanNumber(loggedInUser.hospitalGeneratorCapacity);

    if (!generatorCapacity || generatorCapacity <= 0) {
        return 0;
    }

    return generatorCapacity * 0.25;
}

function generateCrisisReason() {
    const hospitalName = loggedInUser.hospitalName || "Hospital";
    const hospitalUnderThana = loggedInUser.hospitalUnderThana || loggedInUser.thanaOrUpazila || "-";
    const generatorCapacity = cleanNumber(loggedInUser.hospitalGeneratorCapacity);
    const currentReserve = cleanNumber(loggedInUser.hospitalCurrentDieselReserve);
    const currentBackupHours = calculateBackupHours(generatorCapacity, currentReserve);
    const dieselStatus = resolveDieselStatus(currentBackupHours);
    const hourlyConsumption = calculateHourlyDieselConsumption();

    const situation = document.getElementById("outageSituation").value;
    const backupHoursNeeded = document.getElementById("backupHoursNeeded").value;
    const requiredDiesel = document.getElementById("requiredDieselLiter").value;

    let message = hospitalName + " requests generator DIESEL support";
    message += " for hospital under " + hospitalUnderThana + " thana.";
    message += " Current diesel reserve: " + currentReserve.toFixed(2) + " liter(s).";
    message += " Registered generator capacity: " + generatorCapacity.toFixed(2) + " kVA.";
    message += " Estimated diesel consumption: " + roundTwo(hourlyConsumption) + " liter(s)/hour.";
    message += " Current estimated backup: " + currentBackupHours.toFixed(2) + " hour(s).";
    message += " Current diesel status: " + dieselStatus + ".";
    message += " Total ICU units: " + getNumberOrZero(loggedInUser.totalIcuUnits) + ".";
    message += " AC patient capacity: " + getNumberOrZero(loggedInUser.acPatientCapacity) + ".";
    message += " Non-AC patient capacity: " + getNumberOrZero(loggedInUser.nonAcPatientCapacity) + ".";

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

    const generatorCapacity = cleanNumber(loggedInUser.hospitalGeneratorCapacity);
    const currentReserve = cleanNumber(loggedInUser.hospitalCurrentDieselReserve);
    const currentBackupHours = calculateBackupHours(generatorCapacity, currentReserve);
    const dieselStatus = resolveDieselStatus(currentBackupHours);

    const data = {
        userId: Number(getLoggedInUserId()),
        affectedThana: loggedInUser.hospitalUnderThana || loggedInUser.thanaOrUpazila,
        hospitalName: loggedInUser.hospitalName,
        generatorCapacity: generatorCapacity,
        requiredDieselLiter: Number(requiredDieselLiter),
        urgencyLevel: dieselStatus,
        reason: document.getElementById("generatedReasonPreview").value.trim(),
        contactNumber: contactNumber,
        totalIcuUnits: getNumberOrZero(loggedInUser.totalIcuUnits),
        acPatientCapacity: getNumberOrZero(loggedInUser.acPatientCapacity),
        nonAcPatientCapacity: getNumberOrZero(loggedInUser.nonAcPatientCapacity)
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

    const approvalMode = dieselStatus === "CRITICAL" && Number(currentBackupHours) < 6
        ? "Auto approval possible if an open pump has enough DIESEL stock"
        : "Admin approval required";

    const confirmationMessage =
        "Confirm Generator Diesel Request\n\n" +
        "Hospital: " + valueOrDash(loggedInUser.hospitalName) + "\n" +
        "Hospital Under Thana: " + valueOrDash(loggedInUser.hospitalUnderThana || loggedInUser.thanaOrUpazila) + "\n" +
        "Generator Capacity: " + generatorCapacity.toFixed(2) + "\n" +
        "Current Diesel Reserve: " + currentReserve.toFixed(2) + " L\n" +
        "Current Backup: " + currentBackupHours.toFixed(2) + " hours\n" +
        "Current Status: " + dieselStatus + "\n" +
        "Total ICU Units: " + data.totalIcuUnits + "\n" +
        "AC Patient Capacity: " + data.acPatientCapacity + "\n" +
        "Non-AC Patient Capacity: " + data.nonAcPatientCapacity + "\n\n" +
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

function getLoggedInUserId() {
    return loggedInUser.userId || loggedInUser.id || localStorage.getItem("userId");
}

function getNumberOrZero(value) {
    const number = Number(value);

    if (Number.isNaN(number) || number < 0) {
        return 0;
    }

    return number;
}

function cleanNumber(value) {
    if (value === null || value === undefined || value === "-") {
        return 0;
    }

    return Number(
        String(value)
            .replace("L", "")
            .replace("hours", "")
            .replace("liter(s)", "")
            .replace("kVA", "")
            .replace("KVA", "")
            .replace("KW", "")
            .replace("kw", "")
            .replace(",", "")
            .trim()
    ) || 0;
}

function calculateBackupHours(generatorCapacity, dieselReserve) {
    const capacity = cleanNumber(generatorCapacity);
    const reserve = cleanNumber(dieselReserve);

    if (capacity <= 0 || reserve <= 0) {
        return 0;
    }

    const hourlyConsumption = capacity * 0.25;

    if (hourlyConsumption <= 0) {
        return 0;
    }

    return reserve / hourlyConsumption;
}

function resolveDieselStatus(backupHours) {
    const hours = cleanNumber(backupHours);

    if (hours < 6) {
        return "CRITICAL";
    }

    if (hours < 8) {
        return "MIDDLE";
    }

    return "RISK_FREE";
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

function setTextIfExists(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.innerText = value;
    }
}