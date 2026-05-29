document.addEventListener("DOMContentLoaded", function () {
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || {};

    if (loggedInUser.role !== "ADMIN") {
        alert("Only admin can access building allocation setup.");
        window.location.href = "dashboard.html";
        return;
    }

    setupLogout();
    loadBuildingAllocations();
});

async function loadBuildingAllocations() {
    const tableBody = document.getElementById("buildingAllocationBody");

    tableBody.innerHTML = `
        <tr>
            <td colspan="12">Loading building allocations...</td>
        </tr>
    `;

    try {
        const response = await fetch("http://localhost:8081/api/admin/building-allocations");
        const buildings = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(buildings), "error-text");
            return;
        }

        document.getElementById("totalBuildings").innerText = buildings.length;
        renderBuildingAllocations(buildings);

    } catch (error) {
        showMessage("Server connection failed while loading building allocations.", "error-text");
        tableBody.innerHTML = `
            <tr>
                <td colspan="12">Server connection failed.</td>
            </tr>
        `;
    }
}

function renderBuildingAllocations(buildings) {
    const tableBody = document.getElementById("buildingAllocationBody");

    if (!buildings || buildings.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="12">No building manager found.</td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = "";

    buildings.forEach(function (building) {
        const row = document.createElement("tr");

        const allocationInputId = "allocationInput_" + building.userId;

        row.innerHTML = `
            <td>${valueOrDash(building.userId)}</td>
            <td>
                <strong>${valueOrDash(building.buildingName)}</strong><br>
                <small>Holding: ${valueOrDash(building.holdingNumber)}</small><br>
                <small>Thana: ${valueOrDash(building.buildingUnderThana)}</small>
            </td>
            <td>${valueOrDash(building.fullName)}</td>
            <td>${valueOrDash(building.phoneNumber)}</td>
            <td>${valueOrDash(building.numberOfFlats)}</td>
            <td>${formatNumber(building.generatorCapacityKva)}</td>
            <td>${formatNumber(building.requiredLoadKw)} kW</td>
            <td>${formatNumber(building.safeGeneratorCapacityKw)} kW</td>
            <td>${formatNumber(building.suggestedWeeklyAllocationLiter)} L/week</td>
            <td>
                <input type="number"
                       id="${allocationInputId}"
                       min="1"
                       step="0.01"
                       value="${formatNumber(building.currentWeeklyAllocationLiter)}">
            </td>
            <td>${getGeneratorWarning(building.generatorOverloadRisk)}</td>
            <td>
                <button class="btn primary small-btn" onclick="saveBuildingAllocation(${building.userId})">
                    Save
                </button>
                <button class="btn secondary small-btn" onclick="useSuggestedAllocation(${building.userId}, ${Number(building.suggestedWeeklyAllocationLiter || 0)})">
                    Use Suggested
                </button>
            </td>
        `;

        tableBody.appendChild(row);
    });
}

function useSuggestedAllocation(userId, suggestedValue) {
    const input = document.getElementById("allocationInput_" + userId);

    if (input) {
        input.value = formatNumber(suggestedValue);
    }
}

async function saveBuildingAllocation(userId) {
    const input = document.getElementById("allocationInput_" + userId);

    if (!input) {
        showMessage("Allocation input not found.", "error-text");
        return;
    }

    const weeklyAllocationLiter = Number(input.value);

    if (!weeklyAllocationLiter || weeklyAllocationLiter <= 0) {
        showMessage("Weekly allocation must be greater than 0.", "error-text");
        return;
    }

    const confirmed = confirm(
        "Save weekly diesel allocation?\n\n" +
        "Building User ID: " + userId + "\n" +
        "Allocation: " + weeklyAllocationLiter.toFixed(2) + " L/week"
    );

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch("http://localhost:8081/api/admin/building-allocations/" + userId, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                weeklyAllocationLiter: weeklyAllocationLiter
            })
        });

        const result = await response.json();

        if (!response.ok) {
            showMessage(getErrorMessage(result), "error-text");
            return;
        }

        showMessage(result.message || "Building allocation updated successfully.", "success-text");
        loadBuildingAllocations();

    } catch (error) {
        showMessage("Server connection failed while saving allocation.", "error-text");
    }
}

function getGeneratorWarning(generatorOverloadRisk) {
    if (generatorOverloadRisk) {
        return `<span class="status-badge status-rejected">OVERLOAD RISK</span>`;
    }

    return `<span class="status-badge status-approved">OK</span>`;
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

function showMessage(message, className) {
    const messageElement = document.getElementById("buildingAllocationMessage");

    if (messageElement) {
        messageElement.className = className;
        messageElement.innerText = message;
    }
}

function getErrorMessage(result) {
    if (!result) {
        return "Request failed.";
    }

    if (result.message) {
        return result.message;
    }

    if (result.messages) {
        return JSON.stringify(result.messages);
    }

    if (result.error) {
        return result.error;
    }

    return "Request failed.";
}

function valueOrDash(value) {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    return value;
}

function formatNumber(value) {
    const numberValue = Number(value);

    if (Number.isNaN(numberValue)) {
        return "0.00";
    }

    return numberValue.toFixed(2);
}