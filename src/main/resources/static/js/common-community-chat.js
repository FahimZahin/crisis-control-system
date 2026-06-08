const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;
let commonCommunityRefreshInterval = null;

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    setupLogout();
    setupEvents();
    loadCommonMessages(true);

    commonCommunityRefreshInterval = setInterval(function () {
        loadCommonMessages(false);
    }, 5000);
});

function setupEvents() {
    const refreshBtn = document.getElementById("refreshCommonChatBtn");
    const form = document.getElementById("commonCommunityForm");

    if (refreshBtn) {
        refreshBtn.addEventListener("click", function () {
            loadCommonMessages(true);
        });
    }

    if (form) {
        form.addEventListener("submit", function (event) {
            event.preventDefault();
            sendCommonMessage();
        });
    }
}

async function loadCommonMessages(scrollBottom) {
    const thread = document.getElementById("commonCommunityThread");

    try {
        const response = await fetch(
            "http://localhost:8081/api/community-chat/common/messages?time=" + Date.now()
        );

        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");
            return;
        }

        renderMessages(Array.isArray(result) ? result : [], scrollBottom);
        markCommonCommunityAsSeen();

    } catch (error) {
        if (thread) {
            thread.innerHTML = `<p class="error-text">Server connection failed while loading community messages.</p>`;
        }
    }
}

function renderMessages(messages, scrollBottom) {
    const thread = document.getElementById("commonCommunityThread");

    if (!thread) {
        return;
    }

    if (!messages.length) {
        thread.innerHTML = `
            <div class="empty-dashboard-box">
                <h3>No community message yet</h3>
                <p>Start the common crisis community discussion.</p>
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

async function sendCommonMessage() {
    const input = document.getElementById("commonCommunityInput");
    const message = input ? input.value.trim() : "";

    if (!message) {
        showMessage("Message cannot be empty.", "error-text");
        return;
    }

    const data = {
        senderId: Number(getLoggedInUserId()),
        message: message
    };

    try {
        const response = await fetch("http://localhost:8081/api/community-chat/common/send", {
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
        await loadCommonMessages(true);
        showMessage("Message sent to common community.", "success-text");

    } catch (error) {
        showMessage("Server connection failed while sending community message.", "error-text");
    }
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

function showMessage(message, className) {
    const element = document.getElementById("commonCommunityMessage");

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

function markCommonCommunityAsSeen() {
    const userId = getLoggedInUserId();

    if (!userId) {
        return;
    }

    localStorage.setItem("commonCommunityLastSeenAt_" + userId, new Date().toISOString());
}