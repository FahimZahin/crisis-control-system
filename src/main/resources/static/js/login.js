const phoneNumberInput = document.getElementById("phoneNumber");
const passwordInput = document.getElementById("password");
const message = document.getElementById("message");

document.addEventListener("DOMContentLoaded", function () {
    setupLoginValidation();
});

function setupLoginValidation() {
    if (phoneNumberInput) {
        phoneNumberInput.addEventListener("input", function () {
            phoneNumberInput.value = phoneNumberInput.value.replace(/\D/g, "").slice(0, 11);
            validatePhoneNumberLive();
        });

        phoneNumberInput.addEventListener("blur", function () {
            validatePhoneNumberLive();
        });
    }

    if (passwordInput) {
        passwordInput.addEventListener("input", function () {
            validatePasswordLive();
        });

        passwordInput.addEventListener("blur", function () {
            validatePasswordLive();
        });
    }
}

document.getElementById("loginForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!validateLoginForm()) {
        return;
    }

    const data = {
        phoneNumber: phoneNumberInput.value.trim(),
        password: passwordInput.value
    };

    try {
        const response = await fetch("http://localhost:8081/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            const userId = result.userId || result.id || "";

            const resolvedThana = firstValidValue(
                result.thanaOrUpazila,
                result.buildingUnderThana,
                result.hospitalUnderThana,
                result.serviceArea,
                result.assignedArea,
                result.district
            );

            result.userId = userId;
            result.thanaOrUpazila = resolvedThana;
            result.loginTime = new Date().toISOString();

            if (result.token) {
                localStorage.setItem("authToken", result.token);
            }

            if (result.role === "BUILDING_MANAGER") {
                result.buildingUnderThana = firstValidValue(result.buildingUnderThana, resolvedThana);
            }

            if (result.role === "HOSPITAL_AUTHORITY") {
                result.hospitalUnderThana = firstValidValue(result.hospitalUnderThana, resolvedThana);
            }

            result.totalIcuUnits = result.totalIcuUnits || 0;
            result.acPatientCapacity = result.acPatientCapacity || 0;
            result.nonAcPatientCapacity = result.nonAcPatientCapacity || 0;

            localStorage.setItem("loggedInUser", JSON.stringify(result));

            localStorage.setItem("userId", userId);
            localStorage.setItem("fullName", result.fullName || "");
            localStorage.setItem("phoneNumber", result.phoneNumber || "");
            localStorage.setItem("address", result.address || "");
            localStorage.setItem("latitude", result.latitude ?? "");
            localStorage.setItem("longitude", result.longitude ?? "");
            localStorage.setItem("role", result.role || "");
            localStorage.setItem("status", result.status || "");
            localStorage.setItem("drivingLicenseNumber", result.drivingLicenseNumber || "");

            localStorage.setItem("thanaOrUpazila", result.thanaOrUpazila || "");
            localStorage.setItem("buildingUnderThana", result.buildingUnderThana || "");
            localStorage.setItem("hospitalUnderThana", result.hospitalUnderThana || "");
            localStorage.setItem("serviceArea", result.serviceArea || "");
            localStorage.setItem("assignedArea", result.assignedArea || "");
            localStorage.setItem("district", result.district || "");

            localStorage.setItem("hospitalName", result.hospitalName || "");
            localStorage.setItem("hospitalGeneratorCapacity", result.hospitalGeneratorCapacity || "");
            localStorage.setItem("hospitalCurrentDieselReserve", result.hospitalCurrentDieselReserve || "");
            localStorage.setItem("hospitalEstimatedBackupHours", result.hospitalEstimatedBackupHours || "");
            localStorage.setItem("hospitalDieselStatus", result.hospitalDieselStatus || "");
            localStorage.setItem("emergencyContactNumber", result.emergencyContactNumber || "");
            localStorage.setItem("totalIcuUnits", result.totalIcuUnits || "");
            localStorage.setItem("acPatientCapacity", result.acPatientCapacity || "");
            localStorage.setItem("nonAcPatientCapacity", result.nonAcPatientCapacity || "");

            showMainMessage(result.message || "Login successful", "success-text");
            showCelebration("🎉 Congratulations! Login successful");

            setTimeout(function () {
                redirectToRoleDashboard(result.role);
            }, 2200);
        } else {
            showMainMessage(result.message || "Login failed", "error-text");
        }

    } catch (error) {
        showMainMessage("Server connection failed", "error-text");
    }
});

function validateLoginForm() {
    const phoneValid = validatePhoneNumberLive();
    const passwordValid = validatePasswordLive();

    return phoneValid && passwordValid;
}

