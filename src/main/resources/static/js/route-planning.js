const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;
let routeVehicles = [];
let supportedCities = [];
let latestRoutePlan = null;

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    if (loggedInUser.role !== "VEHICLE_OWNER") {
        alert("Route planning is available for vehicle owners.");
        window.location.href = "dashboard.html";
        return;
    }

    setupLogout();
    setupEvents();
    loadInitialRouteData();
});

function setupEvents() {
    const form = document.getElementById("routePlanningForm");
    const refreshBtn = document.getElementById("refreshRouteDataBtn");
    const vehicleSelect = document.getElementById("routeVehicleId");

    if (form) {
        form.addEventListener("submit", function (event) {
            event.preventDefault();
            planRoute();
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadInitialRouteData);
    }

    if (vehicleSelect) {
        vehicleSelect.addEventListener("change", fillFuelFromSelectedVehicle);
    }
}

async function loadInitialRouteData() {
    await loadVehicles();
    await loadSupportedCities();
}

async function loadVehicles() {
    const userId = getLoggedInUserId();
    const select = document.getElementById("routeVehicleId");

    if (select) {
        select.innerHTML = `<option value="">Loading vehicles...</option>`;
    }

    try {
        const response = await fetch("http://localhost:8081/api/vehicles/user/" + userId + "?time=" + Date.now());
        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");
            renderVehicleOptions([]);
            return;
        }

        routeVehicles = Array.isArray(result) ? result : [];
        renderVehicleOptions(routeVehicles);

    } catch (error) {
        showMessage("Server connection failed while loading vehicles.", "error-text");
        renderVehicleOptions([]);
    }
}

async function loadSupportedCities() {
    try {
        const response = await fetch("http://localhost:8081/api/routes/supported-cities?time=" + Date.now());
        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");
            renderCityOptions([]);
            return;
        }

        supportedCities = Array.isArray(result) ? result : [];
        renderCityOptions(supportedCities);

    } catch (error) {
        showMessage("Server connection failed while loading supported cities.", "error-text");
        renderCityOptions([]);
    }
}

function renderVehicleOptions(vehicles) {
    const select = document.getElementById("routeVehicleId");

    if (!select) {
        return;
    }

    if (!vehicles.length) {
        select.innerHTML = `<option value="">No saved vehicle found</option>`;
        return;
    }

    select.innerHTML = `<option value="">Select vehicle</option>`;

    vehicles.forEach(function (vehicle) {
        const option = document.createElement("option");
        option.value = vehicle.id;
        option.innerText = vehicle.brand
            + " "
            + vehicle.model
            + " | "
            + vehicle.numberPlate
            + " | "
            + vehicle.fuelType;
        select.appendChild(option);
    });
}

function renderCityOptions(cities) {
    const source = document.getElementById("sourceCity");
    const destination = document.getElementById("destinationCity");

    [source, destination].forEach(function (select) {
        if (!select) {
            return;
        }

        if (!cities.length) {
            select.innerHTML = `<option value="">No city configured</option>`;
            return;
        }

        select.innerHTML = `<option value="">Select city</option>`;

        cities.forEach(function (city) {
            const option = document.createElement("option");
            option.value = city;
            option.innerText = city;
            select.appendChild(option);
        });
    });
}

function fillFuelFromSelectedVehicle() {
    const vehicleId = Number(getValue("routeVehicleId"));
    const vehicle = routeVehicles.find(item => Number(item.id) === vehicleId);

    if (!vehicle) {
        setValue("currentFuelLiter", "");
        return;
    }

    setValue("currentFuelLiter", vehicle.currentFuelLiter || "");
}

async function planRoute() {
    const vehicleId = Number(getValue("routeVehicleId"));
    const sourceCity = getValue("sourceCity");
    const destinationCity = getValue("destinationCity");
    const currentFuelText = getValue("currentFuelLiter");

    if (!vehicleId) {
        showMessage("Please select a vehicle.", "error-text");
        return;
    }

    if (!sourceCity || !destinationCity) {
        showMessage("Please select source and destination city.", "error-text");
        return;
    }

    if (sourceCity === destinationCity) {
        showMessage("Source and destination cannot be the same.", "error-text");
        return;
    }

    const data = {
        userId: Number(getLoggedInUserId()),
        vehicleId: vehicleId,
        sourceCity: sourceCity,
        destinationCity: destinationCity,
        currentFuelLiter: currentFuelText ? Number(currentFuelText) : null
    };

    try {
        showMessage("Planning route...", "muted-text");

        const response = await fetch("http://localhost:8081/api/routes/plan", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");
            return;
        }

        latestRoutePlan = result;
        renderRoutePlan(result);
        showMessage("Smart route plan generated successfully.", "success-text");

    } catch (error) {
        showMessage("Server connection failed while planning route.", "error-text");
    }
}

function renderRoutePlan(plan) {
    setText("routeDistanceSummary", formatNumber(plan.routeDistanceKm));
    setText("currentRangeSummary", formatNumber(plan.currentEstimatedRangeKm));
    setText("requiredFuelSummary", formatNumber(plan.requiredFuelLiter));
    setText("shortageSummary", formatNumber(plan.shortageFuelLiter));

    setText("routeName", safeText(plan.sourceCity) + " → " + safeText(plan.destinationCity));
    setText("routeVehicleName", safeText(plan.vehicleName) + " | " + safeText(plan.numberPlate));
    setText("routeFuelType", safeText(plan.fuelType));
    setText("routeDecision", formatEnum(plan.decision));
    setText("routeDecisionMessage", safeText(plan.message));

    showElement("routeDecisionSection");
    showElement("suggestedPumpSection");

    renderSuggestedPumps(plan.suggestedPumps || []);
}

