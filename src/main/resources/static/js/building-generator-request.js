let loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;
let adminBuildingWeeklyAllocation = 0;

document.addEventListener("DOMContentLoaded", async function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    if (loggedInUser.role !== "BUILDING_MANAGER") {
        alert("Only Building Manager can access this page.");
        window.location.href = "dashboard.html";
        return;
    }

    setupLogout();
    await loadAdminWeeklyAllocation();
    fillBuildingData();
    setupFormEvents();
    updateBuildingStockPreview();
    generateRequestReason();
});

async function loadAdminWeeklyAllocation() {
    try {
        const response = await fetch("http://localhost:8081/api/fuel-settings");
        const settings = await response.json();

        if (!response.ok) {
            showMessage("Failed to load admin weekly allocation.", "error-text");
            return;
        }

        adminBuildingWeeklyAllocation = cleanNumber(settings.buildingGeneratorWeeklyDieselAllocation);

        loggedInUser.buildingWeeklyAllocationLiter = adminBuildingWeeklyAllocation;
        localStorage.setItem("buildingWeeklyAllocationLiter", adminBuildingWeeklyAllocation);
        localStorage.setItem("loggedInUser", JSON.stringify(loggedInUser));

    } catch (error) {
        showMessage("Server connection failed while loading admin weekly allocation.", "error-text");
    }
}

function setupFormEvents() {
    const form = document.getElementById("buildingGeneratorRequestForm");

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        submitBuildingGeneratorRequest();
    });

    document.getElementById("outageSituation").addEventListener("change", generateRequestReason);

    document.getElementById("requiredDieselLiter").addEventListener("input", function () {
        updateBuildingStockPreview();
        generateRequestReason();
    });

    document.getElementById("contactNumber").addEventListener("input", generateRequestReason);

    document.getElementById("buildingDieselTankCapacity").addEventListener("input", function () {
        updateBuildingStockPreview();
        generateRequestReason();
    });

    document.getElementById("buildingCurrentFuel").addEventListener("input", function () {
        updateBuildingStockPreview();
        generateRequestReason();
    });
}

function fillBuildingData() {
    setTextIfExists("buildingNameSummary", loggedInUser.buildingName || "Not Provided");
    setTextIfExists("generatorPowerSummary", loggedInUser.generatorPower || "Not Provided");
    setTextIfExists("buildingThanaSummary", loggedInUser.buildingUnderThana || loggedInUser.thanaOrUpazila || "Not Provided");
    setTextIfExists("numberOfFlatsSummary", loggedInUser.numberOfFlats || "Not Provided");

    setTextIfExists("buildingNameInfo", loggedInUser.buildingName || "Not Provided");
    setTextIfExists("holdingNumberInfo", loggedInUser.holdingNumber || "Not Provided");
    setTextIfExists("generatorPowerInfo", loggedInUser.generatorPower || "Not Provided");
    setTextIfExists("numberOfFlatsInfo", loggedInUser.numberOfFlats || "Not Provided");
    setTextIfExists("buildingThanaInfo", loggedInUser.buildingUnderThana || loggedInUser.thanaOrUpazila || "Not Provided");

    setInputValueIfEmpty("buildingDieselTankCapacity", cleanNumber(loggedInUser.buildingDieselTankCapacity));
    setInputValueIfEmpty("buildingCurrentFuel", cleanNumber(loggedInUser.buildingCurrentFuel));

    const weeklyAllocationInput = document.getElementById("buildingWeeklyAllocationLiter");

    if (weeklyAllocationInput) {
        weeklyAllocationInput.value = formatNumber(adminBuildingWeeklyAllocation);
    }

    setTextIfExists("weeklyAllocationSummary", formatNumber(adminBuildingWeeklyAllocation));
    setTextIfExists("adminWeeklyAllocationInfo", formatNumber(adminBuildingWeeklyAllocation));

    const contactInput = document.getElementById("contactNumber");

    if (contactInput && !contactInput.value) {
        contactInput.value = loggedInUser.phoneNumber || "";
    }
}

