let loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    setupLogout();
    setupEvents();
    fillUserSummary();
    loadNotifications();
});

function setupEvents() {
    const refreshBtn = document.getElementById("refreshNotificationsBtn");
    const markAllReadBtn = document.getElementById("markAllReadBtn");

    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadNotifications);
    }

    if (markAllReadBtn) {
        markAllReadBtn.addEventListener("click", markAllAsRead);
    }
}

function fillUserSummary() {
    setText("notificationUserName", loggedInUser.fullName || localStorage.getItem("fullName") || "-");
    setText("notificationUserRole", loggedInUser.role || localStorage.getItem("role") || "-");
}

async function loadNotifications() {
    const userId = getLoggedInUserId();

    if (!userId) {
        showMessage("User ID not found. Please login again.", "error-text");
        return;
    }

    try {
        const response = await fetch("http://localhost:8081/api/notifications/user/" + userId + "?time=" + Date.now());
        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");
            return;
        }

        const notifications = Array.isArray(result) ? result : [];

        renderNotifications(notifications);
        updateSummary(notifications);
        showMessage("Notifications loaded successfully.", "success-text");

    } catch (error) {
        showMessage("Server connection failed while loading notifications.", "error-text");
    }
}

function renderNotifications(notifications) {
    const container = document.getElementById("notificationList");

    if (!container) {
        return;
    }

    if (!notifications.length) {
        container.innerHTML = `
            <div class="notification-card">
                <h3>No notifications found</h3>
                <p>You have no system notifications yet.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = "";

    notifications.forEach(function (notification) {
        const card = document.createElement("div");
        card.className = notification.readStatus ? "notification-card" : "notification-card unread-notification";

        card.innerHTML = `
            <div class="notification-card-header">
                <div>
                    <h3>${safeText(notification.title)}</h3>
                    <p class="muted-text">
                        ${formatEnum(notification.notificationType)}
                        |
                        ${formatDateTime(notification.createdAt)}
                    </p>
                </div>

                <div>
                    ${notification.readStatus ? `<span class="status-pill success-pill">READ</span>` : `<span class="status-pill warning-pill">UNREAD</span>`}
                </div>
            </div>

            <p>${safeText(notification.message)}</p>

            <div class="notification-card-actions">
                ${notification.targetPage ? `<a class="btn primary small-btn" href="${notification.targetPage}">Open</a>` : ""}
                ${!notification.readStatus ? `<button class="btn secondary small-btn" onclick="markAsRead(${notification.id})">Mark Read</button>` : ""}
            </div>
        `;

        container.appendChild(card);
    });
}

function updateSummary(notifications) {
    const unreadCount = notifications.filter(function (notification) {
        return !notification.readStatus;
    }).length;

    setText("totalNotifications", notifications.length);
    setText("unreadNotifications", unreadCount);
}

async function markAsRead(notificationId) {
    const userId = getLoggedInUserId();

    try {
        const response = await fetch(
            "http://localhost:8081/api/notifications/" + notificationId + "/read/user/" + userId,
            {
                method: "PUT"
            }
        );

        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");
            return;
        }

        loadNotifications();

    } catch (error) {
        showMessage("Server connection failed while marking notification as read.", "error-text");
    }
}

async function markAllAsRead() {
    const userId = getLoggedInUserId();

    const confirmed = confirm("Mark all notifications as read?");

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(
            "http://localhost:8081/api/notifications/user/" + userId + "/read-all",
            {
                method: "PUT"
            }
        );

        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");
            return;
        }

        loadNotifications();

    } catch (error) {
        showMessage("Server connection failed while marking all as read.", "error-text");
    }
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

function getLoggedInUserId() {
    return loggedInUser.userId || loggedInUser.id || localStorage.getItem("userId");
}

function showMessage(message, className) {
    const element = document.getElementById("notificationMessage");

    if (element) {
        element.className = className;
        element.innerText = message;
    }
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.innerText = value;
    }
}

function safeText(value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    return String(value);
}

function formatEnum(value) {
    if (!value) {
        return "-";
    }

    return String(value).replaceAll("_", " ");
}

function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    return String(value).replace("T", " ").substring(0, 16);
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

    return JSON.stringify(result);
}