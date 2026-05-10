document.getElementById("loginForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const message = document.getElementById("message");

    const data = {
        phoneNumber: document.getElementById("phoneNumber").value,
        password: document.getElementById("password").value
    };

    try {
        const response = await fetch("http://localhost:8081/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            localStorage.setItem("loggedInUser", JSON.stringify(result));

            localStorage.setItem("userId", result.userId);
            localStorage.setItem("fullName", result.fullName);
            localStorage.setItem("phoneNumber", result.phoneNumber || "");
            localStorage.setItem("address", result.address || "");
            localStorage.setItem("role", result.role);
            localStorage.setItem("status", result.status || "");
            localStorage.setItem("drivingLicenseNumber", result.drivingLicenseNumber || "");

            message.className = "success-text";
            message.innerText = result.message;

            setTimeout(function () {
                window.location.href = "dashboard.html";
            }, 1000);
        } else {
            message.className = "error-text";
            message.innerText = result.message || "Login failed";
        }

    } catch (error) {
        message.className = "error-text";
        message.innerText = "Server connection failed";
    }
});