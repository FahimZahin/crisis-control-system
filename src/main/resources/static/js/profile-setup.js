document.getElementById("ownerName").value = localStorage.getItem("fullName") || "Demo User";
document.getElementById("ownerRole").value = localStorage.getItem("role") || "VEHICLE_OWNER";

const vehicleData = {
    BIKE: {
        "Yamaha": {
            "FZ-S FI": { cc: 149, mileage: 45, tankCapacity: 13 },
            "FZ-X": { cc: 149, mileage: 45, tankCapacity: 10 },
            "R15 V3": { cc: 155, mileage: 40, tankCapacity: 11 },
            "R15 V4": { cc: 155, mileage: 40, tankCapacity: 11 },
            "MT-15": { cc: 155, mileage: 40, tankCapacity: 10 },
            "Fazer FI": { cc: 149, mileage: 45, tankCapacity: 12 },
            "Saluto": { cc: 125, mileage: 60, tankCapacity: 7 },
            "SZ-RR": { cc: 149, mileage: 45, tankCapacity: 14 }
        },
        "Honda": {
            "CB Shine": { cc: 125, mileage: 55, tankCapacity: 10 },
            "CB Hornet 160R": { cc: 163, mileage: 45, tankCapacity: 12 },
            "Livo": { cc: 110, mileage: 60, tankCapacity: 9 },
            "XBlade": { cc: 163, mileage: 45, tankCapacity: 12 },
            "CB Trigger": { cc: 150, mileage: 45, tankCapacity: 12 },
            "Dio": { cc: 110, mileage: 50, tankCapacity: 5 },
            "Activa": { cc: 110, mileage: 50, tankCapacity: 5 },
            "Dream Neo": { cc: 110, mileage: 60, tankCapacity: 8 }
        },
        "Suzuki": {
            "Gixxer": { cc: 155, mileage: 45, tankCapacity: 12 },
            "Gixxer SF": { cc: 155, mileage: 45, tankCapacity: 12 },
            "GSX-R150": { cc: 150, mileage: 40, tankCapacity: 11 },
            "Hayate": { cc: 113, mileage: 55, tankCapacity: 10 },
            "Access 125": { cc: 125, mileage: 50, tankCapacity: 5 },
            "Burgman Street": { cc: 125, mileage: 45, tankCapacity: 6 },
            "Samurai": { cc: 150, mileage: 45, tankCapacity: 12 },
            "Lets": { cc: 113, mileage: 50, tankCapacity: 5 }
        },
        "Bajaj": {
            "Pulsar 150": { cc: 150, mileage: 45, tankCapacity: 15 },
            "Pulsar NS160": { cc: 160, mileage: 40, tankCapacity: 12 },
            "Pulsar NS200": { cc: 200, mileage: 35, tankCapacity: 12 },
            "Pulsar N160": { cc: 165, mileage: 40, tankCapacity: 14 },
            "Discover 125": { cc: 125, mileage: 60, tankCapacity: 10 },
            "Platina 100": { cc: 100, mileage: 70, tankCapacity: 11 },
            "Avenger Street 150": { cc: 150, mileage: 45, tankCapacity: 14 },
            "CT 100": { cc: 100, mileage: 70, tankCapacity: 10 }
        },
        "TVS": {
            "Apache RTR 160": { cc: 160, mileage: 45, tankCapacity: 12 },
            "Apache RTR 160 4V": { cc: 160, mileage: 40, tankCapacity: 12 },
            "Apache RTR 180": { cc: 180, mileage: 40, tankCapacity: 12 },
            "Apache RTR 200": { cc: 200, mileage: 35, tankCapacity: 12 },
            "Metro Plus": { cc: 110, mileage: 60, tankCapacity: 12 },
            "Stryker": { cc: 125, mileage: 55, tankCapacity: 14 },
            "Raider 125": { cc: 125, mileage: 55, tankCapacity: 10 },
            "Jupiter": { cc: 110, mileage: 50, tankCapacity: 5 }
        },
        "Hero": {
            "Splendor Plus": { cc: 100, mileage: 65, tankCapacity: 10 },
            "HF Deluxe": { cc: 100, mileage: 65, tankCapacity: 10 },
            "Glamour": { cc: 125, mileage: 55, tankCapacity: 10 },
            "Hunk": { cc: 150, mileage: 45, tankCapacity: 12 },
            "Thriller": { cc: 160, mileage: 40, tankCapacity: 12 },
            "Passion XPro": { cc: 110, mileage: 60, tankCapacity: 9 },
            "Pleasure": { cc: 110, mileage: 50, tankCapacity: 5 },
            "Maestro Edge": { cc: 110, mileage: 50, tankCapacity: 5 }
        },
        "Runner": {
            "Bullet 100": { cc: 100, mileage: 60, tankCapacity: 10 },
            "Bullet 125": { cc: 125, mileage: 55, tankCapacity: 12 },
            "Turbo 125": { cc: 125, mileage: 55, tankCapacity: 12 },
            "Knight Rider": { cc: 150, mileage: 40, tankCapacity: 12 },
            "Royal Plus": { cc: 110, mileage: 55, tankCapacity: 10 },
            "Scooty 110": { cc: 110, mileage: 50, tankCapacity: 5 },
            "AD80S": { cc: 80, mileage: 65, tankCapacity: 8 },
            "F100-6A": { cc: 100, mileage: 60, tankCapacity: 10 }
        },
        "Walton": {
            "Fusion": { cc: 125, mileage: 55, tankCapacity: 12 },
            "Xplore": { cc: 140, mileage: 50, tankCapacity: 12 },
            "Stylex": { cc: 100, mileage: 60, tankCapacity: 10 },
            "Ranger": { cc: 150, mileage: 45, tankCapacity: 12 },
            "Leo": { cc: 100, mileage: 60, tankCapacity: 10 },
            "Prizm": { cc: 110, mileage: 55, tankCapacity: 10 },
            "Takyon": { cc: 125, mileage: 55, tankCapacity: 12 },
            "Cruize": { cc: 100, mileage: 60, tankCapacity: 10 }
        },
        "Lifan": {
            "KPR 150": { cc: 150, mileage: 40, tankCapacity: 14 },
            "KPR 165": { cc: 165, mileage: 40, tankCapacity: 14 },
            "KPT 150": { cc: 150, mileage: 40, tankCapacity: 12 },
            "KP Mini": { cc: 150, mileage: 40, tankCapacity: 12 },
            "KP 150": { cc: 150, mileage: 40, tankCapacity: 12 },
            "X-Pect": { cc: 150, mileage: 40, tankCapacity: 12 },
            "Blink 125": { cc: 125, mileage: 50, tankCapacity: 10 }
        },
        "Keeway": {
            "RKS 100": { cc: 100, mileage: 60, tankCapacity: 12 },
            "RKS 125": { cc: 125, mileage: 55, tankCapacity: 12 },
            "RKS 150": { cc: 150, mileage: 45, tankCapacity: 12 },
            "RKF 125": { cc: 125, mileage: 50, tankCapacity: 10 },
            "K-Light": { cc: 150, mileage: 40, tankCapacity: 12 },
            "Superlight": { cc: 150, mileage: 40, tankCapacity: 15 },
            "TXM 150": { cc: 150, mileage: 40, tankCapacity: 12 }
        },
        "KTM": {
            "Duke 125": { cc: 125, mileage: 40, tankCapacity: 13 },
            "Duke 200": { cc: 200, mileage: 35, tankCapacity: 13 },
            "RC 125": { cc: 125, mileage: 40, tankCapacity: 10 },
            "RC 200": { cc: 200, mileage: 35, tankCapacity: 10 }
        },
        "Royal Enfield": {
            "Classic 350": { cc: 350, mileage: 35, tankCapacity: 13 },
            "Meteor 350": { cc: 350, mileage: 35, tankCapacity: 15 },
            "Hunter 350": { cc: 350, mileage: 35, tankCapacity: 13 },
            "Bullet 350": { cc: 350, mileage: 35, tankCapacity: 13 }
        }
    },

    CAR: {
        "Toyota": {
            "Corolla": { cc: 1800, mileage: 12, tankCapacity: 50 },
            "Corolla Axio": { cc: 1500, mileage: 16, tankCapacity: 42 },
            "Corolla Axio Hybrid": { cc: 1500, mileage: 24, tankCapacity: 42 },
            "Corolla Cross": { cc: 1800, mileage: 14, tankCapacity: 47 },
            "Corolla Cross Hybrid": { cc: 1800, mileage: 20, tankCapacity: 43 },
            "Premio": { cc: 1500, mileage: 14, tankCapacity: 60 },
            "Allion": { cc: 1500, mileage: 14, tankCapacity: 60 },
            "Aqua": { cc: 1500, mileage: 28, tankCapacity: 36 },
            "Prius": { cc: 1800, mileage: 25, tankCapacity: 43 },
            "Prius Alpha": { cc: 1800, mileage: 22, tankCapacity: 45 },
            "Noah": { cc: 2000, mileage: 11, tankCapacity: 55 },
            "Noah Hybrid": { cc: 1800, mileage: 18, tankCapacity: 50 },
            "Voxy": { cc: 2000, mileage: 11, tankCapacity: 55 },
            "Voxy Hybrid": { cc: 1800, mileage: 18, tankCapacity: 50 },
            "Esquire": { cc: 2000, mileage: 11, tankCapacity: 55 },
            "Probox": { cc: 1500, mileage: 14, tankCapacity: 50 },
            "Fielder": { cc: 1500, mileage: 16, tankCapacity: 42 },
            "Fielder Hybrid": { cc: 1500, mileage: 24, tankCapacity: 42 },
            "Harrier": { cc: 2000, mileage: 12, tankCapacity: 55 },
            "RAV4": { cc: 2000, mileage: 12, tankCapacity: 55 },
            "C-HR": { cc: 1800, mileage: 20, tankCapacity: 43 },
            "Land Cruiser Prado": { cc: 2700, mileage: 8, tankCapacity: 87 },
            "Hiace": { cc: 2700, mileage: 8, tankCapacity: 70 },
            "Camry": { cc: 2500, mileage: 12, tankCapacity: 60 },
            "Camry Hybrid": { cc: 2500, mileage: 20, tankCapacity: 50 },
            "Yaris": { cc: 1500, mileage: 16, tankCapacity: 42 }
        },
        "Honda": {
            "Civic": { cc: 1500, mileage: 13, tankCapacity: 47 },
            "Grace": { cc: 1500, mileage: 18, tankCapacity: 40 },
            "Grace Hybrid": { cc: 1500, mileage: 24, tankCapacity: 40 },
            "Vezel": { cc: 1500, mileage: 15, tankCapacity: 40 },
            "Vezel Hybrid": { cc: 1500, mileage: 22, tankCapacity: 40 },
            "Fit": { cc: 1300, mileage: 18, tankCapacity: 40 },
            "Fit Hybrid": { cc: 1500, mileage: 25, tankCapacity: 40 },
            "Accord": { cc: 2000, mileage: 12, tankCapacity: 56 },
            "Accord Hybrid": { cc: 2000, mileage: 20, tankCapacity: 48 },
            "CR-V": { cc: 1500, mileage: 12, tankCapacity: 57 },
            "Insight": { cc: 1500, mileage: 24, tankCapacity: 40 },
            "Freed": { cc: 1500, mileage: 16, tankCapacity: 42 },
            "Freed Hybrid": { cc: 1500, mileage: 22, tankCapacity: 36 },
            "Shuttle": { cc: 1500, mileage: 18, tankCapacity: 40 },
            "City": { cc: 1500, mileage: 15, tankCapacity: 40 },
            "HR-V": { cc: 1500, mileage: 15, tankCapacity: 40 }
        },
        "Nissan": {
            "X-Trail": { cc: 2000, mileage: 11, tankCapacity: 60 },
            "X-Trail Hybrid": { cc: 2000, mileage: 16, tankCapacity: 60 },
            "Bluebird Sylphy": { cc: 1500, mileage: 14, tankCapacity: 52 },
            "Note": { cc: 1200, mileage: 18, tankCapacity: 41 },
            "Note e-Power": { cc: 1200, mileage: 25, tankCapacity: 41 },
            "Sunny": { cc: 1500, mileage: 14, tankCapacity: 41 },
            "Tiida": { cc: 1500, mileage: 14, tankCapacity: 52 },
            "Juke": { cc: 1500, mileage: 13, tankCapacity: 46 },
            "March": { cc: 1200, mileage: 18, tankCapacity: 41 },
            "AD Van": { cc: 1500, mileage: 14, tankCapacity: 52 },
            "Serena": { cc: 2000, mileage: 10, tankCapacity: 60 },
            "Navara": { cc: 2500, mileage: 9, tankCapacity: 80 },
            "Leaf": { cc: 0, mileage: 0, tankCapacity: 0 }
        },
        "Mitsubishi": {
            "Pajero": { cc: 3000, mileage: 7, tankCapacity: 90 },
            "Pajero Sport": { cc: 2500, mileage: 9, tankCapacity: 68 },
            "Lancer": { cc: 1500, mileage: 13, tankCapacity: 50 },
            "Outlander": { cc: 2000, mileage: 11, tankCapacity: 63 },
            "Outlander PHEV": { cc: 2000, mileage: 18, tankCapacity: 45 },
            "Attrage": { cc: 1200, mileage: 18, tankCapacity: 42 },
            "Mirage": { cc: 1200, mileage: 18, tankCapacity: 35 },
            "Xpander": { cc: 1500, mileage: 12, tankCapacity: 45 },
            "L200": { cc: 2500, mileage: 9, tankCapacity: 75 },
            "ASX": { cc: 2000, mileage: 11, tankCapacity: 63 }
        },
        "Hyundai": {
            "Elantra": { cc: 1600, mileage: 13, tankCapacity: 50 },
            "Tucson": { cc: 2000, mileage: 10, tankCapacity: 62 },
            "Sonata": { cc: 2000, mileage: 11, tankCapacity: 60 },
            "Creta": { cc: 1500, mileage: 14, tankCapacity: 50 },
            "Santa Fe": { cc: 2200, mileage: 9, tankCapacity: 67 },
            "Accent": { cc: 1400, mileage: 14, tankCapacity: 43 },
            "i10": { cc: 1200, mileage: 18, tankCapacity: 35 },
            "i20": { cc: 1200, mileage: 17, tankCapacity: 37 },
            "Kona": { cc: 1600, mileage: 13, tankCapacity: 50 },
            "Venue": { cc: 1500, mileage: 14, tankCapacity: 45 },
            "H-1": { cc: 2500, mileage: 8, tankCapacity: 75 }
        },
        "Kia": {
            "Sportage": { cc: 2000, mileage: 10, tankCapacity: 62 },
            "Seltos": { cc: 1500, mileage: 14, tankCapacity: 50 },
            "Cerato": { cc: 1600, mileage: 13, tankCapacity: 50 },
            "Picanto": { cc: 1200, mileage: 18, tankCapacity: 35 },
            "Rio": { cc: 1400, mileage: 15, tankCapacity: 45 },
            "Sorento": { cc: 2200, mileage: 9, tankCapacity: 67 },
            "Carnival": { cc: 2200, mileage: 8, tankCapacity: 80 },
            "Stonic": { cc: 1400, mileage: 15, tankCapacity: 45 },
            "Optima": { cc: 2000, mileage: 11, tankCapacity: 60 }
        },
        "Suzuki": {
            "Swift": { cc: 1200, mileage: 18, tankCapacity: 37 },
            "WagonR": { cc: 1000, mileage: 20, tankCapacity: 32 },
            "Alto": { cc: 800, mileage: 20, tankCapacity: 35 },
            "Celerio": { cc: 1000, mileage: 20, tankCapacity: 35 },
            "Baleno": { cc: 1200, mileage: 18, tankCapacity: 37 },
            "Dzire": { cc: 1200, mileage: 18, tankCapacity: 37 },
            "Ertiga": { cc: 1500, mileage: 15, tankCapacity: 45 },
            "Vitara": { cc: 1600, mileage: 13, tankCapacity: 47 },
            "Jimny": { cc: 1500, mileage: 13, tankCapacity: 40 },
            "S-Presso": { cc: 1000, mileage: 20, tankCapacity: 27 },
            "Ciaz": { cc: 1500, mileage: 15, tankCapacity: 43 }
        },
        "Mazda": {
            "Axela": { cc: 1500, mileage: 14, tankCapacity: 51 },
            "Axela Hybrid": { cc: 2000, mileage: 20, tankCapacity: 51 },
            "Demio": { cc: 1300, mileage: 18, tankCapacity: 44 },
            "Atenza": { cc: 2000, mileage: 12, tankCapacity: 62 },
            "CX-3": { cc: 1500, mileage: 14, tankCapacity: 48 },
            "CX-5": { cc: 2000, mileage: 11, tankCapacity: 56 },
            "CX-7": { cc: 2300, mileage: 9, tankCapacity: 69 },
            "CX-8": { cc: 2200, mileage: 9, tankCapacity: 72 },
            "CX-9": { cc: 2500, mileage: 8, tankCapacity: 74 },
            "Premacy": { cc: 2000, mileage: 11, tankCapacity: 60 }
        },
        "BMW": {
            "3 Series": { cc: 2000, mileage: 10, tankCapacity: 59 },
            "5 Series": { cc: 2000, mileage: 9, tankCapacity: 68 },
            "7 Series": { cc: 3000, mileage: 7, tankCapacity: 78 },
            "X1": { cc: 1500, mileage: 11, tankCapacity: 51 },
            "X3": { cc: 2000, mileage: 9, tankCapacity: 65 },
            "X5": { cc: 3000, mileage: 7, tankCapacity: 83 },
            "X6": { cc: 3000, mileage: 7, tankCapacity: 83 }
        },
        "Mercedes-Benz": {
            "C-Class": { cc: 1500, mileage: 10, tankCapacity: 66 },
            "E-Class": { cc: 2000, mileage: 9, tankCapacity: 66 },
            "S-Class": { cc: 3000, mileage: 7, tankCapacity: 76 },
            "GLA": { cc: 1600, mileage: 10, tankCapacity: 50 },
            "GLC": { cc: 2000, mileage: 9, tankCapacity: 66 },
            "GLE": { cc: 3000, mileage: 7, tankCapacity: 85 },
            "CLA": { cc: 1600, mileage: 10, tankCapacity: 50 }
        }
    }
};

