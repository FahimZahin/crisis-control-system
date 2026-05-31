(function () {
    const STORAGE_PREFIX = "ccs_scroll_";
    const RESTORE_FLAG = "ccs_should_restore_scroll";

    if ("scrollRestoration" in history) {
        history.scrollRestoration = "manual";
    }

    function getPageKey() {
        return STORAGE_PREFIX + window.location.pathname + window.location.search;
    }

    function getScrollY() {
        return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    }

    function saveScrollPosition() {
        const y = getScrollY();

        sessionStorage.setItem(getPageKey(), String(y));

        try {
            const state = Object.assign({}, history.state || {});
            state.ccsScrollY = y;
            history.replaceState(state, document.title, window.location.href);
        } catch (error) {
            // ignore
        }
    }

    function getSavedScrollPosition() {
        if (history.state && history.state.ccsScrollY !== undefined) {
            const stateY = Number(history.state.ccsScrollY);

            if (!Number.isNaN(stateY)) {
                return stateY;
            }
        }

        const saved = sessionStorage.getItem(getPageKey());

        if (saved === null) {
            return null;
        }

        const y = Number(saved);

        if (Number.isNaN(y)) {
            return null;
        }

        return y;
    }

    function isBackForwardNavigation() {
        const entries = performance.getEntriesByType("navigation");

        if (entries && entries.length > 0) {
            return entries[0].type === "back_forward";
        }

        if (performance.navigation) {
            return performance.navigation.type === 2;
        }

        return sessionStorage.getItem(RESTORE_FLAG) === "true";
    }

    function shouldRestore() {
        return isBackForwardNavigation() || sessionStorage.getItem(RESTORE_FLAG) === "true";
    }

    function restoreScrollPosition() {
        if (!shouldRestore()) {
            return;
        }

        const targetY = getSavedScrollPosition();

        if (targetY === null) {
            return;
        }

        let attempts = 0;
        const maxAttempts = 40;

        function tryRestore() {
            window.scrollTo(0, targetY);
            document.documentElement.scrollTop = targetY;
            document.body.scrollTop = targetY;

            attempts++;

            if (attempts < maxAttempts) {
                requestAnimationFrame(tryRestore);
            } else {
                sessionStorage.removeItem(RESTORE_FLAG);
            }
        }

        requestAnimationFrame(tryRestore);
    }

    let scrollTimer = null;

    window.addEventListener("scroll", function () {
        if (scrollTimer) {
            clearTimeout(scrollTimer);
        }

        scrollTimer = setTimeout(saveScrollPosition, 80);
    }, { passive: true });

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
        sessionStorage.setItem(RESTORE_FLAG, "true");
    }, true);

    window.addEventListener("beforeunload", function () {
        saveScrollPosition();
        sessionStorage.setItem(RESTORE_FLAG, "true");
    });

    window.addEventListener("pagehide", function () {
        saveScrollPosition();
        sessionStorage.setItem(RESTORE_FLAG, "true");
    });

    window.addEventListener("pageshow", function () {
        restoreScrollPosition();
    });

    document.addEventListener("DOMContentLoaded", function () {
        restoreScrollPosition();

        const observer = new MutationObserver(function () {
            restoreScrollPosition();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(function () {
            observer.disconnect();
            restoreScrollPosition();
        }, 5000);
    });

    window.addEventListener("load", function () {
        restoreScrollPosition();
    });

    window.ccsRestoreScrollPosition = restoreScrollPosition;
    window.ccsSaveScrollPosition = saveScrollPosition;
})();