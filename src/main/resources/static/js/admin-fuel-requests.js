const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

let vehicles = [];
let fuelSettings = null;
let selectedVehicle = null;

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    setupLogout();
    setupEvents();
    loadInitialData();
});

function setupEvents() {
    document.getElementById("vehicleSelect").addEventListener("change", function () {
        handleVehicleSelection();
    });

    document.getElementById("fuelType").addEventListener("change", function () {
        updateFuelRequestCalculation("liter");
    });

    document.getElementById("requestedLiter").addEventListener("input", function () {
        updateFuelRequestCalculation("liter");
    });

    document.getElementById("requestedAmountBdt").addEventListener("input", function () {
        updateFuelRequestCalculation("bdt");
    });

    document.getElementById("extraFuelReasonType").addEventListener("change", function () {
        updateExtraFuelMessage();
    });

    document.getElementById("currentOdometerReading").addEventListener("input", function () {
        updateOdometerPreview();
    });

    document.getElementById("fuelRequestForm").addEventListener("submit", function (event) {
        event.preventDefault();
        submitFuelRequest();
    });
}

async function loadInitialData() {
    await loadFuelSettings();
    await loadVehicles();
}

async function loadFuelSettings() {
    try {
        const response = await fetch("http://localhost:8081/api/admin/fuel-settings");
        fuelSettings = await response.json();

        if (!response.ok) {
            showMessage("fuelRequestMessage", "Failed to load fuel settings.", "error-text");
        }

    } catch (error) {
        showMessage("fuelRequestMessage", "Server connection failed while loading fuel settings.", "error-text");
    }
}

async function loadVehicles() {
    const userId = loggedInUser.userId || localStorage.getItem("userId");

    try {
        const response = await fetch("http://localhost:8081/api/vehicles/user/" + userId);
        vehicles = await response.json();

        const vehicleSelect = document.getElementById("vehicleSelect");
        vehicleSelect.innerHTML = `<option value="">Select saved vehicle</option>`;

        if (!response.ok) {
            showMessage("fuelRequestMessage", "Failed to load vehicles.", "error-text");
            return;
        }

        if (vehicles.length === 0) {
            vehicleSelect.innerHTML = `<option value="">No vehicle found. Add vehicle first.</option>`;
            showMessage("fuelRequestMessage", "Please add a vehicle before requesting fuel.", "error-text");
            return;
        }

        vehicles.forEach(function (vehicle) {
            const option = document.createElement("option");
            option.value = vehicle.id;
            option.innerText = vehicle.brand + " " + vehicle.model + " - " + vehicle.numberPlate;
            vehicleSelect.appendChild(option);
        });

    } catch (error) {
        showMessage("fuelRequestMessage", "Server connection failed while loading vehicles.", "error-text");
    }
}

function handleVehicleSelection() {
    const vehicleId = Number(document.getElementById("vehicleSelect").value);

    selectedVehicle = vehicles.find(function (vehicle) {
        return vehicle.id === vehicleId;
    });

    const fuelTypeSelect = document.getElementById("fuelType");
    fuelTypeSelect.innerHTML = `<option value="">Select fuel type</option>`;

    if (!selectedVehicle) {
        clearVehiclePreview();
        return;
    }

    const companyMileage = Number(selectedVehicle.companyMileage || 0);
    const effectiveMileage = calculateEffectiveMileage(companyMileage);

    document.getElementById("vehicleType").value = selectedVehicle.vehicleType;
    document.getElementById("numberPlate").value = selectedVehicle.numberPlate;
    document.getElementById("companyMileage").value = companyMileage.toFixed(2) + " km/l";
    document.getElementById("effectiveMileage").value = effectiveMileage.toFixed(2) + " km/l";
    document.getElementById("tankCapacity").value = Number(selectedVehicle.tankCapacity || 0).toFixed(2) + " liter";
    document.getElementById("savedCurrentFuelLiter").value = Number(selectedVehicle.currentFuelLiter || 0).toFixed(2) + " L";
    document.getElementById("normalFuelLimit").value = getFixedFuelLimitByVehicle() + " BDT";
    updateFuelLevelFromSavedFuel();
    document.getElementById("lastVerifiedOdometer").value = selectedVehicle.odometerReading + " km";

    const option = document.createElement("option");
    option.value = selectedVehicle.fuelType;
    option.innerText = selectedVehicle.fuelType;
    fuelTypeSelect.appendChild(option);

    fuelTypeSelect.value = selectedVehicle.fuelType;

    updateCostPreview();
    updateFuelLevelFromApproxLiter();
    updateOdometerPreview();
}