const fuelTypes = {
    BIKE: ["OCTANE", "PETROL"],
    CAR: ["OCTANE", "PETROL", "DIESEL", "CNG"]
};

const vehicleTypeSelect = document.getElementById("vehicleType");
const carCategorySection = document.getElementById("carCategorySection");
const carCategorySelect = document.getElementById("carCategory");
const brandSelect = document.getElementById("brand");
const modelSelect = document.getElementById("model");
const fuelTypeSelect = document.getElementById("fuelType");
const engineCcInput = document.getElementById("engineCc");
const mileageInput = document.getElementById("mileagePerLiter");
const tankCapacityInput = document.getElementById("tankCapacity");

vehicleTypeSelect.addEventListener("change", function () {
    const selectedType = this.value;

    resetDropdown(brandSelect, "Enter your vehicle brand");
    resetDropdown(modelSelect, "Enter your vehicle model");
    resetDropdown(fuelTypeSelect, "Select Fuel Type");
    clearAutoSpecs();

    if (selectedType === "CAR") {
        carCategorySection.style.display = "block";
        carCategorySelect.required = true;
    } else {
        carCategorySection.style.display = "none";
        carCategorySelect.required = false;
        carCategorySelect.value = "";
    }

    if (selectedType && vehicleData[selectedType]) {
        Object.keys(vehicleData[selectedType]).forEach(function (brand) {
            const option = document.createElement("option");
            option.value = brand;
            option.textContent = brand;
            brandSelect.appendChild(option);
        });
    }

    if (selectedType && fuelTypes[selectedType]) {
        fuelTypes[selectedType].forEach(function (fuel) {
            const option = document.createElement("option");
            option.value = fuel;
            option.textContent = fuel;
            fuelTypeSelect.appendChild(option);
        });
    }
});

