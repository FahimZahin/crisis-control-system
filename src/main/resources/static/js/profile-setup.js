const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")) || null;

let currentVehicleId = null;

const vehicleData = {
    BIKE: {
        "Yamaha": {
            "FZ-S FI V2": { cc: 149, mileage: 45, tank: 13, fuels: ["PETROL", "OCTANE"] },
            "FZ-S FI V3": { cc: 149, mileage: 45, tank: 13, fuels: ["PETROL", "OCTANE"] },
            "FZ-S FI V4": { cc: 149, mileage: 45, tank: 13, fuels: ["PETROL", "OCTANE"] },
            "FZ-X": { cc: 149, mileage: 45, tank: 10, fuels: ["PETROL", "OCTANE"] },
            "R15 V3": { cc: 155, mileage: 40, tank: 11, fuels: ["PETROL", "OCTANE"] },
            "R15 V4": { cc: 155, mileage: 40, tank: 11, fuels: ["PETROL", "OCTANE"] },
            "MT-15 V1": { cc: 155, mileage: 42, tank: 10, fuels: ["PETROL", "OCTANE"] },
            "MT-15 V2": { cc: 155, mileage: 42, tank: 10, fuels: ["PETROL", "OCTANE"] },
            "Fazer FI": { cc: 149, mileage: 45, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "Saluto": { cc: 125, mileage: 60, tank: 7, fuels: ["PETROL", "OCTANE"] },
            "SZ-RR": { cc: 149, mileage: 45, tank: 14, fuels: ["PETROL", "OCTANE"] }
        },

        "Honda": {
            "CB Shine": { cc: 125, mileage: 55, tank: 10, fuels: ["PETROL", "OCTANE"] },
            "CB Shine SP": { cc: 125, mileage: 55, tank: 10, fuels: ["PETROL", "OCTANE"] },
            "CB Hornet 160R": { cc: 163, mileage: 45, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "XBlade": { cc: 163, mileage: 45, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "Livo": { cc: 110, mileage: 60, tank: 9, fuels: ["PETROL", "OCTANE"] },
            "Dream Neo": { cc: 110, mileage: 60, tank: 8, fuels: ["PETROL", "OCTANE"] },
            "CB Trigger": { cc: 150, mileage: 45, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "Dio": { cc: 110, mileage: 50, tank: 5, fuels: ["PETROL", "OCTANE"] },
            "Activa": { cc: 110, mileage: 50, tank: 5, fuels: ["PETROL", "OCTANE"] },
            "CBR150R": { cc: 150, mileage: 38, tank: 13, fuels: ["PETROL", "OCTANE"] }
        },

        "Suzuki": {
            "Gixxer": { cc: 155, mileage: 45, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "Gixxer SF": { cc: 155, mileage: 42, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "Gixxer FI ABS": { cc: 155, mileage: 45, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "Gixxer SF FI ABS": { cc: 155, mileage: 42, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "GSX-R150": { cc: 150, mileage: 40, tank: 11, fuels: ["PETROL", "OCTANE"] },
            "Hayate": { cc: 113, mileage: 60, tank: 10, fuels: ["PETROL", "OCTANE"] },
            "Access 125": { cc: 125, mileage: 50, tank: 5, fuels: ["PETROL", "OCTANE"] },
            "Burgman Street": { cc: 125, mileage: 45, tank: 6, fuels: ["PETROL", "OCTANE"] },
            "Samurai": { cc: 150, mileage: 45, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "Lets": { cc: 113, mileage: 50, tank: 5, fuels: ["PETROL", "OCTANE"] }
        },

        "Bajaj": {
            "Pulsar 150": { cc: 150, mileage: 45, tank: 15, fuels: ["PETROL", "OCTANE"] },
            "Pulsar 150 Twin Disc": { cc: 150, mileage: 45, tank: 15, fuels: ["PETROL", "OCTANE"] },
            "Pulsar NS160": { cc: 160, mileage: 40, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "Pulsar NS200": { cc: 200, mileage: 35, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "Pulsar N160": { cc: 165, mileage: 40, tank: 14, fuels: ["PETROL", "OCTANE"] },
            "Pulsar P150": { cc: 150, mileage: 45, tank: 14, fuels: ["PETROL", "OCTANE"] },
            "Discover 125": { cc: 125, mileage: 60, tank: 10, fuels: ["PETROL", "OCTANE"] },
            "Platina 100": { cc: 100, mileage: 70, tank: 11, fuels: ["PETROL", "OCTANE"] },
            "Platina 110": { cc: 110, mileage: 65, tank: 11, fuels: ["PETROL", "OCTANE"] },
            "CT 100": { cc: 100, mileage: 70, tank: 10, fuels: ["PETROL", "OCTANE"] },
            "Avenger Street 150": { cc: 150, mileage: 45, tank: 14, fuels: ["PETROL", "OCTANE"] },
            "Avenger Street 160": { cc: 160, mileage: 40, tank: 14, fuels: ["PETROL", "OCTANE"] }
        },

        "TVS": {
            "Apache RTR 160": { cc: 160, mileage: 45, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "Apache RTR 160 4V": { cc: 160, mileage: 42, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "Apache RTR 180": { cc: 180, mileage: 40, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "Apache RTR 200 4V": { cc: 200, mileage: 35, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "Raider 125": { cc: 125, mileage: 55, tank: 10, fuels: ["PETROL", "OCTANE"] },
            "Metro Plus": { cc: 110, mileage: 60, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "Stryker 125": { cc: 125, mileage: 55, tank: 14, fuels: ["PETROL", "OCTANE"] },
            "Jupiter": { cc: 110, mileage: 50, tank: 5, fuels: ["PETROL", "OCTANE"] },
            "Wego": { cc: 110, mileage: 50, tank: 5, fuels: ["PETROL", "OCTANE"] },
            "Ntorq 125": { cc: 125, mileage: 45, tank: 5, fuels: ["PETROL", "OCTANE"] }
        },

        "Hero": {
            "Splendor Plus": { cc: 100, mileage: 65, tank: 10, fuels: ["PETROL", "OCTANE"] },
            "HF Deluxe": { cc: 100, mileage: 65, tank: 10, fuels: ["PETROL", "OCTANE"] },
            "Passion XPro": { cc: 110, mileage: 60, tank: 9, fuels: ["PETROL", "OCTANE"] },
            "Glamour": { cc: 125, mileage: 55, tank: 10, fuels: ["PETROL", "OCTANE"] },
            "Hunk": { cc: 150, mileage: 45, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "Hunk 150R": { cc: 150, mileage: 45, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "Thriller 160R": { cc: 160, mileage: 40, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "Xtreme 125R": { cc: 125, mileage: 55, tank: 10, fuels: ["PETROL", "OCTANE"] },
            "Xtreme 160R": { cc: 160, mileage: 42, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "Pleasure": { cc: 110, mileage: 50, tank: 5, fuels: ["PETROL", "OCTANE"] },
            "Maestro Edge": { cc: 110, mileage: 50, tank: 5, fuels: ["PETROL", "OCTANE"] }
        },

        "Runner": {
            "Bullet 100": { cc: 100, mileage: 60, tank: 10, fuels: ["PETROL", "OCTANE"] },
            "Bullet 125": { cc: 125, mileage: 55, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "Turbo 125": { cc: 125, mileage: 55, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "Knight Rider 150": { cc: 150, mileage: 40, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "Royal Plus": { cc: 110, mileage: 55, tank: 10, fuels: ["PETROL", "OCTANE"] },
            "Scooty 110": { cc: 110, mileage: 50, tank: 5, fuels: ["PETROL", "OCTANE"] },
            "AD80S": { cc: 80, mileage: 65, tank: 8, fuels: ["PETROL", "OCTANE"] },
            "F100-6A": { cc: 100, mileage: 60, tank: 10, fuels: ["PETROL", "OCTANE"] }
        },

        "Lifan": {
            "KPR 150": { cc: 150, mileage: 40, tank: 14, fuels: ["PETROL", "OCTANE"] },
            "KPR 165": { cc: 165, mileage: 40, tank: 14, fuels: ["PETROL", "OCTANE"] },
            "KPR 165R": { cc: 165, mileage: 40, tank: 14, fuels: ["PETROL", "OCTANE"] },
            "KPT 150": { cc: 150, mileage: 40, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "KP 150": { cc: 150, mileage: 40, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "KP Mini": { cc: 150, mileage: 40, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "X-Pect": { cc: 150, mileage: 40, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "Blink 125": { cc: 125, mileage: 50, tank: 10, fuels: ["PETROL", "OCTANE"] }
        },

        "Keeway": {
            "RKS 100": { cc: 100, mileage: 60, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "RKS 125": { cc: 125, mileage: 55, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "RKS 150": { cc: 150, mileage: 45, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "RKF 125": { cc: 125, mileage: 50, tank: 10, fuels: ["PETROL", "OCTANE"] },
            "K-Light 150": { cc: 150, mileage: 40, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "Superlight 150": { cc: 150, mileage: 40, tank: 15, fuels: ["PETROL", "OCTANE"] },
            "TXM 150": { cc: 150, mileage: 40, tank: 12, fuels: ["PETROL", "OCTANE"] }
        },

        "H Power": {
            "Zaara 100": { cc: 100, mileage: 60, tank: 10, fuels: ["PETROL", "OCTANE"] },
            "Zaara 110": { cc: 110, mileage: 55, tank: 10, fuels: ["PETROL", "OCTANE"] },
            "Max Z": { cc: 150, mileage: 45, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "Dark": { cc: 150, mileage: 40, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "Robot Z": { cc: 150, mileage: 40, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "CRZ 165": { cc: 165, mileage: 38, tank: 12, fuels: ["PETROL", "OCTANE"] }
        },

        "Speeder": {
            "Countryman 165": { cc: 165, mileage: 40, tank: 13, fuels: ["PETROL", "OCTANE"] },
            "Mugen 150": { cc: 150, mileage: 40, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "NSX 165R": { cc: 165, mileage: 38, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "Big Monster 165": { cc: 165, mileage: 38, tank: 13, fuels: ["PETROL", "OCTANE"] },
            "Colt 150": { cc: 150, mileage: 42, tank: 12, fuels: ["PETROL", "OCTANE"] }
        },

        "PHP": {
            "Commando 150": { cc: 150, mileage: 45, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "Pride 125": { cc: 125, mileage: 55, tank: 11, fuels: ["PETROL", "OCTANE"] },
            "Super 125": { cc: 125, mileage: 55, tank: 11, fuels: ["PETROL", "OCTANE"] },
            "Mercury 125": { cc: 125, mileage: 55, tank: 11, fuels: ["PETROL", "OCTANE"] }
        },

        "Roadmaster": {
            "Velocity 100": { cc: 100, mileage: 60, tank: 10, fuels: ["PETROL", "OCTANE"] },
            "Prime 100": { cc: 100, mileage: 60, tank: 10, fuels: ["PETROL", "OCTANE"] },
            "Delight 100": { cc: 100, mileage: 60, tank: 10, fuels: ["PETROL", "OCTANE"] },
            "Rex 80": { cc: 80, mileage: 65, tank: 8, fuels: ["PETROL", "OCTANE"] },
            "Rapido 150": { cc: 150, mileage: 42, tank: 12, fuels: ["PETROL", "OCTANE"] }
        },

        "Walton": {
            "Fusion": { cc: 125, mileage: 55, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "Xplore": { cc: 140, mileage: 50, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "Stylex": { cc: 100, mileage: 60, tank: 10, fuels: ["PETROL", "OCTANE"] },
            "Ranger": { cc: 150, mileage: 45, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "Leo": { cc: 100, mileage: 60, tank: 10, fuels: ["PETROL", "OCTANE"] },
            "Prizm": { cc: 110, mileage: 55, tank: 10, fuels: ["PETROL", "OCTANE"] },
            "Takyon": { cc: 125, mileage: 55, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "Cruize": { cc: 100, mileage: 60, tank: 10, fuels: ["PETROL", "OCTANE"] }
        },

        "KTM": {
            "Duke 125": { cc: 125, mileage: 40, tank: 13, fuels: ["PETROL", "OCTANE"] },
            "Duke 200": { cc: 200, mileage: 35, tank: 13, fuels: ["PETROL", "OCTANE"] },
            "RC 125": { cc: 125, mileage: 40, tank: 10, fuels: ["PETROL", "OCTANE"] },
            "RC 200": { cc: 200, mileage: 35, tank: 10, fuels: ["PETROL", "OCTANE"] }
        },

        "Royal Enfield": {
            "Classic 350": { cc: 350, mileage: 35, tank: 13, fuels: ["PETROL", "OCTANE"] },
            "Bullet 350": { cc: 350, mileage: 35, tank: 13, fuels: ["PETROL", "OCTANE"] },
            "Meteor 350": { cc: 350, mileage: 35, tank: 15, fuels: ["PETROL", "OCTANE"] },
            "Hunter 350": { cc: 350, mileage: 35, tank: 13, fuels: ["PETROL", "OCTANE"] }
        },

        "Aprilia": {
            "FX 125": { cc: 125, mileage: 45, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "FX 150": { cc: 150, mileage: 40, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "GPR 150": { cc: 150, mileage: 38, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "SR 125": { cc: 125, mileage: 45, tank: 6, fuels: ["PETROL", "OCTANE"] },
            "SR 150": { cc: 150, mileage: 40, tank: 6, fuels: ["PETROL", "OCTANE"] }
        },

        "Benelli": {
            "TNT 150": { cc: 150, mileage: 40, tank: 13, fuels: ["PETROL", "OCTANE"] },
            "TNT 165S": { cc: 165, mileage: 38, tank: 13, fuels: ["PETROL", "OCTANE"] },
            "TNT 135": { cc: 135, mileage: 45, tank: 7, fuels: ["PETROL", "OCTANE"] }
        },

        "CFMoto": {
            "150 NK": { cc: 150, mileage: 40, tank: 10, fuels: ["PETROL", "OCTANE"] },
            "250 NK": { cc: 250, mileage: 30, tank: 12, fuels: ["PETROL", "OCTANE"] },
            "300 NK": { cc: 300, mileage: 28, tank: 12, fuels: ["PETROL", "OCTANE"] }
        },

        "Znen": {
            "T6": { cc: 150, mileage: 40, tank: 6, fuels: ["PETROL", "OCTANE"] },
            "T9": { cc: 150, mileage: 40, tank: 6, fuels: ["PETROL", "OCTANE"] },
            "T10": { cc: 150, mileage: 40, tank: 6, fuels: ["PETROL", "OCTANE"] },
            "Vista": { cc: 110, mileage: 50, tank: 5, fuels: ["PETROL", "OCTANE"] }
        },

        "Vespa": {
            "VXL 125": { cc: 125, mileage: 45, tank: 7, fuels: ["PETROL", "OCTANE"] },
            "SXL 125": { cc: 125, mileage: 45, tank: 7, fuels: ["PETROL", "OCTANE"] },
            "VXL 150": { cc: 150, mileage: 40, tank: 7, fuels: ["PETROL", "OCTANE"] },
            "SXL 150": { cc: 150, mileage: 40, tank: 7, fuels: ["PETROL", "OCTANE"] }
        }
    },

    CAR: {
        "Toyota": {
            "Aqua Hybrid": { cc: 1500, mileage: 28, tank: 36, fuels: ["PETROL", "OCTANE"] },
            "Prius Hybrid": { cc: 1800, mileage: 25, tank: 43, fuels: ["PETROL", "OCTANE"] },
            "Prius Alpha Hybrid": { cc: 1800, mileage: 22, tank: 45, fuels: ["PETROL", "OCTANE"] },
            "Corolla": { cc: 1800, mileage: 12, tank: 50, fuels: ["PETROL", "OCTANE", "CNG"] },
            "Corolla Axio": { cc: 1500, mileage: 16, tank: 42, fuels: ["PETROL", "OCTANE", "CNG"] },
            "Corolla Axio Hybrid": { cc: 1500, mileage: 24, tank: 42, fuels: ["PETROL", "OCTANE"] },
            "Corolla Cross": { cc: 1800, mileage: 14, tank: 47, fuels: ["PETROL", "OCTANE"] },
            "Corolla Cross Hybrid": { cc: 1800, mileage: 20, tank: 43, fuels: ["PETROL", "OCTANE"] },
            "Premio": { cc: 1500, mileage: 14, tank: 60, fuels: ["PETROL", "OCTANE", "CNG"] },
            "Allion": { cc: 1500, mileage: 14, tank: 60, fuels: ["PETROL", "OCTANE", "CNG"] },
            "Fielder": { cc: 1500, mileage: 16, tank: 42, fuels: ["PETROL", "OCTANE", "CNG"] },
            "Fielder Hybrid": { cc: 1500, mileage: 24, tank: 42, fuels: ["PETROL", "OCTANE"] },
            "Probox": { cc: 1500, mileage: 14, tank: 50, fuels: ["PETROL", "OCTANE", "CNG"] },
            "Succeed": { cc: 1500, mileage: 14, tank: 50, fuels: ["PETROL", "OCTANE", "CNG"] },
            "Vitz": { cc: 1000, mileage: 18, tank: 42, fuels: ["PETROL", "OCTANE"] },
            "Yaris": { cc: 1500, mileage: 16, tank: 42, fuels: ["PETROL", "OCTANE"] },
            "Noah": { cc: 2000, mileage: 11, tank: 55, fuels: ["PETROL", "OCTANE"] },
            "Noah Hybrid": { cc: 1800, mileage: 18, tank: 50, fuels: ["PETROL", "OCTANE"] },
            "Voxy": { cc: 2000, mileage: 11, tank: 55, fuels: ["PETROL", "OCTANE"] },
            "Voxy Hybrid": { cc: 1800, mileage: 18, tank: 50, fuels: ["PETROL", "OCTANE"] },
            "Esquire": { cc: 2000, mileage: 11, tank: 55, fuels: ["PETROL", "OCTANE"] },
            "Harrier": { cc: 2000, mileage: 12, tank: 55, fuels: ["PETROL", "OCTANE"] },
            "Harrier Hybrid": { cc: 2500, mileage: 18, tank: 55, fuels: ["PETROL", "OCTANE"] },
            "RAV4": { cc: 2000, mileage: 12, tank: 55, fuels: ["PETROL", "OCTANE"] },
            "RAV4 Hybrid": { cc: 2500, mileage: 18, tank: 55, fuels: ["PETROL", "OCTANE"] },
            "C-HR Hybrid": { cc: 1800, mileage: 20, tank: 43, fuels: ["PETROL", "OCTANE"] },
            "Raize": { cc: 1000, mileage: 17, tank: 36, fuels: ["PETROL", "OCTANE"] },
            "Rush": { cc: 1500, mileage: 12, tank: 45, fuels: ["PETROL", "OCTANE"] },
            "Hiace": { cc: 2700, mileage: 8, tank: 70, fuels: ["PETROL", "OCTANE"] },
            "Land Cruiser Prado": { cc: 2700, mileage: 8, tank: 87, fuels: ["PETROL", "OCTANE"] },
            "Land Cruiser": { cc: 4600, mileage: 6, tank: 93, fuels: ["PETROL", "OCTANE"] },
            "Camry": { cc: 2500, mileage: 12, tank: 60, fuels: ["PETROL", "OCTANE"] },
            "Camry Hybrid": { cc: 2500, mileage: 20, tank: 50, fuels: ["PETROL", "OCTANE"] }
        },

        "Honda": {
            "Civic": { cc: 1500, mileage: 13, tank: 47, fuels: ["PETROL", "OCTANE", "CNG"] },
            "City": { cc: 1500, mileage: 15, tank: 40, fuels: ["PETROL", "OCTANE", "CNG"] },
            "Grace": { cc: 1500, mileage: 18, tank: 40, fuels: ["PETROL", "OCTANE"] },
            "Grace Hybrid": { cc: 1500, mileage: 24, tank: 40, fuels: ["PETROL", "OCTANE"] },
            "Fit": { cc: 1300, mileage: 18, tank: 40, fuels: ["PETROL", "OCTANE"] },
            "Fit Hybrid": { cc: 1500, mileage: 25, tank: 40, fuels: ["PETROL", "OCTANE"] },
            "Vezel": { cc: 1500, mileage: 15, tank: 40, fuels: ["PETROL", "OCTANE"] },
            "Vezel Hybrid": { cc: 1500, mileage: 22, tank: 40, fuels: ["PETROL", "OCTANE"] },
            "HR-V": { cc: 1500, mileage: 15, tank: 40, fuels: ["PETROL", "OCTANE"] },
            "CR-V": { cc: 1500, mileage: 12, tank: 57, fuels: ["PETROL", "OCTANE"] },
            "Accord": { cc: 2000, mileage: 12, tank: 56, fuels: ["PETROL", "OCTANE"] },
            "Accord Hybrid": { cc: 2000, mileage: 20, tank: 48, fuels: ["PETROL", "OCTANE"] },
            "Insight Hybrid": { cc: 1500, mileage: 24, tank: 40, fuels: ["PETROL", "OCTANE"] },
            "Freed": { cc: 1500, mileage: 16, tank: 42, fuels: ["PETROL", "OCTANE"] },
            "Freed Hybrid": { cc: 1500, mileage: 22, tank: 36, fuels: ["PETROL", "OCTANE"] },
            "Shuttle": { cc: 1500, mileage: 18, tank: 40, fuels: ["PETROL", "OCTANE"] },
            "Shuttle Hybrid": { cc: 1500, mileage: 24, tank: 40, fuels: ["PETROL", "OCTANE"] }
        },

        "Nissan": {
            "X-Trail": { cc: 2000, mileage: 11, tank: 60, fuels: ["PETROL", "OCTANE"] },
            "X-Trail Hybrid": { cc: 2000, mileage: 16, tank: 60, fuels: ["PETROL", "OCTANE"] },
            "Bluebird Sylphy": { cc: 1500, mileage: 14, tank: 52, fuels: ["PETROL", "OCTANE", "CNG"] },
            "Sunny": { cc: 1500, mileage: 14, tank: 41, fuels: ["PETROL", "OCTANE", "CNG"] },
            "Tiida": { cc: 1500, mileage: 14, tank: 52, fuels: ["PETROL", "OCTANE"] },
            "Note": { cc: 1200, mileage: 18, tank: 41, fuels: ["PETROL", "OCTANE"] },
            "Note e-Power": { cc: 1200, mileage: 25, tank: 41, fuels: ["PETROL", "OCTANE"] },
            "March": { cc: 1200, mileage: 18, tank: 41, fuels: ["PETROL", "OCTANE"] },
            "Juke": { cc: 1500, mileage: 13, tank: 46, fuels: ["PETROL", "OCTANE"] },
            "AD Van": { cc: 1500, mileage: 14, tank: 52, fuels: ["PETROL", "OCTANE", "CNG"] },
            "Serena": { cc: 2000, mileage: 10, tank: 60, fuels: ["PETROL", "OCTANE"] },
            "Serena Hybrid": { cc: 2000, mileage: 15, tank: 60, fuels: ["PETROL", "OCTANE"] },
            "Navara": { cc: 2500, mileage: 9, tank: 80, fuels: ["DIESEL"] }
        },

        "Mitsubishi": {
            "Lancer": { cc: 1500, mileage: 13, tank: 50, fuels: ["PETROL", "OCTANE", "CNG"] },
            "Attrage": { cc: 1200, mileage: 18, tank: 42, fuels: ["PETROL", "OCTANE"] },
            "Mirage": { cc: 1200, mileage: 18, tank: 35, fuels: ["PETROL", "OCTANE"] },
            "Outlander": { cc: 2000, mileage: 11, tank: 63, fuels: ["PETROL", "OCTANE"] },
            "Outlander PHEV": { cc: 2000, mileage: 18, tank: 45, fuels: ["PETROL", "OCTANE"] },
            "Pajero": { cc: 3000, mileage: 7, tank: 90, fuels: ["DIESEL"] },
            "Pajero Sport": { cc: 2500, mileage: 9, tank: 68, fuels: ["DIESEL"] },
            "Xpander": { cc: 1500, mileage: 12, tank: 45, fuels: ["PETROL", "OCTANE"] },
            "L200": { cc: 2500, mileage: 9, tank: 75, fuels: ["DIESEL"] },
            "ASX": { cc: 2000, mileage: 11, tank: 63, fuels: ["PETROL", "OCTANE"] }
        },

        "Hyundai": {
            "i10": { cc: 1200, mileage: 18, tank: 35, fuels: ["PETROL", "OCTANE"] },
            "i20": { cc: 1200, mileage: 17, tank: 37, fuels: ["PETROL", "OCTANE"] },
            "Accent": { cc: 1400, mileage: 14, tank: 43, fuels: ["PETROL", "OCTANE"] },
            "Elantra": { cc: 1600, mileage: 13, tank: 50, fuels: ["PETROL", "OCTANE", "CNG"] },
            "Sonata": { cc: 2000, mileage: 11, tank: 60, fuels: ["PETROL", "OCTANE"] },
            "Creta": { cc: 1500, mileage: 14, tank: 50, fuels: ["PETROL", "OCTANE"] },
            "Tucson": { cc: 2000, mileage: 10, tank: 62, fuels: ["PETROL", "OCTANE"] },
            "Santa Fe": { cc: 2200, mileage: 9, tank: 67, fuels: ["DIESEL"] },
            "Kona": { cc: 1600, mileage: 13, tank: 50, fuels: ["PETROL", "OCTANE"] },
            "Venue": { cc: 1500, mileage: 14, tank: 45, fuels: ["PETROL", "OCTANE"] },
            "H-1": { cc: 2500, mileage: 8, tank: 75, fuels: ["DIESEL"] }
        },

        "Kia": {
            "Picanto": { cc: 1200, mileage: 18, tank: 35, fuels: ["PETROL", "OCTANE"] },
            "Rio": { cc: 1400, mileage: 15, tank: 45, fuels: ["PETROL", "OCTANE"] },
            "Cerato": { cc: 1600, mileage: 13, tank: 50, fuels: ["PETROL", "OCTANE"] },
            "Optima": { cc: 2000, mileage: 11, tank: 60, fuels: ["PETROL", "OCTANE"] },
            "Stonic": { cc: 1400, mileage: 15, tank: 45, fuels: ["PETROL", "OCTANE"] },
            "Seltos": { cc: 1500, mileage: 14, tank: 50, fuels: ["PETROL", "OCTANE"] },
            "Sportage": { cc: 2000, mileage: 10, tank: 62, fuels: ["PETROL", "OCTANE"] },
            "Sorento": { cc: 2200, mileage: 9, tank: 67, fuels: ["DIESEL"] },
            "Carnival": { cc: 2200, mileage: 8, tank: 80, fuels: ["DIESEL"] }
        },

        "Suzuki": {
            "Alto": { cc: 800, mileage: 20, tank: 35, fuels: ["PETROL", "OCTANE"] },
            "S-Presso": { cc: 1000, mileage: 20, tank: 27, fuels: ["PETROL", "OCTANE"] },
            "Celerio": { cc: 1000, mileage: 20, tank: 35, fuels: ["PETROL", "OCTANE"] },
            "WagonR": { cc: 1000, mileage: 20, tank: 32, fuels: ["PETROL", "OCTANE"] },
            "Swift": { cc: 1200, mileage: 18, tank: 37, fuels: ["PETROL", "OCTANE"] },
            "Baleno": { cc: 1200, mileage: 18, tank: 37, fuels: ["PETROL", "OCTANE"] },
            "Dzire": { cc: 1200, mileage: 18, tank: 37, fuels: ["PETROL", "OCTANE"] },
            "Ciaz": { cc: 1500, mileage: 15, tank: 43, fuels: ["PETROL", "OCTANE"] },
            "Ertiga": { cc: 1500, mileage: 15, tank: 45, fuels: ["PETROL", "OCTANE"] },
            "Vitara": { cc: 1600, mileage: 13, tank: 47, fuels: ["PETROL", "OCTANE"] },
            "Grand Vitara": { cc: 2400, mileage: 10, tank: 66, fuels: ["PETROL", "OCTANE"] },
            "Jimny": { cc: 1500, mileage: 13, tank: 40, fuels: ["PETROL", "OCTANE"] }
        },

        "Mazda": {
            "Demio": { cc: 1300, mileage: 18, tank: 44, fuels: ["PETROL", "OCTANE"] },
            "Axela": { cc: 1500, mileage: 14, tank: 51, fuels: ["PETROL", "OCTANE"] },
            "Axela Hybrid": { cc: 2000, mileage: 20, tank: 51, fuels: ["PETROL", "OCTANE"] },
            "Atenza": { cc: 2000, mileage: 12, tank: 62, fuels: ["PETROL", "OCTANE"] },
            "Premacy": { cc: 2000, mileage: 11, tank: 60, fuels: ["PETROL", "OCTANE"] },
            "CX-3": { cc: 1500, mileage: 14, tank: 48, fuels: ["PETROL", "OCTANE"] },
            "CX-5": { cc: 2000, mileage: 11, tank: 56, fuels: ["PETROL", "OCTANE"] },
            "CX-7": { cc: 2300, mileage: 9, tank: 69, fuels: ["PETROL", "OCTANE"] },
            "CX-8": { cc: 2200, mileage: 9, tank: 72, fuels: ["DIESEL"] },
            "CX-9": { cc: 2500, mileage: 8, tank: 74, fuels: ["PETROL", "OCTANE"] }
        },

        "Subaru": {
            "Impreza": { cc: 1600, mileage: 12, tank: 50, fuels: ["PETROL", "OCTANE"] },
            "XV": { cc: 2000, mileage: 11, tank: 63, fuels: ["PETROL", "OCTANE"] },
            "Forester": { cc: 2000, mileage: 10, tank: 63, fuels: ["PETROL", "OCTANE"] },
            "Outback": { cc: 2500, mileage: 9, tank: 63, fuels: ["PETROL", "OCTANE"] },
            "Legacy": { cc: 2000, mileage: 10, tank: 60, fuels: ["PETROL", "OCTANE"] },
            "Levorg": { cc: 1600, mileage: 11, tank: 60, fuels: ["PETROL", "OCTANE"] }
        },

        "BMW": {
            "3 Series": { cc: 2000, mileage: 10, tank: 59, fuels: ["PETROL", "OCTANE"] },
            "5 Series": { cc: 2000, mileage: 9, tank: 68, fuels: ["PETROL", "OCTANE"] },
            "7 Series": { cc: 3000, mileage: 7, tank: 78, fuels: ["PETROL", "OCTANE"] },
            "X1": { cc: 1500, mileage: 11, tank: 51, fuels: ["PETROL", "OCTANE"] },
            "X3": { cc: 2000, mileage: 9, tank: 65, fuels: ["PETROL", "OCTANE"] },
            "X5": { cc: 3000, mileage: 7, tank: 83, fuels: ["PETROL", "OCTANE"] },
            "X6": { cc: 3000, mileage: 7, tank: 83, fuels: ["PETROL", "OCTANE"] }
        },

        "Mercedes-Benz": {
            "A-Class": { cc: 1300, mileage: 12, tank: 43, fuels: ["PETROL", "OCTANE"] },
            "C-Class": { cc: 1500, mileage: 10, tank: 66, fuels: ["PETROL", "OCTANE"] },
            "E-Class": { cc: 2000, mileage: 9, tank: 66, fuels: ["PETROL", "OCTANE"] },
            "S-Class": { cc: 3000, mileage: 7, tank: 76, fuels: ["PETROL", "OCTANE"] },
            "CLA": { cc: 1600, mileage: 10, tank: 50, fuels: ["PETROL", "OCTANE"] },
            "GLA": { cc: 1600, mileage: 10, tank: 50, fuels: ["PETROL", "OCTANE"] },
            "GLC": { cc: 2000, mileage: 9, tank: 66, fuels: ["PETROL", "OCTANE"] },
            "GLE": { cc: 3000, mileage: 7, tank: 85, fuels: ["PETROL", "OCTANE"] }
        },

        "Audi": {
            "A3": { cc: 1400, mileage: 12, tank: 50, fuels: ["PETROL", "OCTANE"] },
            "A4": { cc: 2000, mileage: 10, tank: 54, fuels: ["PETROL", "OCTANE"] },
            "A6": { cc: 2000, mileage: 9, tank: 63, fuels: ["PETROL", "OCTANE"] },
            "Q2": { cc: 1000, mileage: 12, tank: 50, fuels: ["PETROL", "OCTANE"] },
            "Q3": { cc: 1500, mileage: 11, tank: 60, fuels: ["PETROL", "OCTANE"] },
            "Q5": { cc: 2000, mileage: 9, tank: 70, fuels: ["PETROL", "OCTANE"] },
            "Q7": { cc: 3000, mileage: 7, tank: 85, fuels: ["PETROL", "OCTANE"] }
        },

        "Ford": {
            "EcoSport": { cc: 1500, mileage: 12, tank: 52, fuels: ["PETROL", "OCTANE"] },
            "Escape": { cc: 2000, mileage: 10, tank: 60, fuels: ["PETROL", "OCTANE"] },
            "Focus": { cc: 1600, mileage: 12, tank: 55, fuels: ["PETROL", "OCTANE"] },
            "Everest": { cc: 2200, mileage: 9, tank: 80, fuels: ["DIESEL"] },
            "Ranger": { cc: 2200, mileage: 9, tank: 80, fuels: ["DIESEL"] },
            "Mustang": { cc: 2300, mileage: 7, tank: 59, fuels: ["PETROL", "OCTANE"] }
        },

        "Chevrolet": {
            "Spark": { cc: 1000, mileage: 18, tank: 35, fuels: ["PETROL", "OCTANE"] },
            "Aveo": { cc: 1400, mileage: 14, tank: 45, fuels: ["PETROL", "OCTANE"] },
            "Cruze": { cc: 1600, mileage: 12, tank: 60, fuels: ["PETROL", "OCTANE"] },
            "Captiva": { cc: 2400, mileage: 8, tank: 65, fuels: ["PETROL", "OCTANE"] },
            "Trailblazer": { cc: 2800, mileage: 8, tank: 76, fuels: ["DIESEL"] }
        },

        "Proton": {
            "Saga": { cc: 1300, mileage: 14, tank: 40, fuels: ["PETROL", "OCTANE"] },
            "Persona": { cc: 1600, mileage: 12, tank: 40, fuels: ["PETROL", "OCTANE"] },
            "Preve": { cc: 1600, mileage: 11, tank: 50, fuels: ["PETROL", "OCTANE"] },
            "X50": { cc: 1500, mileage: 12, tank: 45, fuels: ["PETROL", "OCTANE"] },
            "X70": { cc: 1500, mileage: 11, tank: 60, fuels: ["PETROL", "OCTANE"] }
        },

        "MG": {
            "MG3": { cc: 1500, mileage: 14, tank: 45, fuels: ["PETROL", "OCTANE"] },
            "MG5": { cc: 1500, mileage: 13, tank: 50, fuels: ["PETROL", "OCTANE"] },
            "ZS": { cc: 1500, mileage: 12, tank: 48, fuels: ["PETROL", "OCTANE"] },
            "HS": { cc: 1500, mileage: 11, tank: 55, fuels: ["PETROL", "OCTANE"] },
            "ZS EV": { cc: 0, mileage: 0, tank: 0, fuels: ["OCTANE"] }
        },

        "Tata": {
            "Nano": { cc: 624, mileage: 20, tank: 24, fuels: ["PETROL", "OCTANE"] },
            "Indica": { cc: 1200, mileage: 15, tank: 37, fuels: ["PETROL", "OCTANE"] },
            "Indigo": { cc: 1400, mileage: 14, tank: 42, fuels: ["PETROL", "OCTANE"] },
            "Tiago": { cc: 1200, mileage: 18, tank: 35, fuels: ["PETROL", "OCTANE"] },
            "Tigor": { cc: 1200, mileage: 17, tank: 35, fuels: ["PETROL", "OCTANE"] },
            "Nexon": { cc: 1200, mileage: 15, tank: 44, fuels: ["PETROL", "OCTANE"] },
            "Safari": { cc: 2000, mileage: 10, tank: 50, fuels: ["DIESEL"] }
        },

        "Mahindra": {
            "Bolero": { cc: 1500, mileage: 13, tank: 60, fuels: ["DIESEL"] },
            "Scorpio": { cc: 2200, mileage: 10, tank: 60, fuels: ["DIESEL"] },
            "XUV300": { cc: 1200, mileage: 15, tank: 42, fuels: ["PETROL", "OCTANE"] },
            "XUV500": { cc: 2200, mileage: 10, tank: 70, fuels: ["DIESEL"] },
            "Thar": { cc: 2000, mileage: 10, tank: 57, fuels: ["DIESEL", "PETROL"] }
        },

        "Haval": {
            "H2": { cc: 1500, mileage: 11, tank: 55, fuels: ["PETROL", "OCTANE"] },
            "H6": { cc: 1500, mileage: 10, tank: 58, fuels: ["PETROL", "OCTANE"] },
            "Jolion": { cc: 1500, mileage: 11, tank: 55, fuels: ["PETROL", "OCTANE"] },
            "M6": { cc: 1500, mileage: 10, tank: 55, fuels: ["PETROL", "OCTANE"] }
        },

        "DFSK": {
            "Glory 560": { cc: 1500, mileage: 11, tank: 58, fuels: ["PETROL", "OCTANE"] },
            "Glory 580": { cc: 1500, mileage: 10, tank: 58, fuels: ["PETROL", "OCTANE"] },
            "K01": { cc: 1200, mileage: 13, tank: 40, fuels: ["PETROL", "OCTANE"] },
            "K07": { cc: 1200, mileage: 13, tank: 40, fuels: ["PETROL", "OCTANE"] }
        },

        "Chery": {
            "Tiggo 2": { cc: 1500, mileage: 12, tank: 50, fuels: ["PETROL", "OCTANE"] },
            "Tiggo 4": { cc: 1500, mileage: 11, tank: 51, fuels: ["PETROL", "OCTANE"] },
            "Tiggo 7": { cc: 1500, mileage: 10, tank: 57, fuels: ["PETROL", "OCTANE"] },
            "Tiggo 8": { cc: 1600, mileage: 10, tank: 51, fuels: ["PETROL", "OCTANE"] }
        },

        "Volkswagen": {
            "Polo": { cc: 1200, mileage: 16, tank: 45, fuels: ["PETROL", "OCTANE"] },
            "Jetta": { cc: 1400, mileage: 13, tank: 55, fuels: ["PETROL", "OCTANE"] },
            "Passat": { cc: 1800, mileage: 11, tank: 66, fuels: ["PETROL", "OCTANE"] },
            "Tiguan": { cc: 1400, mileage: 11, tank: 58, fuels: ["PETROL", "OCTANE"] }
        },

        "Lexus": {
            "CT200h": { cc: 1800, mileage: 22, tank: 45, fuels: ["PETROL", "OCTANE"] },
            "NX300h": { cc: 2500, mileage: 16, tank: 56, fuels: ["PETROL", "OCTANE"] },
            "RX450h": { cc: 3500, mileage: 12, tank: 65, fuels: ["PETROL", "OCTANE"] },
            "LX570": { cc: 5700, mileage: 5, tank: 93, fuels: ["PETROL", "OCTANE"] }
        }
    }
};

document.addEventListener("DOMContentLoaded", function () {
    if (!loggedInUser) {
        window.location.href = "login.html";
        return;
    }

    loadOwnerInfo();
    setupEvents();
    loadUserVehicles();
});

function loadOwnerInfo() {
    document.getElementById("ownerName").value = loggedInUser.fullName || localStorage.getItem("fullName") || "";
    document.getElementById("ownerRole").value = loggedInUser.role || localStorage.getItem("role") || "";
}

function setupEvents() {
    document.getElementById("vehicleType").addEventListener("change", function () {
        resetVehicleDetails();
        handleVehicleTypeChange();
        document.getElementById("vehicleMetroArea").addEventListener("change", function () {
            updateSmartNumberPlate();
        });

        document.getElementById("vehicleNumberDigits").addEventListener("input", function () {
            this.value = this.value.replace(/\D/g, "").slice(0, 6);
            updateSmartNumberPlate();
        });
    });

    document.getElementById("brand").addEventListener("change", function () {
        loadModels();
        clearAutoFields();
    });

    document.getElementById("model").addEventListener("change", function () {
        fillVehicleDetails();
    });

    document.getElementById("vehiclePhoto").addEventListener("change", function () {
        previewVehiclePhoto();
    });

    document.getElementById("vehicleProfileForm").addEventListener("submit", function (event) {
        event.preventDefault();
        saveVehicle();
    });

    document.getElementById("deleteVehicleBtn").addEventListener("click", function () {
        deleteVehicle();
    });

    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            localStorage.clear();
        });
    }
}

function handleVehicleTypeChange() {
    const vehicleType = document.getElementById("vehicleType").value;
    const carCategorySection = document.getElementById("carCategorySection");

    if (vehicleType === "CAR") {
        carCategorySection.classList.remove("hidden-section");
    } else {
        carCategorySection.classList.add("hidden-section");
        document.getElementById("carCategory").value = "NOT_APPLICABLE";
    }

    loadBrands();
}

function loadBrands() {
    const vehicleType = document.getElementById("vehicleType").value;
    const brandSelect = document.getElementById("brand");
    const modelSelect = document.getElementById("model");

    brandSelect.innerHTML = `<option value="">Select vehicle brand</option>`;
    modelSelect.innerHTML = `<option value="">Select vehicle model</option>`;

    if (!vehicleType) {
        return;
    }

    Object.keys(vehicleData[vehicleType]).forEach(function (brand) {
        const option = document.createElement("option");
        option.value = brand;
        option.innerText = brand;
        brandSelect.appendChild(option);
    });
}

function loadModels() {
    const vehicleType = document.getElementById("vehicleType").value;
    const brand = document.getElementById("brand").value;
    const modelSelect = document.getElementById("model");

    modelSelect.innerHTML = `<option value="">Select vehicle model</option>`;

    if (!vehicleType || !brand) {
        return;
    }

    Object.keys(vehicleData[vehicleType][brand]).forEach(function (model) {
        const option = document.createElement("option");
        option.value = model;
        option.innerText = model;
        modelSelect.appendChild(option);
    });
}

function fillVehicleDetails() {
    const vehicleType = document.getElementById("vehicleType").value;
    const brand = document.getElementById("brand").value;
    const model = document.getElementById("model").value;

    if (!vehicleType || !brand || !model) {
        return;
    }

    const selectedVehicle = vehicleData[vehicleType][brand][model];

    document.getElementById("engineCc").value = selectedVehicle.cc;
    document.getElementById("companyMileage").value = selectedVehicle.mileage;
    document.getElementById("tankCapacity").value = selectedVehicle.tank;

    loadFuelTypes(selectedVehicle.fuels);

    if (vehicleType === "CAR" && model.toLowerCase().includes("hybrid")) {
        document.getElementById("carCategory").value = "HYBRID";
    } else if (vehicleType === "CAR") {
        document.getElementById("carCategory").value = "NON_HYBRID";
    }

    updateSmartNumberPlate();
}
function loadFuelTypes(fuels) {
    const fuelTypeSelect = document.getElementById("fuelType");
    fuelTypeSelect.innerHTML = `<option value="">Select Fuel Type</option>`;

    fuels.forEach(function (fuel) {
        const option = document.createElement("option");
        option.value = fuel;
        option.innerText = fuel;
        fuelTypeSelect.appendChild(option);
    });
}

function previewVehiclePhoto() {
    const fileInput = document.getElementById("vehiclePhoto");
    const preview = document.getElementById("vehiclePhotoPreview");

    if (fileInput.files && fileInput.files[0]) {
        preview.src = URL.createObjectURL(fileInput.files[0]);
    }
}

async function saveVehicle() {
    const userId = loggedInUser.userId || localStorage.getItem("userId");

    if (!userId) {
        showVehicleMessage("User ID not found. Please login again.", "error-text");
        return;
    }

    const vehicleType = document.getElementById("vehicleType").value;

    const metroArea = document.getElementById("vehicleMetroArea").value;
    const plateSeries = document.getElementById("plateSeries").value;
    const vehicleNumberDigits = document.getElementById("vehicleNumberDigits").value.trim();

    if (!metroArea) {
        showVehicleMessage("Please select vehicle metro area.", "error-text");
        return;
    }

    if (!plateSeries) {
        showVehicleMessage("Vehicle plate series could not be generated. Please select vehicle type, brand, and model properly.", "error-text");
        return;
    }

    if (!/^\d{6}$/.test(vehicleNumberDigits)) {
        showVehicleMessage("Vehicle number must be exactly 6 digits.", "error-text");
        return;
    }

    updateSmartNumberPlate();

    if (!document.getElementById("numberPlate").value.trim()) {
        showVehicleMessage("Final vehicle number plate could not be generated.", "error-text");
        return;
    }

    const currentFuelLiter = Number(document.getElementById("currentFuelLiter").value);
    const tankCapacity = Number(document.getElementById("tankCapacity").value);

    if (currentFuelLiter < 0) {
        showVehicleMessage("Current fuel cannot be negative.", "error-text");
        return;
    }

    if (currentFuelLiter > tankCapacity) {
        showVehicleMessage("Current fuel cannot be greater than tank capacity.", "error-text");
        return;
    }
    const data = {
        userId: Number(userId),
        vehicleType: vehicleType,
        carCategory: vehicleType === "CAR" ? document.getElementById("carCategory").value : "NOT_APPLICABLE",
        brand: document.getElementById("brand").value,
        model: document.getElementById("model").value,
        fuelType: document.getElementById("fuelType").value,
        engineCc: Number(document.getElementById("engineCc").value),
        companyMileage: Number(document.getElementById("companyMileage").value),
        tankCapacity: Number(document.getElementById("tankCapacity").value),
        currentFuelLiter: currentFuelLiter,
        numberPlate: document.getElementById("numberPlate").value.trim(),
        odometerReading: Number(document.getElementById("odometerReading").value),
        vehiclePhotoPath: getVehiclePhotoPath()
    };

    try {
        let response;

        if (currentVehicleId) {
            response = await fetch("http://localhost:8081/api/vehicles/" + currentVehicleId, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            });
        } else {
            response = await fetch("http://localhost:8081/api/vehicles", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            });
        }

        const result = await response.json();

        if (response.ok) {
            showVehicleMessage(currentVehicleId ? "Vehicle updated successfully." : "Vehicle saved successfully.", "success-text");
            currentVehicleId = result.id;
            document.getElementById("vehicleId").value = result.id;
            document.getElementById("deleteVehicleBtn").classList.remove("hidden-section");

            localStorage.setItem("vehicleProfilePreview", JSON.stringify(result));

            loadUserVehicles();
        } else {
            showVehicleMessage(getErrorMessage(result), "error-text");
        }

    } catch (error) {
        showVehicleMessage("Server connection failed while saving vehicle.", "error-text");
    }
}

async function loadUserVehicles() {
    const userId = loggedInUser.userId || localStorage.getItem("userId");
    const list = document.getElementById("savedVehiclesList");

    if (!userId) {
        list.innerHTML = "User ID not found.";
        return;
    }

    try {
        const response = await fetch("http://localhost:8081/api/vehicles/user/" + userId);
        const vehicles = await response.json();

        if (!response.ok) {
            list.innerHTML = "Failed to load vehicles.";
            return;
        }

        if (vehicles.length === 0) {
            list.innerHTML = `<p class="muted-text">No vehicle added yet.</p>`;
            return;
        }

        list.innerHTML = "";

        vehicles.forEach(function (vehicle) {
            const card = document.createElement("div");
            card.className = "saved-vehicle-card";

            card.innerHTML = `
                <div>
                    <h3>${vehicle.brand} ${vehicle.model}</h3>
                    <p><strong>Type:</strong> ${vehicle.vehicleType}</p>
                    <p><strong>Plate:</strong> ${vehicle.numberPlate}</p>
                    <p><strong>Fuel:</strong> ${vehicle.fuelType}</p>
                </div>
                <button class="btn primary small-btn" onclick="loadVehicleIntoForm(${vehicle.id})">
                    Edit
                </button>
            `;

            list.appendChild(card);
        });

    } catch (error) {
        list.innerHTML = "Server connection failed while loading vehicles.";
    }
}

async function loadVehicleIntoForm(vehicleId) {
    try {
        const response = await fetch("http://localhost:8081/api/vehicles/" + vehicleId);
        const vehicle = await response.json();

        if (!response.ok) {
            showVehicleMessage("Failed to load vehicle.", "error-text");
            return;
        }

        currentVehicleId = vehicle.id;

        document.getElementById("vehicleId").value = vehicle.id;
        document.getElementById("vehicleType").value = vehicle.vehicleType;

        handleVehicleTypeChange();

        if (vehicle.vehicleType === "CAR") {
            document.getElementById("carCategory").value = vehicle.carCategory;
        }

        document.getElementById("brand").value = vehicle.brand;
        loadModels();

        document.getElementById("model").value = vehicle.model;
        fillVehicleDetails();

        document.getElementById("fuelType").value = vehicle.fuelType;
        document.getElementById("engineCc").value = vehicle.engineCc;
        document.getElementById("companyMileage").value = vehicle.companyMileage;
        document.getElementById("tankCapacity").value = vehicle.tankCapacity;
        document.getElementById("currentFuelLiter").value = vehicle.currentFuelLiter || 0;

        loadSmartPlateIntoForm(vehicle.numberPlate);
        document.getElementById("odometerReading").value = vehicle.odometerReading;

        document.getElementById("vehiclePhotoPreview").src = vehicle.vehiclePhotoPath || "images/default-vehicle.jpg";

        document.getElementById("saveVehicleBtn").innerText = "Update Vehicle";
        document.getElementById("deleteVehicleBtn").classList.remove("hidden-section");

        showVehicleMessage("Vehicle loaded for editing.", "success-text");

    } catch (error) {
        showVehicleMessage("Server connection failed while loading vehicle.", "error-text");
    }
}

async function deleteVehicle() {
    if (!currentVehicleId) {
        showVehicleMessage("No vehicle selected for delete.", "error-text");
        return;
    }

    const confirmed = confirm("Are you sure you want to delete this vehicle?");

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch("http://localhost:8081/api/vehicles/" + currentVehicleId, {
            method: "DELETE"
        });

        const result = await response.json();

        if (response.ok) {
            showVehicleMessage(result.message, "success-text");
            resetFormAfterDelete();
            loadUserVehicles();
        } else {
            showVehicleMessage(result.message || "Failed to delete vehicle.", "error-text");
        }

    } catch (error) {
        showVehicleMessage("Server connection failed while deleting vehicle.", "error-text");
    }
}

function getVehiclePhotoPath() {
    const fileInput = document.getElementById("vehiclePhoto");

    if (fileInput.files && fileInput.files[0]) {
        return "images/" + fileInput.files[0].name;
    }

    return "images/default-vehicle.jpg";
}

function resetVehicleDetails() {
    document.getElementById("brand").innerHTML = `<option value="">Enter your vehicle brand and model</option>`;
    document.getElementById("model").innerHTML = `<option value="">Enter your vehicle brand and model</option>`;
    document.getElementById("fuelType").innerHTML = `<option value="">Select Fuel Type</option>`;
    clearAutoFields();
}

function clearAutoFields() {
    document.getElementById("engineCc").value = "";
    document.getElementById("companyMileage").value = "";
    document.getElementById("tankCapacity").value = "";
}

function resetFormAfterDelete() {
    currentVehicleId = null;
    document.getElementById("vehicleProfileForm").reset();
    document.getElementById("ownerName").value = loggedInUser.fullName || localStorage.getItem("fullName") || "";
    document.getElementById("ownerRole").value = loggedInUser.role || localStorage.getItem("role") || "";
    document.getElementById("vehiclePhotoPreview").src = "images/default-vehicle.jpg";
    document.getElementById("saveVehicleBtn").innerText = "Save Vehicle";
    document.getElementById("deleteVehicleBtn").classList.add("hidden-section");
    document.getElementById("carCategorySection").classList.add("hidden-section");
}

function showVehicleMessage(message, className) {
    const messageElement = document.getElementById("vehicleMessage");
    messageElement.className = className;
    messageElement.innerText = message;
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

function updateSmartNumberPlate() {
    const vehicleType = document.getElementById("vehicleType").value;
    const metroArea = document.getElementById("vehicleMetroArea").value;
    const engineCc = Number(document.getElementById("engineCc").value);
    const vehicleNumberDigits = document.getElementById("vehicleNumberDigits").value.trim();

    const plateSeries = resolvePlateSeries(vehicleType, engineCc);

    document.getElementById("plateSeries").value = plateSeries;

    if (!metroArea || !plateSeries || vehicleNumberDigits.length !== 6) {
        document.getElementById("numberPlate").value = "";
        return;
    }

    document.getElementById("numberPlate").value = metroArea + " " + plateSeries + " " + vehicleNumberDigits;
}

function resolvePlateSeries(vehicleType, engineCc) {
    if (!vehicleType || !engineCc || engineCc <= 0) {
        return "";
    }

    if (vehicleType === "BIKE") {
        return resolveBikePlateSeries(engineCc);
    }

    if (vehicleType === "CAR") {
        return resolveCarPlateSeries(engineCc);
    }

    return "";
}

function resolveBikePlateSeries(engineCc) {
    if (engineCc <= 80) {
        return "HA";
    }

    if (engineCc <= 100) {
        return "JA";
    }

    if (engineCc <= 125) {
        return "JHA";
    }

    if (engineCc <= 150) {
        return "LA";
    }

    if (engineCc <= 165) {
        return "MA";
    }

    if (engineCc <= 200) {
        return "FA";
    }

    if (engineCc <= 250) {
        return "BA";
    }

    if (engineCc <= 350) {
        return "KA";
    }

    if (engineCc <= 500) {
        return "KHA";
    }

    return "GA";
}

function resolveCarPlateSeries(engineCc) {
    if (engineCc <= 800) {
        return "KA";
    }

    if (engineCc <= 1000) {
        return "KHA";
    }

    if (engineCc <= 1200) {
        return "GA";
    }

    if (engineCc <= 1300) {
        return "GHA";
    }

    if (engineCc <= 1500) {
        return "CHA";
    }

    if (engineCc <= 1600) {
        return "CHHA";
    }

    if (engineCc <= 1800) {
        return "JA";
    }

    if (engineCc <= 2000) {
        return "JHA";
    }

    if (engineCc <= 2200) {
        return "TA";
    }

    if (engineCc <= 2500) {
        return "THA";
    }

    if (engineCc <= 2700) {
        return "DA";
    }

    if (engineCc <= 3000) {
        return "DHA";
    }

    if (engineCc <= 3500) {
        return "NA";
    }

    if (engineCc <= 4000) {
        return "PA";
    }

    if (engineCc <= 4500) {
        return "PHA";
    }

    if (engineCc <= 5000) {
        return "BA";
    }

    if (engineCc <= 5700) {
        return "BHA";
    }

    return "MA";
}

function loadSmartPlateIntoForm(numberPlate) {
    document.getElementById("vehicleMetroArea").value = "";
    document.getElementById("plateSeries").value = "";
    document.getElementById("vehicleNumberDigits").value = "";
    document.getElementById("numberPlate").value = numberPlate || "";

    if (!numberPlate) {
        return;
    }

    const parts = numberPlate.trim().split(" ");

    if (parts.length < 3) {
        return;
    }

    const digits = parts[parts.length - 1];
    const series = parts[parts.length - 2];
    const metroArea = parts.slice(0, parts.length - 2).join(" ");

    document.getElementById("vehicleMetroArea").value = metroArea;
    document.getElementById("plateSeries").value = series;
    document.getElementById("vehicleNumberDigits").value = digits;
}