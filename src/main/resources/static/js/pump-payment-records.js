const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    if (loggedInUser.role !== "PUMP_AUTHORITY") {
        alert("Only pump authority can view pump payment records.");
        window.location.href = "dashboard.html";
        return;
    }

    setupLogout();

    const refreshBtn = document.getElementById("refreshPumpPaymentsBtn");

    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadPumpPaymentData);
    }

    loadPumpPaymentData();
});

async function loadPumpPaymentData() {
    await loadPumpTodaySummary();
    await loadPumpPayments();
}

async function loadPumpTodaySummary() {
    try {
        const response = await fetch(
            "http://localhost:8081/api/payment-records/summary/pump-user/"
            + getLoggedInUserId()
            + "/today?time="
            + Date.now()
        );

        const data = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(data), "error-text");
            return;
        }

        setText("todayCashAmount", formatNumber(data.totalCash));
        setText("todayBkashAmount", formatNumber(data.totalBkash));
        setText("todayTotalAmount", formatNumber(data.totalPaid));
        setText("todayRecordCount", data.totalRecords || 0);

        setText("todayGovtRecovery", formatNumber(data.totalGovernmentRecovery));
        setText("todayPumpKept", formatNumber(data.totalPumpKept));
        setText("todayNormalPaymentCount", data.normalFuelPaymentRecords || 0);
        setText("todayRouteTokenPaymentCount", data.routeTokenPaymentRecords || 0);

    } catch (error) {
        showMessage("Server connection failed while loading payment summary.", "error-text");
    }
}

async function loadPumpPayments() {
    const body = document.getElementById("pumpPaymentBody");

    if (body) {
        body.innerHTML = `<tr><td colspan="11">Loading...</td></tr>`;
    }

    try {
        const response = await fetch(
            "http://localhost:8081/api/payment-records/pump-user/"
            + getLoggedInUserId()
            + "?time="
            + Date.now()
        );

        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");
            return;
        }

        renderPaymentRecords(Array.isArray(result) ? result : []);
        showMessage("Payment records loaded successfully.", "success-text");

    } catch (error) {
        showMessage("Server connection failed while loading payment records.", "error-text");

        if (body) {
            body.innerHTML = `<tr><td colspan="11">Server connection failed.</td></tr>`;
        }
    }
}

function renderPaymentRecords(records) {
    const body = document.getElementById("pumpPaymentBody");

    if (!body) {
        return;
    }

    if (!records.length) {
        body.innerHTML = `<tr><td colspan="11">No payment record found.</td></tr>`;
        return;
    }

    body.innerHTML = "";

    records.forEach(function (record) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${safeText(record.id)}</td>

            <td>
                <strong>${safeText(record.userName)}</strong><br>
                <small>${safeText(record.userPhone)}</small>
            </td>

            <td>${formatEnum(record.paymentPurpose)}</td>

            <td>
                ${
            record.fuelRequestId
                ? `Fuel Request: ${record.fuelRequestId}<br><small>Code: ${safeText(record.collectionCode)}</small>`
                : ""
        }
                ${
            record.routeFuelTokenId
                ? `Route Token: ${record.routeFuelTokenId}<br><small>${safeText(record.routeTokenCode)}</small>`
                : ""
        }
            </td>

            <td>
                ${safeText(record.paymentMethod)}<br>
                <small>${safeText(record.bkashTransactionId)}</small>
            </td>

            <td>${formatNumber(record.cashAmountBdt)} BDT</td>
            <td>${formatNumber(record.bkashAmountBdt)} BDT</td>
            <td><strong>${formatNumber(record.paidAmountBdt)} BDT</strong></td>
            <td>${formatNumber(record.governmentRecoveryAmountBdt)} BDT</td>
            <td>${formatNumber(record.pumpKeptAmountBdt)} BDT</td>
            <td>${formatDateTime(record.recordedAt)}</td>
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
    const element = document.getElementById("pumpPaymentMessage");

    if (element) {
        element.className = className || "";
        element.innerText = message || "";
    }
}

function formatNumber(value) {
    const numberValue = Number(value);

    if (Number.isNaN(numberValue)) {
        return "0.00";
    }

    return numberValue.toFixed(2);
}

function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    return String(value).replace("T", " ").substring(0, 16);
}

function formatEnum(value) {
    if (!value) {
        return "-";
    }

    return String(value)
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, function (letter) {
            return letter.toUpperCase();
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

    return result.message || result.error || JSON.stringify(result);
}