brandSelect.addEventListener("change", function () {
    const selectedType = vehicleTypeSelect.value;
    const selectedBrand = this.value;

    resetDropdown(modelSelect, "Enter your vehicle model");
    clearAutoSpecs();

    if (selectedType && selectedBrand && vehicleData[selectedType][selectedBrand]) {
        Object.keys(vehicleData[selectedType][selectedBrand]).forEach(function (model) {
            const option = document.createElement("option");
            option.value = model;
            option.textContent = model;
            modelSelect.appendChild(option);
        });
    }
});

modelSelect.addEventListener("change", function () {
    const selectedType = vehicleTypeSelect.value;
    const selectedBrand = brandSelect.value;
    const selectedModel = this.value;

    clearAutoSpecs();

    if (
        selectedType &&
        selectedBrand &&
        selectedModel &&
        vehicleData[selectedType][selectedBrand][selectedModel]
    ) {
        const specs = vehicleData[selectedType][selectedBrand][selectedModel];

        engineCcInput.value = specs.cc;
        mileageInput.value = specs.mileage;
        tankCapacityInput.value = specs.tankCapacity;
    }
});

document.getElementById("vehiclePhoto").addEventListener("change", function () {
    const file = this.files[0];

    if (file) {
        const reader = new FileReader();

        reader.onload = function (event) {
            document.getElementById("vehiclePreview").src = event.target.result;
        };

        reader.readAsDataURL(file);
    }
});

