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
    setInputValueIfExists(
        "profileUserId",
        loggedInUser.userId || loggedInUser.id || localStorage.getItem("userId") || ""
    );

    setInputValueIfExists(
        "profileFullName",
        loggedInUser.fullName || localStorage.getItem("fullName") || ""
    );

    setInputValueIfExists(
        "profilePhoneNumber",
        loggedInUser.phoneNumber || localStorage.getItem("phoneNumber") || ""
    );

    setInputValueIfExists(
        "profileRole",
        loggedInUser.role || localStorage.getItem("role") || ""
    );

    setInputValueIfExists(
        "profileStatus",
        loggedInUser.status || localStorage.getItem("status") || "ACTIVE"
    );

    setInputValueIfExists(
        "profileAddress",
        loggedInUser.address || localStorage.getItem("address") || ""
    );

    const resolvedThana = resolveUserThana();

    setupProfileThanaVisibility();
}

function setupProfileThanaVisibility() {
    const role = loggedInUser.role || localStorage.getItem("role") || "";
    const thanaSection = document.getElementById("profileThanaSection");

    if (!thanaSection) {
        return;
    }

    if (
        role === "PUMP_AUTHORITY" ||
        role === "BUILDING_MANAGER" ||
        role === "HOSPITAL_AUTHORITY"
    ) {
        const resolvedThana = resolveUserThana();

        thanaSection.classList.remove("hidden-section");
        setInputValueIfExists("buildingUnderThana", resolvedThana);
        setInputValueIfExists("profileThana", resolvedThana);
        setInputValueIfExists("thanaOrUpazila", resolvedThana);
    } else {
        thanaSection.classList.add("hidden-section");
        setInputValueIfExists("buildingUnderThana", "");
        setInputValueIfExists("profileThana", "");
        setInputValueIfExists("thanaOrUpazila", "");
    }
}

function resolveUserThana() {
    return firstValidValue(
        loggedInUser.thanaOrUpazila,
        loggedInUser.buildingUnderThana,
        loggedInUser.hospitalUnderThana,
        loggedInUser.pumpUnderThana,
        loggedInUser.pumpThana,
        loggedInUser.serviceArea,
        loggedInUser.assignedArea,
        loggedInUser.district,
        localStorage.getItem("thanaOrUpazila"),
        localStorage.getItem("buildingUnderThana"),
        localStorage.getItem("hospitalUnderThana"),
        localStorage.getItem("pumpUnderThana"),
        localStorage.getItem("pumpThana"),
        localStorage.getItem("serviceArea"),
        localStorage.getItem("assignedArea"),
        localStorage.getItem("district")
    );
}

function setupInactiveAccountBox() {
    const status = loggedInUser.status || "ACTIVE";

    if (status === "INACTIVE") {
        document.getElementById("inactiveAccountBox").classList.remove("hidden-section");
    }
}

function setupProfileSave() {
    const saveProfileBtn = document.getElementById("saveProfileBtn");

    if (!saveProfileBtn) {
        return;
    }

    saveProfileBtn.addEventListener("click", async function () {
        if (loggedInUser.status === "INACTIVE") {
            showMessage("profileMessage", "Your account is deactivated. Apply for activation first.", "error-text");
            return;
        }

        const userId = getLoggedInUserId();

        if (!userId) {
            showMessage("profileMessage", "User ID not found. Please login again.", "error-text");
            return;
        }

        const fullName = document.getElementById("profileFullName").value.trim();
        const phoneNumber = document.getElementById("profilePhoneNumber").value.trim();
        const address = document.getElementById("profileAddress").value.trim();

        const role = loggedInUser.role || localStorage.getItem("role") || "";

        let thanaOrUpazila = "";

        if (
            role === "PUMP_AUTHORITY" ||
            role === "BUILDING_MANAGER" ||
            role === "HOSPITAL_AUTHORITY"
        ) {
            const thanaInput = document.getElementById("buildingUnderThana");

            if (thanaInput) {
                thanaOrUpazila = thanaInput.value.trim();
            }
        }

        if (!fullName) {
            showMessage("profileMessage", "Full name is required.", "error-text");
            return;
        }

        if (!phoneNumber.match(/^[0-9]{11}$/)) {
            showMessage("profileMessage", "Phone number must be exactly 11 digits.", "error-text");
            return;
        }

        const data = {
            fullName: fullName,
            phoneNumber: phoneNumber,
            address: address,
            thanaOrUpazila: thanaOrUpazila
        };

        try {
            showMessage("profileMessage", "Saving profile to database...", "muted-text");

            const response = await fetch("http://localhost:8081/api/users/" + userId + "/profile", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            });

            let result = {};

            try {
                result = await response.json();
            } catch (error) {
                result = {};
            }

            if (!response.ok) {
                showMessage(
                    "profileMessage",
                    result.message || result.error || "Profile update failed.",
                    "error-text"
                );
                return;
            }

            loggedInUser.fullName = result.fullName || fullName;
            loggedInUser.phoneNumber = result.phoneNumber || phoneNumber;
            loggedInUser.address = result.address || address;
            loggedInUser.status = result.status || loggedInUser.status;
            loggedInUser.role = result.role || loggedInUser.role;

            if (result.thanaOrUpazila) {
                loggedInUser.thanaOrUpazila = result.thanaOrUpazila;
            }

            if (result.buildingUnderThana) {
                loggedInUser.buildingUnderThana = result.buildingUnderThana;
            }

            if (result.hospitalUnderThana) {
                loggedInUser.hospitalUnderThana = result.hospitalUnderThana;
            }

            if (result.serviceArea) {
                loggedInUser.serviceArea = result.serviceArea;
            }

            if (result.assignedArea) {
                loggedInUser.assignedArea = result.assignedArea;
            }

            if (result.district) {
                loggedInUser.district = result.district;
            }

            localStorage.setItem("loggedInUser", JSON.stringify(loggedInUser));
            localStorage.setItem("fullName", loggedInUser.fullName || "");
            localStorage.setItem("phoneNumber", loggedInUser.phoneNumber || "");
            localStorage.setItem("address", loggedInUser.address || "");
            localStorage.setItem("status", loggedInUser.status || "");
            localStorage.setItem("role", loggedInUser.role || "");
            localStorage.setItem("thanaOrUpazila", loggedInUser.thanaOrUpazila || "");

            showMessage(
                "profileMessage",
                result.message || "Profile updated successfully in database.",
                "success-text"
            );

        } catch (error) {
            showMessage("profileMessage", "Server connection failed while updating profile.", "error-text");
        }
    });
}

