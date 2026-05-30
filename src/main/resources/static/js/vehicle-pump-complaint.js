let loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;
let pumps = [];

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    if (loggedInUser.role !== "VEHICLE_OWNER") {
        alert("Only vehicle owners can submit pump complaints.");
        window.location.href = "dashboard.html";
        return;
    }

    setupLogout();
    setupEvents();
    loadPumps();
    loadMyComplaints();
});

function setupEvents() {
    const form = document.getElementById("pumpComplaintForm");
    const refreshBtn = document.getElementById("refreshMyComplaintsBtn");

    if (form) {
        form.addEventListener("submit", function (event) {
            event.preventDefault();
            submitComplaint();
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadMyComplaints);
    }
}

async function loadPumps() {
    const select = document.getElementById("pumpProfileId");

    if (select) {
        select.innerHTML = `<option value="">Loading pumps...</option>`;
    }

    try {
        const response = await fetch("http://localhost:8081/api/pumps?time=" + Date.now());
        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");
            return;
        }

        pumps = Array.isArray(result) ? result : [];
        renderPumpOptions();

    } catch (error) {
        showMessage("Server connection failed while loading pumps.", "error-text");
    }
}

function renderPumpOptions() {
    const select = document.getElementById("pumpProfileId");

    if (!select) {
        return;
    }

    if (!pumps.length) {
        select.innerHTML = `<option value="">No pump found</option>`;
        return;
    }

    select.innerHTML = `<option value="">Select pump</option>`;

    pumps.forEach(function (pump) {
        const option = document.createElement("option");
        option.value = pump.id;
        option.textContent = `${pump.pumpName} | ${pump.pumpAddress} | Status: ${pump.pumpStatus}`;
        select.appendChild(option);
    });
}

async function submitComplaint() {
    const data = {
        complainantUserId: Number(getLoggedInUserId()),
        pumpProfileId: Number(getValue("pumpProfileId")),
        complaintType: getValue("complaintType"),
        complaintTitle: getValue("complaintTitle"),
        complaintDescription: getValue("complaintDescription"),
        evidenceNote: getValue("evidenceNote")
    };

    if (!data.complainantUserId || !data.pumpProfileId || !data.complaintType || !data.complaintTitle || !data.complaintDescription) {
        showMessage("Pump, complaint type, title, and description are required.", "error-text");
        return;
    }

    try {
        const response = await fetch("http://localhost:8081/api/pump-complaints", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");
            return;
        }

        showMessage("Complaint submitted successfully. It is now pending local authority verification.", "success-text");

        const form = document.getElementById("pumpComplaintForm");

        if (form) {
            form.reset();
        }

        loadMyComplaints();

    } catch (error) {
        showMessage("Server connection failed while submitting complaint.", "error-text");
    }
}

async function loadMyComplaints() {
    const body = document.getElementById("myPumpComplaintsBody");
    const userId = getLoggedInUserId();

    if (!userId) {
        if (body) {
            body.innerHTML = `<tr><td colspan="6">User ID not found.</td></tr>`;
        }
        return;
    }

    try {
        const response = await fetch("http://localhost:8081/api/pump-complaints/vehicle-owner/" + userId + "?time=" + Date.now());
        const result = await response.json();

        if (!response.ok) {
            if (body) {
                body.innerHTML = `<tr><td colspan="6">${getErrorMessage(result)}</td></tr>`;
            }
            return;
        }

        renderMyComplaints(Array.isArray(result) ? result : []);

    } catch (error) {
        if (body) {
            body.innerHTML = `<tr><td colspan="6">Server connection failed.</td></tr>`;
        }
    }
}

function renderMyComplaints(complaints) {
    const body = document.getElementById("myPumpComplaintsBody");

    if (!body) {
        return;
    }

    if (!complaints.length) {
        body.innerHTML = `<tr><td colspan="6">No complaint submitted yet.</td></tr>`;
        return;
    }

    body.innerHTML = "";

    complaints.forEach(function (complaint) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${complaint.id}</td>
            <td>${safeText(complaint.pumpName)}</td>
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

function getValue(id) {
    const element = document.getElementById(id);

    if (!element) {
        return "";
    }

    return element.value.trim();
}

function showMessage(message, className) {
    const element = document.getElementById("pumpComplaintMessage");

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