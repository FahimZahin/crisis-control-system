(function () {
    const loggedInUser = getLoggedInUser();

    document.addEventListener("DOMContentLoaded", function () {
        if (!loggedInUser) {
            return;
        }

        loadNavbarNotificationCount();

        setInterval(loadNavbarNotificationCount, 30000);
    });

    function getLoggedInUser() {
        try {
            return JSON.parse(localStorage.getItem("loggedInUser")) || null;
        } catch (error) {
            return null;
        }
    }

    function getUserId() {
        return loggedInUser.userId || loggedInUser.id || localStorage.getItem("userId");
    }

    async function loadNavbarNotificationCount() {
        const badge = document.getElementById("navbarNotificationBadge");

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
                "http://localhost:8081/api/notifications/user/"
                + userId
                + "/unread-count?time="
                + Date.now()
            );

            const result = await response.json();

            if (!response.ok) {
                badge.style.display = "none";
                return;
            }

            const count = Number(result.count || result.unreadCount || result || 0);

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
})();