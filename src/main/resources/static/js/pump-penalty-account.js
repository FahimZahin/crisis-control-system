let loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser || loggedInUser.role !== "PUMP_AUTHORITY") {
        window.location.href = "login.html";
        return;
    }

    setupLogout();

    const refreshBtn = document.getElementById("refreshPenaltyBtn");

    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadPumpPenaltyPage);
    }

    loadPumpPenaltyPage();
});

async function loadPumpPenaltyPage() {
    await loadPumpCurrentAccountSummary();
    await loadPumpPenaltyLedgers();
}

async function loadPumpCurrentAccountSummary() {
    try {
        const response = await fetch(
            "http://localhost:8081/api/government-penalty-ledger/pump-authority/"
            + getLoggedInUserId()
            + "/account-summary?time="
            + Date.now()
        );

        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");
            return;
        }

        fillPumpCurrentAccountSummary(result);

    } catch (error) {
        showMessage("Server connection failed while loading pump current account summary.", "error-text");
    }
}

async function loadPumpPenaltyLedgers() {
    const body = document.getElementById("pumpPenaltyBody");

    if (body) {
        body.innerHTML = `<tr><td colspan="10">Loading...</td></tr>`;
    }

    try {
        const response = await fetch(
            "http://localhost:8081/api/government-penalty-ledger/pump-authority/"
            + getLoggedInUserId()
            + "?time="
            + Date.now()
        );

        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");

            if (body) {
                body.innerHTML = `<tr><td colspan="10">${getErrorMessage(result)}</td></tr>`;
            }

            return;
        }

        renderPenaltyLedgers(Array.isArray(result) ? result : []);
        showMessage("Penalty account loaded successfully.", "success-text");

    } catch (error) {
        showMessage("Server connection failed while loading penalty ledgers.", "error-text");

        if (body) {
            body.innerHTML = `<tr><td colspan="10">Server connection failed.</td></tr>`;
        }
    }
}

function fillPumpCurrentAccountSummary(summary) {
    const totalFuelSalesEarning = Number(summary.totalFuelSalesEarning || 0);
    const totalGovernmentRecovered = Number(summary.totalGovernmentRecovered || 0);
    const pumpCurrentBalance = Number(summary.pumpCurrentBalance || 0);
    const totalOutstandingDebt = Number(summary.totalOutstandingDebt || 0);
    const netPosition = Number(summary.netPosition || 0);

    setText("totalFuelSalesEarning", formatMoney(totalFuelSalesEarning) + " BDT");
    setText("totalGovernmentRecovered", formatMoney(totalGovernmentRecovered) + " BDT");
    setText("pumpCurrentBalance", formatMoney(pumpCurrentBalance) + " BDT");
    setText("pumpOutstandingDebt", formatMoney(totalOutstandingDebt) + " BDT");
    setText("pumpNetPosition", formatMoney(netPosition) + " BDT");
    setText("pumpOperationStatus", safeText(summary.operationStatus));
    setText("pumpEarningRule", safeText(summary.earningRule));

    setMoneyColor("totalFuelSalesEarning", totalFuelSalesEarning);
    setMoneyColor("totalGovernmentRecovered", totalGovernmentRecovered);
    setMoneyColor("pumpCurrentBalance", pumpCurrentBalance);
    setMoneyColor("pumpOutstandingDebt", totalOutstandingDebt > 0 ? -totalOutstandingDebt : 0);
    setMoneyColor("pumpNetPosition", netPosition);
}

