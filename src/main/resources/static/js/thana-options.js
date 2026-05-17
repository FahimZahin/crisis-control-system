const CCS_DESCO_THANAS = [
    "Uttara East",
    "Uttara West",
    "Dakshinkhan",
    "Uttarkhan",
    "Khilkhet",
    "Turag",
    "Gulshan",
    "Banani",
    "Badda",
    "Baridhara",
    "Mirpur",
    "Pallabi",
    "Rupnagar",
    "Shah Ali",
    "Kafrul",
    "Darus Salam",
    "Agargaon",
    "Sher-e-Bangla Nagar",
    "Cantonment"
];

const CCS_DPDC_THANAS = [
    "Ramna",
    "Shahbagh",
    "Dhanmondi",
    "Kalabagan",
    "New Market",
    "Hazaribagh",
    "Lalbagh",
    "Chawkbazar",
    "Kotwali",
    "Sutrapur",
    "Wari",
    "Gendaria",
    "Bangshal",
    "Motijheel",
    "Paltan",
    "Shyampur",
    "Kadamtali",
    "Jatrabari",
    "Demra",
    "Kamrangirchar",
    "Khilgaon",
    "Sabujbagh",
    "Mugda"
];

const CCS_ALL_DHAKA_THANAS = [
    ...CCS_DESCO_THANAS,
    ...CCS_DPDC_THANAS
];

function populateDhakaThanaSelect(selectId, selectedValue) {
    const select = document.getElementById(selectId);

    if (!select) {
        return;
    }

    const normalizedSelected = normalizeCcsThanaName(selectedValue);

    select.innerHTML = `<option value="">Select hospital thana</option>`;

    const descoGroup = document.createElement("optgroup");
    descoGroup.label = "DESCO / Dhaka North City Corporation";

    CCS_DESCO_THANAS.forEach(function (thana) {
        const option = document.createElement("option");
        option.value = thana;
        option.innerText = thana;

        if (normalizeCcsThanaName(thana) === normalizedSelected) {
            option.selected = true;
        }

        descoGroup.appendChild(option);
    });

    const dpdcGroup = document.createElement("optgroup");
    dpdcGroup.label = "DPDC / Dhaka South City Corporation";

    CCS_DPDC_THANAS.forEach(function (thana) {
        const option = document.createElement("option");
        option.value = thana;
        option.innerText = thana;

        if (normalizeCcsThanaName(thana) === normalizedSelected) {
            option.selected = true;
        }

        dpdcGroup.appendChild(option);
    });

    select.appendChild(descoGroup);
    select.appendChild(dpdcGroup);
}

function normalizeCcsThanaName(value) {
    if (!value) {
        return "";
    }

    let normalized = value
        .toString()
        .toLowerCase()
        .replaceAll(" ", "")
        .replaceAll("-", "")
        .replaceAll("_", "")
        .trim();

    const aliasMap = {
        "gulsan": "gulshan",
        "gulshan": "gulshan",
        "shahbag": "shahbagh",
        "shahbagh": "shahbagh",
        "sherbanglanagar": "sher e bangla nagar",
        "sherebanglanagar": "sher e bangla nagar",
        "sher-e-banglanagar": "sher e bangla nagar",
        "sher-e-bangla-nagar": "sher e bangla nagar",
        "newmarket": "newmarket",
        "darussalam": "darussalam",
        "uttaraeast": "uttaraeast",
        "uttarawest": "uttarawest",
        "shahali": "shahali"
    };

    return aliasMap[normalized] || normalized;
}

function isValidCcsDhakaThana(value) {
    const normalizedValue = normalizeCcsThanaName(value);

    return CCS_ALL_DHAKA_THANAS.some(function (thana) {
        return normalizeCcsThanaName(thana) === normalizedValue;
    });
}