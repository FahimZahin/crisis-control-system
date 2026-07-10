let loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;
let lastEditedInput = null;

const MINIMUM_BACKUP_HOURS = 6;
const BASE_CRITICAL_SERVICE_LOAD_KW = 5.0;
const ICU_UNIT_LOAD_KW = 1.5;
const AC_PATIENT_LOAD_KW = 0.08;
const NON_AC_PATIENT_LOAD_KW = 0.04;
const DIESEL_LITER_PER_KWH = 0.27;
const GENERATOR_SAFE_LOAD_FACTOR = 0.80;

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

    document.getElementById("totalIcuUnits").addEventListener("input", function () {
        updateAfterCriticalServiceChange();
    });

    document.getElementById("acPatientCapacity").addEventListener("input", function () {
        updateAfterCriticalServiceChange();
    });

    document.getElementById("nonAcPatientCapacity").addEventListener("input", function () {
        updateAfterCriticalServiceChange();
    });

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

function updateAfterCriticalServiceChange() {
    updateHospitalLocalServiceData();
    fillHospitalData();

    if (lastEditedInput === "BACKUP_HOURS") {
        calculateDieselFromBackupHours();
    } else if (lastEditedInput === "DIESEL_LITER") {
        calculateBackupHoursFromDiesel();
    }

    updateApprovalMode();
    updateHourlyConsumptionBox();
    generateCrisisReason();
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
    loggedInUser.hospitalDieselTankCapacity = profile.hospitalDieselTankCapacity ?? loggedInUser.hospitalDieselTankCapacity;
    loggedInUser.hospitalCurrentDieselReserve = profile.hospitalCurrentDieselReserve ?? loggedInUser.hospitalCurrentDieselReserve;
    loggedInUser.hospitalEstimatedBackupHours = profile.hospitalEstimatedBackupHours ?? calculateBackupHours(
        loggedInUser.hospitalCurrentDieselReserve
    );
    loggedInUser.hospitalDieselStatus = profile.hospitalDieselStatus || resolveDieselStatus(
        cleanNumber(loggedInUser.hospitalEstimatedBackupHours)
    );
    loggedInUser.emergencyContactNumber = profile.emergencyContactNumber || loggedInUser.emergencyContactNumber;

    loggedInUser.totalIcuUnits = profile.totalIcuUnits ?? loggedInUser.totalIcuUnits ?? localStorage.getItem("totalIcuUnits") ?? 0;
    loggedInUser.acPatientCapacity = profile.acPatientCapacity ?? loggedInUser.acPatientCapacity ?? localStorage.getItem("acPatientCapacity") ?? 0;
    loggedInUser.nonAcPatientCapacity = profile.nonAcPatientCapacity ?? loggedInUser.nonAcPatientCapacity ?? localStorage.getItem("nonAcPatientCapacity") ?? 0;

    saveHospitalLocalStorage();
}

