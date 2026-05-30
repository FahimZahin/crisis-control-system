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
            <td>${buildComplaintActionButtons(complaint)}</td>
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
function buildComplaintActionButtons(complaint) {
    if (loggedInUser.role === "GOVERNMENT_AUTHORITY") {
        return "Monitor only";
    }

    if (loggedInUser.role === "PUMP_AUTHORITY") {
        return "View only";
    }

    if (loggedInUser.role === "LOCAL_AUTHORITY") {
        if (
            complaint.status !== "PENDING_LOCAL_VERIFICATION" &&
            complaint.status !== "UNDER_LOCAL_INVESTIGATION" &&
            complaint.status !== "NEEDS_MORE_EVIDENCE"
        ) {
            return "Already processed";
        }

        return `
            <button class="btn primary small-btn" onclick="verifyComplaint(${complaint.id}, 'VERIFIED_TRUE', '${complaint.complaintType}')">
                Verified True
            </button>
            <button class="btn danger small-btn" onclick="verifyComplaint(${complaint.id}, 'VERIFIED_FALSE', '${complaint.complaintType}')">
                False
            </button>
            <button class="btn secondary small-btn" onclick="verifyComplaint(${complaint.id}, 'NEEDS_MORE_EVIDENCE', '${complaint.complaintType}')">
                Need Evidence
            </button>
        `;
    }

    if (loggedInUser.role === "ADMIN") {
        if (complaint.status !== "SENT_TO_ADMIN") {
            return "Waiting for local verification";
        }

        const rule = getFixedLawBookRuleByComplaintType(complaint.complaintType);

        return `
            <button class="btn primary small-btn" onclick="adminApplyRuleAction(${complaint.id}, '${complaint.complaintType}')">
                Apply ${rule.ruleCode}
            </button>
            <button class="btn danger small-btn" onclick="adminDismissComplaint(${complaint.id})">
                Dismiss
            </button>
        `;
    }

    return "-";
}

async function verifyComplaint(complaintId, decision, complaintType) {
    const rule = getFixedLawBookRuleByComplaintType(complaintType);

    let message = "";

    if (decision === "VERIFIED_TRUE") {
        message =
            "Local Verification: VERIFIED TRUE\n\n" +
            "Complaint Type: " + formatEnum(complaintType) + "\n" +
            "Fixed Law Book Rule: " + rule.ruleCode + "\n" +
            "Violation: " + rule.violationTitle + "\n" +
            "Allowed Admin Action: " + formatEnum(rule.allowedAdminAction) + "\n" +
            "Fixed Penalty: " + rule.penaltyAmount + " BDT\n" +
            "Temporary Deactivation: " + rule.temporaryDeactivationDays + " days\n\n" +
            "Write your inspection note below. Do not change the rule/action manually:";
    }

    if (decision === "VERIFIED_FALSE") {
        message =
            "Local Verification: VERIFIED FALSE\n\n" +
            "Complaint Type: " + formatEnum(complaintType) + "\n\n" +
            "Write why this complaint is false:";
    }

    if (decision === "NEEDS_MORE_EVIDENCE") {
        message =
            "Local Verification: NEEDS MORE EVIDENCE\n\n" +
            "Complaint Type: " + formatEnum(complaintType) + "\n\n" +
            "Write what evidence is missing:";
    }

    const localAuthorityNote = prompt(message);

    if (localAuthorityNote === null || localAuthorityNote.trim() === "") {
        alert("Local authority note is required.");
        return;
    }

    let localRecommendation = "";

    if (decision === "VERIFIED_TRUE") {
        localRecommendation =
            "Complaint verified true by local authority inspection.\n" +
            "Complaint Type: " + formatEnum(complaintType) + "\n" +
            "Fixed Law Book Rule: " + rule.ruleCode + "\n" +
            "Violation: " + rule.violationTitle + "\n" +
            "Allowed Admin Action: " + formatEnum(rule.allowedAdminAction) + "\n" +
            "Fixed Penalty: " + rule.penaltyAmount + " BDT\n" +
            "Temporary Deactivation: " + rule.temporaryDeactivationDays + " days\n" +
            "Local Inspection Note: " + localAuthorityNote.trim();
    }

    if (decision === "VERIFIED_FALSE") {
        localRecommendation =
            "Complaint verified false by local authority.\n" +
            "Reason: " + localAuthorityNote.trim();
    }

    if (decision === "NEEDS_MORE_EVIDENCE") {
        localRecommendation =
            "Complaint needs more evidence.\n" +
            "Missing Evidence: " + localAuthorityNote.trim();
    }

    const data = {
        localAuthorityUserId: Number(getLoggedInUserId()),
        decision: decision,
        localAuthorityNote: localAuthorityNote.trim(),
        localRecommendation: localRecommendation
    };

    try {
        const response = await fetch(
            "http://localhost:8081/api/pump-complaints/" + complaintId + "/local-verification",
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            }
        );

        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");
            return;
        }

        if (decision === "VERIFIED_TRUE") {
            showMessage("Complaint verified true and sent to admin with fixed law-book rule " + rule.ruleCode + ".", "success-text");
        } else if (decision === "VERIFIED_FALSE") {
            showMessage("Complaint marked as false.", "success-text");
        } else {
            showMessage("Complaint marked as needing more evidence.", "success-text");
        }

        loadComplaints();

    } catch (error) {
        showMessage("Server connection failed while verifying complaint.", "error-text");
    }
}

