const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;
let currentPumpId = null;

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    if (loggedInUser.role !== "PUMP_AUTHORITY") {
        alert("Only pump authority should access pump stock management.");
    }

    setupEvents();
    loadPumpByUser();
});

function setupEvents() {
    document.getElementById("createPumpProfileBtn").addEventListener("click", function () {
        createOrLoadPumpProfile();
    });

    document.getElementById("pumpStockForm").addEventListener("submit", function (event) {
        event.preventDefault();
        updatePumpStock();
    });

    document.getElementById("open24Hours").addEventListener("change", function () {
        toggleTimeFields();
    });

    document.getElementById("setOpenBtn").addEventListener("click", function () {
        updatePumpStatus("OPEN");
    });

    document.getElementById("setClosedBtn").addEventListener("click", function () {
        updatePumpStatus("CLOSED");
    });

    document.querySelectorAll("input[name='pumpFuelTypes']").forEach(function (checkbox) {
        checkbox.addEventListener("change", function () {
            toggleFuelStockInputs(checkbox.value, checkbox.checked);
        });
    });

    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            localStorage.clear();
        });
    }

    ["PETROL", "OCTANE", "DIESEL", "CNG"].forEach(function (fuelType) {
        toggleFuelStockInputs(fuelType, false);
    });
}

async function loadPumpByUser() {
    const userId = loggedInUser.userId || localStorage.getItem("userId");

    try {
        const response = await fetch("http://localhost:8081/api/pumps/user/" + userId);
        const pump = await response.json();

        if (response.ok) {
            fillPumpData(pump);
            showMessage("pumpProfileMessage", "Pump profile loaded.", "success-text");
        } else {
            showMessage("pumpProfileMessage", "No pump profile found. Click Create / Load Pump Profile.", "error-text");
        }

    } catch (error) {
        showMessage("pumpProfileMessage", "Could not load pump profile. Click Create / Load Pump Profile.", "error-text");
    }
}

async function createOrLoadPumpProfile() {
    const userId = loggedInUser.userId || localStorage.getItem("userId");

    try {
        const response = await fetch("http://localhost:8081/api/pumps/create-from-user/" + userId, {
            method: "POST"
        });

        const pump = await response.json();

        if (response.ok) {
            fillPumpData(pump);
            showMessage("pumpProfileMessage", "Pump profile is ready.", "success-text");
        } else {
            showMessage("pumpProfileMessage", getErrorMessage(pump), "error-text");
        }

    } catch (error) {
        showMessage("pumpProfileMessage", "Server connection failed while creating pump profile.", "error-text");
    }
}

function fillPumpData(pump) {
    currentPumpId = pump.id;

    document.getElementById("pumpNameSummary").innerText = valueOrDash(pump.pumpName);
    document.getElementById("pumpStatusSummary").innerText = valueOrDash(pump.pumpStatus);
    document.getElementById("fuelCapacitySummary").innerText = valueOrDash(pump.totalFuelCapacity);
    document.getElementById("currentStockSummary").innerText = valueOrDash(pump.totalCurrentStock);

    document.getElementById("ownerName").innerText = valueOrDash(pump.ownerName);
    document.getElementById("phoneNumber").innerText = valueOrDash(pump.phoneNumber);
    document.getElementById("businessLicenseNumber").innerText = valueOrDash(pump.businessLicenseNumber);
    document.getElementById("pumpAddress").innerText = valueOrDash(pump.pumpAddress);
    document.getElementById("fuelTypesPreview").innerText = valueOrDash(pump.fuelTypes);
    document.getElementById("availableCapacity").innerText = valueOrDash(pump.totalAvailableStock);

    document.getElementById("open24Hours").checked = pump.open24Hours === true;
    document.getElementById("openingTime").value = pump.openingTime || "";
    document.getElementById("closingTime").value = pump.closingTime || "";

    clearAllFuelStockInputs();

    if (pump.fuelStocks && pump.fuelStocks.length > 0) {
        pump.fuelStocks.forEach(function (stock) {
            setFuelStockInput(stock.fuelType, stock.fuelCapacity, stock.currentStock);
        });
    }

    toggleTimeFields();
}

function setFuelStockInput(fuelType, capacity, currentStock) {
    const checkbox = document.querySelector("input[name='pumpFuelTypes'][value='" + fuelType + "']");
    checkbox.checked = true;
    toggleFuelStockInputs(fuelType, true);

    const ids = getFuelInputIds(fuelType);
    document.getElementById(ids.capacityId).value = capacity;
    document.getElementById(ids.stockId).value = currentStock;
}

function clearAllFuelStockInputs() {
    ["PETROL", "OCTANE", "DIESEL", "CNG"].forEach(function (fuelType) {
        const checkbox = document.querySelector("input[name='pumpFuelTypes'][value='" + fuelType + "']");
        checkbox.checked = false;

        const ids = getFuelInputIds(fuelType);
        document.getElementById(ids.capacityId).value = "";
        document.getElementById(ids.stockId).value = "";

        toggleFuelStockInputs(fuelType, false);
    });
}

