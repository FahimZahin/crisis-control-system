let allUsers = [];
let currentPage = 1;
const usersPerPage = 30;

document.addEventListener("DOMContentLoaded", function () {
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || {};

    if (loggedInUser.role !== "ADMIN") {
        alert("Only admin should access user management in the final system.");
    }

    loadRegisteredUsers();

    document.getElementById("refreshUsersBtn").addEventListener("click", function () {
        loadRegisteredUsers();
    });

    document.getElementById("previousPageBtn").addEventListener("click", function () {
        if (currentPage > 1) {
            currentPage--;
            renderUsersTable();
        }
    });

    document.getElementById("nextPageBtn").addEventListener("click", function () {
        const totalPages = getTotalPages();

        if (currentPage < totalPages) {
            currentPage++;
            renderUsersTable();
        }
    });
});

async function loadRegisteredUsers() {
    const tableBody = document.getElementById("registeredUsersTableBody");

    tableBody.innerHTML = `
        <tr>
            <td colspan="8">Loading users...</td>
        </tr>
    `;

    try {
        const response = await fetch("http://localhost:8081/api/admin/users");
        const users = await response.json();

        if (!response.ok) {
            showRegisteredUsersMessage("Failed to load users.", "error-text");
            return;
        }

        allUsers = users;
        currentPage = 1;

        document.getElementById("totalUsers").innerText = allUsers.length;

        renderUsersTable();

    } catch (error) {
        showRegisteredUsersMessage("Server connection failed while loading users.", "error-text");

        tableBody.innerHTML = `
            <tr>
                <td colspan="8">Could not load users.</td>
            </tr>
        `;
    }
}

function renderUsersTable() {
    const tableBody = document.getElementById("registeredUsersTableBody");

    if (allUsers.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8">No users found.</td>
            </tr>
        `;

        updatePagination();
        return;
    }

    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    const usersToShow = allUsers.slice(startIndex, endIndex);

    tableBody.innerHTML = "";

    usersToShow.forEach(function (user) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${user.id}</td>
            <td>${valueOrDash(user.fullName)}</td>
            <td>${valueOrDash(user.phoneNumber)}</td>
            <td><span class="table-role-badge">${valueOrDash(user.role)}</span></td>
            <td>${renderStatusBadge(user.status)}</td>
            <td>${getIdentityInfo(user)}</td>
            <td>${formatDate(user.createdAt)}</td>
            <td>
                <button class="deactivate-user-btn" onclick="deactivateUser(${user.id}, '${escapeText(user.fullName)}')">
                    Deactivate
                </button>
                <button class="delete-user-btn" onclick="deleteUser(${user.id}, '${escapeText(user.fullName)}')">
                    Delete
                </button>
            </td>
        `;

        tableBody.appendChild(row);
    });

    updatePagination();
}

async function deactivateUser(userId, fullName) {
    const confirmed = confirm("Are you sure you want to deactivate user: " + fullName + "?");

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch("http://localhost:8081/api/admin/users/" + userId + "/deactivate", {
            method: "PUT"
        });

        const result = await response.json();

        if (response.ok) {
            showRegisteredUsersMessage(result.message, "success-text");
            loadRegisteredUsers();
        } else {
            showRegisteredUsersMessage(result.message || "Failed to deactivate user.", "error-text");
        }

    } catch (error) {
        showRegisteredUsersMessage("Server connection failed while deactivating user.", "error-text");
    }
}

async function deleteUser(userId, fullName) {
    const confirmed = confirm("Are you sure you want to permanently delete user: " + fullName + "?");

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch("http://localhost:8081/api/admin/users/" + userId, {
            method: "DELETE"
        });

        const result = await response.json();

        if (response.ok) {
            showRegisteredUsersMessage(result.message, "success-text");

            const totalPagesBeforeRender = getTotalPages();

            loadRegisteredUsers().then(function () {
                if (currentPage > totalPagesBeforeRender && currentPage > 1) {
                    currentPage--;
                    renderUsersTable();
                }
            });
        } else {
            showRegisteredUsersMessage(result.message || "Failed to delete user.", "error-text");
        }

    } catch (error) {
        showRegisteredUsersMessage("Server connection failed while deleting user.", "error-text");
    }
}

function updatePagination() {
    const totalPages = getTotalPages();

    document.getElementById("currentPageText").innerText = currentPage;
    document.getElementById("paginationInfo").innerText = "Page " + currentPage + " of " + totalPages;

    document.getElementById("previousPageBtn").disabled = currentPage <= 1;
    document.getElementById("nextPageBtn").disabled = currentPage >= totalPages;
}

function getTotalPages() {
    return Math.max(1, Math.ceil(allUsers.length / usersPerPage));
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

function renderStatusBadge(status) {
    const value = valueOrDash(status);

    if (value === "ACTIVE") {
        return `<span class="status-badge active-status">ACTIVE</span>`;
    }

    if (value === "INACTIVE") {
        return `<span class="status-badge inactive-status">INACTIVE</span>`;
    }

    if (value === "BLOCKED") {
        return `<span class="status-badge blocked-status">BLOCKED</span>`;
    }

    return value;
}

function showRegisteredUsersMessage(message, className) {
    const messageBox = document.getElementById("registeredUsersMessage");
    messageBox.className = className;
    messageBox.innerText = message;
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

function escapeText(text) {
    if (!text) {
        return "Unknown";
    }

    return text.replace(/'/g, "\\'");
}