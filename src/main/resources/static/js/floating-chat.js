(function () {
    const loggedInUser = getLoggedInUser();

    document.addEventListener("DOMContentLoaded", function () {
        if (!loggedInUser || !loggedInUser.role) {
            return;
        }

        resetOldCommunitySeenTimesOnce();
        createFloatingChatButton();
        createFloatingChatPanel();
        setupFloatingChatEvents();
        initializeCommunitySeenTimes();
        loadAllFloatingUnreadCounts();

        setInterval(loadAllFloatingUnreadCounts, 3000);
    });

    function getLoggedInUser() {
        try {
            return JSON.parse(localStorage.getItem("loggedInUser")) || null;
        } catch (error) {
            return null;
        }
    }

    function getRole() {
        return loggedInUser.role || localStorage.getItem("role") || "";
    }

    function getUserId() {
        return loggedInUser.userId || loggedInUser.id || localStorage.getItem("userId");
    }

    function getUserThana() {
        return loggedInUser.thanaOrUpazila
            || loggedInUser.buildingUnderThana
            || loggedInUser.hospitalUnderThana
            || loggedInUser.serviceArea
            || loggedInUser.assignedArea
            || "Not Set";
    }

    function getActiveLocalCommunityThana() {
        const groupSelect = document.getElementById("localCommunityGroupSelect");

        if (groupSelect && groupSelect.value) {
            return groupSelect.value;
        }

        return getUserThana();
    }

    function resetOldCommunitySeenTimesOnce() {
        const userId = getUserId();

        if (!userId) {
            return;
        }

        const resetKey = "communitySeenTimeLocalFixApplied_" + userId;

        if (localStorage.getItem(resetKey) === "true") {
            return;
        }

        Object.keys(localStorage)
            .filter(function (key) {
                return key.includes("CommunityLastSeenAt");
            })
            .forEach(function (key) {
                localStorage.removeItem(key);
            });

        localStorage.setItem(resetKey, "true");
    }

    function createFloatingChatButton() {
        if (document.getElementById("floatingChatBtn")) {
            return;
        }

        const button = document.createElement("button");
        button.id = "floatingChatBtn";
        button.className = "floating-chat-btn";
        button.title = "Open Chat";
        button.innerHTML = `
            <span class="floating-chat-icon">💬</span>
            <span id="floatingChatUnreadBadge" class="floating-chat-unread-badge" style="display:none;">0</span>
        `;

        document.body.appendChild(button);
    }

    function createFloatingChatPanel() {
        if (document.getElementById("floatingChatPanel")) {
            return;
        }

        const panel = document.createElement("div");
        panel.id = "floatingChatPanel";
        panel.className = "floating-chat-panel";

        panel.innerHTML = `
            <div class="floating-chat-header">
                <div>
                    <h3>Chat Center</h3>
                    <p>${formatRole(getRole())}</p>
                </div>
                <button id="closeFloatingChatBtn" class="floating-chat-close-btn">×</button>
            </div>

            <div class="floating-chat-body">
                <a href="chat.html" class="floating-chat-option">
                    <div class="floating-chat-option-icon">👤</div>
                    <div class="floating-chat-option-content">
                        <div class="floating-chat-option-title-row">
                            <h4>Direct Chat</h4>
                            <span id="directChatUnreadBadge" class="chat-option-unread-badge" style="display:none;">0</span>
                        </div>
                        <p>Message users, pumps, authorities and emergency roles.</p>
                    </div>
                </a>

                <a href="common-community-chat.html" class="floating-chat-option">
                    <div class="floating-chat-option-icon">🌐</div>
                    <div class="floating-chat-option-content">
                        <div class="floating-chat-option-title-row">
                            <h4>Common Community</h4>
                            <span id="commonCommunityUnreadBadge" class="chat-option-unread-badge" style="display:none;">0</span>
                        </div>
                        <p>System-wide crisis discussion for all users.</p>
                    </div>
                </a>

                <a href="local-community-chat.html" class="floating-chat-option">
                    <div class="floating-chat-option-icon">📍</div>
                    <div class="floating-chat-option-content">
                        <div class="floating-chat-option-title-row">
                            <h4>Local Community</h4>
                            <span id="localCommunityUnreadBadge" class="chat-option-unread-badge" style="display:none;">0</span>
                        </div>
                        <p>Your local thana group: ${escapeHtml(getActiveLocalCommunityThana())}.</p>
                    </div>
                </a>

                <a href="ai-crisis-assistant.html" class="floating-chat-option">
                    <div class="floating-chat-option-icon">🤖</div>
                    <div>
                        <h4>AI Crisis Assistant</h4>
                        <p>Ask about fuel availability, outage notices, route tokens, and fuel request status.</p>
                    </div>
                </a>
            </div>

            <div class="floating-chat-footer">
                <a href="chat.html" class="btn primary full-width">Open Full Chat</a>
            </div>
        `;

        document.body.appendChild(panel);
    }

    function setupFloatingChatEvents() {
        const chatBtn = document.getElementById("floatingChatBtn");
        const panel = document.getElementById("floatingChatPanel");
        const closeBtn = document.getElementById("closeFloatingChatBtn");

        if (chatBtn && panel) {
            chatBtn.addEventListener("click", function () {
                panel.classList.toggle("floating-chat-panel-open");
                loadAllFloatingUnreadCounts();
            });
        }

        if (closeBtn && panel) {
            closeBtn.addEventListener("click", function () {
                panel.classList.remove("floating-chat-panel-open");
            });
        }
    }

    function getSeenKey(type) {
        return type + "CommunityLastSeenAt_" + getUserId();
    }

    function initializeCommunitySeenTimes() {
        const userId = getUserId();

        if (!userId) {
            return;
        }

        const now = getLocalDateTimeForBackend();

        if (!localStorage.getItem(getSeenKey("common"))) {
            localStorage.setItem(getSeenKey("common"), now);
        }

        const thanaName = getActiveLocalCommunityThana();

        if (
            thanaName
            && thanaName !== "-"
            && thanaName !== "Not Set"
            && !localStorage.getItem(getLocalGroupSeenKey(thanaName))
        ) {
            localStorage.setItem(getLocalGroupSeenKey(thanaName), now);
        }
    }

    async function loadAllFloatingUnreadCounts() {
        const directCount = await loadDirectChatUnreadCount();
        const commonCount = await loadCommonCommunityUnreadCount();
        const localCount = await loadLocalCommunityUnreadCount();

        const totalUnread = directCount + commonCount + localCount;
        const floatingBadge = document.getElementById("floatingChatUnreadBadge");

        updateUnreadBadge(floatingBadge, totalUnread);
    }

    window.loadAllFloatingUnreadCounts = loadAllFloatingUnreadCounts;

    async function loadDirectChatUnreadCount() {
        const directChatBadge = document.getElementById("directChatUnreadBadge");
        const userId = getUserId();

        if (!userId) {
            hideUnreadBadge(directChatBadge);
            return 0;
        }

        try {
            const response = await fetch(
                "http://localhost:8081/api/chats/unread-count/"
                + encodeURIComponent(userId)
                + "?time="
                + Date.now()
            );

            const result = await response.json();

            if (!response.ok) {
                hideUnreadBadge(directChatBadge);
                return 0;
            }

            const unreadCount = Number(result.unreadCount || 0);
            updateUnreadBadge(directChatBadge, unreadCount);

            return unreadCount;

        } catch (error) {
            hideUnreadBadge(directChatBadge);
            return 0;
        }
    }

    async function loadCommonCommunityUnreadCount() {
        const badge = document.getElementById("commonCommunityUnreadBadge");
        const userId = getUserId();
        const lastSeenAt = localStorage.getItem(getSeenKey("common"));

        if (!userId || !lastSeenAt) {
            hideUnreadBadge(badge);
            return 0;
        }

        try {
            const response = await fetch(
                "http://localhost:8081/api/community-chat/common/unread-count/"
                + encodeURIComponent(userId)
                + "?lastSeenAt="
                + encodeURIComponent(lastSeenAt)
                + "&time="
                + Date.now()
            );

            const result = await response.json();

            if (!response.ok) {
                hideUnreadBadge(badge);
                return 0;
            }

            const unreadCount = Number(result.unreadCount || 0);
            updateUnreadBadge(badge, unreadCount);

            return unreadCount;

        } catch (error) {
            hideUnreadBadge(badge);
            return 0;
        }
    }

    async function loadLocalCommunityUnreadCount() {
        const badge = document.getElementById("localCommunityUnreadBadge");
        const userId = getUserId();
        const thanaName = getActiveLocalCommunityThana();

        if (!userId || !thanaName || thanaName === "-" || thanaName === "Not Set") {
            hideUnreadBadge(badge);
            return 0;
        }

        const lastSeenAt = localStorage.getItem(getLocalGroupSeenKey(thanaName));

        if (!lastSeenAt) {
            localStorage.setItem(getLocalGroupSeenKey(thanaName), getLocalDateTimeForBackend());
            hideUnreadBadge(badge);
            return 0;
        }

        try {
            const response = await fetch(
                "http://localhost:8081/api/community-chat/local/unread-count/"
                + encodeURIComponent(userId)
                + "?thanaName="
                + encodeURIComponent(thanaName)
                + "&lastSeenAt="
                + encodeURIComponent(lastSeenAt)
                + "&time="
                + Date.now()
            );

            const result = await response.json();

            if (!response.ok) {
                hideUnreadBadge(badge);
                return 0;
            }

            const unreadCount = Number(result.unreadCount || 0);
            updateUnreadBadge(badge, unreadCount);

            return unreadCount;

        } catch (error) {
            hideUnreadBadge(badge);
            return 0;
        }
    }

    function updateUnreadBadge(badge, count) {
        if (!badge) {
            return;
        }

        if (count > 0) {
            badge.innerText = count > 99 ? "99+" : String(count);
            badge.style.display = "inline-flex";
        } else {
            badge.innerText = "0";
            badge.style.display = "none";
        }
    }

    function hideUnreadBadge(badge) {
        if (!badge) {
            return;
        }

        badge.innerText = "0";
        badge.style.display = "none";
    }

    function getLocalGroupSeenKey(thanaName) {
        return "localCommunityLastSeenAt_" + getUserId() + "_" + normalizeLocalSeenKey(thanaName);
    }

    function normalizeLocalSeenKey(value) {
        return String(value || "")
            .trim()
            .toLowerCase()
            .replaceAll(" ", "_")
            .replaceAll("-", "_");
    }

    function formatRole(role) {
        if (!role) {
            return "User";
        }

        return String(role)
            .replaceAll("_", " ")
            .toLowerCase()
            .replace(/\b\w/g, function (letter) {
                return letter.toUpperCase();
            });
    }

    function escapeHtml(value) {
        if (value === null || value === undefined) {
            return "";
        }

        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function getLocalDateTimeForBackend() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const hour = String(now.getHours()).padStart(2, "0");
        const minute = String(now.getMinutes()).padStart(2, "0");
        const second = String(now.getSeconds()).padStart(2, "0");

        return year + "-" + month + "-" + day + "T" + hour + ":" + minute + ":" + second;
    }
})();