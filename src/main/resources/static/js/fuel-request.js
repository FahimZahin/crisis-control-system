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
        updateCostPreview();
    });

    document.getElementById("requestedLiter").addEventListener("input", function () {
        updateCostPreview();
    });

    document.getElementById("fuelLevelStatus").addEventListener("change", function () {
        updateFuelLevelPreview();
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

    document.getElementById("vehicleType").value = selectedVehicle.vehicleType;
    document.getElementById("numberPlate").value = selectedVehicle.numberPlate;
    document.getElementById("companyMileage").value = selectedVehicle.companyMileage + " km/l";
    document.getElementById("tankCapacity").value = selectedVehicle.tankCapacity + " liter";

    const option = document.createElement("option");
    option.value = selectedVehicle.fuelType;
    option.innerText = selectedVehicle.fuelType;
    fuelTypeSelect.appendChild(option);

    fuelTypeSelect.value = selectedVehicle.fuelType;

    updateCostPreview();
}

function updateCostPreview() {
    const fuelType = document.getElementById("fuelType").value;
    const requestedLiter = Number(document.getElementById("requestedLiter").value);

    document.getElementById("selectedFuelTypePreview").innerText = fuelType || "-";

    if (!fuelSettings || !fuelType) {
        document.getElementById("pricePerUnitPreview").innerText = "0";
        document.getElementById("estimatedCostPreview").innerText = "0";
        document.getElementById("adminLimitPreview").innerText = "0";
        return;
    }

    const price = getPriceByFuelType(fuelType);
    const limit = getAdminLimitByVehicle();

    document.getElementById("pricePerUnitPreview").innerText = price;
    document.getElementById("adminLimitPreview").innerText = limit;

    if (!requestedLiter || requestedLiter <= 0) {
        document.getElementById("estimatedCostPreview").innerText = "0";
        return;
    }

    const estimatedCost = requestedLiter * price;
    document.getElementById("estimatedCostPreview").innerText = estimatedCost.toFixed(2);

    if (estimatedCost > limit) {
        showMessage("fuelRequestMessage", "Estimated cost exceeds admin limit.", "error-text");
    } else {
        showMessage("fuelRequestMessage", "Request is within admin limit.", "success-text");
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

function getAdminLimitByVehicle() {
    if (!selectedVehicle || !fuelSettings) {
        return 0;
    }

    if (selectedVehicle.vehicleType === "BIKE") {
        return Number(fuelSettings.bikeLimit || 0);
    }

    return Number(fuelSettings.carLimit || 0);
}

async function submitFuelRequest() {
    if (!selectedVehicle) {
        showMessage("fuelRequestMessage", "Please select a vehicle.", "error-text");
        return;
    }

    const fuelType = document.getElementById("fuelType").value;
    const requestedLiter = Number(document.getElementById("requestedLiter").value);
    const fuelLevelStatus = document.getElementById("fuelLevelStatus").value;

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

    const estimatedCost = requestedLiter * getPriceByFuelType(fuelType);
    const adminLimit = getAdminLimitByVehicle();

    if (estimatedCost > adminLimit) {
        showMessage("fuelRequestMessage", "Cannot submit. Estimated cost exceeds admin limit.", "error-text");
        return;
    }

    const data = {
        userId: Number(loggedInUser.userId || localStorage.getItem("userId")),
        vehicleId: selectedVehicle.id,
        fuelType: fuelType,
        requestedLiter: requestedLiter,
        fuelLevelStatus: fuelLevelStatus
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
            showMessage("fuelRequestMessage", "Fuel request submitted successfully. Low-fuel requests may be auto-approved.", "success-text");
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
    document.getElementById("selectedFuelTypePreview").innerText = "-";
    document.getElementById("pricePerUnitPreview").innerText = "0";
    document.getElementById("estimatedCostPreview").innerText = "0";
    document.getElementById("adminLimitPreview").innerText = "0";
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

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            localStorage.clear();
        });
    }
}

function updateFuelLevelPreview() {
    const fuelLevelStatus = document.getElementById("fuelLevelStatus").value;

    if (fuelLevelStatus === "EMPTY" || fuelLevelStatus === "LOW") {
        showMessage("fuelRequestMessage", "Low fuel detected. System will try to auto-approve if pump stock is available.", "success-text");
        return;
    }

    if (fuelLevelStatus === "MEDIUM" || fuelLevelStatus === "HIGH") {
        showMessage("fuelRequestMessage", "Fuel level is not low. This request may need admin review.", "error-text");
    }
}