function updateBuildingStockPreview() {
    const tankCapacity = cleanNumber(document.getElementById("buildingDieselTankCapacity").value);
    const weeklyAllocation = cleanNumber(adminBuildingWeeklyAllocation);
    const currentFuel = cleanNumber(document.getElementById("buildingCurrentFuel").value);
    const requestedDiesel = cleanNumber(document.getElementById("requiredDieselLiter").value);

    const availableSpace = Math.max(0, tankCapacity - currentFuel);
    const backupHours = calculateBuildingBackupHours(currentFuel);
    const lowStockAlert = resolveLowStockAlert(tankCapacity, currentFuel, backupHours);

    setTextIfExists("tankCapacitySummary", formatNumber(tankCapacity));
    setTextIfExists("weeklyAllocationSummary", formatNumber(weeklyAllocation));
    setTextIfExists("adminWeeklyAllocationInfo", formatNumber(weeklyAllocation));
    setTextIfExists("currentFuelSummary", formatNumber(currentFuel));
    setTextIfExists("backupHoursSummary", formatNumber(backupHours));
    setTextIfExists("availableTankSpaceInfo", formatNumber(availableSpace));

    const lowStockElement = document.getElementById("lowStockAlertSummary");

    if (lowStockElement) {
        lowStockElement.innerText = lowStockAlert ? "LOW STOCK" : "NORMAL";
        lowStockElement.className = lowStockAlert ? "error-text" : "success-text";
    }

    const approvalRule = document.getElementById("approvalRuleSummary");

    if (approvalRule) {
        if (requestedDiesel > 0 && weeklyAllocation > 0 && requestedDiesel <= weeklyAllocation) {
            approvalRule.innerText = "Within weekly allocation";
            approvalRule.className = "success-text";
        } else if (requestedDiesel > weeklyAllocation && weeklyAllocation > 0) {
            approvalRule.innerText = "Exceeds weekly allocation";
            approvalRule.className = "error-text";
        } else {
            approvalRule.innerText = "Enter requested diesel";
            approvalRule.className = "muted-text";
        }
    }

    const hint = document.getElementById("requestLimitHint");

    if (hint) {
        hint.innerText =
            "Available tank space: " + formatNumber(availableSpace) +
            " L | Admin weekly allocation: " + formatNumber(weeklyAllocation) +
            " L. Within allocation may auto-approve; exceeding allocation needs admin approval.";
    }

    if (requestedDiesel > 0 && requestedDiesel > availableSpace) {
        showMessage("Requested diesel is greater than available tank space.", "error-text");
        return;
    }

    if (lowStockAlert) {
        showMessage("Low-stock alert: current diesel stock is low. Diesel request is recommended.", "error-text");
    } else {
        showMessage("Building diesel stock is currently within a safer range.", "success-text");
    }
}

