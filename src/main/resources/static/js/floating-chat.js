(function () {
    const loggedInUser = getLoggedInUser();

    document.addEventListener("DOMContentLoaded", function () {
        if (!loggedInUser || !loggedInUser.role) {
            return;
        }

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

    function getUserThana() {
        return loggedInUser.thanaOrUpazila
            || loggedInUser.buildingUnderThana
            || loggedInUser.hospitalUnderThana
            || loggedInUser.serviceArea
            || loggedInUser.assignedArea
            || "Not Set";
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
        <p>Your local thana group: ${escapeHtml(getUserThana())}.</p>
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
            });
        }

        if (closeBtn && panel) {
            closeBtn.addEventListener("click", function () {
                panel.classList.remove("floating-chat-panel-open");
            });
        }

        const commonPreviewBtn = document.getElementById("commonCommunityPreviewBtn");
        const localPreviewBtn = document.getElementById("localCommunityPreviewBtn");
        const aiPreviewBtn = document.getElementById("aiAssistantPreviewBtn");




    }

    function getUserId() {
        return loggedInUser.userId || loggedInUser.id || localStorage.getItem("userId");
    }

    async function loadFloatingChatUnreadCount() {
        const badge = document.getElementById("floatingChatUnreadBadge");

        if (!badge) {
            return;
        }

        const userId = getUserId();

        if (!userId) {
            badge.style.display = "none";
            return;
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
                badge.style.display = "none";
                return;
            }

            const count = Number(result.unreadCount || 0);

            if (count > 0) {
                badge.innerText = count > 99 ? "99+" : String(count);
                badge.style.display = "inline-block";
            } else {
                badge.style.display = "none";
            }

        } catch (error) {
            badge.style.display = "none";
        }
    }

    function getUserId() {
        return loggedInUser.userId || loggedInUser.id || localStorage.getItem("userId");
    }

    async function loadFloatingChatUnreadCount() {
        const floatingBadge = document.getElementById("floatingChatUnreadBadge");
        const directChatBadge = document.getElementById("directChatUnreadBadge");
        const userId = getUserId();

        if (!userId) {
            hideUnreadBadge(floatingBadge);
            hideUnreadBadge(directChatBadge);
            return;
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
                hideUnreadBadge(floatingBadge);
                hideUnreadBadge(directChatBadge);
                return;
            }

            const unreadCount = Number(result.unreadCount || 0);

            updateUnreadBadge(floatingBadge, unreadCount);
            updateUnreadBadge(directChatBadge, unreadCount);

        } catch (error) {
            hideUnreadBadge(floatingBadge);
            hideUnreadBadge(directChatBadge);
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
            badge.style.display = "none";
        }
    }

    function hideUnreadBadge(badge) {
        if (!badge) {
            return;
        }

        badge.style.display = "none";
    }

    function getUserId() {
        return loggedInUser.userId || loggedInUser.id || localStorage.getItem("userId");
    }

    function getSeenKey(type) {
        return type + "CommunityLastSeenAt_" + getUserId();
    }

    function initializeCommunitySeenTimes() {
        const userId = getUserId();

        if (!userId) {
            return;
        }

        const now = new Date().toISOString();

        if (!localStorage.getItem(getSeenKey("common"))) {
            localStorage.setItem(getSeenKey("common"), now);
        }

        if (!localStorage.getItem(getSeenKey("local"))) {
            localStorage.setItem(getSeenKey("local"), now);
        }
    }

    async function loadAllFloatingUnreadCounts() {
        await loadDirectChatUnreadCount();
        await loadCommonCommunityUnreadCount();
        await loadLocalCommunityUnreadCount();
    }

    async function loadDirectChatUnreadCount() {
        const floatingBadge = document.getElementById("floatingChatUnreadBadge");
        const directChatBadge = document.getElementById("directChatUnreadBadge");
        const userId = getUserId();

        if (!userId) {
            hideUnreadBadge(floatingBadge);
            hideUnreadBadge(directChatBadge);
            return;
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
                hideUnreadBadge(floatingBadge);
                hideUnreadBadge(directChatBadge);
                return;
            }

            const unreadCount = Number(result.unreadCount || 0);

            updateUnreadBadge(floatingBadge, unreadCount);
            updateUnreadBadge(directChatBadge, unreadCount);

        } catch (error) {
            hideUnreadBadge(floatingBadge);
            hideUnreadBadge(directChatBadge);
        }
    }

    async function loadCommonCommunityUnreadCount() {
        const badge = document.getElementById("commonCommunityUnreadBadge");
        const userId = getUserId();
        const lastSeenAt = localStorage.getItem(getSeenKey("common"));

        if (!userId || !lastSeenAt) {
            hideUnreadBadge(badge);
            return;
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
                return;
            }

            updateUnreadBadge(badge, Number(result.unreadCount || 0));

        } catch (error) {
            hideUnreadBadge(badge);
        }
    }

    async function loadLocalCommunityUnreadCount() {
        const badge = document.getElementById("localCommunityUnreadBadge");
        const userId = getUserId();
        const lastSeenAt = localStorage.getItem(getSeenKey("local"));

        if (!userId || !lastSeenAt) {
            hideUnreadBadge(badge);
            return;
        }

        try {
            const response = await fetch(
                "http://localhost:8081/api/community-chat/local/unread-count/"
                + encodeURIComponent(userId)
                + "?lastSeenAt="
                + encodeURIComponent(lastSeenAt)
                + "&time="
                + Date.now()
            );

            const result = await response.json();

            if (!response.ok) {
                hideUnreadBadge(badge);
                return;
            }

            updateUnreadBadge(badge, Number(result.unreadCount || 0));

        } catch (error) {
            hideUnreadBadge(badge);
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
            badge.style.display = "none";
        }
    }

    function hideUnreadBadge(badge) {
        if (!badge) {
            return;
        }

        badge.style.display = "none";
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
})();