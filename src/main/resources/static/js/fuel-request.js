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
    const vehicleSelect = document.getElementById("vehicleSelect");
    const fuelType = document.getElementById("fuelType");
    const requestedLiter = document.getElementById("requestedLiter");
    const requestedAmountBdt = document.getElementById("requestedAmountBdt");
    const extraFuelReasonType = document.getElementById("extraFuelReasonType");
    const currentOdometerReading = document.getElementById("currentOdometerReading");
    const fuelRequestForm = document.getElementById("fuelRequestForm");

    if (vehicleSelect) {
        vehicleSelect.addEventListener("change", function () {
            handleVehicleSelection();
        });
    }

    if (fuelType) {
        fuelType.addEventListener("change", function () {
            updateFuelRequestCalculation("liter");
        });
    }

    if (requestedLiter) {
        requestedLiter.addEventListener("input", function () {
            updateFuelRequestCalculation("liter");
        });
    }

    if (requestedAmountBdt) {
        requestedAmountBdt.addEventListener("input", function () {
            updateFuelRequestCalculation("bdt");
        });
    }

    if (extraFuelReasonType) {
        extraFuelReasonType.addEventListener("change", function () {
            updateExtraFuelMessage();
        });
    }

    if (currentOdometerReading) {
        currentOdometerReading.addEventListener("input", function () {
            updateOdometerPreview();
        });
    }

    if (fuelRequestForm) {
        fuelRequestForm.addEventListener("submit", function (event) {
            event.preventDefault();
            submitFuelRequest();
        });
    }
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
    const vehicleSelect = document.getElementById("vehicleSelect");

    const userId =
        loggedInUser.userId ||
        loggedInUser.id ||
        localStorage.getItem("userId") ||
        "";

    if (!vehicleSelect) {
        return;
    }

    if (!userId) {
        vehicleSelect.innerHTML = `<option value="">User ID not found. Please login again.</option>`;
        showMessage("fuelRequestMessage", "User ID not found. Please login again.", "error-text");
        return;
    }

    try {
        const response = await fetch("http://localhost:8081/api/vehicles/user/" + userId + "?time=" + Date.now());
        const result = await response.json();

        if (!response.ok) {
            vehicleSelect.innerHTML = `<option value="">Failed to load vehicles</option>`;
            showMessage("fuelRequestMessage", getErrorMessage(result), "error-text");
            return;
        }

        vehicles = result;

        vehicleSelect.innerHTML = `<option value="">Select saved vehicle</option>`;

        if (!Array.isArray(vehicles) || vehicles.length === 0) {
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

        showMessage("fuelRequestMessage", "Vehicles loaded successfully.", "success-text");

    } catch (error) {
        vehicleSelect.innerHTML = `<option value="">Server connection failed</option>`;
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
    const currentFuelLiter = Number(selectedVehicle.currentFuelLiter || 0);
    const tankCapacity = Number(selectedVehicle.tankCapacity || 0);

    document.getElementById("vehicleType").value = selectedVehicle.vehicleType;
    document.getElementById("numberPlate").value = selectedVehicle.numberPlate;
    document.getElementById("companyMileage").value = companyMileage.toFixed(2) + " km/l";
    document.getElementById("effectiveMileage").value = effectiveMileage.toFixed(2) + " km/l";
    document.getElementById("tankCapacity").value = tankCapacity.toFixed(2) + " liter";
    document.getElementById("savedCurrentFuelLiter").value = currentFuelLiter.toFixed(2) + " L";
    document.getElementById("normalFuelLimit").value = getFixedFuelLimitByVehicle() + " BDT";
    document.getElementById("lastVerifiedOdometer").value = selectedVehicle.odometerReading + " km";

    const option = document.createElement("option");
    option.value = selectedVehicle.fuelType;
    option.innerText = selectedVehicle.fuelType;
    fuelTypeSelect.appendChild(option);

    fuelTypeSelect.value = selectedVehicle.fuelType;

    updateFuelLevelFromSavedFuel();
    updateFuelRequestCalculation("liter");
    updateOdometerPreview();
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
    const savedCurrentFuelLiter = Number(selectedVehicle.currentFuelLiter || 0);
    const availableRangeFromSavedFuel = effectiveMileage * savedCurrentFuelLiter;

    let distanceTravelled = currentOdometer - previousOdometer;

    if (!currentOdometer || currentOdometer < previousOdometer) {
        distanceTravelled = 0;
    }

    let remainingRange = availableRangeFromSavedFuel - distanceTravelled;

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

function updateFuelRequestCalculation(source) {
    const fuelType = document.getElementById("fuelType").value;
    const price = getPriceByFuelType(fuelType);
    const literInput = document.getElementById("requestedLiter");
    const bdtInput = document.getElementById("requestedAmountBdt");

    document.getElementById("selectedFuelTypePreview").innerText = fuelType || "-";

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

    document.getElementById("pricePerUnitPreview").innerText = price;
    document.getElementById("estimatedCostPreview").innerText = requestedAmountBdt > 0 ? requestedAmountBdt.toFixed(2) : "0";

    updateExtraFuelMessage();
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

async function submitFuelRequest() {
    if (!selectedVehicle) {
        showMessage("fuelRequestMessage", "Please select a vehicle.", "error-text");
        return;
    }

    const fuelType = document.getElementById("fuelType").value;
    const requestedLiter = Number(document.getElementById("requestedLiter").value);
    const requestedAmountBdt = Number(document.getElementById("requestedAmountBdt").value);
    const fuelLevelStatus = document.getElementById("fuelLevelStatus").value;
    const currentOdometerReading = Number(document.getElementById("currentOdometerReading").value);
    const normalLimit = getFixedFuelLimitByVehicle();
    const extraFuelReasonType = document.getElementById("extraFuelReasonType").value;
    const extraFuelDemandMessage = document.getElementById("extraFuelDemandMessage").value;

    const savedCurrentFuelLiter = Number(selectedVehicle.currentFuelLiter || 0);
    const tankCapacity = Number(selectedVehicle.tankCapacity || 0);

    if (!fuelType) {
        showMessage("fuelRequestMessage", "Please select fuel type.", "error-text");
        return;
    }

    if (!requestedLiter || requestedLiter <= 0) {
        showMessage("fuelRequestMessage", "Requested fuel liter must be greater than 0.", "error-text");
        return;
    }

    if (!requestedAmountBdt || requestedAmountBdt <= 0) {
        showMessage("fuelRequestMessage", "Requested amount in BDT must be greater than 0.", "error-text");
        return;
    }

    if (!fuelLevelStatus) {
        showMessage("fuelRequestMessage", "Auto fuel level could not be calculated from saved vehicle fuel.", "error-text");
        return;
    }

    if (requestedAmountBdt > normalLimit && !extraFuelReasonType) {
        showMessage("fuelRequestMessage", "Please select a reason for extra fuel request.", "error-text");
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

    const availableTankSpace = tankCapacity - savedCurrentFuelLiter;

    if (availableTankSpace <= 0) {
        showMessage("fuelRequestMessage", "Vehicle fuel tank is already full. Fuel request is not allowed.", "error-text");
        return;
    }

    if (requestedLiter > availableTankSpace) {
        showMessage(
            "fuelRequestMessage",
            "Requested fuel cannot be greater than available tank space. Available space: " + availableTankSpace.toFixed(2) + " L",
            "error-text"
        );
        return;
    }

    const companyMileage = Number(selectedVehicle.companyMileage || 0);
    const effectiveMileage = calculateEffectiveMileage(companyMileage);

    const fullTankRange = effectiveMileage * tankCapacity;
    const availableRangeFromSavedFuel = effectiveMileage * savedCurrentFuelLiter;
    const distanceTravelled = currentOdometerReading - previousOdometer;
    const remainingRange = Math.max(0, availableRangeFromSavedFuel - distanceTravelled);

    if (remainingRange > 5) {
        showMessage(
            "fuelRequestMessage",
            "Cannot submit. Estimated remaining range is " + remainingRange.toFixed(2) + " km. It must be 5 km or less.",
            "error-text"
        );
        return;
    }

    const data = {
        userId: Number(loggedInUser.userId || localStorage.getItem("userId")),
        vehicleId: selectedVehicle.id,
        fuelType: fuelType,
        requestedLiter: requestedLiter,
        requestedAmountBdt: requestedAmountBdt,
        fuelLevelStatus: fuelLevelStatus,
        currentOdometerReading: currentOdometerReading,
        extraFuelReasonType: extraFuelReasonType,
        extraFuelDemandMessage: extraFuelDemandMessage
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
            if (result.requestStatus === "PENDING") {
                showMessage("fuelRequestMessage", "Fuel request submitted and waiting for admin approval.", "success-text");
            } else {
                showMessage("fuelRequestMessage", "Fuel request submitted successfully.", "success-text");
            }

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

function getPriceByFuelType(fuelType) {
    if (!fuelSettings || !fuelType) {
        return 0;
    }

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

function getFixedFuelLimitByVehicle() {
    if (!selectedVehicle) {
        return 0;
    }

    if (selectedVehicle.vehicleType === "BIKE") {
        return 500;
    }

    return 2000;
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

function clearVehiclePreview() {
    document.getElementById("fuelType").innerHTML = `<option value="">Select fuel type</option>`;
    document.getElementById("vehicleType").value = "";
    document.getElementById("numberPlate").value = "";
    document.getElementById("companyMileage").value = "";
    document.getElementById("effectiveMileage").value = "";
    document.getElementById("tankCapacity").value = "";
    document.getElementById("savedCurrentFuelLiter").value = "";
    document.getElementById("normalFuelLimit").value = "";
    document.getElementById("lastVerifiedOdometer").value = "";
    document.getElementById("currentOdometerReading").value = "";
    document.getElementById("distanceTravelledPreview").value = "";
    document.getElementById("fullTankRangePreview").value = "";
    document.getElementById("selectedFuelTypePreview").innerText = "-";
    document.getElementById("pricePerUnitPreview").innerText = "0";
    document.getElementById("estimatedCostPreview").innerText = "0";
    document.getElementById("remainingRangePreview").innerText = "0";
    document.getElementById("fuelLevelStatus").value = "";
    document.getElementById("requestedAmountBdt").value = "";
    document.getElementById("extraFuelReasonType").value = "";
    document.getElementById("extraFuelDemandMessage").value = "";
    document.getElementById("extraFuelReasonSection").classList.add("hidden-section");
    document.getElementById("extraFuelMessageSection").classList.add("hidden-section");
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