let loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;
let currentWeeklyAllocation = 0;

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
    await loadBuildingAllocation();
    fillBuildingData();
    setupEvents();
    updatePreview();
    generateDefaultReason();
});

function setupEvents() {
    const form = document.getElementById("weeklyIncreaseRequestForm");

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        submitWeeklyIncreaseRequest();
    });

    document.getElementById("buildingDieselTankCapacity").addEventListener("input", updatePreview);
    document.getElementById("buildingCurrentFuel").addEventListener("input", updatePreview);

    document.getElementById("requiredDieselLiter").addEventListener("input", function () {
        updatePreview();
        generateDefaultReason();
    });

    document.getElementById("increaseReasonType").addEventListener("change", function () {
        toggleCustomReasonBox();
        generateDefaultReason();
    });

    document.getElementById("customReasonText").addEventListener("input", generateDefaultReason);
    document.getElementById("contactNumber").addEventListener("input", generateDefaultReason);
}

function toggleCustomReasonBox() {
    const reasonType = document.getElementById("increaseReasonType").value;
    const customReasonBox = document.getElementById("customReasonBox");

    if (!customReasonBox) {
        return;
    }

    if (reasonType === "OTHERS") {
        customReasonBox.style.display = "block";
    } else {
        customReasonBox.style.display = "none";
        document.getElementById("customReasonText").value = "";
    }
}

async function loadBuildingAllocation() {
    const userId = getLoggedInUserId();

    if (!userId) {
        showMessage("User ID not found. Please login again.", "error-text");
        return;
    }

    try {
        const response = await fetch("http://localhost:8081/api/users/" + userId + "/building-allocation?time=" + Date.now());
        const allocation = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(allocation), "error-text");
            return;
        }

        currentWeeklyAllocation = cleanNumber(allocation.currentWeeklyAllocationLiter);

        loggedInUser.buildingWeeklyAllocationLiter = currentWeeklyAllocation;
        localStorage.setItem("buildingWeeklyAllocationLiter", currentWeeklyAllocation);
        localStorage.setItem("loggedInUser", JSON.stringify(loggedInUser));

    } catch (error) {
        showMessage("Server connection failed while loading building allocation.", "error-text");
    }
}

function fillBuildingData() {
    setTextIfExists("buildingNameSummary", loggedInUser.buildingName || "-");
    setTextIfExists("numberOfFlatsSummary", loggedInUser.numberOfFlats || "-");
    setTextIfExists("generatorPowerSummary", loggedInUser.generatorPower || "-");
    setTextIfExists("weeklyAllocationSummary", formatNumber(currentWeeklyAllocation));

    setInputValueIfExists("buildingDieselTankCapacity", cleanNumber(loggedInUser.buildingDieselTankCapacity));
    setInputValueIfExists("buildingCurrentFuel", cleanNumber(loggedInUser.buildingCurrentFuel));

    const contactInput = document.getElementById("contactNumber");

    if (contactInput) {
        contactInput.value = loggedInUser.phoneNumber || "";
    }
}

function updatePreview() {
    const tankCapacity = cleanNumber(document.getElementById("buildingDieselTankCapacity").value);
    const currentFuel = cleanNumber(document.getElementById("buildingCurrentFuel").value);
    const requestedDiesel = cleanNumber(document.getElementById("requiredDieselLiter").value);

    const availableSpace = Math.max(0, tankCapacity - currentFuel);
    const projectedStockAfterRequest = currentFuel + requestedDiesel;
    const remainingWeeklyAllocation = Math.max(0, currentWeeklyAllocation - currentFuel);

    setTextIfExists("currentFuelSummary", formatNumber(currentFuel));
    setTextIfExists("availableTankSpaceSummary", formatNumber(availableSpace));

    const hint = document.getElementById("requestHint");

    if (hint) {
        hint.innerText =
            "Weekly allocation: " + formatNumber(currentWeeklyAllocation) +
            " L | Current stock: " + formatNumber(currentFuel) +
            " L | Remaining weekly allocation: " + formatNumber(remainingWeeklyAllocation) +
            " L | Available tank space: " + formatNumber(availableSpace) + " L.";
    }

    if (requestedDiesel <= 0) {
        showMessage("Enter requested diesel amount to check approval rule.", "success-text");
        return;
    }

    if (requestedDiesel > availableSpace) {
        showMessage(
            "Requested diesel cannot be greater than available tank space. Available space: " +
            formatNumber(availableSpace) + " L.",
            "error-text"
        );
        return;
    }

    if (projectedStockAfterRequest <= currentWeeklyAllocation) {
        showMessage(
            "This amount is still within weekly allocation. Current stock + request = " +
            formatNumber(projectedStockAfterRequest) +
            " L / " +
            formatNumber(currentWeeklyAllocation) +
            " L. Use normal Generator Request for auto-approval.",
            "success-text"
        );
        return;
    }

    showMessage(
        "This request crosses weekly allocation. Current stock + request = " +
        formatNumber(projectedStockAfterRequest) +
        " L, but weekly allocation is " +
        formatNumber(currentWeeklyAllocation) +
        " L. Admin approval is required.",
        "error-text"
    );
}


