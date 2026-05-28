const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

let currentPump = null;

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    if (loggedInUser.role !== "PUMP_AUTHORITY") {
        alert("Only pump authority should access this page.");
        window.location.href = "dashboard.html";
        return;
    }

    setupLogout();
    setupPaymentRecordEvents();
    initializePaymentRecordPage();
});

function setupPaymentRecordEvents() {
    const form = document.getElementById("paymentRecordSearchForm");

    if (form) {
        form.addEventListener("submit", function (event) {
            event.preventDefault();
            searchPaymentRecords();
        });
    }
}

async function initializePaymentRecordPage() {
    setDefaultSearchValues();
    await loadPumpProfileForPayments();

    if (currentPump) {
        searchPaymentRecords();
    }
}

function setDefaultSearchValues() {
    const params = new URLSearchParams(window.location.search);
    const paymentMethodFromUrl = params.get("paymentMethod");

    const paymentMethodElement = document.getElementById("paymentMethod");
    const paymentDateElement = document.getElementById("paymentDate");

    if (paymentMethodElement) {
        if (paymentMethodFromUrl && paymentMethodFromUrl.toUpperCase() === "BKASH") {
            paymentMethodElement.value = "BKASH";
        } else {
            paymentMethodElement.value = "CASH";
        }
    }

    if (paymentDateElement) {
        paymentDateElement.value = getTodayDateString();
    }
}

async function loadPumpProfileForPayments() {
    const userId = getLoggedInUserId();

    if (!userId) {
        showPaymentRecordsMessage("User ID not found. Please login again.", "error-text");
        return;
    }

    try {
        let response = await fetch("http://localhost:8081/api/pumps/user/" + userId);
        let pump = await response.json();

        if (!response.ok) {
            response = await fetch("http://localhost:8081/api/pumps/create-from-user/" + userId, {
                method: "POST"
            });

            pump = await response.json();
        }

        if (!response.ok) {
            showPaymentRecordsMessage(getErrorMessage(pump), "error-text");
            return;
        }

        currentPump = pump;
        setTextIfExists("paymentPumpName", valueOrDash(pump.pumpName));

    } catch (error) {
        showPaymentRecordsMessage("Server connection failed while loading pump profile.", "error-text");
    }
}

async function searchPaymentRecords() {
    if (!currentPump) {
        showPaymentRecordsMessage("Pump profile not loaded.", "error-text");
        return;
    }

    const paymentMethod = document.getElementById("paymentMethod").value;
    const paymentDate = document.getElementById("paymentDate").value;

    if (!paymentMethod) {
        showPaymentRecordsMessage("Please select payment method.", "error-text");
        return;
    }

    if (!paymentDate) {
        showPaymentRecordsMessage("Please select search date.", "error-text");
        return;
    }

    try {
        const response = await fetch(
            "http://localhost:8081/api/pumps/"
            + currentPump.id
            + "/payment-records?paymentMethod="
            + encodeURIComponent(paymentMethod)
            + "&date="
            + encodeURIComponent(paymentDate)
        );

        const result = await response.json();

        if (!response.ok) {
            showPaymentRecordsMessage(getErrorMessage(result), "error-text");
            renderPaymentRecords([]);
            return;
        }

        fillPaymentRecordSummary(result);
        renderPaymentRecords(result.records || []);

        showPaymentRecordsMessage("Payment records loaded successfully.", "success-text");

    } catch (error) {
        showPaymentRecordsMessage("Server connection failed while loading payment records.", "error-text");
    }
}

function fillPaymentRecordSummary(result) {
    setTextIfExists("paymentPumpName", valueOrDash(result.pumpName));
    setTextIfExists("selectedPaymentMethod", valueOrDash(result.paymentMethod));
    setTextIfExists("selectedPaymentDate", valueOrDash(result.date));
    setTextIfExists("paymentTotalRecords", result.totalRecords || 0);
    setTextIfExists("paymentTotalAmount", formatNumber(result.totalAmount));
    setTextIfExists("paymentTotalFuelSold", formatNumber(result.totalFuelSold));
    setTextIfExists("paymentTotalCollections", result.totalRecords || 0);
}

function renderPaymentRecords(records) {
    const tableBody = document.getElementById("paymentRecordsTableBody");

    if (!tableBody) {
        return;
    }

    if (!records || records.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="10">No payment records found for the selected date and method.</td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = "";

    records.forEach(function (record) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${valueOrDash(record.id)}</td>
            <td>${valueOrDash(record.userName)}</td>
            <td>${valueOrDash(record.phoneNumber)}</td>
            <td>${formatRequestSource(record.requestSource)}</td>
            <td>${valueOrDash(record.fuelType)}</td>
            <td>${formatNumber(record.requestedLiter)} L</td>
            <td>${formatNumber(record.paidAmountBdt)} BDT</td>
            <td>${valueOrDash(record.paymentMethod)}</td>
            <td>${valueOrDash(record.bkashTransactionId)}</td>
            <td>${formatDate(record.collectedAt)}</td>
        `;

        tableBody.appendChild(row);
    });
}

function formatRequestSource(source) {
    if (!source) {
        return "-";
    }

    return String(source).replaceAll("_", " ");
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

function setTextIfExists(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.innerText = value;
    }
}

function showPaymentRecordsMessage(message, className) {
    const element = document.getElementById("paymentRecordsMessage");

    if (element) {
        element.className = className;
        element.innerText = message;
    }
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

function valueOrDash(value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    return value;
}

function formatNumber(value) {
    if (value === null || value === undefined || value === "") {
        return "0.00";
    }

    const numberValue = Number(value);

    if (Number.isNaN(numberValue)) {
        return value;
    }

    return numberValue.toFixed(2);
}

function formatDate(dateValue) {
    if (!dateValue) {
        return "-";
    }

    return String(dateValue).replace("T", " ").substring(0, 19);
}

function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return year + "-" + month + "-" + day;
}