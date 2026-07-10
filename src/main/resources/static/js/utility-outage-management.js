const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

let utilityProfile = null;
let myOutages = [];
let activeOutages = [];
let selectedNoticeId = null;
let countdownTimer = null;

let currentOutagePage = 1;
const outagesPerPage = 10;

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    if (loggedInUser.role !== "UTILITY_AUTHORITY") {
        alert("Only Utility Authority can access this page.");
        window.location.href = "dashboard.html";
        return;
    }

    setupLogout();
    setupEvents();
    loadPageData();

    countdownTimer = setInterval(function () {
        updateCountdowns();
        autoRefreshIfExpired();
    }, 1000);
});

function setupEvents() {
    const outageType = document.getElementById("outageType");
    const quickDuration = document.getElementById("quickDuration");
    const thanaName = document.getElementById("thanaName");
    const cause = document.getElementById("cause");
    const startDateTime = document.getElementById("startDateTime");
    const expectedRestorationDateTime = document.getElementById("expectedRestorationDateTime");
    const dailyStartTime = document.getElementById("dailyStartTime");
    const dailyEndTime = document.getElementById("dailyEndTime");
    const outageForm = document.getElementById("outageForm");
    const refreshMyOutagesBtn = document.getElementById("refreshMyOutagesBtn");
    const refreshThanaStatusBtn = document.getElementById("refreshThanaStatusBtn");
    const prevBtn = document.getElementById("prevOutagePageBtn");
    const nextBtn = document.getElementById("nextOutagePageBtn");

    if (outageType) {
        outageType.addEventListener("change", function () {
            handleOutageTypeChange();
            generateEmergencyMessage();
        });
    }

    if (quickDuration) {
        quickDuration.addEventListener("change", function () {
            applyQuickDuration();
            generateEmergencyMessage();
        });
    }

    if (thanaName) {
        thanaName.addEventListener("change", function () {
            checkRecentOutageWarning(thanaName.value);
            generateEmergencyMessage();
        });
    }

    if (cause) {
        cause.addEventListener("change", generateEmergencyMessage);
    }

    if (startDateTime) {
        startDateTime.addEventListener("change", generateEmergencyMessage);
    }

    if (expectedRestorationDateTime) {
        expectedRestorationDateTime.addEventListener("change", generateEmergencyMessage);
    }

    if (dailyStartTime) {
        dailyStartTime.addEventListener("change", generateEmergencyMessage);
    }

    if (dailyEndTime) {
        dailyEndTime.addEventListener("change", generateEmergencyMessage);
    }

    if (outageForm) {
        outageForm.addEventListener("submit", function (event) {
            event.preventDefault();
            saveOutageNotice();
        });
    }

    if (refreshMyOutagesBtn) {
        refreshMyOutagesBtn.addEventListener("click", async function () {
            await refreshWholePageData();
        });
    }

    if (refreshThanaStatusBtn) {
        refreshThanaStatusBtn.addEventListener("click", async function () {
            await refreshWholePageData();
        });
    }

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
    generateEmergencyMessage();
}

async function refreshWholePageData() {
    await loadUtilityProfile();
    await loadActiveOutages();
    await loadMyOutages();
    renderThanaStatusGrid();
    updateCountdowns();
    showMessage("outageMessage", "Page refreshed successfully.", "success-text");
}

async function loadUtilityProfile() {
    const userId = loggedInUser.userId || localStorage.getItem("userId");

    utilityProfile = buildFallbackUtilityProfileFromLoggedInUser();

    try {
        const response = await fetch("http://localhost:8081/api/utility/profile/user/" + userId + "?time=" + Date.now());

        if (response.ok) {
            const profile = await response.json();

            utilityProfile = {
                ...utilityProfile,
                ...profile
            };
        }
    } catch (error) {
        // keep fallback utilityProfile from registration data
    }

    renderUtilityProfileSummary();
    fillUtilityFormDefaults();
    renderThanaDropdown(utilityProfile.allowedThanas || []);
}

function buildFallbackUtilityProfileFromLoggedInUser() {
    const provider = loggedInUser.utilityProvider || loggedInUser.provider || "";
    const cityCorporation = loggedInUser.cityCorporation || deriveCityCorporationFromProvider(provider);
    const allowedThanas = getAllowedThanasByProvider(provider);

    return {
        provider: provider,
        cityCorporation: cityCorporation,
        officerName: loggedInUser.fullName || loggedInUser.authorityName || "",
        serviceZone: loggedInUser.district || loggedInUser.thanaOrUpazila || loggedInUser.zone || "",
        officialPhone: loggedInUser.phoneNumber || "",
        allowedThanas: allowedThanas
    };
}