function getSelectedIncreaseReason() {
    const reasonType = document.getElementById("increaseReasonType").value;
    const customReason = document.getElementById("customReasonText").value.trim();

    const reasonLabels = {
        EXTENDED_OUTAGE: "Extended power outage",
        LOW_CURRENT_STOCK: "Current diesel stock is low",
        MORE_FLATS_NEED_SUPPORT: "More flats need emergency support",
        SCHEDULED_MAINTENANCE_OUTAGE: "Scheduled maintenance outage",
        EMERGENCY_BACKUP_PREPARATION: "Emergency backup preparation",
        OTHERS: customReason || "Others"
    };

    return reasonLabels[reasonType] || "";
}

function generateDefaultReason() {
    const requestedDiesel = cleanNumber(document.getElementById("requiredDieselLiter").value);
    const tankCapacity = cleanNumber(document.getElementById("buildingDieselTankCapacity").value);
    const currentFuel = cleanNumber(document.getElementById("buildingCurrentFuel").value);
    const availableSpace = Math.max(0, tankCapacity - currentFuel);
    const projectedStockAfterRequest = currentFuel + requestedDiesel;
    const remainingWeeklyAllocation = Math.max(0, currentWeeklyAllocation - currentFuel);
    const contactNumber = document.getElementById("contactNumber").value.trim();
    const selectedReason = getSelectedIncreaseReason();

    let reason = "Weekly allocation increase request for building generator diesel support.\n";
    reason += "Building: " + (loggedInUser.buildingName || "-") + ".\n";
    reason += "Holding Number: " + (loggedInUser.holdingNumber || "-") + ".\n";
    reason += "Building Thana: " + (loggedInUser.buildingUnderThana || loggedInUser.thanaOrUpazila || "-") + ".\n";
    reason += "Number of Flats: " + (loggedInUser.numberOfFlats || "-") + ".\n";
    reason += "Generator Power: " + (loggedInUser.generatorPower || "-") + " kVA.\n";
    reason += "Current Weekly Allocation: " + formatNumber(currentWeeklyAllocation) + " L.\n";
    reason += "Current Diesel Stock: " + formatNumber(currentFuel) + " L.\n";
    reason += "Remaining Weekly Allocation: " + formatNumber(remainingWeeklyAllocation) + " L.\n";
    reason += "Tank Capacity: " + formatNumber(tankCapacity) + " L.\n";
    reason += "Available Tank Space: " + formatNumber(availableSpace) + " L.\n";

    if (selectedReason) {
        reason += "Selected Reason: " + selectedReason + ".\n";
    }

    if (requestedDiesel > 0) {
        reason += "Requested Extra Diesel: " + formatNumber(requestedDiesel) + " L.\n";
        reason += "Projected Stock After Request: " + formatNumber(projectedStockAfterRequest) + " L.\n";

        if (projectedStockAfterRequest > currentWeeklyAllocation) {
            reason += "Approval Rule: current stock plus requested diesel exceeds weekly allocation, so admin approval is required.\n";
        } else {
            reason += "Approval Rule: current stock plus requested diesel is still within weekly allocation.\n";
        }
    }

    if (contactNumber) {
        reason += "Contact: " + contactNumber + ".";
    }

    document.getElementById("reason").value = reason.trim();
}

