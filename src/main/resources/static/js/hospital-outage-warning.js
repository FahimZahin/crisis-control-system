const hospitalOutageLoggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

document.addEventListener("DOMContentLoaded", function () {
    if (!hospitalOutageLoggedInUser || hospitalOutageLoggedInUser.role !== "HOSPITAL_AUTHORITY") {
        return;
    }

    createHospitalOutageWarningBox();
    loadHospitalThanaOutageWarning();

    setInterval(function () {
        loadHospitalThanaOutageWarning();
    }, 60000);
});

function createHospitalOutageWarningBox() {
    const dashboardPage = document.querySelector(".role-dashboard-page");

    if (!dashboardPage) {
        return;
    }

    if (document.getElementById("hospitalOutageWarningBox")) {
        return;
    }

    const warningSection = document.createElement("div");
    warningSection.id = "hospitalOutageWarningBox";
    warningSection.className = "role-dashboard-section";
    warningSection.style.display = "none";

    warningSection.innerHTML = `
        <div class="card-title-row">
            <div>
                <h2 id="hospitalOutageWarningTitle">Hospital Area Power Alert</h2>
                <p class="muted-text" id="hospitalOutageWarningText">Checking outage status...</p>
            </div>

            <button class="btn primary small-btn" id="refreshHospitalOutageWarningBtn">
                Refresh Outage
            </button>
        </div>

        <div class="table-wrapper">
            <table class="admin-users-table">
                <thead>
                <tr>
                    <th>Provider</th>
                    <th>Hospital Under Thana</th>
                    <th>Status</th>
                    <th>Cause</th>
                    <th>Start Time</th>
                    <th>Expected Restoration</th>
                    <th>Message</th>
                </tr>
                </thead>
                <tbody id="hospitalOutageWarningBody">
                <tr>
                    <td colspan="7">Checking outage notice...</td>
                </tr>
                </tbody>
            </table>
        </div>
    `;

    const header = dashboardPage.querySelector(".role-dashboard-header");

    if (header && header.nextSibling) {
        dashboardPage.insertBefore(warningSection, header.nextSibling);
    } else {
        dashboardPage.prepend(warningSection);
    }

    const refreshBtn = document.getElementById("refreshHospitalOutageWarningBtn");

    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadHospitalThanaOutageWarning);
    }
}

async function loadHospitalThanaOutageWarning() {
    const warningBox = document.getElementById("hospitalOutageWarningBox");
    const warningTitle = document.getElementById("hospitalOutageWarningTitle");
    const warningText = document.getElementById("hospitalOutageWarningText");
    const tableBody = document.getElementById("hospitalOutageWarningBody");

    if (!warningBox || !warningTitle || !warningText || !tableBody) {
        return;
    }

    const hospitalThana = hospitalFirstValidValue(
        hospitalOutageLoggedInUser.hospitalUnderThana,
        hospitalOutageLoggedInUser.thanaOrUpazila,
        localStorage.getItem("hospitalUnderThana"),
        localStorage.getItem("thanaOrUpazila")
    );

    if (!hospitalThana) {
        warningBox.style.display = "block";
        warningTitle.innerText = "Hospital Area Power Alert";
        warningText.innerText = "Hospital under thana is missing from registration data.";
        tableBody.innerHTML = `<tr><td colspan="7">Hospital under thana is not available.</td></tr>`;
        return;
    }

    try {
        const response = await fetch("http://localhost:8081/api/power-outages/active?time=" + Date.now());
        const notices = await response.json();

        if (!response.ok) {
            warningBox.style.display = "block";
            warningTitle.innerText = "Hospital Area Power Alert";
            warningText.innerText = "Could not load power outage notices.";
            tableBody.innerHTML = `<tr><td colspan="7">Failed to load outage notices.</td></tr>`;
            return;
        }

        const matchingNotices = notices.filter(function (notice) {
            return notice.thanaName
                && notice.thanaName.toLowerCase() === hospitalThana.toLowerCase()
                && isHospitalRelevantOutage(notice);
        });

        if (matchingNotices.length === 0) {
            warningBox.style.display = "none";
            return;
        }

        warningBox.style.display = "block";

        const hasCurrentOutage = matchingNotices.some(function (notice) {
            return getHospitalDisplayOutageStatus(notice) === "ONGOING";
        });

        const hasScheduledOutage = matchingNotices.some(function (notice) {
            return getHospitalDisplayOutageStatus(notice) === "SCHEDULED";
        });

        if (hasCurrentOutage) {
            warningTitle.innerText = "⚠ CURRENT OUTAGE IN YOUR HOSPITAL THANA";
            warningText.innerText = "Power outage is currently active in " + hospitalThana + ". Please check generator backup and diesel reserve immediately.";
        } else if (hasScheduledOutage) {
            warningTitle.innerText = "⚠ SCHEDULED OUTAGE NOTICE FOR YOUR HOSPITAL THANA";
            warningText.innerText = "A scheduled outage notice has been published for " + hospitalThana + ". Please prepare hospital generator backup.";
        } else {
            warningTitle.innerText = "RECENTLY RESTORED POWER NOTICE";
            warningText.innerText = "Power was recently restored in " + hospitalThana + ". Keep monitoring hospital generator backup.";
        }

        renderHospitalOutageWarningTable(matchingNotices);

    } catch (error) {
        warningBox.style.display = "block";
        warningTitle.innerText = "Hospital Area Power Alert";
        warningText.innerText = "Server connection failed while checking outage notices.";
        tableBody.innerHTML = `<tr><td colspan="7">Server connection failed.</td></tr>`;
    }
}

