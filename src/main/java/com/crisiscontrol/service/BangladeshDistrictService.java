package com.crisiscontrol.service;

import com.crisiscontrol.dto.DistrictOptionResponse;
import com.crisiscontrol.helper.BangladeshDistrictInfo;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
public class BangladeshDistrictService {

    private static final List<BangladeshDistrictInfo> DISTRICTS = List.of(
            // Dhaka Division
            new BangladeshDistrictInfo("Dhaka", "Dhaka", 23.8103, 90.4125),
            new BangladeshDistrictInfo("Faridpur", "Dhaka", 23.6070, 89.8429),
            new BangladeshDistrictInfo("Gazipur", "Dhaka", 23.9999, 90.4203),
            new BangladeshDistrictInfo("Gopalganj", "Dhaka", 23.0051, 89.8266),
            new BangladeshDistrictInfo("Kishoreganj", "Dhaka", 24.4449, 90.7766),
            new BangladeshDistrictInfo("Madaripur", "Dhaka", 23.1641, 90.1897),
            new BangladeshDistrictInfo("Manikganj", "Dhaka", 23.8617, 90.0003),
            new BangladeshDistrictInfo("Munshiganj", "Dhaka", 23.5422, 90.5305),
            new BangladeshDistrictInfo("Narayanganj", "Dhaka", 23.6238, 90.5000),
            new BangladeshDistrictInfo("Narsingdi", "Dhaka", 23.9322, 90.7154),
            new BangladeshDistrictInfo("Rajbari", "Dhaka", 23.7574, 89.6440),
            new BangladeshDistrictInfo("Shariatpur", "Dhaka", 23.2423, 90.4348),
            new BangladeshDistrictInfo("Tangail", "Dhaka", 24.2513, 89.9167),

            // Chattogram Division
            new BangladeshDistrictInfo("Chattogram", "Chattogram", 22.3569, 91.7832),
            new BangladeshDistrictInfo("Bandarban", "Chattogram", 22.1953, 92.2184),
            new BangladeshDistrictInfo("Brahmanbaria", "Chattogram", 23.9571, 91.1119),
            new BangladeshDistrictInfo("Chandpur", "Chattogram", 23.2333, 90.6713),
            new BangladeshDistrictInfo("Cox's Bazar", "Chattogram", 21.4272, 92.0058),
            new BangladeshDistrictInfo("Cumilla", "Chattogram", 23.4607, 91.1809),
            new BangladeshDistrictInfo("Feni", "Chattogram", 23.0159, 91.3976),
            new BangladeshDistrictInfo("Khagrachhari", "Chattogram", 23.1193, 91.9847),
            new BangladeshDistrictInfo("Lakshmipur", "Chattogram", 22.9447, 90.8282),
            new BangladeshDistrictInfo("Noakhali", "Chattogram", 22.8246, 91.1017),
            new BangladeshDistrictInfo("Rangamati", "Chattogram", 22.7324, 92.2985),

            // Rajshahi Division
            new BangladeshDistrictInfo("Rajshahi", "Rajshahi", 24.3745, 88.6042),
            new BangladeshDistrictInfo("Bogura", "Rajshahi", 24.8465, 89.3773),
            new BangladeshDistrictInfo("Joypurhat", "Rajshahi", 25.1015, 89.0273),
            new BangladeshDistrictInfo("Naogaon", "Rajshahi", 24.7936, 88.9318),
            new BangladeshDistrictInfo("Natore", "Rajshahi", 24.4206, 89.0003),
            new BangladeshDistrictInfo("Chapainawabganj", "Rajshahi", 24.5965, 88.2775),
            new BangladeshDistrictInfo("Pabna", "Rajshahi", 24.0064, 89.2372),
            new BangladeshDistrictInfo("Sirajganj", "Rajshahi", 24.4534, 89.7007),

            // Khulna Division
            new BangladeshDistrictInfo("Khulna", "Khulna", 22.8456, 89.5403),
            new BangladeshDistrictInfo("Bagerhat", "Khulna", 22.6516, 89.7859),
            new BangladeshDistrictInfo("Chuadanga", "Khulna", 23.6402, 88.8418),
            new BangladeshDistrictInfo("Jashore", "Khulna", 23.1634, 89.2182),
            new BangladeshDistrictInfo("Jhenaidah", "Khulna", 23.5448, 89.1539),
            new BangladeshDistrictInfo("Kushtia", "Khulna", 23.9013, 89.1205),
            new BangladeshDistrictInfo("Magura", "Khulna", 23.4873, 89.4198),
            new BangladeshDistrictInfo("Meherpur", "Khulna", 23.7622, 88.6318),
            new BangladeshDistrictInfo("Narail", "Khulna", 23.1725, 89.5127),
            new BangladeshDistrictInfo("Satkhira", "Khulna", 22.7185, 89.0705),

            // Barishal Division
            new BangladeshDistrictInfo("Barishal", "Barishal", 22.7010, 90.3535),
            new BangladeshDistrictInfo("Barguna", "Barishal", 22.0953, 90.1121),
            new BangladeshDistrictInfo("Bhola", "Barishal", 22.6859, 90.6482),
            new BangladeshDistrictInfo("Jhalokati", "Barishal", 22.6406, 90.1987),
            new BangladeshDistrictInfo("Patuakhali", "Barishal", 22.3596, 90.3299),
            new BangladeshDistrictInfo("Pirojpur", "Barishal", 22.5841, 89.9720),

            // Sylhet Division
            new BangladeshDistrictInfo("Sylhet", "Sylhet", 24.8949, 91.8687),
            new BangladeshDistrictInfo("Habiganj", "Sylhet", 24.3749, 91.4155),
            new BangladeshDistrictInfo("Moulvibazar", "Sylhet", 24.4829, 91.7774),
            new BangladeshDistrictInfo("Sunamganj", "Sylhet", 25.0658, 91.3950),

            // Rangpur Division
            new BangladeshDistrictInfo("Rangpur", "Rangpur", 25.7439, 89.2752),
            new BangladeshDistrictInfo("Dinajpur", "Rangpur", 25.6279, 88.6332),
            new BangladeshDistrictInfo("Gaibandha", "Rangpur", 25.3288, 89.5281),
            new BangladeshDistrictInfo("Kurigram", "Rangpur", 25.8072, 89.6295),
            new BangladeshDistrictInfo("Lalmonirhat", "Rangpur", 25.9167, 89.4500),
            new BangladeshDistrictInfo("Nilphamari", "Rangpur", 25.9310, 88.8560),
            new BangladeshDistrictInfo("Panchagarh", "Rangpur", 26.3411, 88.5542),
            new BangladeshDistrictInfo("Thakurgaon", "Rangpur", 26.0337, 88.4617),

            // Mymensingh Division
            new BangladeshDistrictInfo("Mymensingh", "Mymensingh", 24.7471, 90.4203),
            new BangladeshDistrictInfo("Jamalpur", "Mymensingh", 24.9375, 89.9370),
            new BangladeshDistrictInfo("Netrokona", "Mymensingh", 24.8709, 90.7279),
            new BangladeshDistrictInfo("Sherpur", "Mymensingh", 25.0205, 90.0153)
    );

