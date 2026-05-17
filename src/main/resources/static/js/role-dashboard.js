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

    setupFeatureButtons();
});

function loadUserInfo() {
    const fullName = loggedInUser.fullName || localStorage.getItem("fullName") || "Demo User";
    const phoneNumber = loggedInUser.phoneNumber || localStorage.getItem("phoneNumber") || "Not Provided";
    const role = loggedInUser.role || localStorage.getItem("role") || "UNKNOWN";
    const status = loggedInUser.status || localStorage.getItem("status") || "ACTIVE";
    const address = loggedInUser.address || localStorage.getItem("address") || "Not Provided";

    setTextIfExists("dashboardUserName", fullName);
    setTextIfExists("dashboardUserPhone", phoneNumber);
    setTextIfExists("dashboardUserRole", role);
    setTextIfExists("dashboardUserStatus", status);
    setTextIfExists("dashboardUserAddress", address);
    setTextIfExists("dashboardUserId", loggedInUser.userId || localStorage.getItem("userId") || "-");

    setTextIfExists("drivingLicenseNumber", loggedInUser.drivingLicenseNumber || "Not Provided");

    setTextIfExists("buildingName", loggedInUser.buildingName || "Not Provided");
    setTextIfExists("holdingNumber", loggedInUser.holdingNumber || "Not Provided");
    setTextIfExists("numberOfFlats", loggedInUser.numberOfFlats || "Not Provided");
    setTextIfExists("generatorPower", loggedInUser.generatorPower || "Not Provided");

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
    setTextIfExists("emergencyContactNumber", loggedInUser.emergencyContactNumber || "Not Provided");
    setTextIfExists("hospitalUnderThana", loggedInUser.hospitalUnderThana || "Not Provided");
    setTextIfExists("hospitalGeneratorCapacity", loggedInUser.hospitalGeneratorCapacity || "Not Provided");

    setTextIfExists(
        "hospitalCurrentDieselReserve",
        loggedInUser.hospitalCurrentDieselReserve !== null && loggedInUser.hospitalCurrentDieselReserve !== undefined
            ? loggedInUser.hospitalCurrentDieselReserve + " L"
            : "Not Provided"
    );

    setTextIfExists(
        "hospitalEstimatedBackupHours",
        loggedInUser.hospitalEstimatedBackupHours !== null && loggedInUser.hospitalEstimatedBackupHours !== undefined
            ? loggedInUser.hospitalEstimatedBackupHours + " hours"
            : "Not Provided"
    );

    setTextIfExists(
        "hospitalDieselStatus",
        loggedInUser.hospitalDieselStatus || "Not Provided"
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
    setTextIfExists("thanaOrUpazila", loggedInUser.thanaOrUpazila || "Not Provided");
}

async function refreshHospitalProfile() {
    const userId = loggedInUser.userId || localStorage.getItem("userId");

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

        loggedInUser = profile;
        localStorage.setItem("loggedInUser", JSON.stringify(profile));

        localStorage.setItem("fullName", profile.fullName || "");
        localStorage.setItem("phoneNumber", profile.phoneNumber || "");
        localStorage.setItem("role", profile.role || "");
        localStorage.setItem("status", profile.status || "");
        localStorage.setItem("userId", profile.userId || "");

        loadUserInfo();

        showHospitalDashboardMessage(
            "Profile refreshed. Backup: " + valueOrDash(profile.hospitalEstimatedBackupHours) +
            " hours, Status: " + valueOrDash(profile.hospitalDieselStatus) +
            ", Diesel Reserve: " + valueOrDash(profile.hospitalCurrentDieselReserve) + " L",
            "success-text"
        );

    } catch (error) {
        showHospitalDashboardMessage("Server connection failed while refreshing hospital profile.", "error-text");
    }
}

async function loadPumpForDashboard() {
    const userId = loggedInUser.userId || localStorage.getItem("userId");

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

async function loadVehiclesForDashboard() {
    const userId = loggedInUser.userId || localStorage.getItem("userId");
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