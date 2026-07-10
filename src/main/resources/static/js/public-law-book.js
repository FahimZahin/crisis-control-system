document.addEventListener("DOMContentLoaded", function () {
    const refreshBtn = document.getElementById("refreshPublicLawBookBtn");

    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadPublicLawBook);
    }

    loadPublicLawBook();
});

async function loadPublicLawBook() {
    const list = document.getElementById("publicLawBookList");

    if (list) {
        list.innerHTML = "Loading law book rules...";
    }

    showMessage("", "");

    try {
        const response = await fetch("/public/law-book-rules?time=" + Date.now(), {
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        });

        let result = null;

        try {
            result = await response.json();
        } catch (error) {
            result = null;
        }

        if (!response.ok) {
            const message = getErrorMessage(result);

            showMessage(message, "error-text");

            if (list) {
                list.innerHTML = `<p class="error-text">${message}</p>`;
            }

            return;
        }

        const rules = Array.isArray(result) ? result : [];

        renderPublicRules(rules);
        showMessage("All law book rules loaded successfully.", "success-text");

    } catch (error) {
        showMessage("Server connection failed while loading public law book.", "error-text");

        if (list) {
            list.innerHTML = `<p class="error-text">Server connection failed while loading public law book.</p>`;
        }
    }
}

function renderPublicRules(rules) {
    const list = document.getElementById("publicLawBookList");

    if (!list) {
        return;
    }

    if (!rules.length) {
        list.innerHTML = `<p>No public law-book rule found.</p>`;
        return;
    }

    list.innerHTML = "";

    rules.forEach(function (rule) {
        const card = document.createElement("div");
        card.className = "role-dashboard-section";
        card.style.marginBottom = "18px";

        card.innerHTML = `
            <div class="card-title-row">
                <h2>${safeText(rule.violationCode)} - ${safeText(rule.violationTitle)}</h2>
                <span class="law-type-badge ${getComplaintTypeClass(rule.complaintType)}">
                              ${formatEnum(rule.complaintType)}
                </span>
            </div>

            <div class="info-grid">
                <div>
                    <label>Description</label>
                    <p>${safeText(rule.description)}</p>
                </div>

                <div>
                    <label>Required Evidence</label>
                    <p>${safeText(rule.requiredEvidence)}</p>
                </div>

                <div>
                    <label>Local Authority Verification Rule</label>
                    <p>${safeText(rule.localVerificationRule)}</p>
                </div>

                <div>
                    <label>Allowed Admin Action</label>
                    <p>${formatEnum(rule.allowedAdminAction)}</p>
                </div>

                <div>
                    <label>Penalty Amount</label>
                    <p>${formatMoney(rule.penaltyAmount)} BDT</p>
                </div>

                <div>
                    <label>Temporary Deactivation</label>
                    <p>${safeText(rule.temporaryDeactivationDays)} days</p>
                </div>

                <div>
                    <label>Repeat Offense Rule</label>
                    <p>${safeText(rule.repeatOffenseRule)}</p>
                </div>

                <div>
                    <label>Appeal Option</label>
                    <p>${safeText(rule.appealOption)}</p>
                </div>
            </div>
        `;

        list.appendChild(card);
    });
}

function showMessage(message, className) {
    const element = document.getElementById("publicLawBookMessage");

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