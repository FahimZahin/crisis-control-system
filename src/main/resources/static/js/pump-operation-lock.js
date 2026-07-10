let ccsPumpLockLoggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

document.addEventListener("DOMContentLoaded", function () {
    if (!ccsPumpLockLoggedInUser || ccsPumpLockLoggedInUser.role !== "PUMP_AUTHORITY") {
        return;
    }

    checkPumpOperationLock();
});

async function checkPumpOperationLock() {
    const userId = getPumpLockLoggedInUserId();

    if (!userId) {
        return;
    }

    try {
        const response = await fetch("http://localhost:8081/api/pumps/user/" + userId + "?time=" + Date.now());
        const pump = await response.json();

        if (!response.ok) {
            return;
        }

        if (pump.pumpStatus === "PENALTY_LOCKED") {
            lockPumpAuthorityOperations();
            return;
        }

        if (pump.pumpStatus === "OPEN_WITH_DEBT") {
            showOpenWithDebtNotice();
        }

    } catch (error) {
        console.log("Could not check pump lock status.");
    }
}

function lockPumpAuthorityOperations() {
    const cards = document.querySelectorAll(".feature-preview-card");

    cards.forEach(function (card) {
        const href = card.getAttribute("href") || "";
        const isPenaltyCard = href.includes("pump-penalty-account.html");

        if (isPenaltyCard) {
            card.classList.add("active-feature");
            return;
        }

        card.classList.remove("active-feature");
        card.classList.add("disabled-feature");
        card.removeAttribute("href");

        card.style.opacity = "0.45";
        card.style.cursor = "not-allowed";
        card.style.pointerEvents = "none";

        const existingNotice = card.querySelector(".pump-lock-notice");

        if (!existingNotice) {
            const notice = document.createElement("p");
            notice.className = "pump-lock-notice error-text";
            notice.innerText = "Locked until penalty recovery starts.";
            card.appendChild(notice);
        }
    });

    insertPumpNotice(
        "Pump Operations Locked",
        "Your pump is penalty locked due to an admin enforcement action. Only Pump Penalty Account is available until you start recovery.",
        "error-text"
    );
}

function showOpenWithDebtNotice() {
    insertPumpNotice(
        "Pump Open With Debt",
        "Your pump can operate now, but all earnings will go to government until penalty debt is fully recovered.",
        "success-text"
    );
}

function insertPumpNotice(title, message, className) {
    const dashboardSections = document.querySelectorAll(".role-dashboard-section");

    if (dashboardSections.length === 0) {
        return;
    }

    const existing = document.getElementById("pumpPenaltyStatusNotice");

    if (existing) {
        return;
    }

    const alertBox = document.createElement("div");
    alertBox.id = "pumpPenaltyStatusNotice";
    alertBox.className = "role-dashboard-section";
    alertBox.innerHTML = `
        <h2 class="${className}">${title}</h2>
        <p>${message}</p>
        <a href="pump-penalty-account.html" class="btn primary">Go to Pump Penalty Account</a>
    `;

    dashboardSections[0].parentNode.insertBefore(alertBox, dashboardSections[0]);
}

function getPumpLockLoggedInUserId() {
    return ccsPumpLockLoggedInUser.userId
        || ccsPumpLockLoggedInUser.id
        || localStorage.getItem("userId");
}