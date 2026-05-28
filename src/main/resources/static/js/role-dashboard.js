let loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || {};

document.addEventListener("DOMContentLoaded", function () {
    loadUserInfo();
    setupLogout();

    if (document.getElementById("vehicleDashboardList")) {
        loadVehiclesForDashboard();
    }

    if (document.getElementById("pumpDashboardName")) {
        loadPumpForDashboard();
    }

    if (document.getElementById("refreshHospitalProfileBtn")) {
        document.getElementById("refreshHospitalProfileBtn").addEventListener("click", refreshHospitalProfile);
    }

    if (document.getElementById("refreshGovernmentDashboardBtn")) {
        document.getElementById("refreshGovernmentDashboardBtn").addEventListener("click", loadGovernmentAuthorityDashboard);
        loadGovernmentAuthorityDashboard();
    }

    if (document.getElementById("refreshLocalAuthorityDashboardBtn")) {
        document.getElementById("refreshLocalAuthorityDashboardBtn").addEventListener("click", loadLocalAuthorityDashboard);
        loadLocalAuthorityDashboard();
    }

    setupFeatureButtons();
});

function loadUserInfo() {
    const fullName = loggedInUser.fullName || localStorage.getItem("fullName") || "Demo User";
    const phoneNumber = loggedInUser.phoneNumber || localStorage.getItem("phoneNumber") || "Not Provided";
    const role = loggedInUser.role || localStorage.getItem("role") || "UNKNOWN";
    const status = loggedInUser.status || localStorage.getItem("status") || "ACTIVE";
    const address = loggedInUser.address || localStorage.getItem("address") || "Not Provided";
    const userId = getLoggedInUserId();

    const hospitalGeneratorCapacity = cleanNumber(loggedInUser.hospitalGeneratorCapacity);
    const hospitalDieselTankCapacity = cleanNumber(loggedInUser.hospitalDieselTankCapacity);
    const hospitalCurrentDieselReserve = cleanNumber(loggedInUser.hospitalCurrentDieselReserve);
    const hospitalAvailableDieselSpace = Math.max(0, hospitalDieselTankCapacity - hospitalCurrentDieselReserve);
    const hospitalBackupHours = calculateBackupHours(hospitalGeneratorCapacity, hospitalCurrentDieselReserve);
    const hospitalDieselStatus = resolveDieselStatus(hospitalBackupHours);

    setTextIfExists("dashboardUserName", fullName);
    setTextIfExists("dashboardUserPhone", phoneNumber);
    setTextIfExists("dashboardUserRole", role);
    setTextIfExists("dashboardUserStatus", status);
    setTextIfExists("dashboardUserAddress", address);
    setTextIfExists("dashboardUserId", userId || "-");

    setTextIfExists("drivingLicenseNumber", loggedInUser.drivingLicenseNumber || "Not Provided");

    setTextIfExists("buildingName", loggedInUser.buildingName || "Not Provided");
    setTextIfExists("holdingNumber", loggedInUser.holdingNumber || "Not Provided");
    setTextIfExists("numberOfFlats", loggedInUser.numberOfFlats || "Not Provided");
    setTextIfExists("generatorPower", loggedInUser.generatorPower || "Not Provided");
    setTextIfExists("buildingUnderThana", loggedInUser.buildingUnderThana || loggedInUser.thanaOrUpazila || "Not Provided");
    setTextIfExists("generatorPowerInfo", loggedInUser.generatorPower || "Not Provided");

    setTextIfExists("pumpName", loggedInUser.pumpName || "Not Provided");
    setTextIfExists("businessLicenseNumber", loggedInUser.businessLicenseNumber || "Not Provided");
    setTextIfExists("pumpAddress", loggedInUser.pumpAddress || "Not Provided");
    setTextIfExists("fuelCapacity", loggedInUser.fuelCapacity || "Not Provided");
    setTextIfExists("fuelTypes", loggedInUser.fuelTypes || "Not Provided");
    setTextIfExists("currentStock", loggedInUser.currentStock || "Not Provided");
    setTextIfExists("open24Hours", loggedInUser.open24Hours ? "Yes" : "No");
    setTextIfExists("openingTime", loggedInUser.openingTime || "Not Required");
    setTextIfExists("closingTime", loggedInUser.closingTime || "Not Required");

    setTextIfExists("hospitalName", loggedInUser.hospitalName || "Not Provided");
    setTextIfExists("hospitalRegistrationNumber", loggedInUser.hospitalRegistrationNumber || "Not Provided");
    setTextIfExists("hospitalAddress", loggedInUser.hospitalAddress || "Not Provided");
    setTextIfExists("emergencyContactNumber", loggedInUser.emergencyContactNumber || loggedInUser.phoneNumber || "Not Provided");
    setTextIfExists("hospitalUnderThana", loggedInUser.hospitalUnderThana || loggedInUser.thanaOrUpazila || "Not Provided");

    setTextIfExists(
        "hospitalGeneratorCapacity",
        hospitalGeneratorCapacity > 0 ? hospitalGeneratorCapacity.toFixed(2) : "Not Provided"
    );

    setTextIfExists(
        "hospitalDieselTankCapacity",
        hospitalDieselTankCapacity > 0 ? hospitalDieselTankCapacity.toFixed(2) + " L" : "Not Provided"
    );

    setTextIfExists(
        "hospitalAvailableDieselSpace",
        hospitalDieselTankCapacity > 0 ? hospitalAvailableDieselSpace.toFixed(2) + " L" : "Not Provided"
    );

    setTextIfExists(
        "hospitalCurrentDieselReserve",
        hospitalCurrentDieselReserve >= 0 ? hospitalCurrentDieselReserve.toFixed(2) + " L" : "Not Provided"
    );

    setTextIfExists(
        "hospitalEstimatedBackupHours",
        hospitalBackupHours >= 0 ? hospitalBackupHours.toFixed(1) + " hours" : "Not Provided"
    );

    setTextIfExists(
        "hospitalDieselStatus",
        hospitalDieselStatus || loggedInUser.hospitalDieselStatus || "Not Provided"
    );

    setTextIfExists("utilityOrganizationType", loggedInUser.utilityOrganizationType || "Not Provided");
    setTextIfExists("utilityEmployeeId", loggedInUser.utilityEmployeeId || "Not Provided");
    setTextIfExists("serviceArea", loggedInUser.serviceArea || "Not Provided");
    setTextIfExists("officeAddress", loggedInUser.officeAddress || "Not Provided");

    setTextIfExists("organizationName", loggedInUser.organizationName || "Not Provided");
    setTextIfExists("organizationType", loggedInUser.organizationType || "Not Provided");
    setTextIfExists("officialVerificationId", loggedInUser.officialVerificationId || "Not Provided");
    setTextIfExists("assignedArea", loggedInUser.assignedArea || "Not Provided");

    setTextIfExists("governmentEmployeeId", loggedInUser.governmentEmployeeId || "Not Provided");
    setTextIfExists("departmentName", loggedInUser.departmentName || "Not Provided");
    setTextIfExists("designation", loggedInUser.designation || "Not Provided");

    setTextIfExists("localAuthorityId", loggedInUser.localAuthorityId || "Not Provided");
    setTextIfExists("district", loggedInUser.district || "Not Provided");
    setTextIfExists("thanaOrUpazila", loggedInUser.thanaOrUpazila || loggedInUser.hospitalUnderThana || loggedInUser.buildingUnderThana || "Not Provided");
}

