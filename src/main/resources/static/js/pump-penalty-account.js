let loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser || loggedInUser.role !== "PUMP_AUTHORITY") {
        window.location.href = "login.html";
        return;
    }

    setupLogout();

    const refreshBtn = document.getElementById("refreshPenaltyBtn");

    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadPumpPenaltyLedgers);
    }

    loadPumpPenaltyLedgers();
});

async function loadPumpPenaltyLedgers() {
    await loadPumpCurrentAccountSummary();

    const body = document.getElementById("pumpPenaltyBody");

    if (body) {
        body.innerHTML = `<tr><td colspan="10">Loading...</td></tr>`;
    }

    try {
        const response = await fetch(
            "http://localhost:8081/api/government-penalty-ledger/pump-authority/" + getLoggedInUserId() + "?time=" + Date.now()
        );

        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");
            return;
        }

        renderPenaltyLedgers(Array.isArray(result) ? result : []);

    } catch (error) {
        showMessage("Server connection failed while loading penalty account.", "error-text");
    }
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

function fillPumpCurrentAccountSummary(summary) {
    setText("totalFuelSalesEarning", formatMoney(summary.totalFuelSalesEarning) + " BDT");
    setText("totalGovernmentRecovered", formatMoney(summary.totalGovernmentRecovered) + " BDT");
    setText("pumpCurrentBalance", formatMoney(summary.pumpCurrentBalance) + " BDT");
    setText("pumpOutstandingDebt", formatMoney(summary.totalOutstandingDebt) + " BDT");
    setText("pumpNetPosition", formatMoney(summary.netPosition) + " BDT");
    setText("pumpOperationStatus", safeText(summary.operationStatus));
    setText("pumpEarningRule", safeText(summary.earningRule));

    colorMoneyText("pumpCurrentBalance", Number(summary.pumpCurrentBalance || 0));
    colorMoneyText("pumpNetPosition", Number(summary.netPosition || 0));
    colorMoneyText("pumpOutstandingDebt", Number(summary.totalOutstandingDebt || 0) * -1);
}

function colorMoneyText(id, value) {
    const element = document.getElementById(id);

    if (!element) {
        return;
    }

    if (value < 0) {
        element.style.color = "red";
    } else if (value > 0) {
        element.style.color = "green";
    } else {
        element.style.color = "";
    }
}

function renderPenaltyLedgers(ledgers) {
    const body = document.getElementById("pumpPenaltyBody");

    if (!body) {
        return;
    }

    if (!ledgers.length) {
        updatePumpCurrentAccount([]);
        body.innerHTML = `<tr><td colspan="10">No penalty ledger found.</td></tr>`;
        return;
    }

    body.innerHTML = "";


    ledgers.forEach(function (ledger) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${ledger.id}</td>
            <td>${safeText(ledger.ruleCode)}</td>
            <td>${formatMoney(ledger.basePenaltyAmount)} BDT</td>
            <td>${safeText(ledger.temporaryDeactivationDays)}</td>
            <td><strong>${formatMoney(ledger.earlyOperationAmount)} BDT</strong></td>
            <td>${formatMoney(ledger.paidAmount)} BDT</td>
            <td>${formatMoney(ledger.outstandingAmount)} BDT</td>
            <td>${formatMoney(ledger.pumpNegativeBalance)} BDT</td>
            <td>${safeText(ledger.status)}</td>
            <td>${buildActionButtons(ledger)}</td>
        `;

        body.appendChild(row);
    });
}

function buildActionButtons(ledger) {
    let html = "";

    if (!ledger.operationAllowed && ledger.status !== "PAID") {
        html += `
            <button class="btn primary small-btn" onclick="startOperationToday(${ledger.id}, '${ledger.earlyOperationAmount}')">
                Start Operation Today
            </button>
        `;
    }

    if (ledger.operationAllowed && Number(ledger.outstandingAmount || 0) > 0) {
        html += `
            <button class="btn secondary small-btn" onclick="recordEarning(${ledger.id})">
                Record Earning
            </button>
        `;
    }

    if (ledger.status === "PAID") {
        html += "Fully paid";
    }

    return html || "-";
}

async function startOperationToday(ledgerId, earlyAmount) {
    const confirmed = confirm(
        "To start operation today, penalty debt will be created:\n\n"
        + "Amount = " + formatMoney(earlyAmount) + " BDT\n\n"
        + "If you do not have enough money, your pump balance will become negative.\n"
        + "Future earnings will go to government until the debt is fully paid.\n\n"
        + "Confirm?"
    );

    if (!confirmed) {
        return;
    }

    const data = {
        pumpAuthorityUserId: Number(getLoggedInUserId()),
        note: "Pump requested early operation with penalty debt."
    };

    try {
        const response = await fetch(
            "http://localhost:8081/api/government-penalty-ledger/" + ledgerId + "/start-operation",
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

        showMessage("Operation started. Penalty debt is now active.", "success-text");
        loadPumpPenaltyLedgers();

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
            "http://localhost:8081/api/government-penalty-ledger/" + ledgerId + "/record-earning",
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
            result.message
            + " Government received: "
            + formatMoney(result.governmentCredit)
            + " BDT. Pump kept: "
            + formatMoney(result.pumpKeptAmount)
            + " BDT.",
            "success-text"
        );

        loadPumpPenaltyLedgers();

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

function updatePumpCurrentAccount(ledgers) {
    let totalOutstanding = 0;
    let totalNegativeBalance = 0;
    let hasDebtRecovery = false;
    let hasPendingPenalty = false;

    ledgers.forEach(function (ledger) {
        totalOutstanding += Number(ledger.outstandingAmount || 0);
        totalNegativeBalance += Number(ledger.pumpNegativeBalance || 0);

        if (ledger.status === "DEBT_RECOVERY") {
            hasDebtRecovery = true;
        }

        if (ledger.status === "PENDING") {
            hasPendingPenalty = true;
        }
    });

    const currentBalance = totalNegativeBalance;

    setText("pumpCurrentBalance", formatMoney(currentBalance) + " BDT");
    setText("pumpOutstandingDebt", formatMoney(totalOutstanding) + " BDT");

    const balanceElement = document.getElementById("pumpCurrentBalance");

    if (balanceElement) {
        if (currentBalance < 0) {
            balanceElement.style.color = "red";
        } else {
            balanceElement.style.color = "green";
        }
    }

    if (hasDebtRecovery) {
        setText("pumpOperationStatus", "OPEN WITH DEBT");
        setText("pumpEarningRule", "Earnings go to government until debt is paid");
        return;
    }

    if (hasPendingPenalty) {
        setText("pumpOperationStatus", "PENDING PENALTY");
        setText("pumpEarningRule", "Start operation today to activate debt recovery");
        return;
    }

    setText("pumpOperationStatus", "NORMAL");
    setText("pumpEarningRule", "Pump keeps earnings");
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.innerText = value;
    }
}