async function submitWeeklyIncreaseRequest() {
    const userId = getLoggedInUserId();

    if (!userId) {
        showMessage("User ID not found. Please login again.", "error-text");
        return;
    }

    const tankCapacity = cleanNumber(document.getElementById("buildingDieselTankCapacity").value);
    const currentFuel = cleanNumber(document.getElementById("buildingCurrentFuel").value);
    const requestedDiesel = roundToTwoDecimals(cleanNumber(document.getElementById("requiredDieselLiter").value));
    const contactNumber = document.getElementById("contactNumber").value.trim();
    const selectedReasonType = document.getElementById("increaseReasonType").value;
    const customReasonText = document.getElementById("customReasonText").value.trim();
    const reason = document.getElementById("reason").value.trim();

    if (tankCapacity <= 0) {
        showMessage("Diesel tank capacity must be greater than 0.", "error-text");
        return;
    }

    if (currentFuel < 0) {
        showMessage("Current diesel stock cannot be negative.", "error-text");
        return;
    }

    if (currentFuel > tankCapacity) {
        showMessage("Current stock cannot be greater than tank capacity.", "error-text");
        return;
    }

    const availableSpace = tankCapacity - currentFuel;

    if (availableSpace <= 0) {
        showMessage("Tank is already full. Extra diesel request is not allowed.", "error-text");
        return;
    }

    if (!requestedDiesel || requestedDiesel < 1) {
        showMessage("Requested diesel must be at least 1 L.", "error-text");
        return;
    }

    if (requestedDiesel > availableSpace) {
        showMessage("Requested diesel cannot be greater than available tank space. Available: " + formatNumber(availableSpace) + " L", "error-text");
        return;
    }

    if (!contactNumber) {
        showMessage("Contact number is required.", "error-text");
        return;
    }

    if (!selectedReasonType) {
        showMessage("Please select a reason for weekly allocation increase.", "error-text");
        return;
    }

    if (selectedReasonType === "OTHERS" && !customReasonText) {
        showMessage("Please write your custom reason.", "error-text");
        return;
    }

    if (!reason) {
        showMessage("Reason is required.", "error-text");
        return;
    }

    const projectedStockAfterRequest = currentFuel + requestedDiesel;
    const remainingWeeklyAllocation = Math.max(0, currentWeeklyAllocation - currentFuel);
    const needsAdminApproval = projectedStockAfterRequest > currentWeeklyAllocation;

    const confirmed = confirm(
        "Submit weekly allocation increase request?\n\n" +
        "Current Weekly Allocation: " + formatNumber(currentWeeklyAllocation) + " L\n" +
        "Current Diesel Stock: " + formatNumber(currentFuel) + " L\n" +
        "Remaining Weekly Allocation: " + formatNumber(remainingWeeklyAllocation) + " L\n" +
        "Requested Diesel: " + formatNumber(requestedDiesel) + " L\n" +
        "Projected Stock After Request: " + formatNumber(projectedStockAfterRequest) + " L\n" +
        "Available Tank Space: " + formatNumber(availableSpace) + " L\n\n" +
        "Approval Rule: " + (needsAdminApproval ? "Admin approval required." : "Within weekly allocation.")
    );
    if (!confirmed) {
        return;
    }

    const btn = document.getElementById("submitIncreaseRequestBtn");

    if (btn) {
        btn.disabled = true;
    }

    const requestData = {
        userId: Number(userId),
        buildingName: loggedInUser.buildingName || "",
        buildingGeneratorPower: String(loggedInUser.generatorPower || ""),
        buildingDieselTankCapacity: tankCapacity,
        buildingCurrentFuel: currentFuel,
        requiredDieselLiter: requestedDiesel,
        reason: reason,
        contactNumber: contactNumber
    };

    try {
        const response = await fetch("http://localhost:8081/api/building-generator-fuel-requests", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestData)
        });

        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");

            if (btn) {
                btn.disabled = false;
            }

            return;
        }

        loggedInUser.buildingDieselTankCapacity = tankCapacity;
        loggedInUser.buildingCurrentFuel = currentFuel;
        localStorage.setItem("loggedInUser", JSON.stringify(loggedInUser));

        showMessage(
            "Weekly allocation increase request submitted successfully. Status: " + result.requestStatus + ".",
            "success-text"
        );

        document.getElementById("weeklyIncreaseRequestForm").reset();
        await loadBuildingAllocation();
        fillBuildingData();
        updatePreview();
        generateDefaultReason();

    } catch (error) {
        showMessage("Server connection failed while submitting request.", "error-text");
    }

    if (btn) {
        btn.disabled = false;
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

function showMessage(message, className) {
    const element = document.getElementById("increaseRequestMessage");

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

function setTextIfExists(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.innerText = value;
    }
}

function setInputValueIfExists(id, value) {
    const element = document.getElementById(id);

    if (!element) {
        return;
    }

    if (value === null || value === undefined || value === "" || Number(value) <= 0) {
        return;
    }

    element.value = Number(value).toFixed(2);
}

function cleanNumber(value) {
    if (value === null || value === undefined || value === "" || value === "-") {
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

function roundToTwoDecimals(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}