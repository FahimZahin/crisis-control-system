const roleSelect = document.getElementById("role");
const registrationFields = document.getElementById("registrationFields");
const open24HoursCheckbox = document.getElementById("open24Hours");
const pumpTimeFields = document.getElementById("pumpTimeFields");

const roleSections = {
    VEHICLE_OWNER: document.getElementById("vehicleOwnerFields"),
    BUILDING_MANAGER: document.getElementById("buildingManagerFields"),
    PUMP_AUTHORITY: document.getElementById("pumpAuthorityFields"),
    HOSPITAL_AUTHORITY: document.getElementById("hospitalAuthorityFields"),
    UTILITY_AUTHORITY: document.getElementById("utilityAuthorityFields"),
    EMERGENCY_VEHICLE_AUTHORITY: document.getElementById("emergencyVehicleAuthorityFields"),
    GOVERNMENT_AUTHORITY: document.getElementById("governmentAuthorityFields"),
    LOCAL_AUTHORITY: document.getElementById("localAuthorityFields"),
    ADMIN: document.getElementById("adminFields")
};

document.addEventListener("DOMContentLoaded", function () {
    if (typeof populateDhakaThanaSelect === "function") {
        populateDhakaThanaSelect("hospitalUnderThana", "");
    }

    if (typeof populateDhakaThanaSelect === "function") {
        populateDhakaThanaSelect("buildingUnderThana", "");
    }
});
roleSelect.addEventListener("change", function () {
    const selectedRole = roleSelect.value;

    hideAllRoleSections();
    clearMessage();

    if (!selectedRole) {
        registrationFields.style.display = "none";
        return;
    }

    registrationFields.style.display = "block";

    if (roleSections[selectedRole]) {
        roleSections[selectedRole].style.display = "block";
    }
});

open24HoursCheckbox.addEventListener("change", function () {
    if (open24HoursCheckbox.checked) {
        pumpTimeFields.style.display = "none";
        document.getElementById("openingTime").value = "";
        document.getElementById("closingTime").value = "";
    } else {
        pumpTimeFields.style.display = "block";
    }
});

document.getElementById("registerForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const selectedRole = roleSelect.value;

    if (!selectedRole) {
        showMessage("Please select a role first.", "error-text");
        return;
    }

    const data = buildRegistrationData(selectedRole);

    const frontendValidationMessage = validateFrontendData(data);

    if (frontendValidationMessage) {
        showMessage(frontendValidationMessage, "error-text");
        return;
    }

    try {
        const response = await fetch("http://localhost:8081/api/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            showMessage(result.message + ". Please login now.", "success-text");

            setTimeout(function () {
                window.location.href = "login.html";
            }, 1500);
        } else {
            showMessage(result.message || "Registration failed", "error-text");
        }

    } catch (error) {
        showMessage("Server connection failed", "error-text");
    }
});