function generateRequestReason() {
    const situation = getValue("outageSituation");
    const diesel = getValue("requiredDieselLiter");
    const contact = getValue("contactNumber");

    const tankCapacity = cleanNumber(document.getElementById("buildingDieselTankCapacity").value);
    const weeklyAllocation = cleanNumber(adminBuildingWeeklyAllocation);
    const currentFuel = cleanNumber(document.getElementById("buildingCurrentFuel").value);
    const backupHours = calculateBuildingBackupHours(currentFuel);
    const lowStockAlert = resolveLowStockAlert(tankCapacity, currentFuel, backupHours);
    const availableSpace = Math.max(0, tankCapacity - currentFuel);

    const situationLabel = {
        "ONGOING_OUTAGE": "ongoing outage in building thana",
        "SCHEDULED_OUTAGE": "scheduled outage announced",
        "PRECAUTIONARY_REFILL": "precautionary diesel refill"
    }[situation] || situation || "-";

    let message = "Building Generator Diesel Request.\n";
    message += "Building: " + (loggedInUser.buildingName || "-") + ".\n";
    message += "Holding Number: " + (loggedInUser.holdingNumber || "-") + ".\n";
    message += "Generator Power: " + (loggedInUser.generatorPower || "-") + " kVA.\n";
    message += "Number of Flats: " + (loggedInUser.numberOfFlats || "-") + ".\n";
    message += "Building Thana: " + (loggedInUser.buildingUnderThana || loggedInUser.thanaOrUpazila || "-") + ".\n";
    message += "Tank Capacity: " + formatNumber(tankCapacity) + " L.\n";
    message += "Admin Weekly Allocation: " + formatNumber(weeklyAllocation) + " L.\n";
    message += "Current Diesel Stock: " + formatNumber(currentFuel) + " L.\n";
    message += "Available Tank Space: " + formatNumber(availableSpace) + " L.\n";
    message += "Estimated Backup: " + formatNumber(backupHours) + " hours.\n";
    message += "Low-Stock Alert: " + (lowStockAlert ? "YES" : "NO") + ".\n";

    if (diesel) {
        const requestedDiesel = cleanNumber(diesel);
        message += "Diesel Required: " + formatNumber(requestedDiesel) + " L.\n";

        if (weeklyAllocation > 0 && requestedDiesel <= weeklyAllocation) {
            message += "Weekly Allocation Rule: within admin weekly allocation, auto-approval may apply if pump stock is available.\n";
        } else {
            message += "Weekly Allocation Rule: exceeds admin weekly allocation, admin approval is required.\n";
        }
    }

    message += "Situation: " + situationLabel + ".\n";

    if (contact) {
        message += "Contact: " + contact + ".";
    }

    setTextAreaValue("generatedReasonPreview", message.trim());
}

async function submitBuildingGeneratorRequest() {
    const userId = loggedInUser.userId || localStorage.getItem("userId");

    if (!userId) {
        showMessage("User ID not found. Please login again.", "error-text");
        return;
    }

    const outageSituation = getValue("outageSituation");
    const tankCapacity = cleanNumber(document.getElementById("buildingDieselTankCapacity").value);
    const weeklyAllocation = cleanNumber(adminBuildingWeeklyAllocation);
    const currentFuel = cleanNumber(document.getElementById("buildingCurrentFuel").value);
    const requiredDieselLiter = cleanNumber(document.getElementById("requiredDieselLiter").value);
    const contactNumber = getValue("contactNumber");

    if (!outageSituation) {
        showMessage("Please select the outage situation.", "error-text");
        return;
    }

    if (tankCapacity <= 0) {
        showMessage("Building diesel tank capacity must be greater than 0.", "error-text");
        return;
    }

    if (weeklyAllocation <= 0) {
        showMessage("Admin weekly allocation is not configured. Please contact admin.", "error-text");
        return;
    }

    if (currentFuel < 0) {
        showMessage("Current diesel stock cannot be negative.", "error-text");
        return;
    }

    if (currentFuel > tankCapacity) {
        showMessage("Current diesel stock cannot be greater than tank capacity.", "error-text");
        return;
    }

    if (!requiredDieselLiter || requiredDieselLiter < 1) {
        showMessage("Required diesel liter must be at least 1.", "error-text");
        return;
    }

    const availableSpace = tankCapacity - currentFuel;

    if (availableSpace <= 0) {
        showMessage("Building diesel tank is already full. Diesel request is not allowed.", "error-text");
        return;
    }

    if (requiredDieselLiter > availableSpace) {
        showMessage("Requested diesel cannot be greater than available tank space. Available: " + formatNumber(availableSpace) + " L", "error-text");
        return;
    }

    if (!contactNumber) {
        showMessage("Contact number is required.", "error-text");
        return;
    }

    const generatedReason = getValue("generatedReasonPreview") || "";
    const backupHours = calculateBuildingBackupHours(currentFuel);
    const lowStockAlert = resolveLowStockAlert(tankCapacity, currentFuel, backupHours);

    const approvalMessage = requiredDieselLiter <= weeklyAllocation
        ? "Within admin weekly allocation. Auto-approval may apply if pump stock is available."
        : "Exceeds admin weekly allocation. Admin approval is required.";

    const confirmed = confirm(
        "Confirm Building Generator Diesel Request?\n\n" +
        "Building: " + (loggedInUser.buildingName || "-") + "\n" +
        "Generator Power: " + (loggedInUser.generatorPower || "-") + "\n" +
        "Tank Capacity: " + formatNumber(tankCapacity) + " L\n" +
        "Admin Weekly Allocation: " + formatNumber(weeklyAllocation) + " L\n" +
        "Current Stock: " + formatNumber(currentFuel) + " L\n" +
        "Estimated Backup: " + formatNumber(backupHours) + " hours\n" +
        "Low-Stock Alert: " + (lowStockAlert ? "YES" : "NO") + "\n" +
        "Diesel Required: " + formatNumber(requiredDieselLiter) + " L\n" +
        "Approval Rule: " + approvalMessage + "\n" +
        "Contact: " + contactNumber
    );

    if (!confirmed) {
        return;
    }

    const btn = document.getElementById("submitBuildingGeneratorRequestBtn");

    if (btn) {
        btn.disabled = true;
    }

    const requestData = {
        userId: parseInt(userId),
        buildingName: loggedInUser.buildingName || "",
        buildingGeneratorPower: String(loggedInUser.generatorPower || ""),
        buildingDieselTankCapacity: tankCapacity,
        buildingCurrentFuel: currentFuel,
        requiredDieselLiter: requiredDieselLiter,
        reason: generatedReason || outageSituation,
        contactNumber: contactNumber
    };

    try {
        const response = await fetch("http://localhost:8081/api/building-generator-fuel-requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestData)
        });

        const data = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(data), "error-text");

            if (btn) {
                btn.disabled = false;
            }

            return;
        }

        loggedInUser.buildingDieselTankCapacity = tankCapacity;
        loggedInUser.buildingWeeklyAllocationLiter = weeklyAllocation;
        loggedInUser.buildingCurrentFuel = currentFuel;
        loggedInUser.buildingEstimatedBackupHours = backupHours;
        localStorage.setItem("loggedInUser", JSON.stringify(loggedInUser));

        showMessage("Generator diesel request submitted. Status: " + data.requestStatus + ".", "success-text");

        document.getElementById("buildingGeneratorRequestForm").reset();
        await loadAdminWeeklyAllocation();
        fillBuildingData();
        updateBuildingStockPreview();
        generateRequestReason();

    } catch (error) {
        showMessage("Server connection failed. Please try again.", "error-text");
    }

    if (btn) {
        btn.disabled = false;
    }
}

