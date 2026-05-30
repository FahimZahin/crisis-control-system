let loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    if (
        loggedInUser.role !== "GOVERNMENT_AUTHORITY" &&
        loggedInUser.role !== "LOCAL_AUTHORITY" &&
        loggedInUser.role !== "ADMIN" &&
        loggedInUser.role !== "PUMP_AUTHORITY"
    ) {
        alert("You are not allowed to view pump complaint monitoring.");
        window.location.href = "dashboard.html";
        return;
    }

    setupLogout();
    setupPageTitle();

    const refreshBtn = document.getElementById("refreshComplaintMonitoringBtn");

    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadComplaints);
    }

    loadComplaints();
});

function setupPageTitle() {
    if (loggedInUser.role === "GOVERNMENT_AUTHORITY") {
        setText("monitoringRoleBadge", "GOVERNMENT");
        setText("monitoringSubtitle", "Government can monitor all pump complaints nationally.");
    } else if (loggedInUser.role === "LOCAL_AUTHORITY") {
        setText("monitoringRoleBadge", "LOCAL AUTHORITY");
        setText("monitoringSubtitle", "Local authority can monitor complaints only for pumps in their assigned thana.");
    } else if (loggedInUser.role === "ADMIN") {
        setText("monitoringRoleBadge", "ADMIN");
        setText("monitoringSubtitle", "Admin can view all complaints. Final enforcement comes after local verification.");
    } else if (loggedInUser.role === "PUMP_AUTHORITY") {
        setText("monitoringRoleBadge", "PUMP AUTHORITY");
        setText("monitoringSubtitle", "Pump authority can view complaints submitted against their own pump.");
    }
}

async function loadComplaints() {
    const body = document.getElementById("complaintMonitoringBody");

    if (body) {
        body.innerHTML = `<tr><td colspan="8">Loading...</td></tr>`;
    }

    const url = resolveComplaintUrl();

    if (!url) {
        showMessage("Could not resolve complaint URL for your role.", "error-text");
        return;
    }

    try {
        const response = await fetch(url + "?time=" + Date.now());
        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");

            if (body) {
                body.innerHTML = `<tr><td colspan="8">${getErrorMessage(result)}</td></tr>`;
            }

            return;
        }

        renderComplaints(Array.isArray(result) ? result : []);
        showMessage("Complaints loaded successfully.", "success-text");

    } catch (error) {
        showMessage("Server connection failed while loading complaints.", "error-text");

        if (body) {
            body.innerHTML = `<tr><td colspan="8">Server connection failed.</td></tr>`;
        }
    }
}

function resolveComplaintUrl() {
    const userId = getLoggedInUserId();

    if (loggedInUser.role === "GOVERNMENT_AUTHORITY") {
        return "http://localhost:8081/api/pump-complaints/government";
    }

    if (loggedInUser.role === "LOCAL_AUTHORITY") {
        return "http://localhost:8081/api/pump-complaints/local-authority/" + userId;
    }

    if (loggedInUser.role === "ADMIN") {
        return "http://localhost:8081/api/pump-complaints/admin";
    }

    if (loggedInUser.role === "PUMP_AUTHORITY") {
        return "http://localhost:8081/api/pump-complaints/pump-owner/" + userId;
    }

    return null;
}

function renderComplaints(complaints) {
    const body = document.getElementById("complaintMonitoringBody");

    if (!body) {
        return;
    }

    if (!complaints.length) {
        body.innerHTML = `<tr><td colspan="8">No complaint found.</td></tr>`;
        return;
    }

    body.innerHTML = "";

    complaints.forEach(function (complaint) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${complaint.id}</td>
            <td>
                <strong>${safeText(complaint.pumpName)}</strong><br>
                <small>${safeText(complaint.pumpAddress)}</small>
            </td>
            <td>${safeText(complaint.pumpThana)}</td>
            <td>
                ${safeText(complaint.complainantName)}<br>
                <small>${safeText(complaint.complainantPhone)}</small>
            </td>
            <td><span class="law-type-badge ${getComplaintTypeClass(complaint.complaintType)}">${formatEnum(complaint.complaintType)}</span></td>
            <td>${safeText(complaint.complaintTitle)}</td>
            <td>${formatEnum(complaint.status)}</td>
            <td>${formatDateTime(complaint.createdAt)}</td>
        `;

        body.appendChild(row);
    });
}

function getComplaintTypeClass(type) {
    if (!type) {
        return "law-type-default";
    }

    const normalizedType = String(type).toUpperCase();

    if (normalizedType === "REFUSAL_OF_APPROVED_COLLECTION") {
        return "law-type-refusal";
    }

    if (normalizedType === "OVERCHARGING") {
        return "law-type-overcharging";
    }

    if (normalizedType === "PAYMENT_WITHOUT_FUEL") {
        return "law-type-payment";
    }

    if (normalizedType === "FALSE_STOCK_REPORTING") {
        return "law-type-stock";
    }

    if (normalizedType === "CRITICAL_REQUEST_DISCRIMINATION") {
        return "law-type-critical";
    }

    return "law-type-default";
}

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (!logoutBtn) {
        return;
    }

    logoutBtn.addEventListener("click", function () {
        localStorage.clear();
    });
}

function getLoggedInUserId() {
    return loggedInUser.userId || loggedInUser.id || localStorage.getItem("userId");
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.innerText = value;
    }
}

function showMessage(message, className) {
    const element = document.getElementById("complaintMonitoringMessage");

    if (element) {
        element.className = className;
        element.innerText = message;
    }
}

function formatEnum(value) {
    if (!value) {
        return "-";
    }

    return String(value).replaceAll("_", " ");
}

function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    return String(value).replace("T", " ").substring(0, 16);
}

function safeText(value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    return String(value);
}

function getErrorMessage(result) {
    if (!result) {
        return "Request failed.";
    }

    if (result.message) {
        return result.message;
    }

    if (result.messages) {
        return JSON.stringify(result.messages);
    }

    if (result.error) {
        return result.error;
    }

    return "Request failed.";
}