function renderHospitalOutageWarningTable(notices) {
    const tableBody = document.getElementById("hospitalOutageWarningBody");

    tableBody.innerHTML = "";

    notices.forEach(function (notice) {
        const displayStatus = getHospitalDisplayOutageStatus(notice);
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${hospitalValueOrDash(notice.provider)}</td>
            <td>${hospitalValueOrDash(notice.thanaName)}</td>
            <td><span class="outage-status-badge ${getHospitalOutageStatusClass(displayStatus)}">${displayStatus}</span></td>
            <td>${hospitalFormatEnum(notice.cause)}</td>
            <td>${hospitalFormatDateTime(notice.startDateTime)}</td>
            <td>${hospitalFormatDateTime(notice.expectedRestorationDateTime)}</td>
            <td>${hospitalHighlightOutageMessage(notice.emergencyMessage)}</td>
        `;

        tableBody.appendChild(row);
    });
}

function isHospitalRelevantOutage(notice) {
    const status = getHospitalDisplayOutageStatus(notice);

    if (status === "ONGOING") {
        return true;
    }

    if (status === "SCHEDULED") {
        return true;
    }

    if (status === "RESTORED") {
        return isHospitalRecentlyRestored(notice);
    }

    return false;
}

function getHospitalDisplayOutageStatus(notice) {
    if (!notice) {
        return "UNKNOWN";
    }

    const now = new Date();
    const startTime = hospitalParseBackendDateTime(notice.startDateTime);
    const endTime = hospitalParseBackendDateTime(notice.expectedRestorationDateTime);

    if (notice.status === "CANCELLED" || notice.status === "REJECTED") {
        return notice.status;
    }

    if (notice.outageType === "DAILY_RECURRING") {
        return notice.status || "SCHEDULED";
    }

    if (startTime && startTime > now) {
        return "SCHEDULED";
    }

    if (endTime && endTime <= now) {
        return "RESTORED";
    }

    if (startTime && endTime && startTime <= now && endTime > now) {
        return "ONGOING";
    }

    return notice.status || "UNKNOWN";
}

function isHospitalRecentlyRestored(notice) {
    let restoredAt = hospitalParseBackendDateTime(notice.restoredAt);

    if (!restoredAt || isNaN(restoredAt.getTime())) {
        restoredAt = hospitalParseBackendDateTime(notice.expectedRestorationDateTime);
    }

    if (!restoredAt || isNaN(restoredAt.getTime())) {
        return false;
    }

    const now = new Date();
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    return restoredAt <= now && restoredAt > thirtyMinutesAgo;
}

function hospitalParseBackendDateTime(value) {
    if (!value) {
        return null;
    }

    const cleanValue = value.toString().split(".")[0];

    if (cleanValue.includes("T")) {
        return new Date(cleanValue);
    }

    return new Date(cleanValue.replace(" ", "T"));
}

function getHospitalOutageStatusClass(status) {
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

function hospitalHighlightOutageMessage(message) {
    if (!message) {
        return "-";
    }

    let highlightedMessage = message;

    highlightedMessage = highlightedMessage.replaceAll("Reason:", "<strong>Reason:</strong>");
    highlightedMessage = highlightedMessage.replaceAll("Start time:", "<strong>Start time:</strong>");
    highlightedMessage = highlightedMessage.replaceAll("Expected restoration time:", "<strong>Expected restoration time:</strong>");

    return highlightedMessage;
}

function hospitalFormatDateTime(value) {
    if (!value) {
        return "-";
    }

    return value.replace("T", " ").substring(0, 16);
}

function hospitalFormatEnum(value) {
    if (!value) {
        return "-";
    }

    return value.replaceAll("_", " ");
}

function hospitalValueOrDash(value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    return value;
}
function hospitalFirstValidValue() {
    for (let i = 0; i < arguments.length; i++) {
        const value = arguments[i];

        if (
            value !== null &&
            value !== undefined &&
            String(value).trim() !== "" &&
            String(value).trim() !== "-" &&
            String(value).trim() !== "Not Provided" &&
            String(value).trim() !== "null" &&
            String(value).trim() !== "undefined"
        ) {
            return String(value).trim();
        }
    }

    return "";
}