function renderPenaltyLedgers(ledgers) {
    const body = document.getElementById("pumpPenaltyBody");

    if (!body) {
        return;
    }

    if (!ledgers.length) {
        body.innerHTML = `<tr><td colspan="10">No penalty ledger found.</td></tr>`;
        return;
    }

    body.innerHTML = "";

    ledgers.forEach(function (ledger) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${safeText(ledger.id)}</td>
            <td><strong>${safeText(ledger.ruleCode)}</strong></td>
            <td>${formatMoney(ledger.basePenaltyAmount)} BDT</td>
            <td>${safeText(ledger.temporaryDeactivationDays)}</td>
            <td><strong>${formatMoney(ledger.earlyOperationAmount)} BDT</strong></td>
            <td>${formatMoney(ledger.paidAmount)} BDT</td>
            <td>${formatMoney(ledger.outstandingAmount)} BDT</td>
            <td>${formatMoney(ledger.pumpNegativeBalance)} BDT</td>
            <td>${formatEnum(ledger.status)}</td>
            <td>${buildActionButtons(ledger)}</td>
        `;

        body.appendChild(row);
    });
}

function buildActionButtons(ledger) {
    if (ledger.status === "PAID") {
        return `<span class="success-text"><strong>Fully paid</strong></span>`;
    }

    if (!ledger.operationAllowed && ledger.status !== "PAID") {
        return `
            <button class="btn primary small-btn"
                    onclick="startOperationToday(${ledger.id}, '${ledger.earlyOperationAmount}')">
                Start Operation Today
            </button>
        `;
    }

    if (ledger.operationAllowed && Number(ledger.outstandingAmount || 0) > 0) {
        return `
            <button class="btn secondary small-btn"
                    onclick="recordEarning(${ledger.id})">
                Record Earning
            </button>
        `;
    }

    return "-";
}

async function startOperationToday(ledgerId, earlyAmount) {
    const confirmed = confirm(
        "Start operation today?\n\n"
        + "Required amount: " + formatMoney(earlyAmount) + " BDT\n\n"
        + "Your previous fuel-sale earnings will be used first.\n"
        + "If your balance is not enough, the remaining amount will become penalty debt.\n"
        + "Future earnings will go to government until the debt is fully recovered.\n\n"
        + "Confirm?"
    );

    if (!confirmed) {
        return;
    }

    const data = {
        pumpAuthorityUserId: Number(getLoggedInUserId()),
        note: "Pump requested early operation with penalty recovery rule."
    };

    try {
        const response = await fetch(
            "http://localhost:8081/api/government-penalty-ledger/"
            + ledgerId
            + "/start-operation",
            {
                method: "POST",
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

        showMessage("Operation started. Previous earning was used first and remaining debt is now active.", "success-text");
        loadPumpPenaltyPage();

    } catch (error) {
        showMessage("Server connection failed while starting operation.", "error-text");
    }
}

async function recordEarning(ledgerId) {
    const amountText = prompt("Enter pump earning amount from fuel sale:");

    if (amountText === null || amountText.trim() === "") {
        return;
    }

    const amount = Number(amountText);

    if (!amount || amount <= 0) {
        alert("Enter a valid earning amount.");
        return;
    }

    const data = {
        pumpAuthorityUserId: Number(getLoggedInUserId()),
        earningAmount: amount,
        note: "Pump earning redirected to government until penalty is paid."
    };

    try {
        const response = await fetch(
            "http://localhost:8081/api/government-penalty-ledger/"
            + ledgerId
            + "/record-earning",
            {
                method: "POST",
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

        showMessage(
            safeText(result.message)
            + " Government received: "
            + formatMoney(result.governmentCredit)
            + " BDT. Pump kept: "
            + formatMoney(result.pumpKeptAmount)
            + " BDT.",
            "success-text"
        );

        loadPumpPenaltyPage();

    } catch (error) {
        showMessage("Server connection failed while recording earning.", "error-text");
    }
}

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            localStorage.clear();
        });
    }
}

function getLoggedInUserId() {
    return loggedInUser.userId || loggedInUser.id || localStorage.getItem("userId");
}

function showMessage(message, className) {
    const element = document.getElementById("penaltyMessage");

    if (element) {
        element.className = className;
        element.innerText = message;
    }
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.innerText = value;
    }
}

function setMoneyColor(id, value) {
    const element = document.getElementById(id);

    if (!element) {
        return;
    }

    if (value > 0) {
        element.style.color = "green";
    } else if (value < 0) {
        element.style.color = "red";
    } else {
        element.style.color = "";
    }
}

function formatMoney(value) {
    const numberValue = Number(value);

    if (Number.isNaN(numberValue)) {
        return "0.00";
    }

    return numberValue.toFixed(2);
}

function formatEnum(value) {
    if (!value) {
        return "-";
    }

    return String(value).replaceAll("_", " ");
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

    return JSON.stringify(result);
}