let publicNotices = [];

document.addEventListener("DOMContentLoaded", function () {
    setupLogout();
    loadPublicNotices();

    document.getElementById("refreshPublicNoticesBtn").addEventListener("click", loadPublicNotices);
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
        if (!thanaMap[notice.thanaName]) {
            thanaMap[notice.thanaName] = notice.status;
            return;
        }

        if (notice.status === "ONGOING") {
            thanaMap[notice.thanaName] = "ONGOING";
        } else if (notice.status === "SCHEDULED" && thanaMap[notice.thanaName] !== "ONGOING") {
            thanaMap[notice.thanaName] = "SCHEDULED";
        } else if (notice.status === "RESTORED" && !["ONGOING", "SCHEDULED"].includes(thanaMap[notice.thanaName])) {
            thanaMap[notice.thanaName] = "RESTORED";
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

function renderPublicNoticeCards() {
    const list = document.getElementById("publicNoticeList");

    if (publicNotices.length === 0) {
        list.innerHTML = `<div class="empty-dashboard-box">No active or scheduled outage notice found.</div>`;
        return;
    }

    list.innerHTML = "";

    publicNotices.forEach(function (notice) {
        const card = document.createElement("div");
        card.className = "outage-notice-card " + getNoticeCardClass(notice.status);

        card.innerHTML = `
            <div class="card-title-row">
                <div>
                    <h3>${notice.provider} - ${notice.thanaName}</h3>
                    <p>${formatEnum(notice.cityCorporation)}</p>
                </div>
                <span class="outage-status-badge ${getStatusClass(notice.status)}">${notice.status}</span>
            </div>

            <div class="info-grid">
                <div>
                    <label>Outage Type</label>
                    <p>${notice.outageType}</p>
                </div>

                <div>
                    <label>Cause</label>
                    <p>${formatEnum(notice.cause)}</p>
                </div>

                <div>
                    <label>Time</label>
                    <p>${renderTimeInfo(notice)}</p>
                </div>

                <div>
                    <label>Contact</label>
                    <p>${notice.contactNumber}</p>
                </div>

                <div>
                    <label>Officer</label>
                    <p>${notice.officerName}</p>
                </div>
            </div>

            <p class="outage-message">${renderHighlightedPublicMessage(notice)}</p>
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

function getThanaClass(status) {
    if (status === "ONGOING") {
        return "thana-ongoing";
    }

    if (status === "SCHEDULED") {
        return "thana-scheduled";
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