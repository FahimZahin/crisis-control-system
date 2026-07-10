document.addEventListener("DOMContentLoaded", function () {
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || {};

    if (loggedInUser.role !== "ADMIN") {
        alert("Only admin should access fuel settings in the final system.");
    }

    loadFuelSettings();

    document.getElementById("fuelPriceForm").addEventListener("submit", function (event) {
        event.preventDefault();
        updateFuelPrices();
    });

    document.getElementById("fuelLimitForm").addEventListener("submit", function (event) {
        event.preventDefault();
        updateFuelLimits();
    });
});

async function loadFuelSettings() {
    try {
        const response = await fetch("http://localhost:8081/api/admin/fuel-settings");
        const settings = await response.json();

        if (!response.ok) {
            showMessage("fuelPriceMessage", "Failed to load fuel settings.", "error-text");
            return;
        }

        fillFuelSettings(settings);

    } catch (error) {
        showMessage("fuelPriceMessage", "Server connection failed while loading fuel settings.", "error-text");
    }
}

function fillFuelSettings(settings) {
    document.getElementById("petrolPrice").value = settings.petrolPrice;
    document.getElementById("octanePrice").value = settings.octanePrice;
    document.getElementById("dieselPrice").value = settings.dieselPrice;
    document.getElementById("cngPrice").value = settings.cngPrice;

    document.getElementById("bikeLimit").value = settings.bikeLimit;
    document.getElementById("carLimit").value = settings.carLimit;
    document.getElementById("emergencyVehicleLimit").value = settings.emergencyVehicleLimit;
    document.getElementById("generatorDieselLimit").value = settings.generatorDieselLimit;
    document.getElementById("buildingGeneratorWeeklyDieselAllocation").value = settings.buildingGeneratorWeeklyDieselAllocation;
    document.getElementById("hospitalGeneratorWeeklyDieselAllocation").value = settings.hospitalGeneratorWeeklyDieselAllocation;

    document.getElementById("petrolPricePreview").innerText = settings.petrolPrice;
    document.getElementById("octanePricePreview").innerText = settings.octanePrice;
    document.getElementById("dieselPricePreview").innerText = settings.dieselPrice;
    document.getElementById("cngPricePreview").innerText = settings.cngPrice;

    document.getElementById("bikeLimitPreview").innerText = settings.bikeLimit;
    document.getElementById("carLimitPreview").innerText = settings.carLimit;
    document.getElementById("emergencyVehicleLimitPreview").innerText = settings.emergencyVehicleLimit;
    document.getElementById("generatorDieselLimitPreview").innerText = settings.generatorDieselLimit;
    document.getElementById("buildingGeneratorWeeklyDieselAllocationPreview").innerText = settings.buildingGeneratorWeeklyDieselAllocation;
    document.getElementById("hospitalGeneratorWeeklyDieselAllocationPreview").innerText = settings.hospitalGeneratorWeeklyDieselAllocation;

    document.getElementById("lastUpdatedAt").innerText = formatDate(settings.lastUpdatedAt);
}

async function updateFuelPrices() {
    const data = {
        petrolPrice: Number(document.getElementById("petrolPrice").value),
        octanePrice: Number(document.getElementById("octanePrice").value),
        dieselPrice: Number(document.getElementById("dieselPrice").value),
        cngPrice: Number(document.getElementById("cngPrice").value)
    };

    try {
        const response = await fetch("http://localhost:8081/api/admin/fuel-settings/prices", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            showMessage("fuelPriceMessage", result.message, "success-text");
            loadFuelSettings();
        } else {
            showMessage("fuelPriceMessage", getErrorMessage(result), "error-text");
        }

    } catch (error) {
        showMessage("fuelPriceMessage", "Server connection failed while updating prices.", "error-text");
    }
}

async function updateFuelLimits() {
    const data = {
        bikeLimit: Number(document.getElementById("bikeLimit").value),
        carLimit: Number(document.getElementById("carLimit").value),
        emergencyVehicleLimit: Number(document.getElementById("emergencyVehicleLimit").value),
        generatorDieselLimit: Number(document.getElementById("generatorDieselLimit").value),
        buildingGeneratorWeeklyDieselAllocation: Number(document.getElementById("buildingGeneratorWeeklyDieselAllocation").value),
        hospitalGeneratorWeeklyDieselAllocation: Number(document.getElementById("hospitalGeneratorWeeklyDieselAllocation").value)
    };

    try {
        const response = await fetch("http://localhost:8081/api/admin/fuel-settings/limits", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            showMessage("fuelLimitMessage", result.message, "success-text");
            loadFuelSettings();
        } else {
            showMessage("fuelLimitMessage", getErrorMessage(result), "error-text");
        }

    } catch (error) {
        showMessage("fuelLimitMessage", "Server connection failed while updating limits.", "error-text");
    }
}

function showMessage(id, message, className) {
    const messageElement = document.getElementById(id);
    messageElement.className = className;
    messageElement.innerText = message;
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

function formatDate(dateValue) {
    if (!dateValue) {
        return "-";
    }

    return dateValue.replace("T", " ").substring(0, 19);
}