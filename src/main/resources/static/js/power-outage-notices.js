let publicNotices = [];
let publicNoticeRefreshTimer = null;

document.addEventListener("DOMContentLoaded", function () {
    setupLogout();
    loadPublicNotices();

    const refreshBtn = document.getElementById("refreshPublicNoticesBtn");

    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadPublicNotices);
    }

    publicNoticeRefreshTimer = setInterval(function () {
        renderPublicStatusGrid();
        renderPublicNoticeCards();
    }, 1000);
});

async function loadPublicNotices() {
    const list = document.getElementById("publicNoticeList");

    if (list) {
        list.innerHTML = "Loading notices...";
    }

    try {
        const response = await fetch("http://localhost:8081/api/power-outages/active?time=" + Date.now());

        if (!response.ok) {
            let errorText = "Failed to load notices.";

            try {
                const errorResult = await response.json();
                errorText = getErrorMessage(errorResult);
            } catch (error) {
                // keep default error text
            }

            if (list) {
                list.innerHTML = errorText;
            }

            return;
        }

        const result = await response.json();

        publicNotices = Array.isArray(result) ? result : [];

        renderPublicStatusGrid();
        renderPublicNoticeCards();

    } catch (error) {
        console.error("Power outage public notice loading/rendering failed:", error);

        if (list) {
            list.innerHTML = "Could not load outage notices. Please check backend API and browser console.";
        }
    }
}

function renderPublicStatusGrid() {
    const grid = document.getElementById("publicOutageStatusGrid");

    if (!grid) {
        return;
    }

    const thanaMap = {};

    publicNotices.forEach(function (notice) {
        if (!notice || !notice.thanaName) {
            return;
        }

        const thana = notice.thanaName;
        const effectiveStatus = getEffectiveOutageStatus(notice);
        const visualStatus = getPublicVisualStatus(notice);

        if (!thanaMap[thana]) {
            thanaMap[thana] = visualStatus;
            return;
        }

        const currentStatus = thanaMap[thana];

        if (effectiveStatus === "ONGOING") {
            thanaMap[thana] = "ONGOING";
            return;
        }

        if (effectiveStatus === "SCHEDULED" && currentStatus !== "ONGOING") {
            thanaMap[thana] = "SCHEDULED";
            return;
        }

        if (
            isRecentlyRestored(notice)
            && !["ONGOING", "SCHEDULED"].includes(currentStatus)
        ) {
            thanaMap[thana] = "RECENTLY RESTORED";
        }
    });

    grid.innerHTML = "";

    Object.keys(thanaMap).forEach(function (thana) {
        const status = thanaMap[thana];

        const chip = document.createElement("span");
        chip.className = "thana-status-chip " + getThanaClass(status);
        chip.innerText = thana + " - " + status;

        grid.appendChild(chip);
    });
}

function getPublicVisualStatus(notice) {
    const effectiveStatus = getEffectiveOutageStatus(notice);

    if (effectiveStatus === "ONGOING") {
        return "ONGOING";
    }

    if (effectiveStatus === "SCHEDULED") {
        return "SCHEDULED";
    }

    if (isRecentlyRestored(notice)) {
        return "RECENTLY RESTORED";
    }

    if (effectiveStatus === "RESTORED") {
        return "RESTORED";
    }

    return "NORMAL";
}

function renderPublicNoticeCards() {
    const list = document.getElementById("publicNoticeList");

    if (!list) {
        return;
    }

    if (!Array.isArray(publicNotices) || publicNotices.length === 0) {
        list.innerHTML = `
            <p>No active, scheduled, or recently restored outage notice found.</p>
        `;
        return;
    }

    list.innerHTML = "";

    publicNotices.forEach(function (notice) {
        const effectiveStatus = getEffectiveOutageStatus(notice);

        if (effectiveStatus === "CANCELLED") {
            return;
        }

        if (effectiveStatus === "RESTORED" && !isRecentlyRestored(notice)) {
            return;
        }

        const card = document.createElement("div");
        card.className = "outage-notice-card " + getNoticeCardClass(effectiveStatus);

        card.innerHTML = `
            <h3>${safeText(notice.provider)} - ${safeText(notice.thanaName)}</h3>

            <p>${formatEnum(notice.cityCorporation)}</p>

            <span class="${getStatusClass(effectiveStatus)}">${effectiveStatus}</span>

            <div class="notice-detail-grid">
                <div>
                    <strong>Outage Type</strong>
                    <p>${safeText(notice.outageType)}</p>
                </div>

                <div>
                    <strong>Cause</strong>
                    <p>${formatEnum(notice.cause)}</p>
                </div>

                <div>
                    <strong>Time</strong>
                    <p>${renderTimeInfo(notice, effectiveStatus)}</p>
                </div>

                <div>
                    <strong>Contact</strong>
                    <p>${safeText(notice.contactNumber)}</p>
                </div>

                <div>
                    <strong>Officer</strong>
                    <p>${safeText(notice.officerName)}</p>
                </div>
            </div>

            <div class="notice-message">
                ${renderHighlightedPublicMessage(notice)}
            </div>
        `;

        list.appendChild(card);
    });

    if (!list.innerHTML.trim()) {
        list.innerHTML = `
            <p>No active, scheduled, or recently restored outage notice found.</p>
        `;
    }
}

