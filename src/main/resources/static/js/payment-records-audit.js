const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

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
        alert("You are not allowed to view payment audit.");
        window.location.href = "dashboard.html";
        return;
    }

    setupLogout();

    const refreshBtn = document.getElementById("refreshPaymentAuditBtn");

    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadPaymentAudit);
    }

    loadPaymentAudit();
});

async function loadPaymentAudit() {
    await loadTodayPaymentSummary();
    await loadAllPaymentRecords();
}

async function loadTodayPaymentSummary() {
    try {
        const response = await fetch(
            "http://localhost:8081/api/payment-records/summary/today?time=" + Date.now()
        );

        const data = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(data), "error-text");
            return;
        }

        setText("auditTodayCash", formatNumber(data.totalCash));
        setText("auditTodayBkash", formatNumber(data.totalBkash));
        setText("auditTodayTotal", formatNumber(data.totalPaid));
        setText("auditTodayRecords", data.totalRecords || 0);

        setText("auditGovtRecovery", formatNumber(data.totalGovernmentRecovery));
        setText("auditPumpKept", formatNumber(data.totalPumpKept));
        setText("auditNormalRecords", data.normalFuelPaymentRecords || 0);
        setText("auditRouteRecords", data.routeTokenPaymentRecords || 0);

    } catch (error) {
        showMessage("Server connection failed while loading payment summary.", "error-text");
    }
}

async function loadAllPaymentRecords() {
    const body = document.getElementById("paymentAuditBody");

    if (body) {
        body.innerHTML = `<tr><td colspan="12">Loading...</td></tr>`;
    }

    try {
        const response = await fetch(
            "http://localhost:8081/api/payment-records?time=" + Date.now()
        );

        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");
            return;
        }

        renderPaymentRecords(Array.isArray(result) ? result : []);
        showMessage("Payment audit loaded successfully.", "success-text");

    } catch (error) {
        showMessage("Server connection failed while loading payment audit.", "error-text");

        if (body) {
            body.innerHTML = `<tr><td colspan="12">Server connection failed.</td></tr>`;
        }
    }
}

function renderPaymentRecords(records) {
    const body = document.getElementById("paymentAuditBody");

    if (!body) {
        return;
    }

    if (!records.length) {
        body.innerHTML = `<tr><td colspan="12">No payment record found.</td></tr>`;
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

            <td>
                <strong>${safeText(record.pumpName)}</strong><br>
                <small>${safeText(record.pumpAddress)}</small>
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

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.innerText = value;
    }
}

function showMessage(message, className) {
    const element = document.getElementById("paymentAuditMessage");

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