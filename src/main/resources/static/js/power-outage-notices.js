let publicNotices = [];

document.addEventListener("DOMContentLoaded", function () {
    setupLogout();
    loadPublicNotices();

    const refreshBtn = document.getElementById("refreshPublicNoticesBtn");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadPublicNotices);
    }
});

async function loadPublicNotices() {
    const list = document.getElementById("publicNoticeList");

    try {
        const response = await fetch("http://localhost:8081/api/power-outages/active");
        publicNotices = await response.json();

        if (!response.ok) {
            list.innerHTML = "Failed to load notices.";
            return;
        }

        publicNotices = publicNotices.filter(function (notice) {
            if (notice.status === "RESTORED") {
                return isRecentlyRestored(notice);
            }

            return true;
        });

        renderPublicStatusGrid();
        renderPublicNoticeCards();
    } catch (error) {
        list.innerHTML = "Server connection failed.";
    }
}

function renderPublicStatusGrid() {
    const grid = document.getElementById("publicOutageStatusGrid");
    const thanaMap = {};

    publicNotices.forEach(function (notice) {
        const thana = notice.thanaName;

        if (!thanaMap[thana]) {
            thanaMap[thana] = getPublicVisualStatus(notice);
            return;
        }

        const currentStatus = thanaMap[thana];

        if (notice.status === "ONGOING") {
            thanaMap[thana] = "ONGOING";
        } else if (notice.status === "SCHEDULED" && currentStatus !== "ONGOING") {
            thanaMap[thana] = "SCHEDULED";
        } else if (
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
    if (notice.status === "ONGOING") {
        return "ONGOING";
    }

    if (notice.status === "SCHEDULED") {
        return "SCHEDULED";
    }

    if (isRecentlyRestored(notice)) {
        return "RECENTLY RESTORED";
    }

    return "NORMAL";
}

function renderPublicNoticeCards() {
    const list = document.getElementById("publicNoticeList");

    if (publicNotices.length === 0) {
        list.innerHTML = `
            <p>No active, scheduled, or recently restored outage notice found.</p>
        `;
        return;
    }

    list.innerHTML = "";

    publicNotices.forEach(function (notice) {
        const card = document.createElement("div");
        card.className = "outage-notice-card " + getNoticeCardClass(notice.status);

        card.innerHTML = `
            <h3>${notice.provider} - ${notice.thanaName}</h3>

            <p>${formatEnum(notice.cityCorporation)}</p>

            <span class="${getStatusClass(notice.status)}">${notice.status}</span>

            <div class="notice-detail-grid">
                <div>
                    <strong>Outage Type</strong>
                    <p>${notice.outageType}</p>
                </div>

                <div>
                    <strong>Cause</strong>
                    <p>${formatEnum(notice.cause)}</p>
                </div>

                <div>
                    <strong>Time</strong>
                    <p>${renderTimeInfo(notice)}</p>
                </div>

                <div>
                    <strong>Contact</strong>
                    <p>${notice.contactNumber}</p>
                </div>

                <div>
                    <strong>Officer</strong>
                    <p>${notice.officerName}</p>
                </div>
            </div>

            <div class="notice-message">
                ${renderHighlightedPublicMessage(notice)}
            </div>
        `;

        list.appendChild(card);
    });
}

function renderHighlightedPublicMessage(notice) {
    let message = notice.emergencyMessage || "-";

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

function isRecentlyRestored(notice) {
    if (notice.status !== "RESTORED" || !notice.restoredAt) {
        return false;
    }

    const restoredAt = new Date(notice.restoredAt);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    return restoredAt >= oneHourAgo;
}

function getThanaClass(status) {
    if (status === "ONGOING") {
        return "thana-ongoing";
    }

    if (status === "SCHEDULED") {
        return "thana-scheduled";
    }

    if (status === "RECENTLY RESTORED") {
        return "thana-restored";
    }

    if (status === "RESTORED") {
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

function renderTimeInfo(notice) {
    if (notice.outageType === "DAILY_RECURRING") {
        return `Daily: ${notice.dailyStartTime || "-"} - ${notice.dailyEndTime || "-"}`;
    }

    return `${formatDateTime(notice.startDateTime)} to ${formatDateTime(notice.expectedRestorationDateTime)}`;
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

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            localStorage.clear();
            window.location.href = "login.html";
        });
    }
}