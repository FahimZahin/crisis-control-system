(function () {
    const loggedInUser = getLoggedInUser();

    document.addEventListener("DOMContentLoaded", function () {
        if (!loggedInUser || !loggedInUser.role) {
            return;
        }

        createFloatingChatButton();
        createFloatingChatPanel();
        setupFloatingChatEvents();
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
                    <div>
                        <h4>Direct Chat</h4>
                        <p>Message users, pumps, authorities and emergency roles.</p>
                    </div>
                </a>

                <a href="common-community-chat.html" class="floating-chat-option">
                    <div class="floating-chat-option-icon">🌐</div>
                    <div>
                        <h4>Common Community</h4>
                        <p>System-wide crisis discussion for all users. Coming in Priority 20C.</p>
                    </div>
                </a>

                <a href="local-community-chat.html" class="floating-chat-option">
                    <div class="floating-chat-option-icon">📍</div>
                    <div>
                         <h4>Local Community</h4>
                          <p>Your local thana group: ${escapeHtml(getUserThana())}.</p>
                     </div>
                </a>

                <button type="button" class="floating-chat-option disabled-floating-chat-option" id="aiAssistantPreviewBtn">
                    <div class="floating-chat-option-icon">🤖</div>
                    <div>
                        <h4>AI Crisis Assistant</h4>
                        <p>Ask about fuel availability, outage notices and route tokens. Coming in Priority 20E.</p>
                    </div>
                </button>
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




        if (aiPreviewBtn) {
            aiPreviewBtn.addEventListener("click", function () {
                alert("AI Crisis Assistant will be added in Priority 20E.");
            });
        }
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