function buildRegistrationData(selectedRole) {

    const data = {
        role: selectedRole,
        fullName: getValue("fullName"),
        phoneNumber: getValue("phoneNumber"),
        address: getValue("address"),
        password: getValue("password"),
        confirmPassword: getValue("confirmPassword"),

        drivingLicenseNumber: null,

        buildingName: null,
        holdingNumber: null,
        numberOfFlats: null,
        generatorPower: null,

        pumpName: null,
        businessLicenseNumber: null,
        pumpAddress: null,
        fuelCapacity: null,
        fuelTypes: null,
        currentStock: null,
        open24Hours: null,
        openingTime: null,
        closingTime: null,

        hospitalName: null,
        hospitalRegistrationNumber: null,
        hospitalAddress: null,
        emergencyContactNumber: null,
        hospitalUnderThana: null,
        hospitalGeneratorCapacity: null,
        hospitalCurrentDieselReserve: null,

        utilityOrganizationType: null,
        utilityEmployeeId: null,
        serviceArea: null,
        officeAddress: null,

        organizationName: null,
        organizationType: null,
        officialVerificationId: null,
        assignedArea: null,

        governmentEmployeeId: null,
        departmentName: null,
        designation: null,

        localAuthorityId: null,
        district: null,
        thanaOrUpazila: null,

        adminCode: null
    };

    if (selectedRole === "VEHICLE_OWNER") {
        data.drivingLicenseNumber = getValue("drivingLicenseNumber");
    }

    if (selectedRole === "BUILDING_MANAGER") {
        data.buildingName = getValue("buildingName");
        data.holdingNumber = getValue("holdingNumber");
        data.numberOfFlats = getNumberValue("numberOfFlats");
        data.generatorPower = getValue("generatorPower");
        data.thanaOrUpazila = getValue("buildingUnderThana");
    }

    if (selectedRole === "PUMP_AUTHORITY") {
        data.pumpName = getValue("pumpName");
        data.businessLicenseNumber = getValue("businessLicenseNumber");
        data.pumpAddress = getValue("pumpAddress");
        data.fuelCapacity = getNumberValue("fuelCapacity");
        data.fuelTypes = getSelectedFuelTypes();
        data.currentStock = getNumberValue("currentStock");
        data.open24Hours = document.getElementById("open24Hours").checked;
        data.openingTime = data.open24Hours ? null : getValue("openingTime");
        data.closingTime = data.open24Hours ? null : getValue("closingTime");
    }

    if (selectedRole === "HOSPITAL_AUTHORITY") {
        data.hospitalName = getValue("hospitalName");
        data.hospitalRegistrationNumber = getValue("hospitalRegistrationNumber");
        data.hospitalAddress = getValue("hospitalAddress");

        // FIX: Map Thana dropdown to backend field
        data.thanaOrUpazila = getValue("hospitalUnderThana");

        data.hospitalGeneratorCapacity = getValue("hospitalGeneratorCapacity");
        data.hospitalCurrentDieselReserve = getNumberValue("hospitalCurrentDieselReserve");
        data.emergencyContactNumber = getValue("emergencyContactNumber");
    }

    if (selectedRole === "UTILITY_AUTHORITY") {
        data.utilityOrganizationType = getValue("utilityOrganizationType");
        data.utilityEmployeeId = getValue("utilityEmployeeId");
        data.serviceArea = getValue("serviceArea");
        data.officeAddress = getValue("utilityOfficeAddress");
    }

    if (selectedRole === "EMERGENCY_VEHICLE_AUTHORITY") {
        data.organizationName = getValue("organizationName");
        data.organizationType = getValue("organizationType");
        data.officialVerificationId = getValue("officialVerificationId");
        data.assignedArea = getValue("assignedArea");
    }

    if (selectedRole === "GOVERNMENT_AUTHORITY") {
        data.governmentEmployeeId = getValue("governmentEmployeeId");
        data.departmentName = getValue("departmentName");
        data.designation = getValue("governmentDesignation");
        data.officeAddress = getValue("governmentOfficeAddress");
    }

    if (selectedRole === "LOCAL_AUTHORITY") {
        data.localAuthorityId = getValue("localAuthorityId");
        data.district = getValue("district");
        data.thanaOrUpazila = getValue("thanaOrUpazila");
        data.designation = getValue("localDesignation");
        data.officeAddress = getValue("localOfficeAddress");
    }

    if (selectedRole === "ADMIN") {
        data.adminCode = getValue("adminCode");
    }

    return data;
}

