(function () {
    const SCROLL_PREFIX = "ccs_scroll_position_";

    if ("scrollRestoration" in history) {
        history.scrollRestoration = "manual";
    }

    function getPageKey() {
        return SCROLL_PREFIX + window.location.pathname + window.location.search;
    }

    function saveScrollPosition() {
        sessionStorage.setItem(getPageKey(), String(window.scrollY || window.pageYOffset || 0));
    }

    function restoreScrollPosition() {
        const savedPosition = sessionStorage.getItem(getPageKey());

        if (savedPosition === null) {
            return;
        }

        const targetY = Number(savedPosition);

        if (Number.isNaN(targetY)) {
            return;
        }

        let attempts = 0;
        const maxAttempts = 20;

        const restoreInterval = setInterval(function () {
            window.scrollTo(0, targetY);
            attempts++;

            if (attempts >= maxAttempts) {
                clearInterval(restoreInterval);
            }
        }, 100);
    }

    document.addEventListener("click", function (event) {
        const link = event.target.closest("a");

        if (!link) {
            return;
        }

        const href = link.getAttribute("href");

        if (!href || href.startsWith("#") || href.startsWith("javascript:")) {
            return;
        }

        saveScrollPosition();
    });

    window.addEventListener("beforeunload", saveScrollPosition);

    window.addEventListener("pagehide", saveScrollPosition);

    window.addEventListener("pageshow", function () {
        restoreScrollPosition();
    });

    document.addEventListener("DOMContentLoaded", function () {
        restoreScrollPosition();
    });
})();