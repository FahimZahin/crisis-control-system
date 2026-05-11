const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || {};
const vehicleProfile = JSON.parse(localStorage.getItem("vehicleProfilePreview")) || null;

document.addEventListener("DOMContentLoaded", function () {
    loadUserInfo();
    setupLogout();
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

    loadVehiclePreview();
}

function loadVehiclePreview() {
    if (!vehicleProfile) {
        setTextIfExists("vehicleProfileStatus", "Not Added");
        return;
    }

    setTextIfExists("vehicleProfileStatus", "Added");
    setTextIfExists("vehicleType", vehicleProfile.vehicleType || "-");
    setTextIfExists("carCategory", vehicleProfile.carCategory || "N/A");
    setTextIfExists("brand", vehicleProfile.brand || "-");
    setTextIfExists("model", vehicleProfile.model || "-");
    setTextIfExists("fuelType", vehicleProfile.fuelType || "-");
    setTextIfExists("engineCc", vehicleProfile.engineCc || "-");
    setTextIfExists("tankCapacity", vehicleProfile.tankCapacity || "-");
    setTextIfExists("mileagePerLiter", vehicleProfile.mileagePerLiter || "-");
    setTextIfExists("numberPlate", vehicleProfile.numberPlate || "-");
    setTextIfExists("odometerReading", vehicleProfile.odometerReading || "-");

    const rangeElement = document.getElementById("estimatedRange");

    if (rangeElement) {
        const tank = Number(vehicleProfile.tankCapacity);
        const mileage = Number(vehicleProfile.mileagePerLiter);

        if (tank > 0 && mileage > 0) {
            rangeElement.innerText = tank * mileage + " km";
        } else {
            rangeElement.innerText = "-";
        }
    }
}

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (!logoutBtn) {
        return;
    }

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

function setupFeatureButtons() {
    const buttons = document.querySelectorAll(".feature-preview-card");

    buttons.forEach(function (button) {
        button.addEventListener("click", function () {
            const title = button.querySelector("h3").innerText;
            alert(title + " feature will be implemented in a future module.");
        });
    });
}

function setTextIfExists(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.innerText = value;
    }
}