function getFixedLawBookRuleByComplaintType(complaintType) {
    const type = String(complaintType || "").toUpperCase();

    if (type === "REFUSAL_OF_APPROVED_COLLECTION") {
        return {
            ruleCode: "PUMP-001",
            violationTitle: "Refusing approved fuel collection",
            allowedAdminAction: "WARNING_OR_TEMPORARY_DEACTIVATION",
            penaltyAmount: "5000.00",
            temporaryDeactivationDays: 3
        };
    }

    if (type === "OVERCHARGING") {
        return {
            ruleCode: "PUMP-002",
            violationTitle: "Charging higher price than official fuel price",
            allowedAdminAction: "PENALTY_AND_TEMPORARY_DEACTIVATION",
            penaltyAmount: "15000.00",
            temporaryDeactivationDays: 7
        };
    }

    if (type === "PAYMENT_WITHOUT_FUEL") {
        return {
            ruleCode: "PUMP-003",
            violationTitle: "Taking payment but not providing fuel",
            allowedAdminAction: "PENALTY_AND_TEMPORARY_DEACTIVATION",
            penaltyAmount: "25000.00",
            temporaryDeactivationDays: 14
        };
    }

    if (type === "FALSE_STOCK_REPORTING") {
        return {
            ruleCode: "PUMP-004",
            violationTitle: "False stock reporting",
            allowedAdminAction: "TEMPORARY_DEACTIVATION_AND_AUDIT_REVIEW",
            penaltyAmount: "20000.00",
            temporaryDeactivationDays: 10
        };
    }

    if (type === "CRITICAL_REQUEST_DISCRIMINATION") {
        return {
            ruleCode: "PUMP-005",
            violationTitle: "Discrimination against emergency or critical requests",
            allowedAdminAction: "HIGH_PENALTY_AND_TEMPORARY_DEACTIVATION",
            penaltyAmount: "30000.00",
            temporaryDeactivationDays: 14
        };
    }

    return {
        ruleCode: "UNKNOWN",
        violationTitle: "Unknown complaint type",
        allowedAdminAction: "ADMIN_REVIEW_REQUIRED",
        penaltyAmount: "0.00",
        temporaryDeactivationDays: 0
    };
}

async function adminApplyRuleAction(complaintId, complaintType) {
    const rule = getFixedLawBookRuleByComplaintType(complaintType);

    const message =
        "ADMIN FINAL ACTION\n\n" +
        "Complaint Type: " + formatEnum(complaintType) + "\n" +
        "Fixed Law Book Rule: " + rule.ruleCode + "\n" +
        "Violation: " + rule.violationTitle + "\n" +
        "Allowed Admin Action: " + formatEnum(rule.allowedAdminAction) + "\n" +
        "Fixed Penalty: " + rule.penaltyAmount + " BDT\n" +
        "Temporary Deactivation: " + rule.temporaryDeactivationDays + " days\n\n" +
        "Admin cannot change this rule here.\n" +
        "Add final admin note:";

    const adminNote = prompt(message);

    if (adminNote === null || adminNote.trim() === "") {
        alert("Admin note is required.");
        return;
    }

    const confirmed = confirm(
        "Confirm applying fixed law-book rule " +
        rule.ruleCode +
        "?\n\nPump may be closed if this rule includes deactivation."
    );

    if (!confirmed) {
        return;
    }

    await sendAdminAction(complaintId, "APPLY_RULE_ACTION", adminNote.trim());
}

async function adminDismissComplaint(complaintId) {
    const adminNote = prompt("Write reason for dismissing this complaint:");

    if (adminNote === null || adminNote.trim() === "") {
        alert("Dismiss reason is required.");
        return;
    }

    const confirmed = confirm("Confirm dismissing this complaint?");

    if (!confirmed) {
        return;
    }

    await sendAdminAction(complaintId, "DISMISS", adminNote.trim());
}

async function sendAdminAction(complaintId, decision, adminNote) {
    const data = {
        adminUserId: Number(getLoggedInUserId()),
        decision: decision,
        adminNote: adminNote
    };

    try {
        const response = await fetch(
            "http://localhost:8081/api/pump-complaints/" + complaintId + "/admin-action",
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            }
        );

        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");
            return;
        }

        if (decision === "APPLY_RULE_ACTION") {
            showMessage("Admin applied fixed law-book action successfully.", "success-text");
        } else {
            showMessage("Complaint dismissed by admin.", "success-text");
        }

        loadComplaints();

    } catch (error) {
        showMessage("Server connection failed while taking admin action.", "error-text");
    }
}