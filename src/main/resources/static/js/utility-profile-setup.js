const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

const descoThanas = [
    "Uttara East", "Uttara West", "Dakshinkhan", "Uttarkhan", "Khilkhet",
    "Turag", "Gulshan", "Banani", "Badda", "Baridhara", "Mirpur",
    "Pallabi", "Rupnagar", "Shah Ali", "Kafrul", "Darus Salam",
    "Agargaon", "Sher-e-Bangla Nagar", "Cantonment"
];

const dpdcThanas = [
    "Ramna", "Shahbagh", "Dhanmondi", "Kalabagan", "New Market",
    "Hazaribagh", "Lalbagh", "Chawkbazar", "Kotwali", "Sutrapur",
    "Wari", "Gendaria", "Bangshal", "Motijheel", "Paltan", "Shyampur",
    "Kadamtali", "Jatrabari", "Demra", "Kamrangirchar", "Khilgaon",
    "Sabujbagh", "Mugda"
];

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    setupLogout();
    setupEvents();
    loadUtilityProfile();
});

function setupEvents() {
    document.getElementById("provider").addEventListener("change", handleProviderChange);

    document.getElementById("utilityProfileForm").addEventListener("submit", function (event) {
        event.preventDefault();
        saveUtilityProfile();
    });
}

function handleProviderChange() {
    const provider = document.getElementById("provider").value;
    const cityInput = document.getElementById("cityCorporation");

    if (provider === "DESCO") {
        cityInput.value = "Dhaka North City Corporation";
        renderAllowedThanas(descoThanas);
        showMessage("utilityProfileMessage", "DESCO selected. DNCC thana areas loaded.", "success-text");
        return;
    }

    if (provider === "DPDC") {
        cityInput.value = "Dhaka South City Corporation";
        renderAllowedThanas(dpdcThanas);
        showMessage("utilityProfileMessage", "DPDC selected. DSCC thana areas loaded.", "success-text");
        return;
    }

    if (provider === "BPDB" || provider === "PALLI_BIDYUT") {
        cityInput.value = "Not Available";
        renderAllowedThanas([]);
        showMessage("utilityProfileMessage", "System is currently available only for Dhaka city corporation areas under DPDC and DESCO.", "error-text");
        return;
    }

    cityInput.value = "";
    renderAllowedThanas([]);
}

function renderAllowedThanas(thanas) {
    const box = document.getElementById("allowedThanaList");

    if (!thanas || thanas.length === 0) {
        box.innerHTML = `<p class="muted-text">No thana list available.</p>`;
        return;
    }

    box.innerHTML = "";

    thanas.forEach(function (thana) {
        const chip = document.createElement("span");
        chip.className = "thana-chip";
        chip.innerText = thana;
        box.appendChild(chip);
    });
}

async function loadUtilityProfile() {
    const userId = loggedInUser.userId || localStorage.getItem("userId");

    try {
        const response = await fetch("http://localhost:8081/api/utility/profile/user/" + userId);
        const profile = await response.json();

        if (response.ok) {
            document.getElementById("provider").value = profile.provider || "";
            document.getElementById("officerName").value = profile.officerName || "";
            document.getElementById("employeeId").value = profile.employeeId || "";
            document.getElementById("officialPhone").value = profile.officialPhone || "";
            document.getElementById("officeAddress").value = profile.officeAddress || "";
            document.getElementById("serviceZone").value = profile.serviceZone || "";

            handleProviderChange();
            showMessage("utilityProfileMessage", "Utility profile loaded.", "success-text");
        }

    } catch (error) {
        showMessage("utilityProfileMessage", "Create your utility profile first.", "error-text");
    }
}

async function saveUtilityProfile() {
    const provider = document.getElementById("provider").value;

    if (provider === "BPDB" || provider === "PALLI_BIDYUT") {
        showMessage("utilityProfileMessage", "System is currently available only for Dhaka city corporation areas under DPDC and DESCO.", "error-text");
        return;
    }

    const data = {
        userId: Number(loggedInUser.userId || localStorage.getItem("userId")),
        provider: provider,
        officerName: document.getElementById("officerName").value.trim(),
        employeeId: document.getElementById("employeeId").value.trim(),
        officialPhone: document.getElementById("officialPhone").value.trim(),
        officeAddress: document.getElementById("officeAddress").value.trim(),
        serviceZone: document.getElementById("serviceZone").value.trim()
    };

    try {
        const response = await fetch("http://localhost:8081/api/utility/profile", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            showMessage("utilityProfileMessage", "Utility profile saved successfully.", "success-text");

            setTimeout(function () {
                window.location.href = "utility-outage-management.html";
            }, 800);
        } else {
            showMessage("utilityProfileMessage", getErrorMessage(result), "error-text");
        }

    } catch (error) {
        showMessage("utilityProfileMessage", "Server connection failed while saving utility profile.", "error-text");
    }
}

function showMessage(id, message, className) {
    const element = document.getElementById(id);
    element.className = className;
    element.innerText = message;
}

function getErrorMessage(result) {
    if (result.message) {
        return result.message;
    }

    if (result.messages) {
        return JSON.stringify(result.messages);
    }

    return "Request failed.";
}

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            localStorage.clear();
        });
    }
}