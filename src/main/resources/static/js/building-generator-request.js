let loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    if (loggedInUser.role !== "BUILDING_MANAGER") {
        alert("Only Building Manager can access this page.");
        window.location.href = "dashboard.html";
        return;
    }

    setupLogout();
    fillBuildingData();
    setupFormEvents();
});

function setupFormEvents() {
    const form = document.getElementById("buildingGeneratorRequestForm");
    form.addEventListener("submit", function (event) {
        event.preventDefault();
        submitBuildingGeneratorRequest();
    });

    document.getElementById("outageSituation").addEventListener("change", generateRequestReason);
    document.getElementById("requiredDieselLiter").addEventListener("input", generateRequestReason);
    document.getElementById("contactNumber").addEventListener("input", generateRequestReason);
}

function fillBuildingData() {
    setTextIfExists("buildingNameSummary", loggedInUser.buildingName || "Not Provided");
    setTextIfExists("generatorPowerSummary", loggedInUser.generatorPower || "Not Provided");
    setTextIfExists("buildingThanaSummary", loggedInUser.buildingUnderThana || "Not Provided");
    setTextIfExists("numberOfFlatsSummary", loggedInUser.numberOfFlats || "Not Provided");

    setTextIfExists("buildingNameInfo", loggedInUser.buildingName || "Not Provided");
    setTextIfExists("holdingNumberInfo", loggedInUser.holdingNumber || "Not Provided");
    setTextIfExists("generatorPowerInfo", loggedInUser.generatorPower || "Not Provided");
    setTextIfExists("numberOfFlatsInfo", loggedInUser.numberOfFlats || "Not Provided");

    const contactInput = document.getElementById("contactNumber");
    if (contactInput && !contactInput.value) {
        contactInput.value = loggedInUser.phoneNumber || "";
    }
}

function generateRequestReason() {
    const situation = getValue("outageSituation");
    const diesel = getValue("requiredDieselLiter");
    const contact = getValue("contactNumber");

    if (!situation) {
        setTextAreaValue("generatedReasonPreview", "");
        return;
    }

    const situationLabel = {
        "ONGOING_OUTAGE": "ongoing outage in building thana",
        "SCHEDULED_OUTAGE": "scheduled outage announced",
        "PRECAUTIONARY_REFILL": "precautionary diesel refill"
    }[situation] || situation;

    let message = "Building Generator Diesel Request.\n";
    message += "Building: " + (loggedInUser.buildingName || "-") + ".\n";
    message += "Holding Number: " + (loggedInUser.holdingNumber || "-") + ".\n";
    message += "Generator Power: " + (loggedInUser.generatorPower || "-") + ".\n";
    message += "Number of Flats: " + (loggedInUser.numberOfFlats || "-") + ".\n";
    message += "Situation: " + situationLabel + ".\n";
    if (diesel) {
        message += "Diesel Required: " + diesel + " L.\n";
    }
    if (contact) {
        message += "Contact: " + contact + ".";
    }

    setTextAreaValue("generatedReasonPreview", message.trim());
}

async function submitBuildingGeneratorRequest() {
    const userId = loggedInUser.userId || localStorage.getItem("userId");

    if (!userId) {
        showMessage("User ID not found. Please login again.", "error-text");
        return;
    }

    const outageSituation = getValue("outageSituation");
    const requiredDieselLiter = getValue("requiredDieselLiter");
    const contactNumber = getValue("contactNumber");

    if (!outageSituation) {
        showMessage("Please select the outage situation.", "error-text");
        return;
    }

    if (!requiredDieselLiter || parseFloat(requiredDieselLiter) < 1) {
        showMessage("Required diesel liter must be at least 1.", "error-text");
        return;
    }

    if (!contactNumber) {
        showMessage("Contact number is required.", "error-text");
        return;
    }

    const generatedReason = getValue("generatedReasonPreview") || "";

    const confirmed = confirm(
        "Confirm Building Generator Diesel Request?\n\n" +
        "Building: " + (loggedInUser.buildingName || "-") + "\n" +
        "Generator Power: " + (loggedInUser.generatorPower || "-") + "\n" +
        "Diesel Required: " + requiredDieselLiter + " L\n" +
        "Contact: " + contactNumber + "\n\n" +
        "Note: Building generator requests require admin approval."
    );

    if (!confirmed) {
        return;
    }

    const btn = document.getElementById("submitBuildingGeneratorRequestBtn");
    if (btn) btn.disabled = true;

    const requestData = {
        userId: parseInt(userId),
        buildingName: loggedInUser.buildingName || "",
        buildingGeneratorPower: loggedInUser.generatorPower || "",
        requiredDieselLiter: parseFloat(requiredDieselLiter),
        reason: generatedReason || outageSituation,
        contactNumber: contactNumber
    };

    try {
        const response = await fetch("http://localhost:8081/api/building-generator-fuel-requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestData)
        });

        const data = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(data), "error-text");
            if (btn) btn.disabled = false;
            return;
        }

        showMessage("Generator diesel request submitted. Status: PENDING (requires admin approval).", "success-text");
        document.getElementById("buildingGeneratorRequestForm").reset();
        fillBuildingData();

    } catch (error) {
        showMessage("Server connection failed. Please try again.", "error-text");
    }

    if (btn) btn.disabled = false;
}

function setupLogout() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", function (event) {
            event.preventDefault();
            localStorage.clear();
            window.location.href = "login.html";
        });
    }
}

function setTextIfExists(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
}

function setTextAreaValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

function getValue(id) {
    const el = document.getElementById(id);
    if (!el) return "";
    return el.value ? el.value.trim() : "";
}

function showMessage(text, cssClass) {
    const el = document.getElementById("buildingGeneratorRequestMessage");
    if (el) {
        el.innerText = text;
        el.className = cssClass || "";
    }
}

function getErrorMessage(data) {
    if (data && data.message) return data.message;
    if (data && data.error) return data.error;
    return "An error occurred.";
}