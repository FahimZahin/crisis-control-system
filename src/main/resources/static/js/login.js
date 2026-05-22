document.getElementById("loginForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const message = document.getElementById("message");

    const data = {
        phoneNumber: document.getElementById("phoneNumber").value,
        password: document.getElementById("password").value
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
            const resolvedThana =
                result.hospitalUnderThana ||
                result.buildingUnderThana ||
                result.thanaOrUpazila ||
                "";

            result.userId = userId;
            result.thanaOrUpazila = resolvedThana;
            result.hospitalUnderThana = result.hospitalUnderThana || resolvedThana;
            result.buildingUnderThana = result.buildingUnderThana || resolvedThana;

            localStorage.setItem("loggedInUser", JSON.stringify(result));

            localStorage.setItem("userId", userId);
            localStorage.setItem("fullName", result.fullName || "");
            localStorage.setItem("phoneNumber", result.phoneNumber || "");
            localStorage.setItem("address", result.address || "");
            localStorage.setItem("role", result.role || "");
            localStorage.setItem("status", result.status || "");
            localStorage.setItem("drivingLicenseNumber", result.drivingLicenseNumber || "");

            localStorage.setItem("hospitalUnderThana", result.hospitalUnderThana || "");
            localStorage.setItem("buildingUnderThana", result.buildingUnderThana || "");
            localStorage.setItem("thanaOrUpazila", result.thanaOrUpazila || "");

            localStorage.setItem("hospitalName", result.hospitalName || "");
            localStorage.setItem("hospitalGeneratorCapacity", result.hospitalGeneratorCapacity || "");
            localStorage.setItem("hospitalCurrentDieselReserve", result.hospitalCurrentDieselReserve || "");
            localStorage.setItem("hospitalEstimatedBackupHours", result.hospitalEstimatedBackupHours || "");
            localStorage.setItem("hospitalDieselStatus", result.hospitalDieselStatus || "");
            localStorage.setItem("emergencyContactNumber", result.emergencyContactNumber || "");

            message.className = "success-text";
            message.innerText = result.message || "Login successful";

            setTimeout(function () {
                redirectToRoleDashboard(result.role);
            }, 1000);
        } else {
            message.className = "error-text";
            message.innerText = result.message || "Login failed";
        }

    } catch (error) {
        message.className = "error-text";
        message.innerText = "Server connection failed";
    }
});

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