function fillHospitalData() {
    const hospitalName = loggedInUser.hospitalName || "-";
    const hospitalUnderThana = loggedInUser.hospitalUnderThana || loggedInUser.thanaOrUpazila || "-";
    const generatorCapacity = cleanNumber(loggedInUser.hospitalGeneratorCapacity);
    const dieselTankCapacity = cleanNumber(loggedInUser.hospitalDieselTankCapacity);
    const currentDieselReserve = cleanNumber(loggedInUser.hospitalCurrentDieselReserve);
    const availableDieselSpace = calculateAvailableDieselSpace();
    const backupHours = calculateBackupHours(currentDieselReserve);
    const dieselStatus = resolveDieselStatus(backupHours);
    const contactNumber = loggedInUser.emergencyContactNumber || loggedInUser.phoneNumber || "";

    const criticalLoadKw = calculateCriticalServiceLoadKw();
    const effectiveLoadKw = calculateEffectiveCriticalLoadKw();
    const hourlyConsumption = calculateHourlyDieselConsumption();
    const requiredSixHourDiesel = calculateRequiredSixHourDiesel();
    const dieselShortage = calculateDieselShortageToSixHours();
    const autoApprovalLimit = calculateAutoApprovalDieselLimit();
    const overloadRisk = hasGeneratorOverloadRisk();

    setTextIfExists(
        "availableDieselSpaceHint",
        dieselTankCapacity > 0
            ? "Available tank space: " + availableDieselSpace.toFixed(2) + " L | Auto approval limit: " + autoApprovalLimit.toFixed(2) + " L"
            : "Hospital diesel tank capacity is not configured."
    );

    const requiredDieselInput = document.getElementById("requiredDieselLiter");

    if (requiredDieselInput && dieselTankCapacity > 0) {
        requiredDieselInput.max = availableDieselSpace.toFixed(2);
    }

    loggedInUser.hospitalEstimatedBackupHours = backupHours;
    loggedInUser.hospitalDieselStatus = dieselStatus;
    saveHospitalLocalStorage();

    setTextIfExists("hospitalNameInfo", hospitalName);
    setTextIfExists("hospitalUnderThanaInfo", hospitalUnderThana);
    setTextIfExists("generatorCapacityInfo", generatorCapacity > 0 ? generatorCapacity.toFixed(2) + " kVA" : "-");
    setTextIfExists("dieselTankCapacityInfo", dieselTankCapacity > 0 ? dieselTankCapacity.toFixed(2) + " L" : "-");
    setTextIfExists("availableDieselSpaceInfo", dieselTankCapacity > 0 ? availableDieselSpace.toFixed(2) + " L" : "-");

    setTextIfExists("criticalLoadSummary", formatNumber(criticalLoadKw));
    setTextIfExists("hourlyDieselSummary", formatNumber(hourlyConsumption));
    setTextIfExists("autoApprovalLimitSummary", formatNumber(autoApprovalLimit));
    setTextIfExists("requiredSixHourDieselInfo", formatNumber(requiredSixHourDiesel));
    setTextIfExists("dieselShortageInfo", formatNumber(dieselShortage));
    setTextIfExists("effectiveCriticalLoadInfo", formatNumber(effectiveLoadKw));
    setTextIfExists("generatorLoadWarningInfo", overloadRisk ? "OVERLOAD RISK" : "OK");

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
    const currentReserve = cleanNumber(loggedInUser.hospitalCurrentDieselReserve);
    const backupHours = calculateBackupHours(currentReserve);
    const autoApprovalLimit = calculateAutoApprovalDieselLimit();

    if (requestedDiesel > 0 && backupHours < 6 && requestedDiesel <= autoApprovalLimit) {
        setTextIfExists("approvalModeSummary", "AUTO APPROVAL POSSIBLE");
        showMessage(
            "Hospital backup is below 6 hours and requested diesel is within the critical-service auto approval limit.",
            "success-text"
        );
    } else if (requestedDiesel > autoApprovalLimit && autoApprovalLimit > 0) {
        setTextIfExists("approvalModeSummary", "ADMIN REVIEW");
        showMessage(
            "Request exceeds the automatic 6-hour critical-service support limit. Admin approval is required.",
            "error-text"
        );
    } else if (backupHours >= 6) {
        setTextIfExists("approvalModeSummary", "ADMIN REVIEW");
        showMessage(
            "Hospital already has at least 6 hours backup. Extra diesel request needs admin approval.",
            "success-text"
        );
    } else {
        setTextIfExists("approvalModeSummary", "ENTER DIESEL AMOUNT");
        showMessage(
            "Enter diesel amount to check critical-service auto approval.",
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

    dieselInput.value = roundTwo(backupHours * hourlyConsumption);
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

    backupHoursInput.value = roundTwo(requiredDiesel / hourlyConsumption);
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

function calculateCriticalServiceLoadKw() {
    const icuUnits = getNumberOrZero(document.getElementById("totalIcuUnits")?.value ?? loggedInUser.totalIcuUnits);
    const acPatients = getNumberOrZero(document.getElementById("acPatientCapacity")?.value ?? loggedInUser.acPatientCapacity);
    const nonAcPatients = getNumberOrZero(document.getElementById("nonAcPatientCapacity")?.value ?? loggedInUser.nonAcPatientCapacity);

    let loadKw = BASE_CRITICAL_SERVICE_LOAD_KW;
    loadKw += icuUnits * ICU_UNIT_LOAD_KW;
    loadKw += acPatients * AC_PATIENT_LOAD_KW;
    loadKw += nonAcPatients * NON_AC_PATIENT_LOAD_KW;

    return roundTwo(loadKw);
}

function calculateSafeGeneratorCapacityKw() {
    const generatorCapacity = cleanNumber(loggedInUser.hospitalGeneratorCapacity);

    if (generatorCapacity <= 0) {
        return 0;
    }

    return roundTwo(generatorCapacity * GENERATOR_SAFE_LOAD_FACTOR);
}

function calculateEffectiveCriticalLoadKw() {
    const criticalLoadKw = calculateCriticalServiceLoadKw();
    const safeGeneratorCapacityKw = calculateSafeGeneratorCapacityKw();

    if (safeGeneratorCapacityKw > 0 && safeGeneratorCapacityKw < criticalLoadKw) {
        return safeGeneratorCapacityKw;
    }

    return criticalLoadKw;
}

function hasGeneratorOverloadRisk() {
    const criticalLoadKw = calculateCriticalServiceLoadKw();
    const safeGeneratorCapacityKw = calculateSafeGeneratorCapacityKw();

    return criticalLoadKw > 0 && safeGeneratorCapacityKw > 0 && criticalLoadKw > safeGeneratorCapacityKw;
}

function calculateHourlyDieselConsumption() {
    const effectiveLoadKw = calculateEffectiveCriticalLoadKw();

    if (effectiveLoadKw <= 0) {
        return 0;
    }

    return roundTwo(effectiveLoadKw * DIESEL_LITER_PER_KWH);
}

function calculateBackupHours(currentReserve) {
    const reserve = cleanNumber(currentReserve);
    const hourlyConsumption = calculateHourlyDieselConsumption();

    if (reserve <= 0 || hourlyConsumption <= 0) {
        return 0;
    }

    return roundTwo(reserve / hourlyConsumption);
}

function calculateRequiredSixHourDiesel() {
    const hourlyConsumption = calculateHourlyDieselConsumption();

    if (hourlyConsumption <= 0) {
        return 0;
    }

    return roundTwo(hourlyConsumption * MINIMUM_BACKUP_HOURS);
}

function calculateDieselShortageToSixHours() {
    const requiredSixHourDiesel = calculateRequiredSixHourDiesel();
    const currentReserve = cleanNumber(loggedInUser.hospitalCurrentDieselReserve);

    return roundTwo(Math.max(0, requiredSixHourDiesel - currentReserve));
}

function calculateAvailableDieselSpace() {
    const dieselTankCapacity = cleanNumber(loggedInUser.hospitalDieselTankCapacity);
    const currentReserve = cleanNumber(loggedInUser.hospitalCurrentDieselReserve);

    return roundTwo(Math.max(0, dieselTankCapacity - currentReserve));
}

function calculateAutoApprovalDieselLimit() {
    const shortage = calculateDieselShortageToSixHours();
    const availableSpace = calculateAvailableDieselSpace();

    return roundTwo(Math.min(shortage, availableSpace));
}

function generateCrisisReason() {
    updateHospitalLocalServiceData();

    const hospitalName = loggedInUser.hospitalName || "Hospital";
    const hospitalUnderThana = loggedInUser.hospitalUnderThana || loggedInUser.thanaOrUpazila || "-";
    const generatorCapacity = cleanNumber(loggedInUser.hospitalGeneratorCapacity);
    const currentReserve = cleanNumber(loggedInUser.hospitalCurrentDieselReserve);
    const currentBackupHours = calculateBackupHours(currentReserve);
    const dieselStatus = resolveDieselStatus(currentBackupHours);
    const hourlyConsumption = calculateHourlyDieselConsumption();
    const criticalLoadKw = calculateCriticalServiceLoadKw();
    const effectiveLoadKw = calculateEffectiveCriticalLoadKw();
    const requiredSixHourDiesel = calculateRequiredSixHourDiesel();
    const dieselShortage = calculateDieselShortageToSixHours();
    const autoApprovalLimit = calculateAutoApprovalDieselLimit();

    const situation = document.getElementById("outageSituation").value;
    const backupHoursNeeded = document.getElementById("backupHoursNeeded").value;
    const requiredDiesel = document.getElementById("requiredDieselLiter").value;
    const requiredDieselNumber = cleanNumber(requiredDiesel);

    let message = hospitalName + " requests generator DIESEL support for critical hospital services.";
    message += " Hospital under thana: " + hospitalUnderThana + ".";
    message += " Generator capacity: " + generatorCapacity.toFixed(2) + " kVA.";
    message += " Current diesel reserve: " + currentReserve.toFixed(2) + " L.";
    message += " Critical service load: " + criticalLoadKw.toFixed(2) + " kW.";
    message += " Effective supported load: " + effectiveLoadKw.toFixed(2) + " kW.";
    message += " Estimated diesel consumption: " + hourlyConsumption.toFixed(2) + " L/hour.";
    message += " Current backup: " + currentBackupHours.toFixed(2) + " hours.";
    message += " Minimum emergency target: 6 hours.";
    message += " Required diesel for 6 hours: " + requiredSixHourDiesel.toFixed(2) + " L.";
    message += " Shortage to reach 6 hours: " + dieselShortage.toFixed(2) + " L.";
    message += " Auto approval diesel limit: " + autoApprovalLimit.toFixed(2) + " L.";
    message += " Diesel status: " + dieselStatus + ".";
    message += " ICU units: " + getNumberOrZero(document.getElementById("totalIcuUnits").value) + ".";
    message += " AC patient capacity: " + getNumberOrZero(document.getElementById("acPatientCapacity").value) + ".";
    message += " Non-AC patient capacity: " + getNumberOrZero(document.getElementById("nonAcPatientCapacity").value) + ".";

    if (requiredDieselNumber > 0 && currentBackupHours < 6 && requiredDieselNumber <= autoApprovalLimit) {
        message += " Approval rule: request is within the automatic 6-hour critical-service support limit.";
    } else if (requiredDieselNumber > 0) {
        message += " Approval rule: admin approval is required.";
    }

    if (situation) {
        message += " Situation: " + formatEnum(situation) + ".";
    }

    if (backupHoursNeeded) {
        message += " Expected extra backup requested: " + backupHoursNeeded + " hour(s).";
    }

    if (requiredDiesel) {
        message += " Requested diesel: " + requiredDiesel + " L.";
    }

    document.getElementById("generatedReasonPreview").value = message;
}

async function submitHospitalGeneratorRequest() {
    updateHospitalLocalServiceData();

    const outageSituation = document.getElementById("outageSituation").value;
    const backupHoursNeeded = document.getElementById("backupHoursNeeded").value;
    const requiredDieselLiter = document.getElementById("requiredDieselLiter").value;
    const contactNumber = document.getElementById("contactNumber").value.trim();

    const currentReserve = cleanNumber(loggedInUser.hospitalCurrentDieselReserve);
    const dieselTankCapacity = cleanNumber(loggedInUser.hospitalDieselTankCapacity);
    const availableDieselSpace = calculateAvailableDieselSpace();
    const currentBackupHours = calculateBackupHours(currentReserve);
    const dieselStatus = resolveDieselStatus(currentBackupHours);
    const requestedDiesel = roundTwo(cleanNumber(requiredDieselLiter));
    const autoApprovalLimit = calculateAutoApprovalDieselLimit();

    const data = {
        userId: Number(getLoggedInUserId()),
        affectedThana: loggedInUser.hospitalUnderThana || loggedInUser.thanaOrUpazila,
        hospitalName: loggedInUser.hospitalName,
        generatorCapacity: String(cleanNumber(loggedInUser.hospitalGeneratorCapacity)),
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

    const approvalMode = currentBackupHours < 6 && requestedDiesel <= autoApprovalLimit
        ? "Auto approval possible because request is within the 6-hour critical-service support limit."
        : "Admin approval required.";

    const confirmationMessage =
        "Confirm Hospital Generator Diesel Request?\n\n" +
        "Hospital: " + (loggedInUser.hospitalName || "-") + "\n" +
        "Current Reserve: " + currentReserve.toFixed(2) + " L\n" +
        "Available Tank Space: " + availableDieselSpace.toFixed(2) + " L\n" +
        "Critical Load: " + calculateCriticalServiceLoadKw().toFixed(2) + " kW\n" +
        "Hourly Diesel Use: " + calculateHourlyDieselConsumption().toFixed(2) + " L/hour\n" +
        "Required Diesel for 6 Hours: " + calculateRequiredSixHourDiesel().toFixed(2) + " L\n" +
        "Shortage to 6 Hours: " + calculateDieselShortageToSixHours().toFixed(2) + " L\n" +
        "Auto Approval Limit: " + autoApprovalLimit.toFixed(2) + " L\n" +
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
        saveHospitalLocalStorage();

        showMessage(
            "Hospital generator diesel request submitted successfully. Status: " + result.requestStatus + ".",
            "success-text"
        );

        document.getElementById("hospitalGeneratorRequestForm").reset();
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

function updateHospitalLocalServiceData() {
    const icuInput = document.getElementById("totalIcuUnits");
    const acInput = document.getElementById("acPatientCapacity");
    const nonAcInput = document.getElementById("nonAcPatientCapacity");

    if (icuInput) {
        loggedInUser.totalIcuUnits = getNumberOrZero(icuInput.value);
    }

    if (acInput) {
        loggedInUser.acPatientCapacity = getNumberOrZero(acInput.value);
    }

    if (nonAcInput) {
        loggedInUser.nonAcPatientCapacity = getNumberOrZero(nonAcInput.value);
    }

    saveHospitalLocalStorage();
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
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
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

function saveHospitalLocalStorage() {
    localStorage.setItem("loggedInUser", JSON.stringify(loggedInUser));
    localStorage.setItem("userId", loggedInUser.userId || "");
    localStorage.setItem("totalIcuUnits", loggedInUser.totalIcuUnits || "");
    localStorage.setItem("acPatientCapacity", loggedInUser.acPatientCapacity || "");
    localStorage.setItem("nonAcPatientCapacity", loggedInUser.nonAcPatientCapacity || "");
}