const roleSelect = document.getElementById("role");
const registrationFields = document.getElementById("registrationFields");
const open24HoursCheckbox = document.getElementById("open24Hours");
const pumpTimeFields = document.getElementById("pumpTimeFields");
const touchedFields = new Set();

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
        populateDhakaThanaSelect("buildingUnderThana", "");
    }

    setupLiveValidation();
});

roleSelect.addEventListener("change", function () {
    const selectedRole = roleSelect.value;

    hideAllRoleSections();
    clearMessage();
    clearAllFieldErrors();
    touchedFields.clear();

    if (!selectedRole) {
        registrationFields.style.display = "none";
        return;
    }

    registrationFields.style.display = "block";

    if (roleSections[selectedRole]) {
        roleSections[selectedRole].style.display = "block";
    }
});

if (open24HoursCheckbox) {
    open24HoursCheckbox.addEventListener("change", function () {
        if (open24HoursCheckbox.checked) {
            pumpTimeFields.style.display = "none";
            document.getElementById("openingTime").value = "";
            document.getElementById("closingTime").value = "";
            clearFieldError("openingTime");
            clearFieldError("closingTime");
        } else {
            pumpTimeFields.style.display = "block";
        }

        validateCurrentVisibleFields();
    });
}

document.getElementById("registerForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const selectedRole = roleSelect.value;

    if (!selectedRole) {
        showMessage("Please select a role first.", "error-text");
        markInvalid(roleSelect);
        return;
    }

    const data = buildRegistrationData(selectedRole);
    const isValid = validateFrontendData(data, true);

    if (!isValid) {
        showMessage("Please fix the highlighted fields before registration.", "error-text");
        focusFirstInvalidField();
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
            showMessage((result.message || "Registration successful") + ". Please login now.", "success-text");

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

function setupLiveValidation() {
    const fieldIds = [
        "fullName",
        "phoneNumber",
        "address",
        "password",
        "confirmPassword",
        "drivingLicenseNumber",

        "buildingName",
        "holdingNumber",
        "numberOfFlats",
        "generatorPower",
        "buildingUnderThana",

        "pumpName",
        "businessLicenseNumber",
        "pumpAddress",
        "fuelCapacity",
        "currentStock",
        "openingTime",
        "closingTime",

        "hospitalName",
        "hospitalRegistrationNumber",
        "hospitalAddress",
        "hospitalUnderThana",
        "hospitalGeneratorCapacity",
        "hospitalDieselTankCapacity",
        "hospitalCurrentDieselReserve",
        "emergencyContactNumber",

        "utilityOrganizationType",
        "utilityEmployeeId",
        "serviceArea",
        "utilityOfficeAddress",

        "organizationName",
        "organizationType",
        "officialVerificationId",
        "assignedArea",

        "governmentEmployeeId",
        "departmentName",
        "governmentDesignation",
        "governmentOfficeAddress",

        "localAuthorityId",
        "district",
        "thanaOrUpazila",
        "localDesignation",
        "localOfficeAddress",

        "adminCode"
    ];

    fieldIds.forEach(function (id) {
        const element = document.getElementById(id);

        if (!element) {
            return;
        }

        if (id === "phoneNumber" || id === "emergencyContactNumber") {
            element.addEventListener("input", function () {
                element.value = element.value.replace(/\D/g, "").slice(0, 11);

                if (touchedFields.has(id)) {
                    validateSingleField(id);
                }
            });
        } else {
            element.addEventListener("input", function () {
                if (touchedFields.has(id)) {
                    validateSingleField(id);
                }

                if (id === "password" || id === "confirmPassword") {
                    validatePasswordMatchIfTouched();
                }

                if (id === "fuelCapacity" || id === "currentStock") {
                    validatePumpStockIfTouched();
                }

                if (id === "hospitalDieselTankCapacity" || id === "hospitalCurrentDieselReserve") {
                    validateHospitalReserveIfTouched();
                }
            });

            element.addEventListener("change", function () {
                touchedFields.add(id);
                validateSingleField(id);

                if (id === "hospitalDieselTankCapacity" || id === "hospitalCurrentDieselReserve") {
                    validateHospitalReserveIfTouched();
                }
            });
        }

        element.addEventListener("blur", function () {
            touchedFields.add(id);
            validateSingleField(id);

            if (id === "password" || id === "confirmPassword") {
                validatePasswordMatchIfTouched();
            }

            if (id === "fuelCapacity" || id === "currentStock") {
                validatePumpStockIfTouched();
            }

            if (id === "hospitalDieselTankCapacity" || id === "hospitalCurrentDieselReserve") {
                validateHospitalReserveIfTouched();
            }
        });
    });

    document.querySelectorAll("input[name='fuelTypes']").forEach(function (checkbox) {
        checkbox.addEventListener("change", function () {
            touchedFields.add("fuelTypes");
            validateFuelTypesIfTouched();
        });
    });
}

function validateCurrentVisibleFields() {
    const selectedRole = roleSelect.value;

    if (!selectedRole) {
        return false;
    }

    const data = buildRegistrationData(selectedRole);
    return validateFrontendData(data, false);
}

function validateSingleField(id) {
    const selectedRole = roleSelect.value;

    if (!selectedRole) {
        return true;
    }

    const data = buildRegistrationData(selectedRole);

    if (id === "fullName") {
        return validateRequired("fullName", data.fullName, "Full name is required.");
    }

    if (id === "phoneNumber") {
        return validatePhoneField("phoneNumber", data.phoneNumber, "Phone number must be exactly 11 digits.");
    }

    if (id === "password") {
        return validateRequired("password", data.password, "Password is required.");
    }

    if (id === "confirmPassword") {
        return validateRequired("confirmPassword", data.confirmPassword, "Confirm password is required.");
    }

    if (id === "drivingLicenseNumber" && data.role === "VEHICLE_OWNER") {
        return validateRequired("drivingLicenseNumber", data.drivingLicenseNumber, "Driving license number is required for vehicle owner.");
    }

    if (data.role === "BUILDING_MANAGER") {
        if (id === "buildingName") return validateRequired("buildingName", data.buildingName, "Building name is required.");
        if (id === "holdingNumber") return validateRequired("holdingNumber", data.holdingNumber, "Holding number is required.");
        if (id === "numberOfFlats") return validatePositiveNumber("numberOfFlats", data.numberOfFlats, "Number of flats must be greater than 0.");
        if (id === "generatorPower") return validateRequired("generatorPower", data.generatorPower, "Generator power is required.");
        if (id === "buildingUnderThana") return validateRequired("buildingUnderThana", data.buildingUnderThana, "Building thana is required.");
    }

    if (data.role === "PUMP_AUTHORITY") {
        if (id === "pumpName") return validateRequired("pumpName", data.pumpName, "Pump name is required.");
        if (id === "businessLicenseNumber") return validateRequired("businessLicenseNumber", data.businessLicenseNumber, "Business license number is required.");
        if (id === "pumpAddress") return validateRequired("pumpAddress", data.pumpAddress, "Pump address is required.");
        if (id === "fuelCapacity") return validatePositiveNumber("fuelCapacity", data.fuelCapacity, "Fuel capacity must be greater than 0.");

        if (id === "currentStock") {
            if (data.currentStock === null || data.currentStock < 0) {
                setFieldError("currentStock", "Current stock cannot be negative.");
                return false;
            }

            if (data.fuelCapacity !== null && data.currentStock > data.fuelCapacity) {
                setFieldError("currentStock", "Current stock cannot be greater than fuel capacity.");
                return false;
            }

            clearFieldError("currentStock");
            markValidById("currentStock");
            return true;
        }

        if (id === "openingTime" && !data.open24Hours) {
            return validateRequired("openingTime", data.openingTime, "Opening time is required.");
        }

        if (id === "closingTime" && !data.open24Hours) {
            return validateRequired("closingTime", data.closingTime, "Closing time is required.");
        }
    }

    if (data.role === "HOSPITAL_AUTHORITY") {
        if (id === "hospitalName") return validateRequired("hospitalName", data.hospitalName, "Hospital name is required.");
        if (id === "hospitalRegistrationNumber") return validateRequired("hospitalRegistrationNumber", data.hospitalRegistrationNumber, "Hospital registration number is required.");
        if (id === "hospitalAddress") return validateRequired("hospitalAddress", data.hospitalAddress, "Hospital address is required.");
        if (id === "hospitalUnderThana") return validateRequired("hospitalUnderThana", data.hospitalUnderThana, "Hospital thana is required.");

        if (id === "hospitalGeneratorCapacity") {
            return validatePositiveNumber(
                "hospitalGeneratorCapacity",
                Number(data.hospitalGeneratorCapacity),
                "Hospital generator capacity must be greater than 0."
            );
        }

        if (id === "hospitalDieselTankCapacity") {
            return validateHospitalDieselTankCapacity(data.hospitalDieselTankCapacity);
        }

        if (id === "hospitalCurrentDieselReserve") {
            return validateHospitalDieselReserve(data.hospitalCurrentDieselReserve, data.hospitalDieselTankCapacity);
        }

        if (id === "emergencyContactNumber") {
            return validatePhoneField("emergencyContactNumber", data.emergencyContactNumber, "Emergency contact must be exactly 11 digits.");
        }
    }

    if (data.role === "UTILITY_AUTHORITY") {
        if (id === "utilityOrganizationType") return validateRequired("utilityOrganizationType", data.utilityOrganizationType, "Utility organization type is required.");
        if (id === "utilityEmployeeId") return validateRequired("utilityEmployeeId", data.utilityEmployeeId, "Utility employee ID is required.");
        if (id === "serviceArea") return validateRequired("serviceArea", data.serviceArea, "Service area is required.");
        if (id === "utilityOfficeAddress") return validateRequired("utilityOfficeAddress", data.officeAddress, "Office address is required.");
    }

    if (data.role === "EMERGENCY_VEHICLE_AUTHORITY") {
        if (id === "organizationName") return validateRequired("organizationName", data.organizationName, "Organization name is required.");
        if (id === "organizationType") return validateRequired("organizationType", data.organizationType, "Organization type is required.");
        if (id === "officialVerificationId") return validateRequired("officialVerificationId", data.officialVerificationId, "Official verification ID is required.");
        if (id === "assignedArea") return validateRequired("assignedArea", data.assignedArea, "Assigned area is required.");
    }

    if (data.role === "GOVERNMENT_AUTHORITY") {
        if (id === "governmentEmployeeId") return validateRequired("governmentEmployeeId", data.governmentEmployeeId, "Government employee ID is required.");
        if (id === "departmentName") return validateRequired("departmentName", data.departmentName, "Department name is required.");
        if (id === "governmentDesignation") return validateRequired("governmentDesignation", data.designation, "Designation is required.");
        if (id === "governmentOfficeAddress") return validateRequired("governmentOfficeAddress", data.officeAddress, "Office address is required.");
    }

    if (data.role === "LOCAL_AUTHORITY") {
        if (id === "localAuthorityId") return validateRequired("localAuthorityId", data.localAuthorityId, "Local authority ID is required.");
        if (id === "district") return validateRequired("district", data.district, "District is required.");
        if (id === "thanaOrUpazila") return validateRequired("thanaOrUpazila", data.thanaOrUpazila, "Thana/Upazila is required.");
        if (id === "localDesignation") return validateRequired("localDesignation", data.designation, "Designation is required.");
        if (id === "localOfficeAddress") return validateRequired("localOfficeAddress", data.officeAddress, "Office address is required.");
    }

    if (id === "adminCode" && data.role === "ADMIN") {
        return validateRequired("adminCode", data.adminCode, "Admin secret code is required.");
    }

    return true;
}

function validatePasswordMatchIfTouched() {
    if (!touchedFields.has("password") || !touchedFields.has("confirmPassword")) {
        return true;
    }

    const password = getValue("password");
    const confirmPassword = getValue("confirmPassword");

    if (password && confirmPassword && password !== confirmPassword) {
        setFieldError("confirmPassword", "Password and confirm password do not match.");
        return false;
    }

    if (confirmPassword) {
        clearFieldError("confirmPassword");
        markValidById("confirmPassword");
    }

    return true;
}

function validatePumpStockIfTouched() {
    if (!touchedFields.has("fuelCapacity") || !touchedFields.has("currentStock")) {
        return true;
    }

    const fuelCapacity = getNumberValue("fuelCapacity");
    const currentStock = getNumberValue("currentStock");

    if (fuelCapacity !== null && currentStock !== null && currentStock > fuelCapacity) {
        setFieldError("currentStock", "Current stock cannot be greater than fuel capacity.");
        return false;
    }

    if (currentStock !== null && currentStock >= 0) {
        clearFieldError("currentStock");
        markValidById("currentStock");
    }

    return true;
}

function validateHospitalReserveIfTouched() {
    if (!touchedFields.has("hospitalDieselTankCapacity") && !touchedFields.has("hospitalCurrentDieselReserve")) {
        return true;
    }

    const data = buildRegistrationData(roleSelect.value);

    if (touchedFields.has("hospitalDieselTankCapacity")) {
        validateHospitalDieselTankCapacity(data.hospitalDieselTankCapacity);
    }

    if (touchedFields.has("hospitalCurrentDieselReserve")) {
        return validateHospitalDieselReserve(data.hospitalCurrentDieselReserve, data.hospitalDieselTankCapacity);
    }

    return true;
}

function validateFuelTypesIfTouched() {
    if (!touchedFields.has("fuelTypes")) {
        return true;
    }

    const fuelTypes = getSelectedFuelTypes();

    if (!fuelTypes) {
        setCheckboxGroupError("fuelTypes", "Please select at least one fuel type.");
        return false;
    }

    clearCheckboxGroupError("fuelTypes");
    return true;
}

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
        buildingUnderThana: null,

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
        hospitalUnderThana: null,
        hospitalGeneratorCapacity: null,
        hospitalDieselTankCapacity: null,
        hospitalCurrentDieselReserve: null,
        emergencyContactNumber: null,

        totalIcuUnits: 0,
        acPatientCapacity: 0,
        nonAcPatientCapacity: 0,

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
        data.buildingUnderThana = getValue("buildingUnderThana");
        data.thanaOrUpazila = data.buildingUnderThana;
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
        data.hospitalUnderThana = getValue("hospitalUnderThana");
        data.thanaOrUpazila = data.hospitalUnderThana;
        data.hospitalGeneratorCapacity = getValue("hospitalGeneratorCapacity");
        data.hospitalDieselTankCapacity = getNumberValue("hospitalDieselTankCapacity");
        data.hospitalCurrentDieselReserve = getNumberValue("hospitalCurrentDieselReserve");
        data.emergencyContactNumber = getValue("emergencyContactNumber");

        data.totalIcuUnits = 0;
        data.acPatientCapacity = 0;
        data.nonAcPatientCapacity = 0;
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

function validateFrontendData(data, showGlobalMessage) {
    let isValid = true;

    clearAllFieldErrors();

    if (!validateRequired("fullName", data.fullName, "Full name is required.")) {
        isValid = false;
    }

    if (!validatePhoneField("phoneNumber", data.phoneNumber, "Phone number must be exactly 11 digits.")) {
        isValid = false;
    }

    if (!validateRequired("password", data.password, "Password is required.")) {
        isValid = false;
    }

    if (!validateRequired("confirmPassword", data.confirmPassword, "Confirm password is required.")) {
        isValid = false;
    }

    if (data.password && data.confirmPassword && data.password !== data.confirmPassword) {
        setFieldError("confirmPassword", "Password and confirm password do not match.");
        isValid = false;
    }

    if (data.role === "VEHICLE_OWNER") {
        if (!validateRequired("drivingLicenseNumber", data.drivingLicenseNumber, "Driving license number is required for vehicle owner.")) {
            isValid = false;
        }
    }

    if (data.role === "BUILDING_MANAGER") {
        if (!validateRequired("buildingName", data.buildingName, "Building name is required.")) isValid = false;
        if (!validateRequired("holdingNumber", data.holdingNumber, "Holding number is required.")) isValid = false;
        if (!validatePositiveNumber("numberOfFlats", data.numberOfFlats, "Number of flats must be greater than 0.")) isValid = false;
        if (!validateRequired("generatorPower", data.generatorPower, "Generator power is required.")) isValid = false;
        if (!validateRequired("buildingUnderThana", data.buildingUnderThana, "Building thana is required.")) isValid = false;
    }

    if (data.role === "PUMP_AUTHORITY") {
        if (!validateRequired("pumpName", data.pumpName, "Pump name is required.")) isValid = false;
        if (!validateRequired("businessLicenseNumber", data.businessLicenseNumber, "Business license number is required.")) isValid = false;
        if (!validateRequired("pumpAddress", data.pumpAddress, "Pump address is required.")) isValid = false;
        if (!validatePositiveNumber("fuelCapacity", data.fuelCapacity, "Fuel capacity must be greater than 0.")) isValid = false;

        if (!data.fuelTypes) {
            setCheckboxGroupError("fuelTypes", "Please select at least one fuel type.");
            isValid = false;
        } else {
            clearCheckboxGroupError("fuelTypes");
        }

        if (data.currentStock === null || data.currentStock < 0) {
            setFieldError("currentStock", "Current stock cannot be negative.");
            isValid = false;
        }

        if (data.currentStock !== null && data.fuelCapacity !== null && data.currentStock > data.fuelCapacity) {
            setFieldError("currentStock", "Current stock cannot be greater than fuel capacity.");
            isValid = false;
        }

        if (!data.open24Hours) {
            if (!validateRequired("openingTime", data.openingTime, "Opening time is required.")) isValid = false;
            if (!validateRequired("closingTime", data.closingTime, "Closing time is required.")) isValid = false;
        }
    }

    if (data.role === "HOSPITAL_AUTHORITY") {
        if (!validateRequired("hospitalName", data.hospitalName, "Hospital name is required.")) isValid = false;
        if (!validateRequired("hospitalRegistrationNumber", data.hospitalRegistrationNumber, "Hospital registration number is required.")) isValid = false;
        if (!validateRequired("hospitalAddress", data.hospitalAddress, "Hospital address is required.")) isValid = false;
        if (!validateRequired("hospitalUnderThana", data.hospitalUnderThana, "Hospital thana is required.")) isValid = false;

        if (!validatePositiveNumber("hospitalGeneratorCapacity", Number(data.hospitalGeneratorCapacity), "Hospital generator capacity must be greater than 0.")) {
            isValid = false;
        }

        if (!validateHospitalDieselTankCapacity(data.hospitalDieselTankCapacity)) {
            isValid = false;
        }

        if (!validateHospitalDieselReserve(data.hospitalCurrentDieselReserve, data.hospitalDieselTankCapacity)) {
            isValid = false;
        }

        if (!validatePhoneField("emergencyContactNumber", data.emergencyContactNumber, "Emergency contact must be exactly 11 digits.")) {
            isValid = false;
        }

        if (
            data.hospitalUnderThana &&
            typeof isValidCcsDhakaThana === "function" &&
            !isValidCcsDhakaThana(data.hospitalUnderThana)
        ) {
            setFieldError("hospitalUnderThana", "Please select a valid Dhaka thana from the list.");
            isValid = false;
        }
    }

    if (data.role === "UTILITY_AUTHORITY") {
        if (!validateRequired("utilityOrganizationType", data.utilityOrganizationType, "Utility organization type is required.")) isValid = false;
        if (!validateRequired("utilityEmployeeId", data.utilityEmployeeId, "Utility employee ID is required.")) isValid = false;
        if (!validateRequired("serviceArea", data.serviceArea, "Service area is required.")) isValid = false;
        if (!validateRequired("utilityOfficeAddress", data.officeAddress, "Office address is required.")) isValid = false;
    }

    if (data.role === "EMERGENCY_VEHICLE_AUTHORITY") {
        if (!validateRequired("organizationName", data.organizationName, "Organization name is required.")) isValid = false;
        if (!validateRequired("organizationType", data.organizationType, "Organization type is required.")) isValid = false;
        if (!validateRequired("officialVerificationId", data.officialVerificationId, "Official verification ID is required.")) isValid = false;
        if (!validateRequired("assignedArea", data.assignedArea, "Assigned area is required.")) isValid = false;
    }

    if (data.role === "GOVERNMENT_AUTHORITY") {
        if (!validateRequired("governmentEmployeeId", data.governmentEmployeeId, "Government employee ID is required.")) isValid = false;
        if (!validateRequired("departmentName", data.departmentName, "Department name is required.")) isValid = false;
        if (!validateRequired("governmentDesignation", data.designation, "Designation is required.")) isValid = false;
        if (!validateRequired("governmentOfficeAddress", data.officeAddress, "Office address is required.")) isValid = false;
    }

    if (data.role === "LOCAL_AUTHORITY") {
        if (!validateRequired("localAuthorityId", data.localAuthorityId, "Local authority ID is required.")) isValid = false;
        if (!validateRequired("district", data.district, "District is required.")) isValid = false;
        if (!validateRequired("thanaOrUpazila", data.thanaOrUpazila, "Thana/Upazila is required.")) isValid = false;
        if (!validateRequired("localDesignation", data.designation, "Designation is required.")) isValid = false;
        if (!validateRequired("localOfficeAddress", data.officeAddress, "Office address is required.")) isValid = false;
    }

    if (data.role === "ADMIN") {
        if (!validateRequired("adminCode", data.adminCode, "Admin secret code is required.")) isValid = false;
    }

    if (!isValid && showGlobalMessage) {
        showMessage("Please fix the highlighted fields before registration.", "error-text");
    }

    return isValid;
}

function validateRequired(id, value, message) {
    if (value === null || value === undefined || String(value).trim() === "") {
        setFieldError(id, message);
        return false;
    }

    clearFieldError(id);
    markValidById(id);
    return true;
}

function validatePhoneField(id, value, message) {
    if (value === null || value === undefined || String(value).trim() === "") {
        setFieldError(id, "This phone number is required.");
        return false;
    }

    if (!/^[0-9]{11}$/.test(String(value).trim())) {
        setFieldError(id, message);
        return false;
    }

    clearFieldError(id);
    markValidById(id);
    return true;
}

function validatePositiveNumber(id, value, message) {
    if (value === null || value === undefined || value === "" || Number(value) <= 0 || Number.isNaN(Number(value))) {
        setFieldError(id, message);
        return false;
    }

    clearFieldError(id);
    markValidById(id);
    return true;
}

function validateHospitalDieselTankCapacity(value) {
    const capacity = Number(value);

    if (value === null || value === undefined || value === "" || Number.isNaN(capacity) || capacity <= 0) {
        setFieldError("hospitalDieselTankCapacity", "Hospital diesel tank capacity is required.");
        return false;
    }

    if (capacity > 1000) {
        setFieldError("hospitalDieselTankCapacity", "Hospital diesel tank capacity cannot be more than 1000 L.");
        return false;
    }

    clearFieldError("hospitalDieselTankCapacity");
    markValidById("hospitalDieselTankCapacity");
    return true;
}

function validateHospitalDieselReserve(currentReserve, dieselTankCapacity) {
    const reserve = Number(currentReserve);
    const capacity = Number(dieselTankCapacity);

    if (currentReserve === null || currentReserve === undefined || currentReserve === "" || Number.isNaN(reserve) || reserve < 0) {
        setFieldError("hospitalCurrentDieselReserve", "Diesel reserve cannot be negative.");
        return false;
    }

    if (dieselTankCapacity !== null && dieselTankCapacity !== undefined && dieselTankCapacity !== "" && !Number.isNaN(capacity)) {
        if (reserve > capacity) {
            setFieldError("hospitalCurrentDieselReserve", "Current diesel reserve cannot be greater than diesel tank capacity.");
            return false;
        }
    }

    clearFieldError("hospitalCurrentDieselReserve");
    markValidById("hospitalCurrentDieselReserve");
    return true;
}


function markValidById(id) {
    const field = document.getElementById(id);

    if (field) {
        field.classList.remove("invalid-input");
        field.classList.add("valid-input");
    }
}

function markInvalid(field) {
    if (field) {
        field.classList.remove("valid-input");
        field.classList.add("invalid-input");
    }
}

function setFieldError(id, message) {
    const field = document.getElementById(id);

    if (!field) {
        return;
    }

    let errorElement = document.getElementById(id + "Error");

    if (!errorElement) {
        errorElement = document.createElement("small");
        errorElement.id = id + "Error";
        errorElement.className = "field-error";
        field.insertAdjacentElement("afterend", errorElement);
    }

    errorElement.innerText = message;
    errorElement.style.display = "block";

    field.classList.remove("valid-input");
    field.classList.add("invalid-input");
}

function clearFieldError(id) {
    const field = document.getElementById(id);
    const errorElement = document.getElementById(id + "Error");

    if (errorElement) {
        errorElement.innerText = "";
        errorElement.style.display = "none";
    }

    if (field) {
        field.classList.remove("invalid-input");
    }
}

function clearAllFieldErrors() {
    document.querySelectorAll(".field-error").forEach(function (element) {
        element.innerText = "";
        element.style.display = "none";
    });

    document.querySelectorAll(".invalid-input").forEach(function (element) {
        element.classList.remove("invalid-input");
    });

    document.querySelectorAll(".valid-input").forEach(function (element) {
        element.classList.remove("valid-input");
    });

    clearCheckboxGroupError("fuelTypes");
}

function setCheckboxGroupError(name, message) {
    let errorElement = document.getElementById(name + "Error");

    if (!errorElement) {
        const group = document.querySelector("input[name='" + name + "']");
        if (group && group.closest(".checkbox-group")) {
            errorElement = document.createElement("small");
            errorElement.id = name + "Error";
            errorElement.className = "field-error";
            group.closest(".checkbox-group").insertAdjacentElement("afterend", errorElement);
        }
    }

    if (errorElement) {
        errorElement.innerText = message;
        errorElement.style.display = "block";
    }
}

function clearCheckboxGroupError(name) {
    const errorElement = document.getElementById(name + "Error");

    if (errorElement) {
        errorElement.innerText = "";
        errorElement.style.display = "none";
    }
}
function focusFirstInvalidField() {
    const firstInvalid = document.querySelector(".invalid-input");

    if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
        firstInvalid.focus();
    }
}

function hideAllRoleSections() {
    Object.values(roleSections).forEach(function (section) {
        if (section) {
            section.style.display = "none";
        }
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

    const numberValue = Number(value);

    if (Number.isNaN(numberValue)) {
        return null;
    }

    return numberValue;
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

    if (message) {
        message.className = className;
        message.innerText = text;
    }
}

function clearMessage() {
    const message = document.getElementById("message");

    if (message) {
        message.className = "";
        message.innerText = "";
    }
}