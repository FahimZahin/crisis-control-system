package com.crisiscontrol.controller;

import com.crisiscontrol.entity.Role;
import com.crisiscontrol.entity.User;
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
}