function renderUtilityProfileSummary() {
    setText("profileProvider", utilityProfile.provider || "-");
    setText("profileCity", formatEnum(utilityProfile.cityCorporation || "-"));
    setText("profileOfficer", utilityProfile.officerName || loggedInUser.fullName || "-");
    setText("profileZone", utilityProfile.serviceZone || loggedInUser.thanaOrUpazila || "-");
}

function fillUtilityFormDefaults() {
    setInputValue("provider", utilityProfile.provider || "");
    setInputValue("cityCorporation", formatEnum(utilityProfile.cityCorporation || ""));
    setInputValue("contactNumber", utilityProfile.officialPhone || loggedInUser.phoneNumber || "");

    if (!document.getElementById("startDateTime").value) {
        setNowAsStart();
    }
}

function deriveCityCorporationFromProvider(provider) {
    if (provider === "DESCO") {
        return "DHAKA_NORTH_CITY_CORPORATION";
    }

    if (provider === "DPDC") {
        return "DHAKA_SOUTH_CITY_CORPORATION";
    }

    return "";
}

function getAllowedThanasByProvider(provider) {
    if (provider === "DESCO") {
        return [
            "Uttara East",
            "Uttara West",
            "Dakshinkhan",
            "Uttarkhan",
            "Khilkhet",
            "Turag",
            "Gulshan",
            "Banani",
            "Badda",
            "Baridhara",
            "Mirpur",
            "Pallabi",
            "Rupnagar",
            "Shah Ali",
            "Kafrul",
            "Darus Salam",
            "Agargaon",
            "Sher-e-Bangla Nagar",
            "Cantonment"
        ];
    }

    if (provider === "DPDC") {
        return [
            "Ramna",
            "Shahbagh",
            "Dhanmondi",
            "Kalabagan",
            "New Market",
            "Hazaribagh",
            "Lalbagh",
            "Chawkbazar",
            "Kotwali",
            "Sutrapur",
            "Wari",
            "Gendaria",
            "Bangshal",
            "Motijheel",
            "Paltan",
            "Shyampur",
            "Kadamtali",
            "Jatrabari",
            "Demra",
            "Kamrangirchar",
            "Khilgaon",
            "Sabujbagh",
            "Mugda"
        ];
    }

    return [];
}

function renderThanaDropdown(thanas) {
    const select = document.getElementById("thanaName");

    if (!select) {
        return;
    }

    const safeThanas = Array.isArray(thanas) ? thanas : [];

    select.innerHTML = `<option value="">Select thana</option>`;

    safeThanas.forEach(function (thana) {
        const option = document.createElement("option");
        option.value = thana;
        option.innerText = thana;
        select.appendChild(option);
    });
}

async function loadActiveOutages() {
    try {
        const response = await fetch("http://localhost:8081/api/power-outages/active?time=" + Date.now());

        if (!response.ok) {
            activeOutages = [];
            document.getElementById("thanaStatusGrid").innerHTML = "Failed to load thana status.";
            return;
        }

        activeOutages = await response.json();
        renderThanaStatusGrid();

    } catch (error) {
        activeOutages = [];
        document.getElementById("thanaStatusGrid").innerHTML = "Failed to load thana status.";
    }
}

function renderThanaStatusGrid() {
    const grid = document.getElementById("thanaStatusGrid");

    if (!grid) {
        return;
    }

    if (!utilityProfile || !Array.isArray(utilityProfile.allowedThanas) || utilityProfile.allowedThanas.length === 0) {
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
        return getEffectiveOutageStatus(notice) === "ONGOING";
    });

    if (hasOngoing) {
        return { className: "thana-ongoing", label: "ONGOING" };
    }

    const hasScheduled = notices.some(function (notice) {
        return getEffectiveOutageStatus(notice) === "SCHEDULED";
    });

    if (hasScheduled) {
        return { className: "thana-scheduled", label: "SCHEDULED" };
    }

    const hasRecentlyRestored = notices.some(function (notice) {
        return isRecentlyRestored(notice);
    });

    if (hasRecentlyRestored) {
        return { className: "thana-restored", label: "RECENTLY RESTORED" };
    }

    return { className: "thana-normal", label: "NORMAL" };
}

