const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

let utilityProfile = null;
let myOutages = [];
let activeOutages = [];
let selectedNoticeId = null;
let countdownTimer = null;
let isRefreshingAfterExpiry = false;

let currentOutagePage = 1;
const outagesPerPage = 10;

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    setupLogout();
    setupEvents();
    loadPageData();

    countdownTimer = setInterval(function () {
        updateCountdowns();
        autoRefreshIfExpired();
        renderThanaStatusGrid();
        renderMyOutagesTableWithoutReset();
    }, 1000);
});

function setupEvents() {
    document.getElementById("outageType").addEventListener("change", function () {
        handleOutageTypeChange();
        generateEmergencyMessage();
    });

    document.getElementById("quickDuration").addEventListener("change", function () {
        applyQuickDuration();
        generateEmergencyMessage();
    });

    document.getElementById("thanaName").addEventListener("change", function () {
        checkRecentOutageWarning();
        generateEmergencyMessage();
    });

    document.getElementById("cause").addEventListener("change", generateEmergencyMessage);
    document.getElementById("startDateTime").addEventListener("change", generateEmergencyMessage);
    document.getElementById("expectedRestorationDateTime").addEventListener("change", generateEmergencyMessage);
    document.getElementById("dailyStartTime").addEventListener("change", generateEmergencyMessage);
    document.getElementById("dailyEndTime").addEventListener("change", generateEmergencyMessage);

    document.getElementById("outageForm").addEventListener("submit", function (event) {
        event.preventDefault();
        saveOutageNotice();
    });

    const refreshMyOutagesBtn = document.getElementById("refreshMyOutagesBtn");

    if (refreshMyOutagesBtn) {
        refreshMyOutagesBtn.addEventListener("click", async function () {
            await refreshWholePageData();
        });
    }

    const refreshThanaStatusBtn = document.getElementById("refreshThanaStatusBtn");

    if (refreshThanaStatusBtn) {
        refreshThanaStatusBtn.addEventListener("click", async function () {
            await refreshWholePageData();
        });
    }

    const prevBtn = document.getElementById("prevOutagePageBtn");
    const nextBtn = document.getElementById("nextOutagePageBtn");

    if (prevBtn) {
        prevBtn.addEventListener("click", function () {
            if (currentOutagePage > 1) {
                currentOutagePage--;
                renderMyOutagesTable();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", function () {
            const totalPages = Math.ceil(myOutages.length / outagesPerPage);

            if (currentOutagePage < totalPages) {
                currentOutagePage++;
                renderMyOutagesTable();
            }
        });
    }
}

async function loadPageData() {
    await loadUtilityProfile();
    await loadActiveOutages();
    await loadMyOutages();
    handleOutageTypeChange();
}

async function refreshWholePageData() {
    await loadActiveOutages();
    await loadMyOutages();
    renderThanaStatusGrid();
    updateCountdowns();
    showMessage("outageMessage", "Page refreshed. Outage colors and countdown updated.", "success-text");
}

async function loadUtilityProfile() {
    const userId = loggedInUser.userId || localStorage.getItem("userId");

    try {
        const response = await fetch("http://localhost:8081/api/utility/profile/user/" + userId);
        const profile = await response.json();

        if (!response.ok) {
            showMessage("outageMessage", "Please complete utility profile first.", "error-text");
            setTimeout(function () {
                window.location.href = "utility-profile-setup.html";
            }, 1000);
            return;
        }

        utilityProfile = profile;

        document.getElementById("profileProvider").innerText = profile.provider;
        document.getElementById("profileCity").innerText = formatEnum(profile.cityCorporation);
        document.getElementById("profileOfficer").innerText = profile.officerName;
        document.getElementById("profileZone").innerText = profile.serviceZone;

        document.getElementById("provider").value = profile.provider;
        document.getElementById("cityCorporation").value = formatEnum(profile.cityCorporation);
        document.getElementById("contactNumber").value = profile.officialPhone || "";

        renderThanaDropdown(profile.allowedThanas || []);

    } catch (error) {
        showMessage("outageMessage", "Server connection failed while loading utility profile.", "error-text");
    }
}

function renderThanaDropdown(thanas) {
    const select = document.getElementById("thanaName");
    select.innerHTML = `<option value="">Select thana</option>`;

    thanas.forEach(function (thana) {
        const option = document.createElement("option");
        option.value = thana;
        option.innerText = thana;
        select.appendChild(option);
    });
}

async function loadActiveOutages() {
    const grid = document.getElementById("thanaStatusGrid");

    try {
        const response = await fetch("http://localhost:8081/api/power-outages/active?time=" + Date.now());
        const data = await response.json();

        if (!response.ok) {
            activeOutages = [];
            renderThanaStatusGrid();
            return;
        }

        activeOutages = data.filter(function (notice) {
            const displayStatus = getDisplayStatus(notice);

            if (displayStatus === "ONGOING") {
                return true;
            }

            if (displayStatus === "SCHEDULED") {
                return true;
            }

            if (displayStatus === "RESTORED") {
                return isRecentlyRestored(notice);
            }

            return false;
        });

        renderThanaStatusGrid();

    } catch (error) {
        activeOutages = [];

        if (grid) {
            grid.innerHTML = "Failed to load thana status.";
        }
    }
}

function renderThanaStatusGrid() {
    const grid = document.getElementById("thanaStatusGrid");

    if (!grid) {
        return;
    }

    if (!utilityProfile || !utilityProfile.allowedThanas) {
        grid.innerHTML = "No thana loaded.";
        return;
    }

    grid.innerHTML = "";

    utilityProfile.allowedThanas.forEach(function (thana) {
        const status = getThanaVisualStatus(thana);

        const chip = document.createElement("span");
        chip.className = "thana-status-chip " + status.className;
        chip.innerText = thana + " - " + status.label;

        grid.appendChild(chip);
    });
}

function getThanaVisualStatus(thana) {
    const notices = activeOutages.filter(function (notice) {
        return notice.thanaName
            && notice.thanaName.toLowerCase() === thana.toLowerCase();
    });

    const hasOngoing = notices.some(function (notice) {
        return getDisplayStatus(notice) === "ONGOING";
    });

    if (hasOngoing) {
        return {
            className: "thana-ongoing",
            label: "ONGOING"
        };
    }

    const hasScheduled = notices.some(function (notice) {
        return getDisplayStatus(notice) === "SCHEDULED";
    });

    if (hasScheduled) {
        return {
            className: "thana-scheduled",
            label: "SCHEDULED"
        };
    }

    const hasRecentlyRestored = notices.some(function (notice) {
        return getDisplayStatus(notice) === "RESTORED" && isRecentlyRestored(notice);
    });

    if (hasRecentlyRestored) {
        return {
            className: "thana-restored",
            label: "RECENTLY RESTORED"
        };
    }

    return {
        className: "thana-normal",
        label: "NORMAL"
    };
}

function getDisplayStatus(notice) {
    if (!notice) {
        return "UNKNOWN";
    }

    if (notice.status === "CANCELLED" || notice.status === "REJECTED") {
        return notice.status;
    }

    const now = new Date();
    const startTime = parseBackendDateTime(notice.startDateTime);
    const endTime = parseBackendDateTime(notice.expectedRestorationDateTime);

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

function isRecentlyRestored(notice) {
    if (!notice) {
        return false;
    }

    const displayStatus = getDisplayStatus(notice);

    if (displayStatus !== "RESTORED") {
        return false;
    }

    let restoredAt = parseBackendDateTime(notice.restoredAt);

    if (!restoredAt || isNaN(restoredAt.getTime())) {
        restoredAt = parseBackendDateTime(notice.expectedRestorationDateTime);
    }

    if (!restoredAt || isNaN(restoredAt.getTime())) {
        return false;
    }

    const now = new Date();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    return restoredAt <= now && restoredAt > oneHourAgo;
}

async function checkRecentOutageWarning() {
    const thanaName = document.getElementById("thanaName").value;
    const warningBox = document.getElementById("areaWarningBox");
    const warningText = document.getElementById("areaWarningText");

    document.getElementById("warningAcknowledged").checked = false;

    if (!thanaName) {
        warningBox.classList.add("hidden-section");
        return;
    }

    try {
        const response = await fetch("http://localhost:8081/api/power-outages/thana/" + encodeURIComponent(thanaName) + "/recent?time=" + Date.now());
        const recentData = await response.json();

        if (!response.ok || recentData.length === 0) {
            warningBox.classList.add("hidden-section");
            return;
        }

        const recent = recentData.filter(function (notice) {
            const displayStatus = getDisplayStatus(notice);

            if (displayStatus === "ONGOING") {
                return true;
            }

            if (displayStatus === "SCHEDULED") {
                return true;
            }

            if (displayStatus === "RESTORED") {
                return isRecentlyRestored(notice);
            }

            return false;
        });

        if (recent.length === 0) {
            warningBox.classList.add("hidden-section");
            return;
        }

        const hasOngoing = recent.some(function (notice) {
            return getDisplayStatus(notice) === "ONGOING";
        });

        const hasScheduled = recent.some(function (notice) {
            return getDisplayStatus(notice) === "SCHEDULED";
        });

        const hasRecentRestored = recent.some(function (notice) {
            return getDisplayStatus(notice) === "RESTORED" && isRecentlyRestored(notice);
        });

        warningBox.classList.remove("hidden-section");

        if (hasOngoing) {
            warningText.innerText = "This thana already has an ongoing outage notice. Creating another current outage may confuse users.";
        } else if (hasScheduled) {
            warningText.innerText = "This thana already has a scheduled outage notice. Please confirm before creating another notice.";
        } else if (hasRecentRestored) {
            warningText.innerText = "This thana was restored recently. Please confirm before creating another notice.";
        } else {
            warningText.innerText = "Recent outage happened here. Please confirm before creating another notice.";
        }

    } catch (error) {
        warningBox.classList.add("hidden-section");
    }
}

function handleOutageTypeChange() {
    const outageType = document.getElementById("outageType").value;
    const dailyStartBox = document.getElementById("dailyStartBox");
    const dailyEndBox = document.getElementById("dailyEndBox");

    if (outageType === "CURRENT") {
        document.getElementById("status").value = "ONGOING";
        setNowAsStart();
        applyQuickDuration();
        dailyStartBox.style.display = "none";
        dailyEndBox.style.display = "none";
        return;
    }

    if (outageType === "SCHEDULED") {
        document.getElementById("status").value = "SCHEDULED";
        dailyStartBox.style.display = "none";
        dailyEndBox.style.display = "none";
        return;
    }

    if (outageType === "DAILY_RECURRING") {
        document.getElementById("status").value = "SCHEDULED";
        dailyStartBox.style.display = "block";
        dailyEndBox.style.display = "block";
    }
}

function setNowAsStart() {
    const now = new Date();
    document.getElementById("startDateTime").value = toDatetimeLocal(now);
}

function applyQuickDuration() {
    const duration = document.getElementById("quickDuration").value;

    if (duration === "CUSTOM") {
        return;
    }

    const startValue = document.getElementById("startDateTime").value;

    if (!startValue) {
        setNowAsStart();
    }

    const start = new Date(document.getElementById("startDateTime").value);
    start.setMinutes(start.getMinutes() + Number(duration));

    document.getElementById("expectedRestorationDateTime").value = toDatetimeLocal(start);
}

function generateEmergencyMessage() {
    const provider = document.getElementById("provider").value;
    const thana = document.getElementById("thanaName").value;
    const cause = formatEnum(document.getElementById("cause").value);
    const outageType = document.getElementById("outageType").value;
    const start = document.getElementById("startDateTime").value;
    const end = document.getElementById("expectedRestorationDateTime").value;
    const dailyStart = document.getElementById("dailyStartTime").value;
    const dailyEnd = document.getElementById("dailyEndTime").value;

    if (!thana) {
        return;
    }

    let message = "";

    if (outageType === "CURRENT") {
        message = `${provider} notice: Power outage is currently ongoing in ${thana} area. Reason: ${cause}. Start time: ${formatDateTimeInput(start)}. Expected restoration time: ${formatDateTimeInput(end)}.`;
    } else if (outageType === "SCHEDULED") {
        message = `${provider} notice: Scheduled power outage in ${thana} area. Reason: ${cause}. Start time: ${formatDateTimeInput(start)}. Expected restoration time: ${formatDateTimeInput(end)}.`;
    } else {
        message = `${provider} notice: Daily recurring power outage in ${thana} area. Reason: ${cause}. Daily start time: ${dailyStart || "-"}. Daily end time: ${dailyEnd || "-"}.`;
    }

    document.getElementById("emergencyMessage").value = message;
}

async function saveOutageNotice() {
    const warningVisible = !document.getElementById("areaWarningBox").classList.contains("hidden-section");
    const warningAcknowledged = document.getElementById("warningAcknowledged").checked;

    if (warningVisible && !warningAcknowledged) {
        showMessage("outageMessage", "Please acknowledge the recent outage warning before submitting.", "error-text");
        return;
    }

    const data = {
        userId: Number(loggedInUser.userId || localStorage.getItem("userId")),
        thanaName: document.getElementById("thanaName").value,
        outageType: document.getElementById("outageType").value,
        cause: document.getElementById("cause").value,
        status: document.getElementById("status").value,
        startDateTime: normalizeDateTimeValue(document.getElementById("startDateTime").value),
        expectedRestorationDateTime: normalizeDateTimeValue(document.getElementById("expectedRestorationDateTime").value),
        dailyStartTime: document.getElementById("dailyStartTime").value,
        dailyEndTime: document.getElementById("dailyEndTime").value,
        emergencyMessage: document.getElementById("emergencyMessage").value,
        contactNumber: document.getElementById("contactNumber").value,
        warningAcknowledged: warningAcknowledged
    };

    try {
        const noticeId = document.getElementById("noticeId").value;
        let url = "http://localhost:8081/api/power-outages";
        let method = "POST";

        if (noticeId) {
            url = "http://localhost:8081/api/power-outages/" + noticeId;
            method = "PUT";
        }

        const response = await fetch(url, {
            method: method,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            showMessage("outageMessage", noticeId ? "Outage notice updated." : "Outage notice created.", "success-text");
            resetForm();
            await refreshWholePageData();
        } else {
            showMessage("outageMessage", getErrorMessage(result), "error-text");
        }

    } catch (error) {
        showMessage("outageMessage", "Server connection failed while saving outage notice.", "error-text");
    }
}

async function loadMyOutages() {
    const userId = loggedInUser.userId || localStorage.getItem("userId");
    const tableBody = document.getElementById("myOutagesBody");

    try {
        const response = await fetch("http://localhost:8081/api/power-outages/user/" + userId + "?time=" + Date.now());
        myOutages = await response.json();

        if (!response.ok) {
            tableBody.innerHTML = `<tr><td colspan="8">Failed to load notices.</td></tr>`;
            return;
        }

        currentOutagePage = 1;
        renderMyOutagesTable();

    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="8">Server connection failed.</td></tr>`;
    }
}

function renderMyOutagesTable() {
    renderMyOutagesTableCore(true);
}

function renderMyOutagesTableWithoutReset() {
    renderMyOutagesTableCore(false);
}

function renderMyOutagesTableCore(allowEmptyMessage) {
    const tableBody = document.getElementById("myOutagesBody");

    if (!tableBody) {
        return;
    }

    if (myOutages.length === 0) {
        if (allowEmptyMessage) {
            tableBody.innerHTML = `<tr><td colspan="8">No outage notice created yet.</td></tr>`;
        }

        updatePaginationControls();
        return;
    }

    const startIndex = (currentOutagePage - 1) * outagesPerPage;
    const endIndex = startIndex + outagesPerPage;
    const pageItems = myOutages.slice(startIndex, endIndex);

    tableBody.innerHTML = "";

    pageItems.forEach(function (notice) {
        const displayStatus = getDisplayStatus(notice);
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${notice.id}</td>
            <td>${notice.thanaName}</td>
            <td>${notice.outageType}</td>
            <td>${formatEnum(notice.cause)}</td>
            <td><span class="outage-status-badge ${getStatusClass(displayStatus)}">${displayStatus}</span></td>
            <td>${renderTimeInfo(notice)}</td>
            <td>${renderHighlightedMessage(notice)}</td>
            <td>
                <button class="btn primary tiny-btn" onclick="editNotice(${notice.id})">Edit</button>
                <button class="btn danger tiny-btn" onclick="deleteNotice(${notice.id})">Delete</button>
            </td>
        `;

        tableBody.appendChild(row);
    });

    updatePaginationControls();
    updateCountdowns();
}

function renderHighlightedMessage(notice) {
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

function updatePaginationControls() {
    const totalPages = Math.max(1, Math.ceil(myOutages.length / outagesPerPage));

    const pageInfo = document.getElementById("outagePageInfo");
    const prevBtn = document.getElementById("prevOutagePageBtn");
    const nextBtn = document.getElementById("nextOutagePageBtn");

    if (currentOutagePage > totalPages) {
        currentOutagePage = totalPages;
    }

    if (pageInfo) {
        pageInfo.innerText = `Page ${currentOutagePage} of ${totalPages}`;
    }

    if (prevBtn) {
        prevBtn.disabled = currentOutagePage <= 1;
    }

    if (nextBtn) {
        nextBtn.disabled = currentOutagePage >= totalPages;
    }
}

function editNotice(id) {
    const notice = myOutages.find(function (item) {
        return item.id === id;
    });

    if (!notice) {
        return;
    }

    selectedNoticeId = id;
    document.getElementById("noticeId").value = notice.id;
    document.getElementById("thanaName").value = notice.thanaName;
    document.getElementById("outageType").value = notice.outageType;
    document.getElementById("cause").value = notice.cause;
    document.getElementById("status").value = notice.status;
    document.getElementById("startDateTime").value = notice.startDateTime ? notice.startDateTime.substring(0, 16) : "";
    document.getElementById("expectedRestorationDateTime").value = notice.expectedRestorationDateTime ? notice.expectedRestorationDateTime.substring(0, 16) : "";
    document.getElementById("dailyStartTime").value = notice.dailyStartTime || "";
    document.getElementById("dailyEndTime").value = notice.dailyEndTime || "";
    document.getElementById("emergencyMessage").value = notice.emergencyMessage;
    document.getElementById("contactNumber").value = notice.contactNumber;
    document.getElementById("saveOutageBtn").innerText = "Update Outage Notice";

    handleOutageTypeChange();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteNotice(id) {
    const confirmed = confirm("Delete this outage notice?");

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch("http://localhost:8081/api/power-outages/" + id, {
            method: "DELETE"
        });

        const result = await response.json();

        if (response.ok) {
            showMessage("outageMessage", result.message, "success-text");
            await refreshWholePageData();
        } else {
            showMessage("outageMessage", getErrorMessage(result), "error-text");
        }

    } catch (error) {
        showMessage("outageMessage", "Server connection failed while deleting notice.", "error-text");
    }
}

function resetForm() {
    document.getElementById("noticeId").value = "";
    document.getElementById("outageForm").reset();
    document.getElementById("provider").value = utilityProfile.provider;
    document.getElementById("cityCorporation").value = formatEnum(utilityProfile.cityCorporation);
    document.getElementById("contactNumber").value = utilityProfile.officialPhone || "";
    document.getElementById("saveOutageBtn").innerText = "Save Outage Notice";
    document.getElementById("areaWarningBox").classList.add("hidden-section");
    document.getElementById("warningAcknowledged").checked = false;
    handleOutageTypeChange();
}

function renderTimeInfo(notice) {
    const displayStatus = getDisplayStatus(notice);

    if (notice.outageType === "DAILY_RECURRING") {
        return `Daily: ${notice.dailyStartTime || "-"} - ${notice.dailyEndTime || "-"}`;
    }

    if (displayStatus === "SCHEDULED") {
        return `
            ${formatDateTime(notice.startDateTime)}<br>
            to<br>
            ${formatDateTime(notice.expectedRestorationDateTime)}<br>
            <strong>SCHEDULED</strong>
        `;
    }

    if (displayStatus === "ONGOING" && notice.expectedRestorationDateTime) {
        return `
            ${formatDateTime(notice.startDateTime)}<br>
            to<br>
            ${formatDateTime(notice.expectedRestorationDateTime)}<br>
            <strong class="live-countdown" data-end="${notice.expectedRestorationDateTime}" data-id="${notice.id}">
                Calculating...
            </strong>
        `;
    }

    if (displayStatus === "RESTORED" && isRecentlyRestored(notice)) {
        return `
            ${formatDateTime(notice.startDateTime)}<br>
            to<br>
            ${formatDateTime(notice.expectedRestorationDateTime)}<br>
            <strong>RECENTLY RESTORED</strong>
        `;
    }

    if (displayStatus === "RESTORED") {
        return `
            ${formatDateTime(notice.startDateTime)}<br>
            to<br>
            ${formatDateTime(notice.expectedRestorationDateTime)}<br>
            <strong>RESTORED</strong>
        `;
    }

    return `${formatDateTime(notice.startDateTime)}<br>to<br>${formatDateTime(notice.expectedRestorationDateTime)}`;
}

function updateCountdowns() {
    const countdownElements = document.querySelectorAll(".live-countdown");

    countdownElements.forEach(function (element) {
        const endTime = parseBackendDateTime(element.getAttribute("data-end"));
        const now = new Date();

        if (!endTime || isNaN(endTime.getTime())) {
            element.innerText = "Invalid restoration time";
            return;
        }

        const diff = endTime - now;

        if (diff <= 0) {
            element.innerText = "Restoration time reached";
            element.className = "countdown-finished";
            return;
        }

        const totalSeconds = Math.floor(diff / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        element.innerText = `Ends in ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    });
}

async function autoRefreshIfExpired() {
    if (isRefreshingAfterExpiry) {
        return;
    }

    const hasExpiredCountdown = Array.from(document.querySelectorAll(".countdown-finished"))
        .some(function (element) {
            return element.innerText === "Restoration time reached";
        });

    if (hasExpiredCountdown) {
        isRefreshingAfterExpiry = true;
        await refreshWholePageData();

        setTimeout(function () {
            isRefreshingAfterExpiry = false;
        }, 3000);
    }
}

function isNoticeExpired(notice) {
    return getDisplayStatus(notice) === "RESTORED";
}

function parseBackendDateTime(value) {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return value;
    }

    const cleanValue = value.toString().split(".")[0];

    if (cleanValue.includes("T")) {
        return new Date(cleanValue);
    }

    return new Date(cleanValue.replace(" ", "T"));
}

function normalizeDateTimeValue(value) {
    if (!value) {
        return null;
    }

    return value;
}

function toDatetimeLocal(date) {
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
}

function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    return value.replace("T", " ").substring(0, 16);
}

function formatDateTimeInput(value) {
    if (!value) {
        return "-";
    }

    return value.replace("T", " ");
}

function formatEnum(value) {
    if (!value) {
        return "-";
    }

    return value.replaceAll("_", " ");
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

function pad(value) {
    return String(value).padStart(2, "0");
}

function showMessage(id, message, className) {
    const element = document.getElementById(id);

    if (element) {
        element.className = className;
        element.innerText = message;
    }
}

function getErrorMessage(result) {
    if (result.message) {
        return result.message;
    }

    if (result.messages) {
        return JSON.stringify(result.messages);
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