async function updatePumpStock() {
    if (!currentPumpId) {
        showMessage("stockMessage", "Please create/load pump profile first.", "error-text");
        return;
    }

    const fuelStocks = getSelectedFuelStocks();
    const open24Hours = document.getElementById("open24Hours").checked;
    const openingTime = open24Hours ? null : document.getElementById("openingTime").value;
    const closingTime = open24Hours ? null : document.getElementById("closingTime").value;

    if (fuelStocks.length === 0) {
        showMessage("stockMessage", "Select at least one fuel type.", "error-text");
        return;
    }

    for (const stock of fuelStocks) {
        if (!stock.fuelCapacity || stock.fuelCapacity <= 0) {
            showMessage("stockMessage", stock.fuelType + " capacity must be greater than 0.", "error-text");
            return;
        }

        if (stock.currentStock < 0) {
            showMessage("stockMessage", stock.fuelType + " current stock cannot be negative.", "error-text");
            return;
        }

        if (stock.currentStock > stock.fuelCapacity) {
            showMessage("stockMessage", stock.fuelType + " current stock cannot be greater than capacity.", "error-text");
            return;
        }
    }

    if (!open24Hours && (!openingTime || !closingTime)) {
        showMessage("stockMessage", "Opening and closing time are required if pump is not open 24 hours.", "error-text");
        return;
    }

    const data = {
        fuelStocks: fuelStocks,
        open24Hours: open24Hours,
        openingTime: openingTime,
        closingTime: closingTime
    };

    try {
        const response = await fetch("http://localhost:8081/api/pumps/" + currentPumpId + "/stock", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const pump = await response.json();

        if (response.ok) {
            fillPumpData(pump);
            showMessage("stockMessage", "Pump fuel type wise stock updated successfully.", "success-text");
        } else {
            showMessage("stockMessage", getErrorMessage(pump), "error-text");
        }

    } catch (error) {
        showMessage("stockMessage", "Server connection failed while updating stock.", "error-text");
    }
}

function getSelectedFuelStocks() {
    const fuelStocks = [];

    document.querySelectorAll("input[name='pumpFuelTypes']:checked").forEach(function (checkbox) {
        const fuelType = checkbox.value;
        const ids = getFuelInputIds(fuelType);

        fuelStocks.push({
            fuelType: fuelType,
            fuelCapacity: Number(document.getElementById(ids.capacityId).value),
            currentStock: Number(document.getElementById(ids.stockId).value)
        });
    });

    return fuelStocks;
}

function getFuelInputIds(fuelType) {
    if (fuelType === "PETROL") {
        return { capacityId: "petrolCapacity", stockId: "petrolStock" };
    }

    if (fuelType === "OCTANE") {
        return { capacityId: "octaneCapacity", stockId: "octaneStock" };
    }

    if (fuelType === "DIESEL") {
        return { capacityId: "dieselCapacity", stockId: "dieselStock" };
    }

    return { capacityId: "cngCapacity", stockId: "cngStock" };
}

function toggleFuelStockInputs(fuelType, enabled) {
    const ids = getFuelInputIds(fuelType);

    document.getElementById(ids.capacityId).disabled = !enabled;
    document.getElementById(ids.stockId).disabled = !enabled;

    if (!enabled) {
        document.getElementById(ids.capacityId).value = "";
        document.getElementById(ids.stockId).value = "";
    }
}

async function updatePumpStatus(status) {
    if (!currentPumpId) {
        showMessage("statusMessage", "Please create/load pump profile first.", "error-text");
        return;
    }

    const confirmed = confirm("Set pump status to " + status + "?");

    if (!confirmed) {
        return;
    }

    const data = {
        pumpStatus: status
    };

    try {
        const response = await fetch("http://localhost:8081/api/pumps/" + currentPumpId + "/status", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const pump = await response.json();

        if (response.ok) {
            fillPumpData(pump);
            showMessage("statusMessage", "Pump status updated to " + status + ".", "success-text");
        } else {
            showMessage("statusMessage", getErrorMessage(pump), "error-text");
        }

    } catch (error) {
        showMessage("statusMessage", "Server connection failed while updating status.", "error-text");
    }
}

function toggleTimeFields() {
    const open24Hours = document.getElementById("open24Hours").checked;
    const openingTimeField = document.getElementById("pumpTimeFields");
    const closingTimeField = document.getElementById("pumpClosingTimeField");

    if (open24Hours) {
        openingTimeField.style.display = "none";
        closingTimeField.style.display = "none";
        document.getElementById("openingTime").value = "";
        document.getElementById("closingTime").value = "";
    } else {
        openingTimeField.style.display = "block";
        closingTimeField.style.display = "block";
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

function valueOrDash(value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    return value;
}