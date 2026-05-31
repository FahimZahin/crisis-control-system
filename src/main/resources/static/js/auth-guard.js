(function () {
    const publicPages = [
        "index.html",
        "login.html",
        "register.html",
        ""
    ];

    const allLoggedInRoles = [
        "ADMIN",
        "VEHICLE_OWNER",
        "PUMP_AUTHORITY",
        "EMERGENCY_VEHICLE_AUTHORITY",
        "UTILITY_AUTHORITY",
        "HOSPITAL_AUTHORITY",
        "BUILDING_MANAGER",
        "GOVERNMENT_AUTHORITY",
        "LOCAL_AUTHORITY"
    ];

    const roleProtectedPages = {
        "admin-dashboard.html": ["ADMIN"],
        "registered-users.html": ["ADMIN"],
        "admin-fuel-settings.html": ["ADMIN"],
        "admin-fuel-requests.html": ["ADMIN"],
        "admin-emergency-vehicles.html": ["ADMIN"],
        "admin-weekly-allocation-requests.html": ["ADMIN"],

        "vehicle-owner-dashboard.html": ["VEHICLE_OWNER"],
        "profile-setup.html": ["VEHICLE_OWNER"],
        "fuel-request.html": ["VEHICLE_OWNER"],
        "fuel-request-history.html": ["VEHICLE_OWNER"],
        "route-planning.html": ["VEHICLE_OWNER"],

        "pump-authority-dashboard.html": ["PUMP_AUTHORITY"],
        "pump-stock-management.html": ["PUMP_AUTHORITY"],
        "pump-fuel-requests.html": ["PUMP_AUTHORITY"],
        "pump-payment-records.html": ["PUMP_AUTHORITY"],
        "pump-penalty-account.html": ["PUMP_AUTHORITY"],

        "emergency-vehicle-dashboard.html": ["EMERGENCY_VEHICLE_AUTHORITY"],
        "emergency-vehicle-setup.html": ["EMERGENCY_VEHICLE_AUTHORITY"],
        "emergency-fuel-request.html": ["EMERGENCY_VEHICLE_AUTHORITY"],
        "emergency-fuel-request-history.html": ["EMERGENCY_VEHICLE_AUTHORITY"],

        "utility-authority-dashboard.html": ["UTILITY_AUTHORITY"],
        "utility-profile-setup.html": ["UTILITY_AUTHORITY"],
        "utility-outage-management.html": ["UTILITY_AUTHORITY"],

        "hospital-authority-dashboard.html": ["HOSPITAL_AUTHORITY"],
        "hospital-generator-request.html": ["HOSPITAL_AUTHORITY"],
        "hospital-generator-request-history.html": ["HOSPITAL_AUTHORITY"],
        "hospital-generator-usage.html": ["HOSPITAL_AUTHORITY"],

        "building-manager-dashboard.html": ["BUILDING_MANAGER"],
        "building-generator-request.html": ["BUILDING_MANAGER"],
        "building-generator-request-history.html": ["BUILDING_MANAGER"],
        "building-weekly-allocation-increase-request.html": ["BUILDING_MANAGER"],
        "building-generator-usage.html": ["BUILDING_MANAGER"],

        "government-dashboard.html": ["GOVERNMENT_AUTHORITY"],
        "local-authority-dashboard.html": ["LOCAL_AUTHORITY"],

        "reports-audit.html": [
            "ADMIN",
            "GOVERNMENT_AUTHORITY",
            "LOCAL_AUTHORITY"
        ],

        "fuel-report-details.html": [
            "ADMIN",
            "GOVERNMENT_AUTHORITY",
            "LOCAL_AUTHORITY"
        ],

        "utility-report-details.html": [
            "ADMIN",
            "GOVERNMENT_AUTHORITY",
            "LOCAL_AUTHORITY"
        ],

        "pump-reports-audit.html": ["PUMP_AUTHORITY"],
        "utility-reports-audit.html": ["UTILITY_AUTHORITY"],
        "hospital-reports-audit.html": ["HOSPITAL_AUTHORITY"],
        "building-reports-audit.html": ["BUILDING_MANAGER"],
        "emergency-reports-audit.html": ["EMERGENCY_VEHICLE_AUTHORITY"],

        "pump-complaint-monitoring.html": [
            "ADMIN",
            "GOVERNMENT_AUTHORITY",
            "LOCAL_AUTHORITY",
            "PUMP_AUTHORITY"
        ],

        "government-penalty-fund.html": [
            "ADMIN",
            "GOVERNMENT_AUTHORITY",
            "LOCAL_AUTHORITY"
        ],

        "public-law-book.html": allLoggedInRoles,
        "notifications.html": allLoggedInRoles,
        "profile.html": allLoggedInRoles,
        "dashboard.html": allLoggedInRoles
    };

    const currentPage = getCurrentPage();

    if (publicPages.includes(currentPage)) {
        return;
    }

    const loggedInUser = getLoggedInUser();

    if (!isValidLoggedInUser(loggedInUser)) {
        clearLoginData();
        redirectToLogin();
        return;
    }

    normalizeLoginStorage(loggedInUser);

    const allowedRoles = roleProtectedPages[currentPage];

    if (allowedRoles && !allowedRoles.includes(loggedInUser.role)) {
        redirectToOwnDashboard(loggedInUser.role);
    }

    function getCurrentPage() {
        const path = window.location.pathname;
        const page = path.substring(path.lastIndexOf("/") + 1);
        return page || "";
    }

    function getLoggedInUser() {
        try {
            return JSON.parse(localStorage.getItem("loggedInUser"));
        } catch (error) {
            return null;
        }
    }

    function isValidLoggedInUser(user) {
        if (!user) {
            return false;
        }

        const userId = user.userId || user.id || localStorage.getItem("userId");
        const role = user.role || localStorage.getItem("role");

        if (!userId || !role) {
            return false;
        }

        if (!allLoggedInRoles.includes(role)) {
            return false;
        }

        if (user.status === "BLOCKED" || user.status === "INACTIVE") {
            return false;
        }

        return true;
    }

    function normalizeLoginStorage(user) {
        const userId = user.userId || user.id || localStorage.getItem("userId");
        const role = user.role || localStorage.getItem("role");

        user.userId = userId;
        user.id = user.id || userId;
        user.role = role;

        localStorage.setItem("loggedInUser", JSON.stringify(user));
        localStorage.setItem("userId", userId);
        localStorage.setItem("role", role);

        if (user.fullName) {
            localStorage.setItem("fullName", user.fullName);
        }

        if (user.phoneNumber) {
            localStorage.setItem("phoneNumber", user.phoneNumber);
        }

        if (user.status) {
            localStorage.setItem("status", user.status);
        }
    }

    function clearLoginData() {
        localStorage.clear();
    }

    function redirectToLogin() {
        window.location.replace("login.html");
    }

    function redirectToOwnDashboard(role) {
        const dashboardMap = {
            "VEHICLE_OWNER": "vehicle-owner-dashboard.html",
            "BUILDING_MANAGER": "building-manager-dashboard.html",
            "PUMP_AUTHORITY": "pump-authority-dashboard.html",
            "HOSPITAL_AUTHORITY": "hospital-authority-dashboard.html",
            "UTILITY_AUTHORITY": "utility-authority-dashboard.html",
            "EMERGENCY_VEHICLE_AUTHORITY": "emergency-vehicle-dashboard.html",
            "GOVERNMENT_AUTHORITY": "government-dashboard.html",
            "LOCAL_AUTHORITY": "local-authority-dashboard.html",
            "ADMIN": "admin-dashboard.html"
        };

        window.location.replace(dashboardMap[role] || "dashboard.html");
    }
})();