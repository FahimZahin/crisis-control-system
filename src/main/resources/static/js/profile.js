const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    loadProfileData();
    setupInactiveAccountBox();
    setupProfileSave();
    setupPasswordChange();
    setupActivationRequest();
    setupDeleteProfile();
    setupLogout();
});

function loadProfileData() {
    document.getElementById("profileUserId").value = loggedInUser.userId || "";
    document.getElementById("profileFullName").value = loggedInUser.fullName || "";
    document.getElementById("profilePhoneNumber").value = loggedInUser.phoneNumber || "";
    document.getElementById("profileRole").value = loggedInUser.role || "";
    document.getElementById("profileStatus").value = loggedInUser.status || "ACTIVE";
    document.getElementById("profileAddress").value = loggedInUser.address || "";
}

function setupInactiveAccountBox() {
    const status = loggedInUser.status || "ACTIVE";

    if (status === "INACTIVE") {
        document.getElementById("inactiveAccountBox").classList.remove("hidden-section");
    }
}

function setupProfileSave() {
    document.getElementById("saveProfileBtn").addEventListener("click", function () {
        if (loggedInUser.status === "INACTIVE") {
            showMessage("profileMessage", "Your account is deactivated. Apply for activation first.", "error-text");
            return;
        }

        loggedInUser.fullName = document.getElementById("profileFullName").value;
        loggedInUser.phoneNumber = document.getElementById("profilePhoneNumber").value;
        loggedInUser.address = document.getElementById("profileAddress").value;

        localStorage.setItem("loggedInUser", JSON.stringify(loggedInUser));
        localStorage.setItem("fullName", loggedInUser.fullName);
        localStorage.setItem("phoneNumber", loggedInUser.phoneNumber);
        localStorage.setItem("address", loggedInUser.address);

        showMessage("profileMessage", "Profile preview updated successfully.", "success-text");
    });
}

function setupPasswordChange() {
    document.getElementById("changePasswordBtn").addEventListener("click", function () {
        if (loggedInUser.status === "INACTIVE") {
            showMessage("passwordMessage", "Your account is deactivated. Apply for activation first.", "error-text");
            return;
        }

        const currentPassword = document.getElementById("currentPassword").value;
        const newPassword = document.getElementById("newPassword").value;
        const confirmNewPassword = document.getElementById("confirmNewPassword").value;

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            showMessage("passwordMessage", "Please fill all password fields.", "error-text");
            return;
        }

        if (newPassword !== confirmNewPassword) {
            showMessage("passwordMessage", "New password and confirm password do not match.", "error-text");
            return;
        }

        showMessage("passwordMessage", "Password change preview successful. Database update will be added later.", "success-text");

        document.getElementById("currentPassword").value = "";
        document.getElementById("newPassword").value = "";
        document.getElementById("confirmNewPassword").value = "";
    });
}

function setupActivationRequest() {
    const button = document.getElementById("sendActivationRequestBtn");

    if (!button) {
        return;
    }

    button.addEventListener("click", async function () {
        const reason = document.getElementById("activationReason").value.trim();

        if (!reason) {
            showMessage("activationRequestMessage", "Please write a reason for activation.", "error-text");
            return;
        }

        try {
            const response = await fetch("http://localhost:8081/api/users/" + loggedInUser.userId + "/activation-request", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ reason: reason })
            });

            const result = await response.json();

            if (response.ok) {
                showMessage("activationRequestMessage", result.message, "success-text");
                document.getElementById("activationReason").value = "";
            } else {
                showMessage("activationRequestMessage", result.message || "Activation request failed.", "error-text");
            }

        } catch (error) {
            showMessage("activationRequestMessage", "Server connection failed.", "error-text");
        }
    });
}

function setupDeleteProfile() {
    document.getElementById("deleteProfileBtn").addEventListener("click", function () {
        if (loggedInUser.status === "INACTIVE") {
            showMessage("deleteMessage", "Your account is deactivated. Apply for activation first.", "error-text");
            return;
        }

        const confirmed = confirm("Are you sure you want to delete/clear this profile preview?");

        if (!confirmed) {
            return;
        }

        localStorage.clear();

        showMessage("deleteMessage", "Profile preview cleared. Redirecting to login...", "success-text");

        setTimeout(function () {
            window.location.href = "login.html";
        }, 1200);
    });
}

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");

    logoutBtn.addEventListener("click", function () {
        localStorage.removeItem("loggedInUser");
        localStorage.removeItem("userId");
        localStorage.removeItem("fullName");
        localStorage.removeItem("phoneNumber");
        localStorage.removeItem("address");
        localStorage.removeItem("role");
        localStorage.removeItem("status");
        localStorage.removeItem("drivingLicenseNumber");
    });
}

function showMessage(id, text, className) {
    const message = document.getElementById(id);
    message.className = className;
    message.innerText = text;
}