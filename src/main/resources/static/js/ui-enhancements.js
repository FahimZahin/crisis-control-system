/*
 * Crisis Control System UI Enhancements
 * Frontend-only helper: visual polish, meaningful emoji labels, active navigation, and responsive table wrapping.
 * This file does not change API calls, backend behavior, storage keys, or business logic.
 */
(function () {
    "use strict";

    const EMOJI_RULES = [
        [/crisis control system|crisis system|control system/i, "🛡️"],
        [/admin|administrator/i, "🧑‍💼"],
        [/dashboard/i, "📊"],
        [/\bhome\b/i, "🏠"],
        [/profile|account/i, "👤"],
        [/logout|sign out/i, "🚪"],
        [/notification|alert|warning/i, "🔔"],
        [/ai|assistant|bot|crisis assistant/i, "🤖"],
        [/fuel price|fuel limit|fuel settings|fuel setup|fuel policy|fuel requests?|emergency fuel|generator diesel|diesel support|petrol|octane|diesel|cng/i, "⛽"],
        [/hospital|icu|patient|medical/i, "🏥"],
        [/power outage|outage|utility|electricity|power/i, "⚡"],
        [/emergency vehicle|emergency authority|emergency|rescue/i, "🚨"],
        [/vehicle|driving|route planning/i, "🚗"],
        [/pump stock|stock management|current stock|fuel stock|inventory/i, "📦"],
        [/pump|station/i, "⛽"],
        [/route token|route tokens|route/i, "🧭"],
        [/building|flat|generator/i, "🏢"],
        [/users?|registered|citizen/i, "👥"],
        [/phone|mobile|contact/i, "☎️"],
        [/payment|penalty|fund|ledger|billing/i, "💳"],
        [/complaint|evidence|review|issue/i, "📝"],
        [/chat|message|community|conversation/i, "💬"],
        [/report|reports|audit|log|summary|analytics|history|details/i, "📈"],
        [/law|rule|legal|policy/i, "⚖️"],
        [/government|department/i, "🏛️"],
        [/local|thana|district|area|location/i, "📍"],
        [/setting|setup|configuration|management|manage/i, "⚙️"],
        [/approval|approve|pending|rejected|collected|status|verification/i, "✅"],
        [/feature|features|module|modules/i, "🧩"],
        [/request|action|quick/i, "⚡"]
    ];

    const SKIP_CLASSES = [
        "navbar-notification-link",
        "navbar-notification-badge",
        "floating-chat-unread-badge",
        "direct-chat-unread-badge",
        "chat-option-unread-badge",
        "status-badge",
        "role-badge",
        "table-role-badge",
        "collection-code",
        "outage-status-badge",
        "emergency-source-badge",
        "normal-source-badge",
        "live-countdown",
        "countdown-finished"
    ];

    function textOf(element) {
        return (element.textContent || "").replace(/\s+/g, " ").trim();
    }

    function hasEmoji(text) {
        return /\p{Extended_Pictographic}/u.test(text.slice(0, 8));
    }

    function shouldSkip(element) {
        if (!element) return true;
        if (SKIP_CLASSES.some((className) => element.classList && element.classList.contains(className))) return true;
        if (element.closest && element.closest(".summary-card, .navbar-notification-link, .navbar-notification-badge, .status-badge, .role-badge, table")) return true;

        const text = textOf(element);
        if (!text || text.length < 3 || hasEmoji(text)) return true;
        if (/^[0-9.,:%\-+/()\s]+$/.test(text)) return true;

        return false;
    }

    function resolveEmoji(text) {
        for (const [pattern, emoji] of EMOJI_RULES) {
            if (pattern.test(text)) return emoji;
        }
        return null;
    }

    function decorateElement(element) {
        if (shouldSkip(element)) return;

        const text = textOf(element);
        const emoji = resolveEmoji(text);

        // No fallback emoji. Unknown labels stay clean and unmodified.
        const sparkleEmoji = String.fromCodePoint(0x2728);
        if (!emoji || emoji === sparkleEmoji) {
            element.classList.remove("ui-emoji-label");
            delete element.dataset.uiEmoji;
            return;
        }

        element.dataset.uiEmoji = emoji;
        element.classList.add("ui-emoji-label");
    }

    function cleanupOldSparkles() {
        const sparkleEmoji = String.fromCodePoint(0x2728);
        document.querySelectorAll('.ui-emoji-label').forEach((element) => {
            if (element.dataset.uiEmoji === sparkleEmoji) {
                element.classList.remove("ui-emoji-label");
                delete element.dataset.uiEmoji;
            }
        });
    }

    function enhanceEmojiLabels() {
        const selectors = [
            ".logo",
            ".navbar a:not(.navbar-notification-link)",
            "h1",
            "h2",
            ".feature-preview-card h3",
            ".feature-card h3",
            ".action-card h3",
            ".report-link-card h3",
            ".role-dashboard-section > h3",
            ".card-title-row h3",
            ".card-title-row h2",
            ".tab-button",
            ".assistant-question-chip"
        ];

        document.querySelectorAll(selectors.join(",")).forEach(decorateElement);
    }

    function markActiveNavigation() {
        const currentPage = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
        document.querySelectorAll(".navbar a[href]").forEach((link) => {
            const href = (link.getAttribute("href") || "").split("?")[0].split("#")[0].toLowerCase();
            if (href && href === currentPage) {
                link.classList.add("active-nav-link");
                link.setAttribute("aria-current", "page");
            }
        });
    }

    function enhanceTables() {
        document.querySelectorAll("table").forEach((table) => {
            if (!table.parentElement || table.parentElement.classList.contains("table-wrapper")) return;

            const wrapper = document.createElement("div");
            wrapper.className = "table-wrapper ui-auto-table-wrapper";
            table.parentElement.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        });
    }

    function cssEscape(value) {
        if (window.CSS && typeof window.CSS.escape === "function") {
            return window.CSS.escape(value);
        }
        return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
    }

    function enhanceForms() {
        document.querySelectorAll("input, select, textarea").forEach((field) => {
            if (!field.id || field.getAttribute("aria-label") || field.getAttribute("aria-labelledby")) return;
            const label = document.querySelector(`label[for="${cssEscape(field.id)}"]`);
            if (label) field.setAttribute("aria-label", textOf(label));
        });
    }

    function enhanceCardClasses() {
        document.querySelectorAll(".feature-preview-card, .action-card, .report-link-card, .summary-card, .profile-card, .fuel-stock-card").forEach((card) => {
            card.classList.add("ui-modern-card");
        });
    }

    function runEnhancements() {
        document.body.classList.add("ccs-ui-enhanced");
        cleanupOldSparkles();
        enhanceEmojiLabels();
        markActiveNavigation();
        enhanceTables();
        enhanceForms();
        enhanceCardClasses();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", runEnhancements);
    } else {
        runEnhancements();
    }
})();