function setupPasswordChange() {
    const changePasswordBtn = document.getElementById("changePasswordBtn");

    if (!changePasswordBtn) {
        return;
    }

    changePasswordBtn.addEventListener("click", async function () {
        if (loggedInUser.status === "INACTIVE") {
            showMessage("passwordMessage", "Your account is deactivated. Apply for activation first.", "error-text");
            return;
        }

        const currentPassword = document.getElementById("currentPassword").value.trim();
        const newPassword = document.getElementById("newPassword").value.trim();
        const confirmNewPassword = document.getElementById("confirmNewPassword").value.trim();

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            showMessage("passwordMessage", "Please fill all password fields.", "error-text");
            return;
        }

        if (newPassword !== confirmNewPassword) {
            showMessage("passwordMessage", "New password and confirm password do not match.", "error-text");
            return;
        }

        if (newPassword.length < 6) {
            showMessage("passwordMessage", "New password must be at least 6 characters.", "error-text");
            return;
        }

        const userId = getLoggedInUserId();

        if (!userId) {
            showMessage("passwordMessage", "User ID not found. Please login again.", "error-text");
            return;
        }

        const data = {
            userId: Number(userId),
            currentPassword: currentPassword,
            newPassword: newPassword,
            confirmNewPassword: confirmNewPassword
        };

        try {
            showMessage("passwordMessage", "Changing password...", "muted-text");

            const response = await fetch("http://localhost:8081/api/auth/change-password", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            });

            let result = {};

            try {
                result = await response.json();
            } catch (error) {
                result = {};
            }

            if (!response.ok) {
                showMessage(
                    "passwordMessage",
                    result.message || result.error || "Password change failed.",
                    "error-text"
                );
                return;
            }

            document.getElementById("currentPassword").value = "";
            document.getElementById("newPassword").value = "";
            document.getElementById("confirmNewPassword").value = "";

            showMessage(
                "passwordMessage",
                result.message || "Password changed successfully.",
                "success-text"
            );

        } catch (error) {
            showMessage("passwordMessage", "Server connection failed while changing password.", "error-text");
        }
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
            const response = await fetch("http://localhost:8081/api/users/" + getLoggedInUserId() + "/activation-request", {
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
    const deleteBtn = document.getElementById("deleteProfileBtn");

    if (!deleteBtn) {
        return;
    }

    deleteBtn.addEventListener("click", async function () {
        if (loggedInUser.status === "INACTIVE") {
            showMessage("deleteMessage", "Your account is deactivated. Apply for activation first.", "error-text");
            return;
        }

        const userId = getLoggedInUserId();

        if (!userId) {
            showMessage("deleteMessage", "User ID not found. Please login again.", "error-text");
            return;
        }

        const confirmed = confirm("Are you sure you want to delete this profile permanently from database?");

        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch("http://localhost:8081/api/users/" + userId, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json"
                }
            });

            let result = {};

            try {
                result = await response.json();
            } catch (error) {
                result = {};
            }

            if (response.ok) {
                localStorage.clear();

                showMessage(
                    "deleteMessage",
                    result.message || "Profile deleted successfully from database. Redirecting...",
                    "success-text"
                );

                setTimeout(function () {
                    window.location.href = "login.html";
                }, 1200);
            } else {
                showMessage(
                    "deleteMessage",
                    result.message || "Failed to delete profile from database.",
                    "error-text"
                );
            }

        } catch (error) {
            showMessage("deleteMessage", "Server connection failed while deleting profile.", "error-text");
        }
    });
}

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (!logoutBtn) {
        return;
    }

    logoutBtn.addEventListener("click", function () {
        localStorage.clear();
    });
}

function getLoggedInUserId() {
    return loggedInUser.userId || loggedInUser.id || localStorage.getItem("userId");
}

function setInputValueIfExists(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.value = value || "";
    }
}

function showMessage(id, text, className) {
    const message = document.getElementById(id);

    if (message) {
        message.className = className;
        message.innerText = text;
    }
}

function firstValidValue() {
    for (let i = 0; i < arguments.length; i++) {
        const value = arguments[i];

        if (
            value !== null &&
            value !== undefined &&
            String(value).trim() !== "" &&
            String(value).trim() !== "-" &&
            String(value).trim() !== "Not Provided" &&
            String(value).trim() !== "null" &&
            String(value).trim() !== "undefined"
        ) {
            return String(value).trim();
        }
    }

    return "";
}