document.getElementById("profileSetupForm").addEventListener("submit", function (event) {
    event.preventDefault();

    const vehicleType = document.getElementById("vehicleType").value;
    const carCategory = document.getElementById("carCategory").value;
    const brand = document.getElementById("brand").value;
    const model = document.getElementById("model").value;
    const fuelType = document.getElementById("fuelType").value;
    const engineCc = document.getElementById("engineCc").value;
    const tankCapacity = document.getElementById("tankCapacity").value;
    const mileagePerLiter = document.getElementById("mileagePerLiter").value;
    const numberPlate = document.getElementById("numberPlate").value;
    const odometerReading = document.getElementById("odometerReading").value;

    if (!vehicleType || !brand || !model || !fuelType || !engineCc || !tankCapacity || !mileagePerLiter || !numberPlate || !odometerReading) {
        showMessage("Please fill all required vehicle details.", "error-text");
        return;
    }

    if (vehicleType === "CAR" && !carCategory) {
        showMessage("Please select Hybrid or Non-Hybrid for car.", "error-text");
        return;
    }

    const profilePreview = {
        ownerName: localStorage.getItem("fullName") || "Demo User",
        role: localStorage.getItem("role") || "VEHICLE_OWNER",
        vehicleType: vehicleType,
        carCategory: vehicleType === "CAR" ? carCategory : "N/A",
        brand: brand,
        model: model,
        fuelType: fuelType,
        engineCc: engineCc,
        tankCapacity: tankCapacity,
        mileagePerLiter: mileagePerLiter,
        numberPlate: numberPlate,
        odometerReading: odometerReading
    };

    localStorage.setItem("vehicleProfilePreview", JSON.stringify(profilePreview));

    showMessage("Profile preview saved successfully. Database save will be added in Part 3.", "success-text");
});

function resetDropdown(dropdown, defaultText) {
    dropdown.innerHTML = "";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = defaultText;

    dropdown.appendChild(defaultOption);
}

function clearAutoSpecs() {
    engineCcInput.value = "";
    mileageInput.value = "";
    tankCapacityInput.value = "";
}

function showMessage(text, className) {
    const message = document.getElementById("message");
    message.className = className;
    message.innerText = text;
}