    public List<DistrictOptionResponse> getAllDistricts() {
        return DISTRICTS.stream()
                .sorted(Comparator.comparing(BangladeshDistrictInfo::getDivisionName)
                        .thenComparing(BangladeshDistrictInfo::getDistrictName))
                .map(this::mapToResponse)
                .toList();
    }

    public Optional<BangladeshDistrictInfo> findDistrict(String districtName) {
        if (districtName == null || districtName.trim().isEmpty()) {
            return Optional.empty();
        }

        String normalizedInput = normalizeDistrictName(districtName);

        return DISTRICTS.stream()
                .filter(district -> normalizeDistrictName(district.getDistrictName()).equals(normalizedInput))
                .findFirst();
    }

    public boolean districtExists(String districtName) {
        return findDistrict(districtName).isPresent();
    }

    public String normalizeDisplayName(String districtName) {
        return findDistrict(districtName)
                .map(BangladeshDistrictInfo::getDistrictName)
                .orElse(districtName);
    }

    private DistrictOptionResponse mapToResponse(BangladeshDistrictInfo district) {
        return DistrictOptionResponse.builder()
                .districtName(district.getDistrictName())
                .divisionName(district.getDivisionName())
                .latitude(district.getLatitude())
                .longitude(district.getLongitude())
                .build();
    }

    private String normalizeDistrictName(String value) {
        return value.trim()
                .toLowerCase()
                .replace("’", "'")
                .replace("`", "'")
                .replace(".", "")
                .replace("-", "")
                .replace("_", "")
                .replaceAll("\\s+", "");
    }
}