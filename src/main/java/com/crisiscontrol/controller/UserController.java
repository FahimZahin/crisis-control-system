package com.crisiscontrol.controller;

import com.crisiscontrol.dto.ProfileUpdateRequest;
import com.crisiscontrol.entity.Role;
import com.crisiscontrol.entity.User;
import com.crisiscontrol.entity.UserStatus;
import com.crisiscontrol.repository.PumpProfileRepository;
import com.crisiscontrol.repository.UserRepository;
import com.crisiscontrol.service.UserDeleteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class UserController {

    private static final double DAILY_OUTAGE_HOURS = 2.0;
    private static final double WEEKLY_DAYS = 7.0;
    private static final double LIGHT_WATT = 20.0;
    private static final double FAN_WATT = 75.0;
    private static final double LIGHTS_PER_FLAT = 2.0;
    private static final double FANS_PER_FLAT = 2.0;
    private static final double DIESEL_LITER_PER_KWH = 0.27;
    private static final double GENERATOR_SAFE_LOAD_FACTOR = 0.80;

    private final UserDeleteService userDeleteService;
    private final UserRepository userRepository;
    private final PumpProfileRepository pumpProfileRepository;

    @PutMapping("/api/users/{userId}/profile")
    public ResponseEntity<Map<String, Object>> updateProfile(
            @PathVariable Long userId,
            @RequestBody ProfileUpdateRequest request
    ) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getStatus() == UserStatus.INACTIVE) {
            throw new RuntimeException("Your account is inactive. Please request activation first.");
        }

        if (user.getStatus() == UserStatus.BLOCKED) {
            throw new RuntimeException("Your account is blocked.");
        }

        validateProfileUpdate(request, user);

        user.setFullName(request.getFullName().trim());
        user.setPhoneNumber(request.getPhoneNumber().trim());
        user.setAddress(emptyToNull(request.getAddress()));
        updateUserCoordinates(user, request.getLatitude(), request.getLongitude());

        updateAllowedThanaField(user, request.getThanaOrUpazila());

        User savedUser = userRepository.save(user);
        syncPumpProfileLocation(savedUser);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("message", "Profile updated successfully in database.");
        response.put("userId", savedUser.getId());
        response.put("fullName", savedUser.getFullName());
        response.put("phoneNumber", savedUser.getPhoneNumber());
        response.put("address", savedUser.getAddress());
        response.put("latitude", savedUser.getLatitude());
        response.put("longitude", savedUser.getLongitude());
        response.put("role", savedUser.getRole());
        response.put("status", savedUser.getStatus());
        response.put("thanaOrUpazila", resolveUserThana(savedUser));
        response.put("buildingUnderThana", savedUser.getBuildingUnderThana());
        response.put("hospitalUnderThana", savedUser.getHospitalUnderThana());
        response.put("serviceArea", savedUser.getServiceArea());
        response.put("assignedArea", savedUser.getAssignedArea());
        response.put("district", savedUser.getDistrict());

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/api/users/{userId}")
    public ResponseEntity<Map<String, String>> deleteUser(@PathVariable Long userId) {
        userDeleteService.deleteUserCompletely(userId);

        return ResponseEntity.ok(
                Map.of("message", "User profile and related records deleted successfully from database.")
        );
    }

    @GetMapping("/api/admin/building-allocations")
    public ResponseEntity<List<Map<String, Object>>> getBuildingAllocations() {
        List<Map<String, Object>> buildings = userRepository.findByRole(Role.BUILDING_MANAGER)
                .stream()
                .map(this::mapBuildingAllocation)
                .toList();

        return ResponseEntity.ok(buildings);
    }

    @GetMapping("/api/users/{userId}/building-allocation")
    public ResponseEntity<Map<String, Object>> getBuildingAllocationByUser(
            @PathVariable Long userId
    ) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getRole() != Role.BUILDING_MANAGER) {
            throw new RuntimeException("Only building manager allocation can be loaded from this endpoint");
        }

        return ResponseEntity.ok(mapBuildingAllocation(user));
    }

    @PutMapping("/api/admin/building-allocations/{userId}")
    public ResponseEntity<Map<String, Object>> updateBuildingAllocation(
            @PathVariable Long userId,
            @RequestBody Map<String, Object> request
    ) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Building manager not found"));

        if (user.getRole() != Role.BUILDING_MANAGER) {
            throw new RuntimeException("Selected user is not a building manager");
        }

        BigDecimal weeklyAllocation = readBigDecimal(request.get("weeklyAllocationLiter"));

        if (weeklyAllocation.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Weekly allocation must be greater than 0");
        }

        user.setBuildingWeeklyAllocationLiter(weeklyAllocation.doubleValue());
        userRepository.save(user);

        Map<String, Object> response = mapBuildingAllocation(user);
        response.put("message", "Building weekly diesel allocation updated successfully");

        return ResponseEntity.ok(response);
    }

    private void validateProfileUpdate(ProfileUpdateRequest request, User user) {
        if (request == null) {
            throw new RuntimeException("Profile update request is required");
        }

        if (isBlank(request.getFullName())) {
            throw new RuntimeException("Full name is required");
        }

        if (request.getFullName().trim().length() < 2) {
            throw new RuntimeException("Full name must be at least 2 characters");
        }

        if (isBlank(request.getPhoneNumber())) {
            throw new RuntimeException("Phone number is required");
        }

        if (!request.getPhoneNumber().trim().matches("^[0-9]{11}$")) {
            throw new RuntimeException("Phone number must be exactly 11 digits");
        }

        userRepository.findByPhoneNumber(request.getPhoneNumber().trim())
                .ifPresent(existingUser -> {
                    if (!existingUser.getId().equals(user.getId())) {
                        throw new RuntimeException("Phone number already registered by another user");
                    }
                });

        if (requiresEditableThana(user.getRole()) && isBlank(request.getThanaOrUpazila())) {
            throw new RuntimeException("Thana / Upazila is required for this role");
        }

        validateCoordinatePair(request.getLatitude(), request.getLongitude());
    }

    private void updateUserCoordinates(User user, Double latitude, Double longitude) {
        if (latitude == null && longitude == null) {
            return;
        }

        user.setLatitude(latitude);
        user.setLongitude(longitude);
    }

    private void syncPumpProfileLocation(User user) {
        if (user.getRole() != Role.PUMP_AUTHORITY) {
            return;
        }

        pumpProfileRepository.findByUserId(user.getId()).ifPresent(pumpProfile -> {
            pumpProfile.setLatitude(user.getLatitude());
            pumpProfile.setLongitude(user.getLongitude());
            pumpProfileRepository.save(pumpProfile);
        });
    }

    private void validateCoordinatePair(Double latitude, Double longitude) {
        if (latitude == null && longitude == null) {
            return;
        }

        if (latitude == null || longitude == null) {
            throw new RuntimeException("Both latitude and longitude are required when updating location");
        }

        if (latitude < -90 || latitude > 90) {
            throw new RuntimeException("Latitude must be between -90 and 90");
        }

        if (longitude < -180 || longitude > 180) {
            throw new RuntimeException("Longitude must be between -180 and 180");
        }
    }

    private void updateAllowedThanaField(User user, String thanaValue) {
        if (!requiresEditableThana(user.getRole())) {
            return;
        }

        String cleanedThana = cleanArea(thanaValue);

        user.setThanaOrUpazila(cleanedThana);

        if (user.getRole() == Role.BUILDING_MANAGER) {
            user.setBuildingUnderThana(cleanedThana);
        }

        if (user.getRole() == Role.HOSPITAL_AUTHORITY) {
            user.setHospitalUnderThana(cleanedThana);
        }
    }

    private boolean requiresEditableThana(Role role) {
        return role == Role.PUMP_AUTHORITY
                || role == Role.BUILDING_MANAGER
                || role == Role.HOSPITAL_AUTHORITY;
    }

    private String resolveUserThana(User user) {
        return firstNonBlank(
                user.getThanaOrUpazila(),
                user.getBuildingUnderThana(),
                user.getHospitalUnderThana(),
                user.getServiceArea(),
                user.getAssignedArea(),
                user.getDistrict()
        );
    }

    private String cleanArea(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        String normalized = trimmed
                .replace("-", "")
                .replace("_", "")
                .replaceAll("\\s+", "")
                .toLowerCase();

        if (normalized.equals("gulsan") || normalized.equals("gulshan")) {
            return "Gulshan";
        }

        if (normalized.equals("basabo")
                || normalized.equals("bashabo")
                || normalized.equals("southbasabo")
                || normalized.equals("northbasabo")
                || normalized.equals("sabujbag")
                || normalized.equals("sabujbagh")) {
            return "Sabujbagh";
        }

        if (normalized.equals("sherebanglanagar")
                || normalized.equals("sherebangla")
                || normalized.equals("sherabanglanagar")) {
            return "Sher-e-Bangla Nagar";
        }

        return trimmed;
    }

    private Map<String, Object> mapBuildingAllocation(User user) {
        BigDecimal suggestedAllocation = calculateSuggestedBuildingWeeklyAllocation(user);
        BigDecimal currentAllocation = getCurrentAllocation(user, suggestedAllocation);
        BigDecimal requiredLoadKw = calculateRequiredBuildingLoadKw(user.getNumberOfFlats());
        BigDecimal safeGeneratorCapacityKw = calculateSafeGeneratorCapacityKw(user.getGeneratorPower());
        boolean generatorOverloadRisk = requiredLoadKw.compareTo(BigDecimal.ZERO) > 0
                && safeGeneratorCapacityKw.compareTo(BigDecimal.ZERO) > 0
                && requiredLoadKw.compareTo(safeGeneratorCapacityKw) > 0;

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("userId", user.getId());
        response.put("fullName", user.getFullName());
        response.put("phoneNumber", user.getPhoneNumber());
        response.put("buildingName", user.getBuildingName());
        response.put("holdingNumber", user.getHoldingNumber());
        response.put("buildingUnderThana", user.getBuildingUnderThana());
        response.put("numberOfFlats", user.getNumberOfFlats());
        response.put("generatorCapacityKva", user.getGeneratorPower());
        response.put("requiredLoadKw", requiredLoadKw);
        response.put("safeGeneratorCapacityKw", safeGeneratorCapacityKw);
        response.put("suggestedWeeklyAllocationLiter", suggestedAllocation);
        response.put("currentWeeklyAllocationLiter", currentAllocation);
        response.put("generatorOverloadRisk", generatorOverloadRisk);
        response.put("formula", "min(numberOfFlats × 0.19 kW, generatorCapacity × 0.8) × 14 hours/week × 0.27 L/kWh");

        return response;
    }

    private BigDecimal getCurrentAllocation(User user, BigDecimal suggestedAllocation) {
        if (user.getBuildingWeeklyAllocationLiter() != null && user.getBuildingWeeklyAllocationLiter() > 0) {
            return BigDecimal.valueOf(user.getBuildingWeeklyAllocationLiter()).setScale(2, RoundingMode.HALF_UP);
        }

        return suggestedAllocation;
    }

    private BigDecimal calculateSuggestedBuildingWeeklyAllocation(User user) {
        BigDecimal requiredLoadKw = calculateRequiredBuildingLoadKw(user.getNumberOfFlats());
        BigDecimal safeGeneratorCapacityKw = calculateSafeGeneratorCapacityKw(user.getGeneratorPower());

        BigDecimal effectiveLoadKw = requiredLoadKw;

        if (safeGeneratorCapacityKw.compareTo(BigDecimal.ZERO) > 0
                && safeGeneratorCapacityKw.compareTo(requiredLoadKw) < 0) {
            effectiveLoadKw = safeGeneratorCapacityKw;
        }

        BigDecimal weeklyOutageHours = BigDecimal.valueOf(DAILY_OUTAGE_HOURS * WEEKLY_DAYS);

        BigDecimal dieselLiter = effectiveLoadKw
                .multiply(weeklyOutageHours)
                .multiply(BigDecimal.valueOf(DIESEL_LITER_PER_KWH));

        return roundUpLiter(dieselLiter);
    }

    private BigDecimal calculateRequiredBuildingLoadKw(Integer numberOfFlats) {
        if (numberOfFlats == null || numberOfFlats <= 0) {
            return BigDecimal.ZERO;
        }

        double perFlatWatt = (LIGHTS_PER_FLAT * LIGHT_WATT) + (FANS_PER_FLAT * FAN_WATT);
        double perFlatKw = perFlatWatt / 1000.0;

        return BigDecimal.valueOf(numberOfFlats)
                .multiply(BigDecimal.valueOf(perFlatKw))
                .setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateSafeGeneratorCapacityKw(Double generatorCapacityKva) {
        if (generatorCapacityKva == null || generatorCapacityKva <= 0) {
            return BigDecimal.ZERO;
        }

        return BigDecimal.valueOf(generatorCapacityKva)
                .multiply(BigDecimal.valueOf(GENERATOR_SAFE_LOAD_FACTOR))
                .setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal roundUpLiter(BigDecimal value) {
        if (value == null || value.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        return BigDecimal.valueOf(Math.ceil(value.doubleValue())).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal readBigDecimal(Object value) {
        if (value == null) {
            throw new RuntimeException("Weekly allocation is required");
        }

        try {
            return new BigDecimal(String.valueOf(value));
        } catch (NumberFormatException exception) {
            throw new RuntimeException("Weekly allocation must be a valid number");
        }
    }

    private String emptyToNull(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }

        return value.trim();
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (
                    value != null
                            && !value.trim().isEmpty()
                            && !value.trim().equals("-")
                            && !value.trim().equalsIgnoreCase("Not Provided")
                            && !value.trim().equalsIgnoreCase("null")
                            && !value.trim().equalsIgnoreCase("undefined")
            ) {
                return value.trim();
            }
        }

        return null;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}