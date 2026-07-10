(function () {
    const originalFetch = window.fetch;

    window.fetch = function (url, options) {
        options = options || {};

        const urlText = String(url);

        const isApiRequest =
            urlText.includes("/api/") ||
            urlText.startsWith("http://localhost:8081/api/");

        const isAuthRequest =
            urlText.includes("/api/auth/login") ||
            urlText.includes("/api/auth/register");

        if (isApiRequest && !isAuthRequest) {
            const token =
                localStorage.getItem("authToken") ||
                getTokenFromLoggedInUser();

            options.headers = options.headers || {};

            if (token) {
                options.headers["Authorization"] = "Bearer " + token;
            }
        }

        return originalFetch(url, options);
    };

    function getTokenFromLoggedInUser() {
        try {
            const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
            return loggedInUser ? loggedInUser.token : null;
        } catch (error) {
            return null;
        }
    }
})();