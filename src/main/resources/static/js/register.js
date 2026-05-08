document.getElementById("registerForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const message = document.getElementById("message");

    const data = {
        fullName: document.getElementById("fullName").value,
        phoneNumber: document.getElementById("phoneNumber").value,
        drivingLicenseNumber: document.getElementById("drivingLicenseNumber").value,
        address: document.getElementById("address").value,
        password: document.getElementById("password").value,
        confirmPassword: document.getElementById("confirmPassword").value,
        role: document.getElementById("role").value
    };

    try {
        const response = await fetch("http://localhost:8081/api/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            message.className = "success-text";
            message.innerText = result.message + ". Please login now.";

            setTimeout(function () {
                window.location.href = "login.html";
            }, 1500);
        } else {
            message.className = "error-text";
            message.innerText = result.message || "Registration failed";
        }

    } catch (error) {
        message.className = "error-text";
        message.innerText = "Server connection failed";
    }
});