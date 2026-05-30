const CCS_DHAKA_THANAS = [
    "Adabor",
    "Badda",
    "Bangshal",
    "Bimanbandar",
    "Cantonment",
    "Chalkbazar",
    "Dakshinkhan",
    "Darus Salam",
    "Demra",
    "Dhanmondi",
    "Gendaria",
    "Gulshan",
    "Hazaribagh",
    "Jatrabari",
    "Kadamtali",
    "Kafrul",
    "Kalabagan",
    "Kamrangirchar",
    "Khilgaon",
    "Khilkhet",
    "Kotwali",
    "Lalbagh",
    "Mirpur",
    "Mohammadpur",
    "Motijheel",
    "Mugda",
    "New Market",
    "Pallabi",
    "Paltan",
    "Ramna",
    "Rampura",
    "Sabujbagh",
    "Shah Ali",
    "Shahbagh",
    "Sher-e-Bangla Nagar",
    "Shyampur",
    "Sutrapur",
    "Tejgaon",
    "Tejgaon Industrial Area",
    "Turag",
    "Uttara East",
    "Uttara West",
    "Vatara",
    "Wari"
];

function populateDhakaThanaSelect(selectId, selectedValue) {
    const select = document.getElementById(selectId);

    if (!select) {
        return;
    }

    const selected = normalizeCcsDhakaThana(selectedValue || select.value || "");

    select.innerHTML = `<option value="">Select thana</option>`;

    CCS_DHAKA_THANAS.forEach(function (thana) {
        const option = document.createElement("option");
        option.value = thana;
        option.textContent = thana;

        if (selected && normalizeCcsDhakaThana(thana) === selected) {
            option.selected = true;
        }

        select.appendChild(option);
    });
}

function isValidCcsDhakaThana(value) {
    const normalized = normalizeCcsDhakaThana(value);

    return CCS_DHAKA_THANAS.some(function (thana) {
        return normalizeCcsDhakaThana(thana) === normalized;
    });
}

function normalizeCcsDhakaThana(value) {
    if (!value) {
        return "";
    }

    let normalized = String(value)
        .trim()
        .replaceAll("_", " ")
        .replaceAll("–", "-")
        .replaceAll("—", "-")
        .replace(/\s+/g, " ")
        .toLowerCase();

    if (normalized === "gulsan") {
        normalized = "gulshan";
    }

    if (
        normalized === "sher e bangla nagar" ||
        normalized === "sher-e bangla nagar" ||
        normalized === "sher e-bangla nagar" ||
        normalized === "shere bangla nagar" ||
        normalized === "sher bangla nagar"
    ) {
        normalized = "sher-e-bangla nagar";
    }

    if (normalized === "sabuj bagh") {
        normalized = "sabujbagh";
    }

    return normalized;
}