function getEffectiveOutageStatus(notice) {
    if (!notice) {
        return "UNKNOWN";
    }

    if (notice.outageType === "DAILY_RECURRING") {
        return notice.status || "SCHEDULED";
    }

    const now = new Date();
    const startTime = parseBackendDateTime(notice.startDateTime);
    const endTime = parseBackendDateTime(notice.expectedRestorationDateTime);

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
    if (getEffectiveOutageStatus(notice) !== "RESTORED") {
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

async function checkRecentOutageWarning(thanaName) {
    const warningBox = document.getElementById("areaWarningBox");
    const warningText = document.getElementById("areaWarningText");
    const warningAcknowledged = document.getElementById("warningAcknowledged");

    if (!warningBox || !warningText) {
        return;
    }

    if (!thanaName) {
        warningBox.classList.add("hidden-section");
        warningText.innerText = "";
        if (warningAcknowledged) {
            warningAcknowledged.checked = false;
        }
        return;
    }

    try {
        const response = await fetch(
            "http://localhost:8081/api/power-outages/recent/" + encodeURIComponent(thanaName) + "?time=" + Date.now()
        );

        const notices = await response.json();

        if (!response.ok || !Array.isArray(notices) || notices.length === 0) {
            warningBox.classList.add("hidden-section");
            warningText.innerText = "";
            if (warningAcknowledged) {
                warningAcknowledged.checked = false;
            }
            return;
        }

        const latestNotice = notices[0];

        warningText.innerText =
            thanaName +
            " had a recently restored outage notice. Creating another notice too quickly may confuse users. Please acknowledge before submitting.";

        warningBox.classList.remove("hidden-section");

        if (warningAcknowledged) {
            warningAcknowledged.checked = false;
        }

    } catch (error) {
        warningBox.classList.add("hidden-section");
        warningText.innerText = "";
        if (warningAcknowledged) {
            warningAcknowledged.checked = false;
        }
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
        if (dailyStartBox) dailyStartBox.style.display = "none";
        if (dailyEndBox) dailyEndBox.style.display = "none";
        return;
    }

    if (outageType === "SCHEDULED") {
        document.getElementById("status").value = "SCHEDULED";
        if (dailyStartBox) dailyStartBox.style.display = "none";
        if (dailyEndBox) dailyEndBox.style.display = "none";
        return;
    }

    if (outageType === "DAILY_RECURRING") {
        document.getElementById("status").value = "SCHEDULED";
        if (dailyStartBox) dailyStartBox.style.display = "block";
        if (dailyEndBox) dailyEndBox.style.display = "block";
    }
}

function setNowAsStart() {
    const now = new Date();
    setInputValue("startDateTime", toDatetimeLocal(now));
}

function applyQuickDuration() {
    const duration = document.getElementById("quickDuration").value;

    if (duration === "CUSTOM") {
        return;
    }

    const startInput = document.getElementById("startDateTime");

    if (!startInput.value) {
        setNowAsStart();
    }

    const start = new Date(startInput.value);
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
    const emergencyMessage = document.getElementById("emergencyMessage");

    if (!emergencyMessage) {
        return;
    }

    if (!thana) {
        emergencyMessage.value = "";
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

    emergencyMessage.value = message;
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

    if (!data.thanaName) {
        showMessage("outageMessage", "Please select thana.", "error-text");
        return;
    }

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

        if (!response.ok) {
            myOutages = [];
            if (tableBody) {
                tableBody.innerHTML = `<tr><td colspan="8">Failed to load notices.</td></tr>`;
            }
            return;
        }

        myOutages = await response.json();
        currentOutagePage = 1;
        renderMyOutagesTable();

    } catch (error) {
        myOutages = [];
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="8">Server connection failed.</td></tr>`;
        }
    }
}

function renderMyOutagesTable() {
    const tableBody = document.getElementById("myOutagesBody");

    if (!tableBody) {
        return;
    }

    if (myOutages.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8">No outage notice created yet.</td></tr>`;
        updatePaginationControls();
        return;
    }

    const startIndex = (currentOutagePage - 1) * outagesPerPage;
    const endIndex = startIndex + outagesPerPage;
    const pageItems = myOutages.slice(startIndex, endIndex);

    tableBody.innerHTML = "";

    pageItems.forEach(function (notice) {
        const effectiveStatus = getEffectiveOutageStatus(notice);

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${notice.id}</td>
            <td>${notice.thanaName}</td>
            <td>${notice.outageType}</td>
            <td>${formatEnum(notice.cause)}</td>
            <td><span class="outage-status-badge ${getStatusClass(effectiveStatus)}">${effectiveStatus}</span></td>
            <td>${renderTimeInfo(notice, effectiveStatus)}</td>
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
    setInputValue("noticeId", notice.id);
    setInputValue("thanaName", notice.thanaName);
    setInputValue("outageType", notice.outageType);
    setInputValue("cause", notice.cause);
    setInputValue("status", notice.status);
    setInputValue("startDateTime", notice.startDateTime ? notice.startDateTime.substring(0, 16) : "");
    setInputValue("expectedRestorationDateTime", notice.expectedRestorationDateTime ? notice.expectedRestorationDateTime.substring(0, 16) : "");
    setInputValue("dailyStartTime", notice.dailyStartTime || "");
    setInputValue("dailyEndTime", notice.dailyEndTime || "");
    setInputValue("emergencyMessage", notice.emergencyMessage || "");
    setInputValue("contactNumber", notice.contactNumber || "");

    const saveBtn = document.getElementById("saveOutageBtn");
    if (saveBtn) {
        saveBtn.innerText = "Update Outage Notice";
    }

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
    setInputValue("noticeId", "");
    document.getElementById("outageForm").reset();

    if (utilityProfile) {
        setInputValue("provider", utilityProfile.provider || "");
        setInputValue("cityCorporation", formatEnum(utilityProfile.cityCorporation || ""));
        setInputValue("contactNumber", utilityProfile.officialPhone || loggedInUser.phoneNumber || "");
    }

    const saveBtn = document.getElementById("saveOutageBtn");
    if (saveBtn) {
        saveBtn.innerText = "Save Outage Notice";
    }

    const warningBox = document.getElementById("areaWarningBox");
    if (warningBox) {
        warningBox.classList.add("hidden-section");
    }

    handleOutageTypeChange();
    generateEmergencyMessage();
}

function renderTimeInfo(notice, effectiveStatus) {
    if (notice.outageType === "DAILY_RECURRING") {
        return `Daily: ${notice.dailyStartTime || "-"} - ${notice.dailyEndTime || "-"}`;
    }

    if (effectiveStatus === "ONGOING" && notice.expectedRestorationDateTime) {
        return `
            ${formatDateTime(notice.startDateTime)}<br>
            to<br>
            ${formatDateTime(notice.expectedRestorationDateTime)}<br>
            <strong class="live-countdown" data-end="${notice.expectedRestorationDateTime}" data-id="${notice.id}">
                Calculating...
            </strong>
        `;
    }

    if (isRecentlyRestored(notice)) {
        return `${formatDateTime(notice.startDateTime)}<br>to<br>${formatDateTime(notice.expectedRestorationDateTime)}<br><strong>RECENTLY RESTORED</strong>`;
    }

    return `${formatDateTime(notice.startDateTime)}<br>to<br>${formatDateTime(notice.expectedRestorationDateTime)}`;
}

function updateCountdowns() {
    const countdownElements = document.querySelectorAll(".live-countdown");

    countdownElements.forEach(function (element) {
        const endTime = parseBackendDateTime(element.getAttribute("data-end"));
        const now = new Date();

        if (!endTime || isNaN(endTime.getTime())) {
            element.innerText = "Invalid time";
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
    const hasExpiredCountdown = Array.from(document.querySelectorAll(".countdown-finished"))
        .some(function (element) {
            return element.innerText === "Restoration time reached";
        });

    if (hasExpiredCountdown) {
        await refreshWholePageData();
    }
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

function pad(value) {
    return String(value).padStart(2, "0");
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.innerText = value;
    }
}

function setInputValue(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.value = value;
    }
}

function showMessage(id, message, className) {
    const element = document.getElementById(id);

    if (element) {
        element.className = className;
        element.innerText = message;
    }
}

function getErrorMessage(result) {
    if (result && result.message) {
        return result.message;
    }

    if (result && result.messages) {
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