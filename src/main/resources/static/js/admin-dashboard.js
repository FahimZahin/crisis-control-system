document.addEventListener("DOMContentLoaded", function () {
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || {};

    if (loggedInUser.role !== "ADMIN") {
        alert("Only admin should access this dashboard in the final system.");
    }

    loadLatestUsersPreview();
});

async function loadLatestUsersPreview() {
    const tableBody = document.getElementById("usersTableBody");
    const totalUsers = document.getElementById("totalUsers");

    tableBody.innerHTML = `
        <tr>
            <td colspan="7">Loading latest users...</td>
        </tr>
    `;

    try {
        const response = await fetch("http://localhost:8081/api/admin/users");
        const users = await response.json();

        if (!response.ok) {
            showAdminMessage("Failed to load users.", "error-text");
            return;
        }

        totalUsers.innerText = users.length;

        if (users.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7">No users found.</td>
                </tr>
            `;
            return;
        }

        const latestUsers = users.slice(0, 5);
        tableBody.innerHTML = "";

        latestUsers.forEach(function (user) {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${user.id}</td>
                <td>${valueOrDash(user.fullName)}</td>
                <td>${valueOrDash(user.phoneNumber)}</td>
                <td><span class="table-role-badge">${valueOrDash(user.role)}</span></td>
                <td>${valueOrDash(user.status)}</td>
                <td>${getIdentityInfo(user)}</td>
                <td>${formatDate(user.createdAt)}</td>
            `;

            tableBody.appendChild(row);
        });

    } catch (error) {
        showAdminMessage("Server connection failed while loading users.", "error-text");
        tableBody.innerHTML = `
            <tr>
                <td colspan="7">Could not load users.</td>
            </tr>
        `;
    }
}

function getIdentityInfo(user) {
    if (user.role === "VEHICLE_OWNER") {
        return "DL: " + valueOrDash(user.drivingLicenseNumber);
    }

    if (user.role === "BUILDING_MANAGER") {
        return "Holding: " + valueOrDash(user.holdingNumber);
    }

    if (user.role === "PUMP_AUTHORITY") {
        return "License: " + valueOrDash(user.businessLicenseNumber);
    }

    if (user.role === "HOSPITAL_AUTHORITY") {
        return "Hospital Reg: " + valueOrDash(user.hospitalRegistrationNumber);
    }

    if (user.role === "UTILITY_AUTHORITY") {
        return valueOrDash(user.utilityOrganizationType) + " / ID: " + valueOrDash(user.utilityEmployeeId);
    }

    if (user.role === "EMERGENCY_VEHICLE_AUTHORITY") {
        return valueOrDash(user.organizationType) + " / " + valueOrDash(user.organizationName);
    }

    if (user.role === "GOVERNMENT_AUTHORITY") {
        return "Gov ID: " + valueOrDash(user.governmentEmployeeId);
    }

    if (user.role === "LOCAL_AUTHORITY") {
        return "Local ID: " + valueOrDash(user.localAuthorityId);
    }

    if (user.role === "ADMIN") {
        return "System Admin";
    }

    return "-";
}

function showAdminMessage(message, className) {
    const adminMessage = document.getElementById("adminMessage");
    adminMessage.className = className;
    adminMessage.innerText = message;
}

function valueOrDash(value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    return value;
}

function formatDate(dateValue) {
    if (!dateValue) {
        return "-";
    }

    return dateValue.replace("T", " ").substring(0, 19);
}