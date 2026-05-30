let loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;
let lawBookRules = [];

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    if (loggedInUser.role !== "ADMIN") {
        alert("Only admin can manage law book rules.");
        window.location.href = "dashboard.html";
        return;
    }

    setupLogout();
    setupEvents();
    loadAdminLawBook();
});

function setupEvents() {
    const form = document.getElementById("lawBookRuleForm");
    const refreshBtn = document.getElementById("refreshAdminLawBookBtn");
    const resetBtn = document.getElementById("resetRuleFormBtn");

    if (form) {
        form.addEventListener("submit", function (event) {
            event.preventDefault();
            saveRule();
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadAdminLawBook);
    }

    if (resetBtn) {
        resetBtn.addEventListener("click", resetForm);
    }
}

async function loadAdminLawBook() {
    const body = document.getElementById("adminLawBookBody");

    if (body) {
        body.innerHTML = `<tr><td colspan="9">Loading...</td></tr>`;
    }

    try {
        const response = await fetch("http://localhost:8081/api/admin/law-book?time=" + Date.now());
        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");
            return;
        }

        lawBookRules = Array.isArray(result) ? result : [];
        renderAdminRules();

    } catch (error) {
        showMessage("Server connection failed while loading admin law book.", "error-text");
    }
}

function renderAdminRules() {
    const body = document.getElementById("adminLawBookBody");

    if (!body) {
        return;
    }

    if (!lawBookRules.length) {
        body.innerHTML = `<tr><td colspan="9">No law-book rule found.</td></tr>`;
        return;
    }

    body.innerHTML = "";

    lawBookRules.forEach(function (rule) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${safeText(rule.violationCode)}</td>
            <td>${safeText(rule.violationTitle)}</td>
            <td>
            <span class="law-type-badge ${getComplaintTypeClass(rule.complaintType)}">
                  ${formatEnum(rule.complaintType)}
             </span>
            </td>
            <td>${formatEnum(rule.allowedAdminAction)}</td>
            <td>${formatMoney(rule.penaltyAmount)} BDT</td>
            <td>${safeText(rule.temporaryDeactivationDays)}</td>
            <td>${rule.publicVisible ? "YES" : "NO"}</td>
            <td>${rule.active ? "YES" : "NO"}</td>
            <td>
                <button class="btn secondary small-btn" onclick="editRule(${rule.id})">Edit</button>
                <button class="btn danger small-btn" onclick="deactivateRule(${rule.id})">Deactivate</button>
            </td>
        `;

        body.appendChild(row);
    });
}

async function saveRule() {
    const ruleId = document.getElementById("ruleId").value;

    const data = {
        adminUserId: Number(getLoggedInUserId()),
        violationCode: getValue("violationCode"),
        violationTitle: getValue("violationTitle"),
        complaintType: getValue("complaintType"),
        description: getValue("description"),
        requiredEvidence: getValue("requiredEvidence"),
        localVerificationRule: getValue("localVerificationRule"),
        allowedAdminAction: getValue("allowedAdminAction"),
        penaltyAmount: cleanNumber(getValue("penaltyAmount")),
        temporaryDeactivationDays: cleanNumber(getValue("temporaryDeactivationDays")),
        repeatOffenseRule: getValue("repeatOffenseRule"),
        appealOption: getValue("appealOption"),
        publicVisible: getValue("publicVisible") === "true",
        active: getValue("active") === "true"
    };

    if (!data.violationCode || !data.violationTitle || !data.complaintType || !data.allowedAdminAction) {
        showMessage("Violation code, title, complaint type, and admin action are required.", "error-text");
        return;
    }

    if (!data.description || !data.requiredEvidence || !data.localVerificationRule) {
        showMessage("Description, required evidence, and local verification rule are required.", "error-text");
        return;
    }

    const url = ruleId
        ? "http://localhost:8081/api/admin/law-book/" + ruleId
        : "http://localhost:8081/api/admin/law-book";

    const method = ruleId ? "PUT" : "POST";

    try {
        const response = await fetch(url, {
            method: method,
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

        showMessage("Law-book rule saved successfully.", "success-text");
        resetForm();
        loadAdminLawBook();

    } catch (error) {
        showMessage("Server connection failed while saving rule.", "error-text");
    }
}

function editRule(ruleId) {
    const rule = lawBookRules.find(item => Number(item.id) === Number(ruleId));

    if (!rule) {
        showMessage("Rule not found.", "error-text");
        return;
    }

    setValue("ruleId", rule.id);
    setValue("violationCode", rule.violationCode);
    setValue("violationTitle", rule.violationTitle);
    setValue("complaintType", rule.complaintType);
    setValue("description", rule.description);
    setValue("requiredEvidence", rule.requiredEvidence);
    setValue("localVerificationRule", rule.localVerificationRule);
    setValue("allowedAdminAction", rule.allowedAdminAction);
    setValue("penaltyAmount", rule.penaltyAmount);
    setValue("temporaryDeactivationDays", rule.temporaryDeactivationDays);
    setValue("repeatOffenseRule", rule.repeatOffenseRule);
    setValue("appealOption", rule.appealOption);
    setValue("publicVisible", String(Boolean(rule.publicVisible)));
    setValue("active", String(Boolean(rule.active)));

    window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deactivateRule(ruleId) {
    const confirmed = confirm("Deactivate this law-book rule? It will be hidden from public law book.");

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(
            "http://localhost:8081/api/admin/law-book/" + ruleId + "?adminUserId=" + getLoggedInUserId(),
            {
                method: "DELETE"
            }
        );

        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");
            return;
        }

        showMessage("Rule deactivated successfully.", "success-text");
        loadAdminLawBook();

    } catch (error) {
        showMessage("Server connection failed while deactivating rule.", "error-text");
    }
}

function resetForm() {
    const form = document.getElementById("lawBookRuleForm");

    if (form) {
        form.reset();
    }

    setValue("ruleId", "");
    setValue("publicVisible", "true");
    setValue("active", "true");
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

function setValue(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.value = value === null || value === undefined ? "" : value;
    }
}

function cleanNumber(value) {
    if (value === null || value === undefined || value === "") {
        return 0;
    }

    return Number(value) || 0;
}

function showMessage(message, className) {
    const element = document.getElementById("adminLawBookMessage");

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

function formatMoney(value) {
    const numberValue = Number(value);

    if (Number.isNaN(numberValue)) {
        return "0.00";
    }

    return numberValue.toFixed(2);
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