function renderSuggestedPumps(pumps) {
    const body = document.getElementById("suggestedPumpBody");

    if (!body) {
        return;
    }

    if (!pumps.length) {
        body.innerHTML = `<tr><td colspan="8">No matching operational pump found for this fuel type.</td></tr>`;
        return;
    }

    body.innerHTML = "";

    pumps.forEach(function (pump, index) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>
                <strong>${safeText(pump.pumpName)}</strong><br>
                <small>${safeText(pump.phoneNumber)}</small>
            </td>
            <td>${safeText(pump.pumpAddress)}</td>
            <td>${formatEnum(pump.pumpStatus)}</td>
            <td>${formatNumber(pump.matchingFuelStock)} L</td>
            <td>${formatNumber(pump.totalCurrentStock)} L</td>
            <td>${safeText(pump.routeMatchNote)}</td>
            <td>
                <strong>${safeText(pump.recommendationLevel)}</strong><br>
                <small>${safeText(pump.recommendationReason)}</small>
            </td>
            <td>
                <button class="btn primary small-btn" onclick="createRouteToken(${index})">
                    Generate Token
                </button>
            </td>
        `;

        body.appendChild(row);
    });
}

async function createRouteToken(index) {
    if (!latestRoutePlan || !latestRoutePlan.suggestedPumps || !latestRoutePlan.suggestedPumps[index]) {
        showMessage("Route plan or selected pump not found.", "error-text");
        return;
    }

    const pump = latestRoutePlan.suggestedPumps[index];

    let reservedLiter = Number(latestRoutePlan.shortageFuelLiter || 0);

    if (reservedLiter <= 0) {
        reservedLiter = Number(latestRoutePlan.requiredFuelLiter || 0);
    }

    if (reservedLiter <= 0) {
        showMessage("No fuel reservation is required for this route.", "error-text");
        return;
    }

    const estimatedCost = reservedLiter * 125;

    const confirmed = confirm(
        "Generate route fuel token?\n\n" +
        "Pump: " + pump.pumpName + "\n" +
        "Fuel Type: " + latestRoutePlan.fuelType + "\n" +
        "Reserved Liter: " + reservedLiter.toFixed(2) + " L\n" +
        "Estimated Cost: " + estimatedCost.toFixed(2) + " BDT\n\n" +
        "This token will be pump-specific, vehicle-specific, and valid for 2 hours."
    );

    if (!confirmed) {
        return;
    }

    const data = {
        userId: Number(getLoggedInUserId()),
        vehicleId: Number(latestRoutePlan.vehicleId),
        pumpId: Number(pump.pumpId),
        sourceCity: latestRoutePlan.sourceCity,
        destinationCity: latestRoutePlan.destinationCity,
        stopCity: pump.routeMatchNote || "",
        distanceFromSourceKm: latestRoutePlan.routeDistanceKm,
        reservedLiter: reservedLiter,
        estimatedCost: estimatedCost,
        currentOdometerAtPlanning: 0,
        expectedOdometerAtStop: 0
    };

    try {
        const response = await fetch("http://localhost:8081/api/route-fuel-tokens", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");
            return;
        }

        showRouteTokenSuccess(result);

    } catch (error) {
        showMessage("Server connection failed while creating route fuel token.", "error-text");
    }
}

function showRouteTokenSuccess(token) {
    const message =
        "Route fuel token created successfully.\n\n" +
        "Token: " + token.tokenCode + "\n" +
        "Pump: " + token.pumpName + "\n" +
        "Reserved Fuel: " + formatNumber(token.reservedLiter) + " L\n" +
        "Valid Until: " + formatDateTime(token.validUntil) + "\n\n" +
        "Show this token to the assigned pump authority.";

    alert(message);

    showMessage(
        "Token created: " + token.tokenCode + ". Show it at " + token.pumpName + ".",
        "success-text"
    );
}

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function (event) {
            event.preventDefault();
            localStorage.clear();
            window.location.href = "login.html";
        });
    }
}

function getLoggedInUserId() {
    return loggedInUser.userId || loggedInUser.id || localStorage.getItem("userId");
}

function getValue(id) {
    const element = document.getElementById(id);
    return element ? element.value : "";
}

function setValue(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.value = value;
    }
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.innerText = value;
    }
}

function showElement(id) {
    const element = document.getElementById(id);

    if (element) {
        element.style.display = "block";
    }
}

function showMessage(message, className) {
    const element = document.getElementById("routePlanningMessage");

    if (element) {
        element.className = className || "";
        element.innerText = message || "";
    }
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

function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    return String(value).replace("T", " ").substring(0, 16);
}

function safeText(value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    return String(value);
}

function getErrorMessage(result) {
    if (!result) {
        return "Request failed.";
    }

    if (result.message) {
        return result.message;
    }

    if (result.error) {
        return result.error;
    }

    if (result.messages) {
        return JSON.stringify(result.messages);
    }

    return JSON.stringify(result);
}