function updateCostPreview() {
    const fuelType = document.getElementById("fuelType").value;
    const requestedLiter = Number(document.getElementById("requestedLiter").value);

    document.getElementById("selectedFuelTypePreview").innerText = fuelType || "-";

    if (!fuelSettings || !fuelType) {
        document.getElementById("pricePerUnitPreview").innerText = "0";
        document.getElementById("estimatedCostPreview").innerText = "0";
        return;
    }

    const price = getPriceByFuelType(fuelType);

    document.getElementById("pricePerUnitPreview").innerText = price;

    if (!requestedLiter || requestedLiter <= 0) {
        document.getElementById("estimatedCostPreview").innerText = "0";
        return;
    }

    const estimatedCost = requestedLiter * price;
    document.getElementById("estimatedCostPreview").innerText = estimatedCost.toFixed(2);
}

function updateOdometerPreview() {
    if (!selectedVehicle) {
        return;
    }

    const currentOdometer = Number(document.getElementById("currentOdometerReading").value);
    const previousOdometer = Number(selectedVehicle.odometerReading || 0);
    const companyMileage = Number(selectedVehicle.companyMileage || 0);
    const effectiveMileage = calculateEffectiveMileage(companyMileage);
    const tank = Number(selectedVehicle.tankCapacity || 0);

    const fullTankRange = effectiveMileage * tank;
    let distanceTravelled = currentOdometer - previousOdometer;

    if (!currentOdometer || currentOdometer < previousOdometer) {
        distanceTravelled = 0;
    }

    let remainingRange = fullTankRange - distanceTravelled;

    if (remainingRange < 0) {
        remainingRange = 0;
    }

    document.getElementById("effectiveMileage").value = effectiveMileage.toFixed(2) + " km/l";
    document.getElementById("fullTankRangePreview").value = fullTankRange.toFixed(2) + " km";
    document.getElementById("distanceTravelledPreview").value = distanceTravelled.toFixed(2) + " km";
    document.getElementById("remainingRangePreview").innerText = remainingRange.toFixed(2);

    if (!currentOdometer) {
        return;
    }

    if (currentOdometer < previousOdometer) {
        showMessage("fuelRequestMessage", "Current odometer cannot be less than last verified odometer.", "error-text");
        return;
    }

    if (remainingRange <= 5) {
        showMessage("fuelRequestMessage", "Odometer eligible. Estimated remaining range is 5 km or less.", "success-text");
    } else {
        showMessage("fuelRequestMessage", "Not eligible yet. Estimated remaining range must be 5 km or less.", "error-text");
    }
}

