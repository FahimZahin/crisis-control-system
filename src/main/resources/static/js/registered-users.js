let allUsers = [];
let currentPage = 1;
const usersPerPage = 30;

document.addEventListener("DOMContentLoaded", function () {
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || {};

    if (loggedInUser.role !== "ADMIN") {
        alert("Only admin should access user management in the final system.");
    }

    loadRegisteredUsers();
    loadActivationRequests();

    document.getElementById("refreshUsersBtn").addEventListener("click", function () {
        loadRegisteredUsers();
    });

    document.getElementById("refreshActivationRequestsBtn").addEventListener("click", function () {
        loadActivationRequests();
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

async function loadActivationRequests() {
    const tableBody = document.getElementById("activationRequestsTableBody");

    tableBody.innerHTML = `
        <tr>
            <td colspan="8">Loading activation requests...</td>
        </tr>
    `;

    try {
        const response = await fetch("http://localhost:8081/api/admin/activation-requests");
        const requests = await response.json();

        if (!response.ok) {
            showActivationAdminMessage("Failed to load activation requests.", "error-text");
            return;
        }

        if (requests.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8">No pending activation requests.</td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = "";

        requests.forEach(function (request) {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${request.requestId}</td>
                <td>${valueOrDash(request.fullName)}</td>
                <td>${valueOrDash(request.phoneNumber)}</td>
                <td><span class="table-role-badge">${valueOrDash(request.role)}</span></td>
                <td>${renderStatusBadge(request.userStatus)}</td>
                <td>${valueOrDash(request.reason)}</td>
                <td>${formatDate(request.requestedAt)}</td>
                <td>
                    <button class="activate-user-btn" onclick="approveActivationRequest(${request.requestId})">
                        Approve
                    </button>
                </td>
            `;

            tableBody.appendChild(row);
        });

    } catch (error) {
        showActivationAdminMessage("Server connection failed while loading activation requests.", "error-text");

        tableBody.innerHTML = `
            <tr>
                <td colspan="8">Could not load activation requests.</td>
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
                ${renderUserActionButtons(user)}
            </td>
        `;

        tableBody.appendChild(row);
    });

    updatePagination();
}

function renderUserActionButtons(user) {
    let buttons = "";

    if (user.status === "ACTIVE") {
        buttons += `
            <button class="deactivate-user-btn" onclick="deactivateUser(${user.id}, '${escapeText(user.fullName)}')">
                Deactivate
            </button>
        `;
    }

    if (user.status === "INACTIVE") {
        buttons += `
            <button class="activate-user-btn" onclick="activateUserDirectly(${user.id}, '${escapeText(user.fullName)}')">
                Activate
            </button>
        `;
    }

    buttons += `
        <button class="delete-user-btn" onclick="deleteUser(${user.id}, '${escapeText(user.fullName)}')">
            Delete
        </button>
    `;

    return buttons;
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

async function activateUserDirectly(userId, fullName) {
    const confirmed = confirm("Are you sure you want to activate user: " + fullName + "?");

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch("http://localhost:8081/api/admin/users/" + userId + "/activate", {
            method: "PUT"
        });

        const result = await response.json();

        if (response.ok) {
            showRegisteredUsersMessage(result.message, "success-text");
            loadRegisteredUsers();
            loadActivationRequests();
        } else {
            showRegisteredUsersMessage(result.message || "Failed to activate user.", "error-text");
        }

    } catch (error) {
        showRegisteredUsersMessage("Server connection failed while activating user.", "error-text");
    }
}

async function approveActivationRequest(requestId) {
    const confirmed = confirm("Approve this activation request?");

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch("http://localhost:8081/api/admin/activation-requests/" + requestId + "/approve", {
            method: "PUT"
        });

        const result = await response.json();

        if (response.ok) {
            showActivationAdminMessage(result.message, "success-text");
            loadActivationRequests();
            loadRegisteredUsers();
        } else {
            showActivationAdminMessage(result.message || "Failed to approve request.", "error-text");
        }

    } catch (error) {
        showActivationAdminMessage("Server connection failed while approving request.", "error-text");
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
            loadRegisteredUsers();
            loadActivationRequests();
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

function showActivationAdminMessage(message, className) {
    const messageBox = document.getElementById("activationRequestAdminMessage");
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