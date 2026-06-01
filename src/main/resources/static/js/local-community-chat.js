const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;
let localCommunityGroups = [];
let selectedLocalThana = "";
let localCommunityRefreshInterval = null;

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    setupLogout();
    setupEvents();
    loadLocalGroups();

    localCommunityRefreshInterval = setInterval(function () {
        if (selectedLocalThana) {
            loadLocalMessages(false);
        }
    }, 5000);
});

function setupEvents() {
    const refreshBtn = document.getElementById("refreshLocalChatBtn");
    const form = document.getElementById("localCommunityForm");
    const groupSelect = document.getElementById("localCommunityGroupSelect");

    if (refreshBtn) {
        refreshBtn.addEventListener("click", function () {
            loadLocalMessages(true);
        });
    }

    if (form) {
        form.addEventListener("submit", function (event) {
            event.preventDefault();
            sendLocalMessage();
        });
    }

    if (groupSelect) {
        groupSelect.addEventListener("change", function () {
            selectedLocalThana = groupSelect.value;
            updateLocalTitle();
            loadLocalMessages(true);
        });
    }
}

async function loadLocalGroups() {
    try {
        const response = await fetch(
            "http://localhost:8081/api/community-chat/local/groups/"
            + getLoggedInUserId()
            + "?time="
            + Date.now()
        );

        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");
            return;
        }

        localCommunityGroups = Array.isArray(result) ? result : [];
        setupLocalGroupSelection();

    } catch (error) {
        showMessage("Server connection failed while loading local communities.", "error-text");
    }
}

function setupLocalGroupSelection() {
    const role = getRole();
    const selectorBox = document.getElementById("localGroupSelectorBox");
    const groupSelect = document.getElementById("localCommunityGroupSelect");

    if (!localCommunityGroups.length) {
        showMessage("No local community found for your account. Please update your thana/area information.", "error-text");
        return;
    }

    if ((role === "ADMIN" || role === "GOVERNMENT_AUTHORITY") && localCommunityGroups.length > 1) {
        if (selectorBox) {
            selectorBox.style.display = "block";
        }

        if (groupSelect) {
            groupSelect.innerHTML = `<option value="">Select local community</option>`;

            localCommunityGroups.forEach(function (group) {
                const option = document.createElement("option");
                option.value = group.thanaName;
                option.innerText = group.groupName;
                groupSelect.appendChild(option);
            });
        }

        showMessage("Please select a local community to monitor.", "muted-text");
        return;
    }

    selectedLocalThana = localCommunityGroups[0].thanaName;
    updateLocalTitle();
    loadLocalMessages(true);
}

async function loadLocalMessages(scrollBottom) {
    if (!selectedLocalThana) {
        showMessage("Please select a local community.", "error-text");
        return;
    }

    const thread = document.getElementById("localCommunityThread");

    try {
        const response = await fetch(
            "http://localhost:8081/api/community-chat/local/messages?userId="
            + encodeURIComponent(getLoggedInUserId())
            + "&thanaName="
            + encodeURIComponent(selectedLocalThana)
            + "&time="
            + Date.now()
        );

        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");
            return;
        }

        renderMessages(Array.isArray(result) ? result : [], scrollBottom);

    } catch (error) {
        if (thread) {
            thread.innerHTML = `<p class="error-text">Server connection failed while loading local community messages.</p>`;
        }
    }
}

function renderMessages(messages, scrollBottom) {
    const thread = document.getElementById("localCommunityThread");

    if (!thread) {
        return;
    }

    if (!messages.length) {
        thread.innerHTML = `
            <div class="empty-dashboard-box">
                <h3>No local message yet</h3>
                <p>Start the local crisis discussion for ${safeText(selectedLocalThana)}.</p>
            </div>
        `;
        return;
    }

    thread.innerHTML = "";

    messages.forEach(function (message) {
        const isMine = Number(message.senderId) === Number(getLoggedInUserId());
        const card = document.createElement("div");

        card.className = isMine ? "community-message-card mine-community-message" : "community-message-card";

        card.innerHTML = `
            <div class="community-message-header">
                <div>
                    <strong>${safeText(message.senderName)}</strong>
                    <small>${formatEnum(message.senderRole)}</small>
                </div>
                <small>${formatDateTime(message.createdAt)}</small>
            </div>
            <p>${escapeHtml(message.message)}</p>
        `;

        thread.appendChild(card);
    });

    if (scrollBottom) {
        thread.scrollTop = thread.scrollHeight;
    }
}

async function sendLocalMessage() {
    if (!selectedLocalThana) {
        showMessage("Please select a local community first.", "error-text");
        return;
    }

    const input = document.getElementById("localCommunityInput");
    const message = input ? input.value.trim() : "";

    if (!message) {
        showMessage("Message cannot be empty.", "error-text");
        return;
    }

    const data = {
        senderId: Number(getLoggedInUserId()),
        thanaName: selectedLocalThana,
        message: message
    };

    try {
        const response = await fetch("http://localhost:8081/api/community-chat/local/send", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");
            return;
        }

        input.value = "";
        await loadLocalMessages(true);
        showMessage("Message sent to " + selectedLocalThana + " local community.", "success-text");

    } catch (error) {
        showMessage("Server connection failed while sending local message.", "error-text");
    }
}

function updateLocalTitle() {
    setText("localCommunityTitle", selectedLocalThana + " Local Community");
    setText("localCommunitySubtitle", "Only users connected with " + selectedLocalThana + " can use this community. Admin and Government can monitor all local communities.");
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

function getLoggedInUserId() {
    return loggedInUser.userId || loggedInUser.id || localStorage.getItem("userId");
}

function getRole() {
    return loggedInUser.role || localStorage.getItem("role") || "";
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.innerText = value;
    }
}

function showMessage(message, className) {
    const element = document.getElementById("localCommunityMessage");

    if (element) {
        element.className = className || "";
        element.innerText = message || "";
    }
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

function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    return String(value).replace("T", " ").substring(0, 16);
}

function safeText(value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    return String(value);
}

function escapeHtml(value) {
    return safeText(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getErrorMessage(result) {
    if (!result) {
        return "Request failed.";
    }

    if (result.message) {
        return result.message;
    }

    if (result.error) {
        return result.error;
    }

    if (result.messages) {
        return JSON.stringify(result.messages);
    }

    return JSON.stringify(result);
}