let ccsPumpGuardLoggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

document.addEventListener("DOMContentLoaded", function () {
    if (!ccsPumpGuardLoggedInUser || ccsPumpGuardLoggedInUser.role !== "PUMP_AUTHORITY") {
        return;
    }

    guardPumpOperationalPage();
});

async function guardPumpOperationalPage() {
    const currentPage = window.location.pathname.split("/").pop();

    const allowedWhenPenaltyLocked = [
        "pump-authority-dashboard.html",
        "pump-penalty-account.html",
        "public-law-book.html",
        "profile.html"
    ];

    const userId = getPumpGuardLoggedInUserId();

    if (!userId) {
        return;
    }

    try {
        const response = await fetch("http://localhost:8081/api/pumps/user/" + userId + "?time=" + Date.now());
        const pump = await response.json();

        if (!response.ok) {
            return;
        }

        if (pump.pumpStatus === "PENALTY_LOCKED" && !allowedWhenPenaltyLocked.includes(currentPage)) {
            alert("Your pump is penalty locked. Only Pump Penalty Account is available until you start penalty recovery.");
            window.location.href = "pump-penalty-account.html";
        }

    } catch (error) {
        console.log("Pump access guard failed.");
    }
}

function getPumpGuardLoggedInUserId() {
    return ccsPumpGuardLoggedInUser.userId
        || ccsPumpGuardLoggedInUser.id
        || localStorage.getItem("userId");
}