const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || {};
const vehicleProfile = JSON.parse(localStorage.getItem("vehicleProfilePreview")) || null;

document.addEventListener("DOMContentLoaded", function () {
    loadAccountInfo();
    loadVehicleInfo();
    setupTabs();
    setupRangeCalculator();
    setupLogout();
});

function loadAccountInfo() {
    const role = loggedInUser.role || localStorage.getItem("role") || "-";

    setText("summaryUserId", loggedInUser.userId || localStorage.getItem("userId") || "-");
    setText("summaryStatus", loggedInUser.status || localStorage.getItem("status") || "ACTIVE");
    setText("summaryLicense", loggedInUser.drivingLicenseNumber || localStorage.getItem("drivingLicenseNumber") || "Not Provided");
    setText("badgeRole", role);

    setText("infoFullName", loggedInUser.fullName || localStorage.getItem("fullName") || "-");
    setText("infoPhoneNumber", loggedInUser.phoneNumber || localStorage.getItem("phoneNumber") || "-");
    setText("infoRole", role);
    setText("infoStatus", loggedInUser.status || localStorage.getItem("status") || "ACTIVE");
    setText("infoDrivingLicense", loggedInUser.drivingLicenseNumber || localStorage.getItem("drivingLicenseNumber") || "Not Provided");
    setText("infoAddress", loggedInUser.address || localStorage.getItem("address") || "Not Provided");

    if (role !== "VEHICLE_OWNER") {
        document.getElementById("roleWarning").classList.remove("hidden-section");
        setText("currentRoleText", role);
    }
}

function loadVehicleInfo() {
    if (!vehicleProfile) {
        setText("summaryVehicleStatus", "Not Added");
        document.getElementById("noVehicleBox").style.display = "block";
        document.getElementById("vehicleInfoBox").classList.add("hidden-section");
        return;
    }

    setText("summaryVehicleStatus", "Added");
    document.getElementById("noVehicleBox").style.display = "none";
    document.getElementById("vehicleInfoBox").classList.remove("hidden-section");

    setText("vehicleType", vehicleProfile.vehicleType || "-");
    setText("carCategory", vehicleProfile.carCategory || "N/A");
    setText("brand", vehicleProfile.brand || "-");
    setText("model", vehicleProfile.model || "-");
    setText("fuelType", vehicleProfile.fuelType || "-");
    setText("engineCc", vehicleProfile.engineCc || "-");
    setText("tankCapacity", vehicleProfile.tankCapacity || "-");
    setText("mileagePerLiter", vehicleProfile.mileagePerLiter || "-");
    setText("numberPlate", vehicleProfile.numberPlate || "-");
    setText("odometerReading", vehicleProfile.odometerReading || "-");

    const tankCapacity = Number(vehicleProfile.tankCapacity);
    const mileage = Number(vehicleProfile.mileagePerLiter);

    if (tankCapacity > 0 && mileage > 0) {
        const estimatedRange = tankCapacity * mileage;
        setText("estimatedRange", estimatedRange);
    } else {
        setText("estimatedRange", "-");
    }
}

function setupTabs() {
    const buttons = document.querySelectorAll(".tab-button");
    const contents = document.querySelectorAll(".tab-content");

    buttons.forEach(function (button) {
        button.addEventListener("click", function () {
            buttons.forEach(function (btn) {
                btn.classList.remove("active");
            });

            contents.forEach(function (content) {
                content.classList.remove("active");
            });

            button.classList.add("active");

            const tabId = button.getAttribute("data-tab");
            document.getElementById(tabId).classList.add("active");
        });
    });
}

function setupRangeCalculator() {
    const calculateButton = document.getElementById("calculateRangeBtn");

    calculateButton.addEventListener("click", function () {
        const liters = Number(document.getElementById("calculatorLiters").value);
        const result = document.getElementById("calculatorResult");

        if (!vehicleProfile) {
            result.className = "error-text";
            result.innerText = "Please complete vehicle profile setup first.";
            return;
        }

        const mileage = Number(vehicleProfile.mileagePerLiter);

        if (!liters || liters <= 0) {
            result.className = "error-text";
            result.innerText = "Please enter a valid fuel amount.";
            return;
        }

        if (!mileage || mileage <= 0) {
            result.className = "error-text";
            result.innerText = "Mileage data is missing.";
            return;
        }

        const range = liters * mileage;

        result.className = "success-text";
        result.innerText = "Estimated range: " + range + " km";
    });
}

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");

    logoutBtn.addEventListener("click", function () {
        localStorage.removeItem("loggedInUser");
        localStorage.removeItem("userId");
        localStorage.removeItem("fullName");
        localStorage.removeItem("phoneNumber");
        localStorage.removeItem("address");
        localStorage.removeItem("role");
        localStorage.removeItem("status");
        localStorage.removeItem("drivingLicenseNumber");
    });
}

function setText(id, value) {
    document.getElementById(id).innerText = value;
}