async function refreshHospitalProfile() {
    const userId = getLoggedInUserId();

    if (!userId) {
        showHospitalDashboardMessage("User ID not found. Please login again.", "error-text");
        return;
    }

    try {
        const response = await fetch("http://localhost:8081/api/hospital-authority/profile/" + userId + "?time=" + Date.now());
        const profile = await response.json();

        if (!response.ok) {
            showHospitalDashboardMessage(getErrorMessage(profile), "error-text");
            return;
        }

        mergeHospitalProfile(profile);

        loadUserInfo();

        showHospitalDashboardMessage(
            "Profile refreshed. Backup: " + cleanNumber(loggedInUser.hospitalEstimatedBackupHours).toFixed(1) +
            " hours, Status: " + valueOrDash(loggedInUser.hospitalDieselStatus) +
            ", Diesel Reserve: " + cleanNumber(loggedInUser.hospitalCurrentDieselReserve).toFixed(2) + " L",
            "success-text"
        );

    } catch (error) {
        showHospitalDashboardMessage("Server connection failed while refreshing hospital profile.", "error-text");
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

    localStorage.setItem("loggedInUser", JSON.stringify(loggedInUser));
    localStorage.setItem("userId", loggedInUser.userId || "");
    localStorage.setItem("fullName", loggedInUser.fullName || "");
    localStorage.setItem("phoneNumber", loggedInUser.phoneNumber || "");
    localStorage.setItem("role", loggedInUser.role || "");
    localStorage.setItem("status", loggedInUser.status || "");
}

async function loadPumpForDashboard() {
    const userId = getLoggedInUserId();

    if (!userId) {
        showDashboardPumpMessage("User ID not found. Please login again.", "error-text");
        return;
    }

    try {
        let response = await fetch("http://localhost:8081/api/pumps/user/" + userId);
        let pump = await response.json();

        if (!response.ok) {
            response = await fetch("http://localhost:8081/api/pumps/create-from-user/" + userId, {
                method: "POST"
            });

            pump = await response.json();
        }

        if (response.ok) {
            fillPumpDashboard(pump);
            loadPumpTransparencyToday(pump.id);
            setupPumpTransparencyRefresh(pump.id);
            showDashboardPumpMessage("Pump profile loaded from database.", "success-text");
        } else {
            showDashboardPumpMessage(getErrorMessage(pump), "error-text");
        }

    } catch (error) {
        showDashboardPumpMessage("Server connection failed while loading pump profile.", "error-text");
    }
}

function fillPumpDashboard(pump) {
    setTextIfExists("pumpDashboardName", valueOrDash(pump.pumpName));
    setTextIfExists("pumpDashboardFuelTypes", valueOrDash(pump.fuelTypes));
    setTextIfExists("pumpDashboardCapacity", valueOrDash(pump.totalFuelCapacity));
    setTextIfExists("pumpDashboardStock", valueOrDash(pump.totalCurrentStock));

    setTextIfExists("pumpDashboardLicense", valueOrDash(pump.businessLicenseNumber));
    setTextIfExists("pumpDashboardAddress", valueOrDash(pump.pumpAddress));
    setTextIfExists("pumpDashboardStatus", valueOrDash(pump.pumpStatus));
    setTextIfExists("pumpDashboardAvailable", valueOrDash(pump.totalAvailableStock));
    setTextIfExists("pumpDashboardOpen24", pump.open24Hours ? "Yes" : "No");

    if (pump.open24Hours) {
        setTextIfExists("pumpDashboardTime", "Open 24 Hours");
    } else {
        setTextIfExists("pumpDashboardTime", valueOrDash(pump.openingTime) + " - " + valueOrDash(pump.closingTime));
    }

    renderPumpFuelStockTable(pump.fuelStocks);
}

async function loadPumpTransparencyToday(pumpId) {
    if (!pumpId) {
        showPumpTransparencyMessage("Pump ID not found. Transparency summary cannot be loaded.", "error-text");
        return;
    }

    try {
        const response = await fetch("http://localhost:8081/api/pumps/" + pumpId + "/transparency/today");
        const transparency = await response.json();

        if (!response.ok) {
            showPumpTransparencyMessage(getErrorMessage(transparency), "error-text");
            return;
        }

        setTextIfExists("dailyCashTotal", formatNumber(transparency.dailyCashTotal));
        setTextIfExists("dailyBkashTotal", formatNumber(transparency.dailyBkashTotal));
        setTextIfExists("totalPaymentToday", formatNumber(transparency.totalPaymentToday));
        setTextIfExists("fuelSoldToday", formatNumber(transparency.fuelSoldToday));
        setTextIfExists("totalCollectionsToday", transparency.totalCollectionsToday || 0);
        setTextIfExists("transparencyDate", transparency.date || "-");

        showPumpTransparencyMessage("Transparency dashboard loaded successfully.", "success-text");

    } catch (error) {
        showPumpTransparencyMessage("Server connection failed while loading transparency dashboard.", "error-text");
    }
}

function setupPumpTransparencyRefresh(pumpId) {
    const refreshButton = document.getElementById("refreshPumpTransparencyBtn");

    if (!refreshButton) {
        return;
    }

    refreshButton.onclick = function () {
        loadPumpTransparencyToday(pumpId);
    };
}

function showPumpTransparencyMessage(message, className) {
    const element = document.getElementById("pumpTransparencyMessage");

    if (element) {
        element.className = className;
        element.innerText = message;
    }
}

async function loadVehiclesForDashboard() {
    const userId = getLoggedInUserId();
    const list = document.getElementById("vehicleDashboardList");
    const totalVehicles = document.getElementById("totalVehicles");

    if (!userId) {
        list.innerHTML = `<p class="error-text">User ID not found. Please login again.</p>`;
        return;
    }

    try {
        const response = await fetch("http://localhost:8081/api/vehicles/user/" + userId);
        const vehicles = await response.json();

        if (!response.ok) {
            list.innerHTML = `<p class="error-text">Failed to load vehicles.</p>`;
            return;
        }

        totalVehicles.innerText = vehicles.length;

        if (vehicles.length === 0) {
            list.innerHTML = `
                <div class="empty-dashboard-box">
                    <h3>No Vehicle Added Yet</h3>
                    <p>Please complete vehicle setup to request fuel in the next module.</p>
                    <a href="profile-setup.html" class="btn primary small-btn">Add Vehicle</a>
                </div>
            `;
            return;
        }

        list.innerHTML = "";

        vehicles.forEach(function (vehicle) {
            const estimatedRange = calculateEstimatedRange(vehicle);

            const card = document.createElement("div");
            card.className = "dashboard-vehicle-card";

            card.innerHTML = `
                <div class="dashboard-vehicle-image-box">
                    <img src="${vehicle.vehiclePhotoPath || "images/default-vehicle.jpg"}" alt="Vehicle photo">
                </div>

                <div class="dashboard-vehicle-info">
                    <h3>${vehicle.brand} ${vehicle.model}</h3>

                    <div class="info-grid">
                        <div><label>Vehicle Type</label><p>${vehicle.vehicleType}</p></div>
                        <div><label>Car Category</label><p>${vehicle.carCategory}</p></div>
                        <div><label>Fuel Type</label><p>${vehicle.fuelType}</p></div>
                        <div><label>Engine CC</label><p>${vehicle.engineCc}</p></div>
                        <div><label>Company Mileage</label><p>${vehicle.companyMileage} km/l</p></div>
                        <div><label>Tank Capacity</label><p>${vehicle.tankCapacity} liter</p></div>
                        <div><label>Last Taken Fuel From</label><p>${valueOrDash(vehicle.lastFuelPumpName)}</p></div>
                        <div><label>Fuel After Last Insertion</label><p>${formatLiter(vehicle.fuelAfterLastInsertionLiter || vehicle.currentFuelLiter)}</p></div>
                        <div><label>Number Plate</label><p>${vehicle.numberPlate}</p></div>
                        <div><label>Odometer Reading</label><p>${vehicle.odometerReading} km</p></div>
                        <div><label>Estimated Full Tank Range</label><p>${estimatedRange}</p></div>
                        <div><label>Last Updated</label><p>${formatDate(vehicle.updatedAt)}</p></div>
                    </div>
                </div>
            `;

            list.appendChild(card);
        });

    } catch (error) {
        list.innerHTML = `<p class="error-text">Server connection failed while loading vehicles.</p>`;
    }
}

function calculateEstimatedRange(vehicle) {
    const tank = Number(vehicle.tankCapacity);
    const mileage = Number(vehicle.companyMileage);

    if (tank > 0 && mileage > 0) {
        return (tank * mileage).toFixed(0) + " km";
    }

    return "-";
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

function setupFeatureButtons() {
    const buttons = document.querySelectorAll(".feature-preview-card");

    buttons.forEach(function (button) {
        if (button.tagName.toLowerCase() === "a") {
            return;
        }

        button.addEventListener("click", function () {
            const title = button.querySelector("h3").innerText;
            alert(title + " feature will be implemented in a future module.");
        });
    });
}

function showDashboardPumpMessage(message, className) {
    const messageBox = document.getElementById("pumpDashboardMessage");

    if (messageBox) {
        messageBox.className = className;
        messageBox.innerText = message;
    }
}

function showHospitalDashboardMessage(message, className) {
    const messageBox = document.getElementById("hospitalDashboardMessage");

    if (messageBox) {
        messageBox.className = className;
        messageBox.innerText = message;
    }
}

function setTextIfExists(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.innerText = value;
    }
}

function getLoggedInUserId() {
    return loggedInUser.userId || loggedInUser.id || localStorage.getItem("userId");
}

function cleanNumber(value) {
    if (value === null || value === undefined || value === "-") {
        return 0;
    }

    return Number(String(value).replace("L", "").replace("hours", "").replace("kVA", "").replace("KVA", "").trim()) || 0;
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

    return "RISK_FREE";
}

function valueOrDash(value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    return value;
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

function renderPumpFuelStockTable(fuelStocks) {
    const tableBody = document.getElementById("pumpFuelStockTableBody");

    if (!tableBody) {
        return;
    }

    if (!fuelStocks || fuelStocks.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4">No fuel stock added yet.</td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = "";

    fuelStocks.forEach(function (stock) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${stock.fuelType}</td>
            <td>${stock.fuelCapacity}</td>
            <td>${stock.currentStock}</td>
            <td>${stock.availableStock}</td>
        `;

        tableBody.appendChild(row);
    });
}

function formatLiter(value) {
    if (value === null || value === undefined || value === "") {
        return "0.00 L";
    }

    const numberValue = Number(value);

    if (Number.isNaN(numberValue)) {
        return value;
    }

    return numberValue.toFixed(2) + " L";
}

async function loadGovernmentAuthorityDashboard() {
    try {
        const response = await fetch("http://localhost:8081/api/authority/government/dashboard?time=" + Date.now());
        const data = await response.json();

        if (!response.ok) {
            showAuthorityMessage("governmentDashboardMessage", getErrorMessage(data), "error-text");
            return;
        }

        fillAuthoritySummary("gov", data.summary);
        renderAuthorityRequests("governmentCriticalRequestsBody", data.criticalRequests);
        renderLowStockPumps("governmentLowStockPumpsBody", data.lowStockPumps);
        renderAuthorityOutages("governmentOutagesBody", data.recentOutages);

        showAuthorityMessage("governmentDashboardMessage", "Government dashboard loaded successfully.", "success-text");

    } catch (error) {
        showAuthorityMessage("governmentDashboardMessage", "Server connection failed while loading government dashboard.", "error-text");
    }
}

async function loadLocalAuthorityDashboard() {
    const userId = getLoggedInUserId();

    if (!userId) {
        showAuthorityMessage("localAuthorityDashboardMessage", "User ID not found. Please login again.", "error-text");
        return;
    }

    try {
        const response = await fetch("http://localhost:8081/api/authority/local/dashboard/" + userId + "?time=" + Date.now());
        const data = await response.json();

        if (!response.ok) {
            showAuthorityMessage("localAuthorityDashboardMessage", getErrorMessage(data), "error-text");
            return;
        }

        fillAuthoritySummary("local", data.summary);
        renderLocalPumps(data.localPumps);
        renderAuthorityRequests("localCriticalRequestsBody", data.criticalRequests);
        renderAuthorityOutages("localOutagesBody", data.recentOutages);

        showAuthorityMessage("localAuthorityDashboardMessage", "Local authority dashboard loaded successfully.", "success-text");

    } catch (error) {
        showAuthorityMessage("localAuthorityDashboardMessage", "Server connection failed while loading local authority dashboard.", "error-text");
    }
}

function fillAuthoritySummary(prefix, summary) {
    if (!summary) {
        return;
    }

    setTextIfExists(prefix + "TotalUsers", summary.totalUsers || 0);
    setTextIfExists(prefix + "TotalPumps", summary.totalPumps || 0);
    setTextIfExists(prefix + "TotalFuelStock", formatNumber(summary.totalFuelStock));
    setTextIfExists(prefix + "ActiveOutages", summary.activeOutages || 0);
    setTextIfExists(prefix + "PendingRequests", summary.pendingRequests || 0);
    setTextIfExists(prefix + "ApprovedRequests", summary.approvedRequests || 0);
    setTextIfExists(prefix + "CollectedRequests", summary.collectedRequests || 0);
    setTextIfExists(prefix + "RejectedRequests", summary.rejectedRequests || 0);
}

function renderAuthorityRequests(tableId, requests) {
    const tableBody = document.getElementById(tableId);

    if (!tableBody) {
        return;
    }

    if (!requests || requests.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6">No critical or pending request found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = "";

    requests.slice(0, 10).forEach(function (request) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${authorityValue(request.id)}</td>
            <td>
                <strong>${authorityValue(request.userName)}</strong><br>
                <small>${authorityValue(request.phoneNumber)}</small>
            </td>
            <td>${authorityValue(request.requestSource)}</td>
            <td>
                ${authorityValue(request.details)}<br>
                <small>Area: ${authorityValue(request.area)}</small>
                ${request.extraFuelRequested ? `<br><small>Extra Fuel: ${authorityValue(request.extraFuelReasonType)}</small>` : ""}
            </td>
            <td>
                ${authorityValue(request.fuelType)}<br>
                ${authorityValue(request.requestedLiter)} L<br>
                ${authorityValue(request.estimatedCost)} BDT
            </td>
            <td>${authorityValue(request.requestStatus)}</td>
        `;

        tableBody.appendChild(row);
    });
}

function renderLowStockPumps(tableId, pumps) {
    const tableBody = document.getElementById(tableId);

    if (!tableBody) {
        return;
    }

    if (!pumps || pumps.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6">No low-stock pump found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = "";

    pumps.forEach(function (pump) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${authorityValue(pump.pumpName)}</td>
            <td>${authorityValue(pump.pumpAddress)}</td>
            <td>${authorityValue(pump.fuelType)}</td>
            <td>${authorityValue(pump.currentStock)} L</td>
            <td>${authorityValue(pump.capacity)} L</td>
            <td>${authorityValue(pump.stockPercentage)}%</td>
        `;

        tableBody.appendChild(row);
    });
}

function renderLocalPumps(pumps) {
    const tableBody = document.getElementById("localPumpsBody");

    if (!tableBody) {
        return;
    }

    if (!pumps || pumps.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5">No local pump found for this area.</td></tr>`;
        return;
    }

    tableBody.innerHTML = "";

    pumps.forEach(function (pump) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${authorityValue(pump.pumpName)}</td>
            <td>${authorityValue(pump.pumpAddress)}</td>
            <td>${authorityValue(pump.fuelTypes)}</td>
            <td>${authorityValue(pump.currentStock)} L</td>
            <td>${authorityValue(pump.pumpStatus)}</td>
        `;

        tableBody.appendChild(row);
    });
}

function renderAuthorityOutages(tableId, outages) {
    const tableBody = document.getElementById(tableId);

    if (!tableBody) {
        return;
    }

    if (!outages || outages.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6">No power outage notice found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = "";

    outages.slice(0, 10).forEach(function (outage) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${authorityValue(outage.provider)}</td>
            <td>${authorityValue(outage.thanaName)}</td>
            <td>${authorityValue(outage.outageType)}</td>
            <td>${authorityValue(outage.cause)}</td>
            <td>${authorityValue(outage.status)}</td>
            <td>${authorityFormatDate(outage.expectedRestorationDateTime)}</td>
        `;

        tableBody.appendChild(row);
    });
}

function showAuthorityMessage(id, message, className) {
    const element = document.getElementById(id);

    if (element) {
        element.className = className;
        element.innerText = message;
    }
}

function authorityValue(value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    return value;
}

function formatNumber(value) {
    const numberValue = Number(value);

    if (Number.isNaN(numberValue)) {
        return "0.00";
    }

    return numberValue.toFixed(2);
}

function authorityFormatDate(value) {
    if (!value) {
        return "-";
    }

    return String(value).replace("T", " ").substring(0, 16);
}