function getPriceByFuelType(fuelType) {
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

async function submitFuelRequest() {
    if (!selectedVehicle) {
        showMessage("fuelRequestMessage", "Please select a vehicle.", "error-text");
        return;
    }

    const fuelType = document.getElementById("fuelType").value;
    const requestedLiter = Number(document.getElementById("requestedLiter").value);

    updateFuelLevelFromApproxLiter();

    const fuelLevelStatus = document.getElementById("fuelLevelStatus").value;
    const currentFuelLiter = Number(document.getElementById("currentFuelLiter").value);
    const tankCapacity = Number(selectedVehicle.tankCapacity || 0);
    const currentOdometerReading = Number(document.getElementById("currentOdometerReading").value);

    if (!fuelType) {
        showMessage("fuelRequestMessage", "Please select fuel type.", "error-text");
        return;
    }

    if (!requestedLiter || requestedLiter <= 0) {
        showMessage("fuelRequestMessage", "Requested amount must be greater than 0.", "error-text");
        return;
    }

    if (!fuelLevelStatus) {
        showMessage("fuelRequestMessage", "Please select current fuel level.", "error-text");
        return;
    }
    if (currentFuelLiter < 0 || currentFuelLiter > tankCapacity) {
        showMessage("fuelRequestMessage", "Approx fuel must be between 0 and tank capacity.", "error-text");
        return;
    }

    if (!fuelLevelStatus) {
        showMessage("fuelRequestMessage", "Auto fuel level could not be calculated. Please enter approximate fuel.", "error-text");
        return;
    }

    if (!currentOdometerReading || currentOdometerReading < 0) {
        showMessage("fuelRequestMessage", "Please enter valid current odometer reading.", "error-text");
        return;
    }

    const previousOdometer = Number(selectedVehicle.odometerReading || 0);

    if (currentOdometerReading < previousOdometer) {
        showMessage("fuelRequestMessage", "Current odometer cannot be less than last verified odometer.", "error-text");
        return;
    }

    const companyMileage = Number(selectedVehicle.companyMileage || 0);
    const effectiveMileage = calculateEffectiveMileage(companyMileage);
    const tank = Number(selectedVehicle.tankCapacity || 0);
    const fullTankRange = effectiveMileage * tank;
    const distanceTravelled = currentOdometerReading - previousOdometer;
    const remainingRange = Math.max(0, fullTankRange - distanceTravelled);

    if (remainingRange > 5) {
        showMessage("fuelRequestMessage", "Cannot submit. Estimated remaining range is " + remainingRange.toFixed(2) + " km. It must be 5 km or less.", "error-text");
        return;
    }

    const data = {
        userId: Number(loggedInUser.userId || localStorage.getItem("userId")),
        vehicleId: selectedVehicle.id,
        fuelType: fuelType,
        requestedLiter: requestedLiter,
        fuelLevelStatus: fuelLevelStatus,
        currentOdometerReading: currentOdometerReading
    };

    try {
        const response = await fetch("http://localhost:8081/api/fuel-requests", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            showMessage("fuelRequestMessage", "Fuel request submitted successfully.", "success-text");
            document.getElementById("fuelRequestForm").reset();
            clearVehiclePreview();

            setTimeout(function () {
                window.location.href = "fuel-request-history.html";
            }, 1000);
        } else {
            showMessage("fuelRequestMessage", getErrorMessage(result), "error-text");
        }

    } catch (error) {
        showMessage("fuelRequestMessage", "Server connection failed while submitting request.", "error-text");
    }
}

function clearVehiclePreview() {
    document.getElementById("fuelType").innerHTML = `<option value="">Select fuel type</option>`;
    document.getElementById("vehicleType").value = "";
    document.getElementById("numberPlate").value = "";
    document.getElementById("companyMileage").value = "";
    document.getElementById("tankCapacity").value = "";
    document.getElementById("lastVerifiedOdometer").value = "";
    document.getElementById("currentOdometerReading").value = "";
    document.getElementById("distanceTravelledPreview").value = "";
    document.getElementById("fullTankRangePreview").value = "";
    document.getElementById("selectedFuelTypePreview").innerText = "-";
    document.getElementById("pricePerUnitPreview").innerText = "0";
    document.getElementById("estimatedCostPreview").innerText = "0";
    document.getElementById("remainingRangePreview").innerText = "0";
    if (document.getElementById("effectiveMileage")) {
        document.getElementById("effectiveMileage").value = "";
    }
    document.getElementById("currentFuelLiter").value = "";
    document.getElementById("fuelLevelStatus").value = "";
    document.getElementById("effectiveMileage").value = "";
}

function showMessage(id, message, className) {
    const element = document.getElementById(id);

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
            window.location.href = "login.html";
        });
    }
}

function updateFuelLevelPreview() {
    const fuelLevelStatus = document.getElementById("fuelLevelStatus").value;

    if (fuelLevelStatus === "EMPTY" || fuelLevelStatus === "LOW") {
        showMessage("fuelRequestMessage", "Low fuel selected. Odometer eligibility will still be checked.", "success-text");
        return;
    }

    if (fuelLevelStatus === "MEDIUM" || fuelLevelStatus === "HIGH") {
        showMessage("fuelRequestMessage", "Fuel level selected. Odometer eligibility is still required.", "error-text");
    }
}

function calculateEffectiveMileage(companyMileage) {
    if (!companyMileage || companyMileage <= 0) {
        return 6;
    }

    let mileageReduction;

    if (companyMileage <= 10) {
        mileageReduction = 3;
    } else {
        mileageReduction = 8;
    }

    const effectiveMileage = companyMileage - mileageReduction;

    if (effectiveMileage < 6) {
        return 6;
    }

    return effectiveMileage;
}

function updateFuelLevelFromApproxLiter() {
    if (!selectedVehicle) {
        document.getElementById("fuelLevelStatus").value = "";
        return;
    }

    const currentFuelLiter = Number(document.getElementById("currentFuelLiter").value);
    const tankCapacity = Number(selectedVehicle.tankCapacity || 0);

    if (currentFuelLiter < 0) {
        document.getElementById("fuelLevelStatus").value = "";
        showMessage("fuelRequestMessage", "Approx fuel cannot be negative.", "error-text");
        return;
    }

    if (!tankCapacity || tankCapacity <= 0) {
        document.getElementById("fuelLevelStatus").value = "";
        return;
    }

    if (currentFuelLiter > tankCapacity) {
        document.getElementById("fuelLevelStatus").value = "";
        showMessage("fuelRequestMessage", "Approx fuel cannot be greater than tank capacity.", "error-text");
        return;
    }

    const fuelPercentage = (currentFuelLiter / tankCapacity) * 100;
    let fuelLevelStatus = "";

    if (fuelPercentage <= 5) {
        fuelLevelStatus = "EMPTY";
    } else if (fuelPercentage <= 25) {
        fuelLevelStatus = "LOW";
    } else if (fuelPercentage <= 60) {
        fuelLevelStatus = "MEDIUM";
    } else {
        fuelLevelStatus = "HIGH";
    }

    document.getElementById("fuelLevelStatus").value = fuelLevelStatus;
}

