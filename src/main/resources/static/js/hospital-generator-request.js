let loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;
let lastEditedInput = null;
let adminHospitalWeeklyAllocation = 0;

document.addEventListener("DOMContentLoaded", async function () {
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
    await loadAdminHospitalWeeklyAllocation();
    setupFormEvents();
    fillHospitalData();
    updateApprovalMode();
    updateHourlyConsumptionBox();
    generateCrisisReason();
});

async function loadAdminHospitalWeeklyAllocation() {
    try {
        const response = await fetch("http://localhost:8081/api/fuel-settings");
        const settings = await response.json();

        if (!response.ok) {
            showMessage("Failed to load admin weekly allocation.", "error-text");
            return;
        }

        adminHospitalWeeklyAllocation = cleanNumber(settings.hospitalGeneratorWeeklyDieselAllocation);

        localStorage.setItem("hospitalGeneratorWeeklyDieselAllocation", adminHospitalWeeklyAllocation);

    } catch (error) {
        showMessage("Server connection failed while loading admin weekly allocation.", "error-text");
    }
}

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
    document.getElementById("totalIcuUnits").addEventListener("input", generateCrisisReason);
    document.getElementById("acPatientCapacity").addEventListener("input", generateCrisisReason);
    document.getElementById("nonAcPatientCapacity").addEventListener("input", generateCrisisReason);

    document.getElementById("backupHoursNeeded").addEventListener("input", function () {
        lastEditedInput = "BACKUP_HOURS";
        calculateDieselFromBackupHours();
        updateApprovalMode();
        generateCrisisReason();
    });

    document.getElementById("requiredDieselLiter").addEventListener("input", function () {
        lastEditedInput = "DIESEL_LITER";
        calculateBackupHoursFromDiesel();
        updateApprovalMode();
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
        await loadAdminHospitalWeeklyAllocation();

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
    loggedInUser.hospitalDieselTankCapacity = profile.hospitalDieselTankCapacity ?? loggedInUser.hospitalDieselTankCapacity;
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
    const dieselTankCapacity = cleanNumber(loggedInUser.hospitalDieselTankCapacity);
    const currentDieselReserve = cleanNumber(loggedInUser.hospitalCurrentDieselReserve);
    const availableDieselSpace = Math.max(0, dieselTankCapacity - currentDieselReserve);
    const backupHours = calculateBackupHours(generatorCapacity, currentDieselReserve);
    const dieselStatus = resolveDieselStatus(backupHours);
    const contactNumber = loggedInUser.emergencyContactNumber || loggedInUser.phoneNumber || "";

    setTextIfExists(
        "availableDieselSpaceHint",
        dieselTankCapacity > 0
            ? "Maximum request allowed now: " + availableDieselSpace.toFixed(2) + " L"
            : "Hospital diesel tank capacity is not configured."
    );

    const requiredDieselInput = document.getElementById("requiredDieselLiter");

    if (requiredDieselInput && dieselTankCapacity > 0) {
        requiredDieselInput.max = availableDieselSpace.toFixed(2);
    }

    loggedInUser.hospitalEstimatedBackupHours = backupHours;
    loggedInUser.hospitalDieselStatus = dieselStatus;
    localStorage.setItem("loggedInUser", JSON.stringify(loggedInUser));

    setTextIfExists("hospitalNameInfo", hospitalName);
    setTextIfExists("hospitalUnderThanaInfo", hospitalUnderThana);
    setTextIfExists("generatorCapacityInfo", generatorCapacity > 0 ? generatorCapacity.toFixed(2) : "-");
    setTextIfExists("dieselTankCapacityInfo", dieselTankCapacity > 0 ? dieselTankCapacity.toFixed(2) + " L" : "-");
    setTextIfExists("availableDieselSpaceInfo", dieselTankCapacity > 0 ? availableDieselSpace.toFixed(2) + " L" : "-");
    setTextIfExists("hospitalWeeklyAllocationSummary", formatNumber(adminHospitalWeeklyAllocation));
    setTextIfExists("hospitalWeeklyAllocationInfo", formatNumber(adminHospitalWeeklyAllocation));
    setInputValueIfExists("hospitalWeeklyAllocation", formatNumber(adminHospitalWeeklyAllocation));
    setTextIfExists("contactInfo", contactNumber || "-");

    setTextIfExists("backupHoursSummary", backupHours.toFixed(2) + " hours");
    setTextIfExists("dieselStatusSummary", dieselStatus);
    setTextIfExists("currentDieselReserveSummary", currentDieselReserve.toFixed(2));

    setInputValueIfExists("contactNumber", contactNumber);
    setInputValueIfExists("urgencyLevel", dieselStatus);

    setInputValueIfExists("totalIcuUnits", getNumberOrZero(loggedInUser.totalIcuUnits));
    setInputValueIfExists("acPatientCapacity", getNumberOrZero(loggedInUser.acPatientCapacity));
    setInputValueIfExists("nonAcPatientCapacity", getNumberOrZero(loggedInUser.nonAcPatientCapacity));

    setTextIfExists("totalIcuUnitsInfo", getNumberOrZero(loggedInUser.totalIcuUnits));
    setTextIfExists("acPatientCapacityInfo", getNumberOrZero(loggedInUser.acPatientCapacity));
    setTextIfExists("nonAcPatientCapacityInfo", getNumberOrZero(loggedInUser.nonAcPatientCapacity));
}

function updateApprovalMode() {
    const requestedDiesel = cleanNumber(document.getElementById("requiredDieselLiter").value);

    if (requestedDiesel > 0 && adminHospitalWeeklyAllocation > 0 && requestedDiesel <= adminHospitalWeeklyAllocation) {
        setTextIfExists("approvalModeSummary", "AUTO APPROVAL POSSIBLE");
        showMessage(
            "Request is within admin weekly allocation. It may auto-approve if an open pump has enough DIESEL stock.",
            "success-text"
        );
    } else if (requestedDiesel > adminHospitalWeeklyAllocation && adminHospitalWeeklyAllocation > 0) {
        setTextIfExists("approvalModeSummary", "ADMIN REVIEW");
        showMessage(
            "Request exceeds admin weekly allocation. Admin approval will be required.",
            "error-text"
        );
    } else {
        setTextIfExists("approvalModeSummary", "ENTER DIESEL AMOUNT");
        showMessage(
            "Enter diesel amount to check whether auto approval can apply.",
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
    const requiredDieselNumber = cleanNumber(requiredDiesel);

    let message = hospitalName + " requests generator DIESEL support";
    message += " for hospital under " + hospitalUnderThana + " thana.";
    message += " Current diesel reserve: " + currentReserve.toFixed(2) + " liter(s).";
    message += " Registered generator capacity: " + generatorCapacity.toFixed(2) + " kVA.";
    message += " Estimated diesel consumption: " + roundTwo(hourlyConsumption) + " liter(s)/hour.";
    message += " Current estimated backup: " + currentBackupHours.toFixed(2) + " hour(s).";
    message += " Current diesel status: " + dieselStatus + ".";
    message += " Admin weekly allocation: " + formatNumber(adminHospitalWeeklyAllocation) + " liter(s).";
    message += " Total ICU units: " + getNumberOrZero(document.getElementById("totalIcuUnits").value) + ".";
    message += " AC patient capacity: " + getNumberOrZero(document.getElementById("acPatientCapacity").value) + ".";
    message += " Non-AC patient capacity: " + getNumberOrZero(document.getElementById("nonAcPatientCapacity").value) + ".";

    if (requiredDieselNumber > 0 && adminHospitalWeeklyAllocation > 0 && requiredDieselNumber <= adminHospitalWeeklyAllocation) {
        message += " Weekly allocation rule: within admin weekly allocation, auto approval may apply if pump stock is available.";
    } else if (requiredDieselNumber > adminHospitalWeeklyAllocation && adminHospitalWeeklyAllocation > 0) {
        message += " Weekly allocation rule: exceeds admin weekly allocation, admin approval is required.";
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
    const dieselTankCapacity = cleanNumber(loggedInUser.hospitalDieselTankCapacity);
    const availableDieselSpace = Math.max(0, dieselTankCapacity - currentReserve);
    const currentBackupHours = calculateBackupHours(generatorCapacity, currentReserve);
    const dieselStatus = resolveDieselStatus(currentBackupHours);
    const requestedDiesel = cleanNumber(requiredDieselLiter);

    const data = {
        userId: Number(getLoggedInUserId()),
        affectedThana: loggedInUser.hospitalUnderThana || loggedInUser.thanaOrUpazila,
        hospitalName: loggedInUser.hospitalName,
        generatorCapacity: generatorCapacity,
        requiredDieselLiter: requestedDiesel,
        urgencyLevel: dieselStatus,
        reason: document.getElementById("generatedReasonPreview").value.trim(),
        contactNumber: contactNumber,
        totalIcuUnits: getNumberOrZero(document.getElementById("totalIcuUnits").value),
        acPatientCapacity: getNumberOrZero(document.getElementById("acPatientCapacity").value),
        nonAcPatientCapacity: getNumberOrZero(document.getElementById("nonAcPatientCapacity").value)
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

    if (adminHospitalWeeklyAllocation <= 0) {
        showMessage("Admin weekly allocation is not configured. Please contact admin.", "error-text");
        return;
    }

    if (dieselTankCapacity <= 0) {
        showMessage("Hospital diesel tank capacity is not configured. Please contact admin.", "error-text");
        return;
    }

    if (availableDieselSpace <= 0) {
        showMessage("Hospital diesel tank is already full. Diesel request is not allowed.", "error-text");
        return;
    }

    if (data.requiredDieselLiter > availableDieselSpace) {
        showMessage(
            "Requested diesel cannot be greater than available diesel space. Available space: " +
            availableDieselSpace.toFixed(2) +
            " L",
            "error-text"
        );
        return;
    }

    if (!contactNumber) {
        showMessage("Please enter contact number.", "error-text");
        return;
    }

    const approvalMode = requestedDiesel <= adminHospitalWeeklyAllocation
        ? "Within admin weekly allocation. Auto approval may apply if pump stock is available."
        : "Exceeds admin weekly allocation. Admin approval is required.";

    const confirmationMessage =
        "Confirm Hospital Generator Diesel Request?\n\n" +
        "Hospital: " + (loggedInUser.hospitalName || "-") + "\n" +
        "Thana: " + (loggedInUser.hospitalUnderThana || loggedInUser.thanaOrUpazila || "-") + "\n" +
        "Current Reserve: " + currentReserve.toFixed(2) + " L\n" +
        "Available Tank Space: " + availableDieselSpace.toFixed(2) + " L\n" +
        "Admin Weekly Allocation: " + formatNumber(adminHospitalWeeklyAllocation) + " L\n" +
        "Requested Diesel: " + requestedDiesel.toFixed(2) + " L\n" +
        "Current Backup: " + currentBackupHours.toFixed(2) + " hours\n" +
        "Current Status: " + dieselStatus + "\n" +
        "Approval Rule: " + approvalMode + "\n" +
        "ICU Units: " + data.totalIcuUnits + "\n" +
        "AC Patients: " + data.acPatientCapacity + "\n" +
        "Non-AC Patients: " + data.nonAcPatientCapacity + "\n\n" +
        "Submit request?";

    if (!confirm(confirmationMessage)) {
        return;
    }

    const submitBtn = document.getElementById("submitHospitalGeneratorRequestBtn");

    if (submitBtn) {
        submitBtn.disabled = true;
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

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");

            if (submitBtn) {
                submitBtn.disabled = false;
            }

            return;
        }

        loggedInUser.totalIcuUnits = data.totalIcuUnits;
        loggedInUser.acPatientCapacity = data.acPatientCapacity;
        loggedInUser.nonAcPatientCapacity = data.nonAcPatientCapacity;
        localStorage.setItem("loggedInUser", JSON.stringify(loggedInUser));

        showMessage(
            "Hospital generator diesel request submitted successfully. Status: " + result.requestStatus + ".",
            "success-text"
        );

        document.getElementById("hospitalGeneratorRequestForm").reset();
        await loadAdminHospitalWeeklyAllocation();
        fillHospitalData();
        updateApprovalMode();
        updateHourlyConsumptionBox();
        generateCrisisReason();

    } catch (error) {
        showMessage("Server connection failed while submitting request.", "error-text");
    }

    if (submitBtn) {
        submitBtn.disabled = false;
    }
}

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (!logoutBtn) {
        return;
    }

    logoutBtn.addEventListener("click", function () {
        localStorage.clear();
    });
}

function getLoggedInUserId() {
    return loggedInUser.userId || loggedInUser.id || localStorage.getItem("userId");
}

function calculateBackupHours(generatorCapacity, dieselReserve) {
    const capacity = cleanNumber(generatorCapacity);
    const reserve = cleanNumber(dieselReserve);

    if (capacity <= 0 || reserve <= 0) {
        return 0;
    }

    return reserve / (capacity * 0.25);
}

function resolveDieselStatus(backupHours) {
    const hours = cleanNumber(backupHours);

    if (hours < 6) {
        return "CRITICAL";
    }

    if (hours < 8) {
        return "MIDDLE";
    }

    if (hours < 12) {
        return "RISK_FREE";
    }

    return "ENOUGH";
}

function cleanNumber(value) {
    if (value === null || value === undefined || value === "" || value === "-") {
        return 0;
    }

    return Number(String(value).replace("L", "").replace("hours", "").replace("kVA", "").replace("KVA", "").trim()) || 0;
}

function getNumberOrZero(value) {
    const numberValue = Number(value);

    if (Number.isNaN(numberValue)) {
        return 0;
    }

    return numberValue;
}

function roundTwo(value) {
    return Math.round(Number(value) * 100) / 100;
}

function formatNumber(value) {
    const numberValue = Number(value);

    if (Number.isNaN(numberValue)) {
        return "0.00";
    }

    return numberValue.toFixed(2);
}

function formatEnum(value) {
    if (!value) {
        return "-";
    }

    return String(value).replaceAll("_", " ");
}

function setTextIfExists(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.innerText = value;
    }
}

function setInputValueIfExists(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.value = value;
    }
}

function showMessage(message, className) {
    const element = document.getElementById("hospitalGeneratorRequestMessage");

    if (element) {
        element.className = className;
        element.innerText = message;
    }
}

function getErrorMessage(result) {
    if (!result) {
        return "Request failed.";
    }

    if (result.message) {
        return result.message;
    }

    if (result.messages) {
        return JSON.stringify(result.messages);
    }

    if (result.error) {
        return result.error;
    }

    return "Request failed.";
}