function calculateBuildingBackupHours(currentFuel) {
    const generatorPower = cleanNumber(loggedInUser.generatorPower);

    if (generatorPower <= 0 || currentFuel <= 0) {
        return 0;
    }

    const hourlyConsumption = generatorPower * 0.25;

    if (hourlyConsumption <= 0) {
        return 0;
    }

    return currentFuel / hourlyConsumption;
}

function resolveLowStockAlert(tankCapacity, currentFuel, backupHours) {
    if (tankCapacity <= 0 || currentFuel <= 0) {
        return true;
    }

    const stockPercentage = (currentFuel * 100) / tankCapacity;

    return stockPercentage <= 20 || backupHours < 6;
}

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            localStorage.clear();
        });
    }
}

function getValue(id) {
    const element = document.getElementById(id);

    if (!element) {
        return "";
    }

    return element.value.trim();
}

function setTextIfExists(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.innerText = value;
    }
}

function setTextAreaValue(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.value = value;
    }
}

function setInputValueIfEmpty(id, value) {
    const element = document.getElementById(id);

    if (!element || element.value) {
        return;
    }

    if (value === null || value === undefined || value === "" || Number(value) <= 0) {
        return;
    }

    element.value = Number(value).toFixed(2);
}

function showMessage(message, className) {
    const element = document.getElementById("buildingGeneratorRequestMessage");

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

function cleanNumber(value) {
    if (value === null || value === undefined || value === "") {
        return 0;
    }

    return Number(String(value).replace("L", "").replace("hours", "").replace("kVA", "").replace("KVA", "").trim()) || 0;
}

function formatNumber(value) {
    const numberValue = Number(value);

    if (Number.isNaN(numberValue)) {
        return "0.00";
    }

    return numberValue.toFixed(2);
}