function getFixedFuelLimitByVehicle() {
    if (!selectedVehicle) {
        return 0;
    }

    if (selectedVehicle.vehicleType === "BIKE") {
        return 500;
    }

    return 2000;
}

function updateFuelLevelFromSavedFuel() {
    if (!selectedVehicle) {
        document.getElementById("fuelLevelStatus").value = "";
        return;
    }

    const currentFuelLiter = Number(selectedVehicle.currentFuelLiter || 0);
    const tankCapacity = Number(selectedVehicle.tankCapacity || 0);

    if (!tankCapacity || tankCapacity <= 0) {
        document.getElementById("fuelLevelStatus").value = "";
        return;
    }

    const fuelPercentage = (currentFuelLiter / tankCapacity) * 100;

    if (fuelPercentage <= 5) {
        document.getElementById("fuelLevelStatus").value = "EMPTY";
    } else if (fuelPercentage <= 25) {
        document.getElementById("fuelLevelStatus").value = "LOW";
    } else if (fuelPercentage <= 60) {
        document.getElementById("fuelLevelStatus").value = "MEDIUM";
    } else {
        document.getElementById("fuelLevelStatus").value = "HIGH";
    }
}

function updateFuelRequestCalculation(source) {
    const fuelType = document.getElementById("fuelType").value;
    const price = getPriceByFuelType(fuelType);
    const literInput = document.getElementById("requestedLiter");
    const bdtInput = document.getElementById("requestedAmountBdt");

    if (!price || price <= 0) {
        document.getElementById("pricePerUnitPreview").innerText = "0";
        document.getElementById("estimatedCostPreview").innerText = "0";
        return;
    }

    let requestedLiter = Number(literInput.value);
    let requestedAmountBdt = Number(bdtInput.value);

    if (source === "liter") {
        requestedAmountBdt = requestedLiter * price;
        bdtInput.value = requestedLiter > 0 ? requestedAmountBdt.toFixed(2) : "";
    }

    if (source === "bdt") {
        requestedLiter = requestedAmountBdt / price;
        literInput.value = requestedAmountBdt > 0 ? requestedLiter.toFixed(2) : "";
    }

    document.getElementById("selectedFuelTypePreview").innerText = fuelType || "-";
    document.getElementById("pricePerUnitPreview").innerText = price;
    document.getElementById("estimatedCostPreview").innerText = requestedAmountBdt > 0 ? requestedAmountBdt.toFixed(2) : "0";

    updateExtraFuelMessage();
}

function updateExtraFuelMessage() {
    if (!selectedVehicle) {
        return;
    }

    const requestedLiter = Number(document.getElementById("requestedLiter").value);
    const requestedAmountBdt = Number(document.getElementById("requestedAmountBdt").value);
    const limit = getFixedFuelLimitByVehicle();
    const reason = document.getElementById("extraFuelReasonType").value;

    const reasonSection = document.getElementById("extraFuelReasonSection");
    const messageSection = document.getElementById("extraFuelMessageSection");
    const messageBox = document.getElementById("extraFuelDemandMessage");

    if (requestedAmountBdt > limit) {
        reasonSection.classList.remove("hidden-section");
        messageSection.classList.remove("hidden-section");

        messageBox.value =
            "Extra fuel request for " +
            selectedVehicle.brand +
            " " +
            selectedVehicle.model +
            " (" +
            selectedVehicle.numberPlate +
            "). Requested " +
            requestedLiter.toFixed(2) +
            " L, estimated cost " +
            requestedAmountBdt.toFixed(2) +
            " BDT, which exceeds normal " +
            selectedVehicle.vehicleType +
            " limit of " +
            limit +
            " BDT. Reason: " +
            (reason || "Not selected yet") +
            ". Admin approval is required.";
    } else {
        reasonSection.classList.add("hidden-section");
        messageSection.classList.add("hidden-section");
        messageBox.value = "";
    }
}