let loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser || loggedInUser.role !== "GOVERNMENT_AUTHORITY") {
        window.location.href = "login.html";
        return;
    }

    setupLogout();

    const refreshBtn = document.getElementById("refreshGovtPenaltyBtn");

    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadGovernmentPenaltyFund);
    }

    loadGovernmentPenaltyFund();
});

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
            return;
        }

        renderLedgers(Array.isArray(result) ? result : []);

    } catch (error) {
        showMessage("Server connection failed while loading ledgers.", "error-text");
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
            <td>${ledger.id}</td>
            <td>
                <strong>${safeText(ledger.pumpName)}</strong><br>
                <small>${safeText(ledger.pumpAddress)}</small>
            </td>
            <td>${safeText(ledger.ruleCode)}</td>
            <td>${formatMoney(ledger.earlyOperationAmount)} BDT</td>
            <td>${formatMoney(ledger.paidAmount)} BDT</td>
            <td>${formatMoney(ledger.outstandingAmount)} BDT</td>
            <td>${safeText(ledger.status)}</td>
            <td>${ledger.operationAllowed ? "Allowed" : "Not allowed"}</td>
        `;

        body.appendChild(row);
    });
}

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            localStorage.clear();
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
        element.className = className;
        element.innerText = message;
    }
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

    return result.message || result.error || JSON.stringify(result);
}