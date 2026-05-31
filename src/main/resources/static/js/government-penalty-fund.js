let loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    if (
        loggedInUser.role !== "ADMIN" &&
        loggedInUser.role !== "GOVERNMENT_AUTHORITY" &&
        loggedInUser.role !== "LOCAL_AUTHORITY"
    ) {
        alert("You are not allowed to view the government penalty fund.");
        window.location.href = "dashboard.html";
        return;
    }

    setupLogout();
    setupPageForRole();

    const refreshBtn = document.getElementById("refreshGovtPenaltyBtn");

    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadGovernmentPenaltyFund);
    }

    loadGovernmentPenaltyFund();
});

function setupPageForRole() {
    const badge = document.querySelector(".role-badge");

    if (badge) {
        if (loggedInUser.role === "ADMIN") {
            badge.innerText = "ADMIN VIEW";
        } else if (loggedInUser.role === "GOVERNMENT_AUTHORITY") {
            badge.innerText = "GOVT FUND";
        } else if (loggedInUser.role === "LOCAL_AUTHORITY") {
            badge.innerText = "LOCAL MONITOR";
        }
    }
}

async function loadGovernmentPenaltyFund() {
    await loadSummary();
    await loadLedgers();
}

async function loadSummary() {
    try {
        const response = await fetch("http://localhost:8081/api/government-penalty-ledger/summary?time=" + Date.now());
        const data = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(data), "error-text");
            return;
        }

        setText("totalReceivable", formatMoney(data.totalReceivable) + " BDT");
        setText("totalCollected", formatMoney(data.totalCollected) + " BDT");
        setText("totalOutstanding", formatMoney(data.totalOutstanding) + " BDT");
        setText("activeDebtCases", data.activeDebtCases || 0);

        showMessage("Government penalty fund loaded successfully.", "success-text");

    } catch (error) {
        showMessage("Server connection failed while loading fund summary.", "error-text");
    }
}

async function loadLedgers() {
    const body = document.getElementById("govtPenaltyBody");

    if (body) {
        body.innerHTML = `<tr><td colspan="8">Loading...</td></tr>`;
    }

    try {
        const response = await fetch("http://localhost:8081/api/government-penalty-ledger?time=" + Date.now());
        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");

            if (body) {
                body.innerHTML = `<tr><td colspan="8">${getErrorMessage(result)}</td></tr>`;
            }

            return;
        }

        renderLedgers(Array.isArray(result) ? result : []);

    } catch (error) {
        showMessage("Server connection failed while loading ledgers.", "error-text");

        if (body) {
            body.innerHTML = `<tr><td colspan="8">Server connection failed.</td></tr>`;
        }
    }
}

function renderLedgers(ledgers) {
    const body = document.getElementById("govtPenaltyBody");

    if (!body) {
        return;
    }

    if (!ledgers.length) {
        body.innerHTML = `<tr><td colspan="8">No penalty ledger found.</td></tr>`;
        return;
    }

    body.innerHTML = "";

    ledgers.forEach(function (ledger) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${safeText(ledger.id)}</td>
            <td>
                <strong>${safeText(ledger.pumpName)}</strong><br>
                <small>${safeText(ledger.pumpAddress)}</small>
            </td>
            <td>${safeText(ledger.ruleCode)}</td>
            <td>${formatMoney(ledger.earlyOperationAmount)} BDT</td>
            <td>${formatMoney(ledger.paidAmount)} BDT</td>
            <td>${formatMoney(ledger.outstandingAmount)} BDT</td>
            <td>${formatEnumText(ledger.status)}</td>
            <td>${ledger.operationAllowed ? "Allowed" : "Not allowed"}</td>
        `;

        body.appendChild(row);
    });
}

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function (event) {
            event.preventDefault();
            localStorage.clear();
            window.location.href = "login.html";
        });
    }
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.innerText = value;
    }
}

function showMessage(message, className) {
    const element = document.getElementById("govtPenaltyMessage");

    if (element) {
        element.className = className || "";
        element.innerText = message || "";
    }
}

function formatMoney(value) {
    const numberValue = Number(value);

    if (Number.isNaN(numberValue)) {
        return "0.00";
    }

    return numberValue.toFixed(2);
}

function formatEnumText(value) {
    if (!value) {
        return "-";
    }

    return String(value)
        .replaceAll("_", " ")
        .replaceAll("-", " ")
        .toLowerCase()
        .replace(/\b\w/g, function (char) {
            return char.toUpperCase();
        });
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

    if (result.error) {
        return result.error;
    }

    if (result.messages) {
        return JSON.stringify(result.messages);
    }

    return JSON.stringify(result);
}