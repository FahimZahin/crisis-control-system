const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    loadProfileData();
    setupProfileSave();
    setupPasswordChange();
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

function setupProfileSave() {
    document.getElementById("saveProfileBtn").addEventListener("click", function () {
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

function setupDeleteProfile() {
    document.getElementById("deleteProfileBtn").addEventListener("click", function () {
        const confirmed = confirm("Are you sure you want to delete/clear this profile preview?");

        if (!confirmed) {
            return;
        }

        localStorage.removeItem("loggedInUser");
        localStorage.removeItem("userId");
        localStorage.removeItem("fullName");
        localStorage.removeItem("phoneNumber");
        localStorage.removeItem("address");
        localStorage.removeItem("role");
        localStorage.removeItem("status");
        localStorage.removeItem("drivingLicenseNumber");
        localStorage.removeItem("vehicleProfilePreview");

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