function validateFrontendData(data) {

    if (!data.fullName) {
        return "Full name is required.";
    }

    if (!data.phoneNumber) {
        return "Phone number is required.";
    }

    if (!data.password) {
        return "Password is required.";
    }

    if (!data.confirmPassword) {
        return "Confirm password is required.";
    }

    if (data.password !== data.confirmPassword) {
        return "Password and confirm password do not match.";
    }

    if (data.role === "VEHICLE_OWNER" && !data.drivingLicenseNumber) {
        return "Driving license number is required for vehicle owner.";
    }

    if (data.role === "BUILDING_MANAGER") {
        if (!data.buildingName || !data.holdingNumber || !data.numberOfFlats || !data.generatorPower) {
            return "Building name, holding number, number of flats, and generator power are required.";
        }
    }

    if (data.role === "PUMP_AUTHORITY") {
        if (!data.pumpName || !data.businessLicenseNumber || !data.pumpAddress) {
            return "Pump name, business license number, and pump address are required.";
        }

        if (!data.fuelCapacity || data.fuelCapacity <= 0) {
            return "Valid fuel capacity is required.";
        }

        if (!data.fuelTypes) {
            return "Please select at least one fuel type.";
        }

        if (data.currentStock === null || data.currentStock < 0) {
            return "Valid current stock is required.";
        }

        if (data.currentStock > data.fuelCapacity) {
            return "Current stock cannot be greater than fuel capacity.";
        }

        if (!data.open24Hours && (!data.openingTime || !data.closingTime)) {
            return "Opening and closing time are required if pump is not open 24 hours.";
        }
    }

    if (data.role === "HOSPITAL_AUTHORITY") {
        if (
            !data.hospitalName
            || !data.hospitalRegistrationNumber
            || !data.hospitalAddress
            || !data.hospitalUnderThana
            || !data.hospitalGeneratorCapacity
            || data.hospitalCurrentDieselReserve === null
            || data.hospitalCurrentDieselReserve < 0
            || !data.emergencyContactNumber
        ) {
            return "Hospital name, registration number, address, hospital under thana, generator capacity, current diesel reserve, and emergency contact number are required.";
        }

        if (typeof isValidCcsDhakaThana === "function" && !isValidCcsDhakaThana(data.hospitalUnderThana)) {
            return "Please select a valid Dhaka thana from the list.";
        }

        if (Number(data.hospitalGeneratorCapacity) <= 0) {
            return "Hospital generator capacity must be greater than 0.";
        }
    }

    if (data.role === "UTILITY_AUTHORITY") {
        if (!data.utilityOrganizationType || !data.utilityEmployeeId || !data.serviceArea || !data.officeAddress) {
            return "Utility organization type, employee ID, service area, and office address are required.";
        }
    }

    if (data.role === "EMERGENCY_VEHICLE_AUTHORITY") {
        if (!data.organizationName || !data.organizationType || !data.officialVerificationId || !data.assignedArea) {
            return "Organization name, type, official verification ID, and assigned area are required.";
        }
    }

    if (data.role === "GOVERNMENT_AUTHORITY") {
        if (!data.governmentEmployeeId || !data.departmentName || !data.designation || !data.officeAddress) {
            return "Government employee ID, department name, designation, and office address are required.";
        }
    }

    if (data.role === "LOCAL_AUTHORITY") {
        if (!data.localAuthorityId || !data.district || !data.thanaOrUpazila || !data.designation || !data.officeAddress) {
            return "Local authority ID, district, thana/upazila, designation, and office address are required.";
        }
    }

    if (data.role === "ADMIN" && !data.adminCode) {
        return "Admin secret code is required.";
    }

    return null;
}

function hideAllRoleSections() {
    Object.values(roleSections).forEach(function (section) {
        section.style.display = "none";
    });
}

function getValue(id) {
    const element = document.getElementById(id);

    if (!element) {
        return null;
    }

    const value = element.value.trim();

    if (value === "") {
        return null;
    }

    return value;
}

function getNumberValue(id) {
    const value = getValue(id);

    if (value === null) {
        return null;
    }

    return Number(value);
}

function getSelectedFuelTypes() {
    const selectedFuelTypes = [];

    document.querySelectorAll("input[name='fuelTypes']:checked").forEach(function (checkbox) {
        selectedFuelTypes.push(checkbox.value);
    });

    if (selectedFuelTypes.length === 0) {
        return null;
    }

    return selectedFuelTypes.join(",");
}

function showMessage(text, className) {
    const message = document.getElementById("message");
    message.className = className;
    message.innerText = text;
}

function clearMessage() {
    const message = document.getElementById("message");
    message.className = "";
    message.innerText = "";
}