function validatePhoneNumberLive() {
    const value = phoneNumberInput.value.trim();

    if (!value) {
        showFieldError("phoneNumberError", "Phone number is required.");
        markInvalid(phoneNumberInput);
        return false;
    }

    if (!/^[0-9]+$/.test(value)) {
        showFieldError("phoneNumberError", "Phone number can contain digits only.");
        markInvalid(phoneNumberInput);
        return false;
    }

    if (value.length !== 11) {
        showFieldError("phoneNumberError", "Phone number must be exactly 11 digits.");
        markInvalid(phoneNumberInput);
        return false;
    }

    clearFieldError("phoneNumberError");
    markValid(phoneNumberInput);
    return true;
}

function validatePasswordLive() {
    const value = passwordInput.value;

    if (!value || value.trim() === "") {
        showFieldError("passwordError", "Password is required.");
        markInvalid(passwordInput);
        return false;
    }

    clearFieldError("passwordError");
    markValid(passwordInput);
    return true;
}

function showFieldError(id, message) {
    const element = document.getElementById(id);

    if (element) {
        element.innerText = message;
    }
}

function clearFieldError(id) {
    const element = document.getElementById(id);

    if (element) {
        element.innerText = "";
    }
}

function markInvalid(input) {
    if (input) {
        input.classList.remove("valid-input");
        input.classList.add("invalid-input");
    }
}

function markValid(input) {
    if (input) {
        input.classList.remove("invalid-input");
        input.classList.add("valid-input");
    }
}

function showMainMessage(text, className) {
    message.className = className;
    message.innerText = text;
}

function firstValidValue() {
    for (let i = 0; i < arguments.length; i++) {
        const value = arguments[i];

        if (
            value !== null &&
            value !== undefined &&
            String(value).trim() !== "" &&
            String(value).trim() !== "-" &&
            String(value).trim() !== "Not Provided" &&
            String(value).trim() !== "null" &&
            String(value).trim() !== "undefined"
        ) {
            return String(value).trim();
        }
    }

    return "";
}

function redirectToRoleDashboard(role) {
    if (role === "VEHICLE_OWNER") {
        window.location.href = "vehicle-owner-dashboard.html";
    } else if (role === "BUILDING_MANAGER") {
        window.location.href = "building-manager-dashboard.html";
    } else if (role === "PUMP_AUTHORITY") {
        window.location.href = "pump-authority-dashboard.html";
    } else if (role === "HOSPITAL_AUTHORITY") {
        window.location.href = "hospital-authority-dashboard.html";
    } else if (role === "UTILITY_AUTHORITY") {
        window.location.href = "utility-authority-dashboard.html";
    } else if (role === "EMERGENCY_VEHICLE_AUTHORITY") {
        window.location.href = "emergency-vehicle-dashboard.html";
    } else if (role === "GOVERNMENT_AUTHORITY") {
        window.location.href = "government-dashboard.html";
    } else if (role === "LOCAL_AUTHORITY") {
        window.location.href = "local-authority-dashboard.html";
    } else if (role === "ADMIN") {
        window.location.href = "admin-dashboard.html";
    } else {
        window.location.href = "dashboard.html";
    }
}

function showCelebration(text) {
    const oldOverlay = document.querySelector(".celebration-overlay");

    if (oldOverlay) {
        oldOverlay.remove();
    }

    const overlay = document.createElement("div");
    overlay.className = "celebration-overlay";

    const messageBox = document.createElement("div");
    messageBox.className = "celebration-message";
    messageBox.innerText = text;
    overlay.appendChild(messageBox);

    const balloonColors = [
        "balloon-red",
        "balloon-blue",
        "balloon-yellow",
        "balloon-green",
        "balloon-purple"
    ];

    for (let i = 0; i < 10; i++) {
        const balloon = document.createElement("div");
        balloon.className = "celebration-balloon " + balloonColors[i % balloonColors.length];
        balloon.style.left = Math.floor(Math.random() * 90) + "vw";
        balloon.style.animationDelay = (Math.random() * 0.5) + "s";
        overlay.appendChild(balloon);
    }

    for (let i = 0; i < 35; i++) {
        const confetti = document.createElement("div");
        confetti.className = "celebration-confetti";
        confetti.style.left = Math.floor(Math.random() * 100) + "vw";
        confetti.style.background = getRandomCelebrationColor();
        confetti.style.animationDelay = (Math.random() * 0.7) + "s";
        overlay.appendChild(confetti);
    }

    document.body.appendChild(overlay);

    setTimeout(function () {
        overlay.remove();
    }, 2600);
}

function getRandomCelebrationColor() {
    const colors = ["#ff4d6d", "#00a8ff", "#ffd166", "#06d6a0", "#9b5de5", "#f72585"];
    return colors[Math.floor(Math.random() * colors.length)];
}