function renderHighlightedPublicMessage(notice) {
    let message = safeText(notice.emergencyMessage);

    const cause = formatEnum(notice.cause);
    const startTime = formatDateTime(notice.startDateTime);
    const endTime = formatDateTime(notice.expectedRestorationDateTime);

    if (cause && cause !== "-") {
        message = message.replaceAll(cause, `<strong>${cause}</strong>`);
    }

    if (notice.cause) {
        message = message.replaceAll(notice.cause, `<strong>${formatEnum(notice.cause)}</strong>`);
    }

    if (startTime && startTime !== "-") {
        message = message.replaceAll(startTime, `<strong>${startTime}</strong>`);
    }

    if (endTime && endTime !== "-") {
        message = message.replaceAll(endTime, `<strong>${endTime}</strong>`);
    }

    return message;
}

function getEffectiveOutageStatus(notice) {
    if (!notice) {
        return "UNKNOWN";
    }

    if (notice.status === "CANCELLED") {
        return "CANCELLED";
    }

    if (notice.outageType === "DAILY_RECURRING") {
        return notice.status || "SCHEDULED";
    }

    const now = new Date();
    const startTime = parseBackendDateTime(notice.startDateTime);
    const endTime = parseBackendDateTime(notice.expectedRestorationDateTime);

    if (notice.status === "RESTORED") {
        return "RESTORED";
    }

    if (startTime && endTime && startTime <= now && endTime > now) {
        return "ONGOING";
    }

    if (startTime && startTime > now) {
        return "SCHEDULED";
    }

    if (endTime && endTime <= now) {
        return "RESTORED";
    }

    return notice.status || "UNKNOWN";
}

function isRecentlyRestored(notice) {
    const effectiveStatus = getEffectiveOutageStatus(notice);

    if (effectiveStatus !== "RESTORED") {
        return false;
    }

    let restoredAt = parseBackendDateTime(notice.restoredAt);

    if (!restoredAt || isNaN(restoredAt.getTime())) {
        restoredAt = parseBackendDateTime(notice.expectedRestorationDateTime);
    }

    if (!restoredAt || isNaN(restoredAt.getTime())) {
        return false;
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    return restoredAt >= oneHourAgo;
}

function renderTimeInfo(notice, effectiveStatus) {
    if (notice.outageType === "DAILY_RECURRING") {
        return `Daily: ${notice.dailyStartTime || "-"} - ${notice.dailyEndTime || "-"}`;
    }

    if (effectiveStatus === "ONGOING" && notice.expectedRestorationDateTime) {
        return `
            ${formatDateTime(notice.startDateTime)}
            to
            ${formatDateTime(notice.expectedRestorationDateTime)}
            <br>
            <strong>${getCountdownText(notice.expectedRestorationDateTime)}</strong>
        `;
    }

    if (isRecentlyRestored(notice)) {
        return `
            ${formatDateTime(notice.startDateTime)}
            to
            ${formatDateTime(notice.expectedRestorationDateTime)}
            <br>
            <strong>RECENTLY RESTORED</strong>
        `;
    }

    return `${formatDateTime(notice.startDateTime)} to ${formatDateTime(notice.expectedRestorationDateTime)}`;
}

function getCountdownText(endValue) {
    const endTime = parseBackendDateTime(endValue);

    if (!endTime || isNaN(endTime.getTime())) {
        return "Invalid restoration time";
    }

    const diff = endTime - new Date();

    if (diff <= 0) {
        return "Restoration time reached";
    }

    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return "Ends in " + pad(hours) + ":" + pad(minutes) + ":" + pad(seconds);
}

function getThanaClass(status) {
    if (status === "ONGOING") {
        return "thana-ongoing";
    }

    if (status === "SCHEDULED") {
        return "thana-scheduled";
    }

    if (status === "RECENTLY RESTORED" || status === "RESTORED") {
        return "thana-restored";
    }

    return "thana-normal";
}

function getNoticeCardClass(status) {
    if (status === "ONGOING") {
        return "notice-ongoing";
    }

    if (status === "SCHEDULED") {
        return "notice-scheduled";
    }

    if (status === "RESTORED") {
        return "notice-restored";
    }

    return "notice-cancelled";
}

function getStatusClass(status) {
    if (status === "ONGOING") {
        return "outage-ongoing";
    }

    if (status === "SCHEDULED") {
        return "outage-scheduled";
    }

    if (status === "RESTORED") {
        return "outage-restored";
    }

    return "outage-cancelled";
}

function parseBackendDateTime(value) {
    if (!value) {
        return null;
    }

    const cleanValue = value.toString().split(".")[0];

    if (cleanValue.includes("T")) {
        return new Date(cleanValue);
    }

    return new Date(cleanValue.replace(" ", "T"));
}

function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    return value.replace("T", " ").substring(0, 16);
}

function formatEnum(value) {
    if (!value) {
        return "-";
    }

    return value.replaceAll("_", " ");
}

function safeText(value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    return String(value);
}

function pad(value) {
    return String(value).padStart(2, "0");
}

function getErrorMessage(result) {
    if (result && result.message) {
        return result.message;
    }

    if (result && result.messages) {
        return JSON.stringify(result.messages);
    }

    if (result && result.error) {
        return result.error;
    }

    return "Request failed.";
}

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            localStorage.clear();
            window.location.href = "login.html";
        });
    }
}