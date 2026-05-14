const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    redirectToRoleDashboard(loggedInUser.role);
});

function redirectToRoleDashboard(role) {
    if (role === "ADMIN") {
        window.location.href = "admin-dashboard.html";
        return;
    }

    if (role === "VEHICLE_OWNER") {
        window.location.href = "vehicle-owner-dashboard.html";
        return;
    }

    if (role === "PUMP_AUTHORITY") {
        window.location.href = "pump-authority-dashboard.html";
        return;
    }

    if (role === "EMERGENCY_VEHICLE_AUTHORITY") {
        window.location.href = "emergency-vehicle-dashboard.html";
        return;
    }

    if (role === "UTILITY_AUTHORITY") {
        window.location.href = "utility-authority-dashboard.html";
        return;
    }

    if (role === "HOSPITAL_AUTHORITY") {
        window.location.href = "hospital-authority-dashboard.html";
        return;
    }

    if (role === "BUILDING_MANAGER") {
        window.location.href = "building-manager-dashboard.html";
        return;
    }

    if (role === "GOVERNMENT_AUTHORITY") {
        window.location.href = "government-dashboard.html";
        return;
    }

    if (role === "LOCAL_AUTHORITY") {
        window.location.href = "local-authority-dashboard.html";
        return;
    }

    window.location.href = "login.html";
}