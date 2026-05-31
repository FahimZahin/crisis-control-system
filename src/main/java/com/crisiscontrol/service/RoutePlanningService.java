package com.crisiscontrol.service;

import com.crisiscontrol.dto.RoutePlanRequest;
import com.crisiscontrol.dto.RoutePlanResponse;
import com.crisiscontrol.dto.RoutePumpSuggestionResponse;
import com.crisiscontrol.entity.FuelType;
import com.crisiscontrol.entity.PumpFuelStock;
import com.crisiscontrol.entity.PumpProfile;
import com.crisiscontrol.entity.PumpStatus;
import com.crisiscontrol.entity.Vehicle;
import com.crisiscontrol.repository.PumpFuelStockRepository;
import com.crisiscontrol.repository.PumpProfileRepository;
import com.crisiscontrol.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RoutePlanningService {

    private static final BigDecimal SAFETY_BUFFER_KM = BigDecimal.valueOf(20.00);

    private final VehicleRepository vehicleRepository;
    private final PumpProfileRepository pumpProfileRepository;
    private final PumpFuelStockRepository pumpFuelStockRepository;

    public RoutePlanResponse planRoute(RoutePlanRequest request) {
        validateRequest(request);

        Vehicle vehicle = vehicleRepository.findById(request.getVehicleId())
                .orElseThrow(() -> new RuntimeException("Vehicle not found"));

        if (Boolean.TRUE.equals(vehicle.getDeleted())) {
            throw new RuntimeException("Deleted vehicle cannot be used for route planning");
        }

        if (request.getUserId() != null && !vehicle.getUser().getId().equals(request.getUserId())) {
            throw new RuntimeException("This vehicle does not belong to the logged-in user");
        }

        BigDecimal distanceKm = resolveDistance(request.getSourceCity(), request.getDestinationCity());
        BigDecimal totalPlannedDistance = distanceKm.add(SAFETY_BUFFER_KM).setScale(2, RoundingMode.HALF_UP);

        BigDecimal mileage = safePositive(vehicle.getCompanyMileage(), "Vehicle mileage is missing or invalid");

        BigDecimal currentFuel = request.getCurrentFuelLiter() == null
                ? safeMoney(vehicle.getCurrentFuelLiter())
                : safeMoney(request.getCurrentFuelLiter());

        BigDecimal currentRange = currentFuel.multiply(mileage).setScale(2, RoundingMode.HALF_UP);
        BigDecimal requiredFuel = totalPlannedDistance.divide(mileage, 2, RoundingMode.CEILING);
        BigDecimal shortage = requiredFuel.subtract(currentFuel).setScale(2, RoundingMode.HALF_UP);

        if (shortage.compareTo(BigDecimal.ZERO) < 0) {
            shortage = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        boolean canCompleteTrip = shortage.compareTo(BigDecimal.ZERO) <= 0;

        String decision = canCompleteTrip ? "ENOUGH_FUEL" : "REFUEL_RECOMMENDED";
        String message = canCompleteTrip
                ? "Your current fuel is enough for this route with a 20 km safety buffer."
                : "Your current fuel may not be enough. Suggested pumps are listed below.";

        List<RoutePumpSuggestionResponse> suggestions = suggestPumps(
                vehicle.getFuelType(),
                request.getSourceCity(),
                request.getDestinationCity(),
                shortage
        );

        return RoutePlanResponse.builder()
                .sourceCity(normalizeDisplayName(request.getSourceCity()))
                .destinationCity(normalizeDisplayName(request.getDestinationCity()))
                .routeDistanceKm(distanceKm)
                .safetyBufferKm(SAFETY_BUFFER_KM)
                .totalPlannedDistanceKm(totalPlannedDistance)
                .vehicleId(vehicle.getId())
                .vehicleName(vehicle.getBrand() + " " + vehicle.getModel())
                .numberPlate(vehicle.getNumberPlate())
                .fuelType(vehicle.getFuelType())
                .mileageKmPerLiter(mileage)
                .currentFuelLiter(currentFuel)
                .currentEstimatedRangeKm(currentRange)
                .requiredFuelLiter(requiredFuel)
                .shortageFuelLiter(shortage)
                .canCompleteTrip(canCompleteTrip)
                .decision(decision)
                .message(message)
                .suggestedPumps(suggestions)
                .build();
    }

    public List<String> getSupportedCities() {
        return cityDistances().keySet()
                .stream()
                .map(this::normalizeDisplayName)
                .sorted()
                .toList();
    }

    private List<RoutePumpSuggestionResponse> suggestPumps(
            FuelType fuelType,
            String sourceCity,
            String destinationCity,
            BigDecimal shortageFuelLiter
    ) {
        List<PumpProfile> pumps = pumpProfileRepository.findAllByOrderByUpdatedAtDesc();
        List<RoutePumpSuggestionResponse> suggestions = new ArrayList<>();

        for (PumpProfile pump : pumps) {
            if (!isPumpOperational(pump)) {
                continue;
            }

            List<PumpFuelStock> stocks = pumpFuelStockRepository.findByPumpProfileIdOrderByFuelTypeAsc(pump.getId());

            BigDecimal totalStock = stocks.stream()
                    .map(PumpFuelStock::getCurrentStock)
                    .filter(value -> value != null)
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .setScale(2, RoundingMode.HALF_UP);

            BigDecimal matchingStock = stocks.stream()
                    .filter(stock -> stock.getFuelType() == fuelType)
                    .map(PumpFuelStock::getCurrentStock)
                    .filter(value -> value != null)
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .setScale(2, RoundingMode.HALF_UP);

            if (matchingStock.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            String routeMatchNote = resolveRouteMatchNote(pump, sourceCity, destinationCity);
            String recommendationLevel = resolveRecommendationLevel(matchingStock, shortageFuelLiter, routeMatchNote);
            String reason = buildRecommendationReason(fuelType, matchingStock, shortageFuelLiter, routeMatchNote);

            suggestions.add(RoutePumpSuggestionResponse.builder()
                    .pumpId(pump.getId())
                    .pumpName(pump.getPumpName())
                    .pumpAddress(pump.getPumpAddress())
                    .ownerName(pump.getUser() == null ? "-" : pump.getUser().getFullName())
                    .phoneNumber(pump.getUser() == null ? "-" : pump.getUser().getPhoneNumber())
                    .pumpStatus(pump.getPumpStatus())
                    .fuelTypes(pump.getFuelTypes())
                    .open24Hours(Boolean.TRUE.equals(pump.getOpen24Hours()))
                    .openingTime(pump.getOpeningTime())
                    .closingTime(pump.getClosingTime())
                    .totalCurrentStock(totalStock)
                    .matchingFuelStock(matchingStock)
                    .recommendationLevel(recommendationLevel)
                    .recommendationReason(reason)
                    .routeMatchNote(routeMatchNote)
                    .build());
        }

        return suggestions.stream()
                .sorted(Comparator
                        .comparing(this::routePriority).reversed()
                        .thenComparing(RoutePumpSuggestionResponse::getMatchingFuelStock, Comparator.reverseOrder()))
                .limit(8)
                .toList();
    }

    private int routePriority(RoutePumpSuggestionResponse response) {
        if (response == null || response.getRecommendationLevel() == null) {
            return 0;
        }

        return switch (response.getRecommendationLevel()) {
            case "BEST" -> 3;
            case "GOOD" -> 2;
            case "AVAILABLE" -> 1;
            default -> 0;
        };
    }

    private boolean isPumpOperational(PumpProfile pump) {
        if (pump == null || pump.getPumpStatus() == null) {
            return false;
        }

        return pump.getPumpStatus() == PumpStatus.OPEN
                || pump.getPumpStatus() == PumpStatus.OPEN_WITH_DEBT;
    }

    private String resolveRecommendationLevel(BigDecimal matchingStock, BigDecimal shortageFuelLiter, String routeMatchNote) {
        BigDecimal shortage = safeMoney(shortageFuelLiter);

        if (!"General available pump".equals(routeMatchNote) && matchingStock.compareTo(shortage) >= 0) {
            return "BEST";
        }

        if (matchingStock.compareTo(shortage) >= 0) {
            return "GOOD";
        }

        return "AVAILABLE";
    }

    private String buildRecommendationReason(
            FuelType fuelType,
            BigDecimal matchingStock,
            BigDecimal shortageFuelLiter,
            String routeMatchNote
    ) {
        BigDecimal shortage = safeMoney(shortageFuelLiter);

        if (shortage.compareTo(BigDecimal.ZERO) <= 0) {
            return "This pump has " + matchingStock + " L " + fuelType + " available if you still want to refuel.";
        }

        if (matchingStock.compareTo(shortage) >= 0) {
            return "This pump has enough " + fuelType + " stock for your estimated shortage of " + shortage + " L.";
        }

        return "This pump has " + matchingStock + " L " + fuelType + ", which may partially support your route shortage of " + shortage + " L.";
    }

    private String resolveRouteMatchNote(PumpProfile pump, String sourceCity, String destinationCity) {
        String address = normalizeKey(pump.getPumpAddress());
        String source = normalizeKey(sourceCity);
        String destination = normalizeKey(destinationCity);

        if (!address.isBlank() && address.contains(source)) {
            return "Near source city";
        }

        if (!address.isBlank() && address.contains(destination)) {
            return "Near destination city";
        }

        List<String> corridorCities = corridorCities(sourceCity, destinationCity);

        for (String city : corridorCities) {
            if (!address.isBlank() && address.contains(normalizeKey(city))) {
                return "Possible route corridor: " + normalizeDisplayName(city);
            }
        }

        return "General available pump";
    }

    private BigDecimal resolveDistance(String sourceCity, String destinationCity) {
        String source = normalizeKey(sourceCity);
        String destination = normalizeKey(destinationCity);

        if (source.equals(destination)) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        Map<String, BigDecimal> sourceMap = cityDistances().get(source);

        if (sourceMap != null && sourceMap.containsKey(destination)) {
            return sourceMap.get(destination).setScale(2, RoundingMode.HALF_UP);
        }

        Map<String, BigDecimal> destinationMap = cityDistances().get(destination);

        if (destinationMap != null && destinationMap.containsKey(source)) {
            return destinationMap.get(source).setScale(2, RoundingMode.HALF_UP);
        }

        throw new RuntimeException("Route distance is not configured for "
                + normalizeDisplayName(sourceCity)
                + " to "
                + normalizeDisplayName(destinationCity)
                + ". Please choose a supported route.");
    }

    private Map<String, Map<String, BigDecimal>> cityDistances() {
        Map<String, Map<String, BigDecimal>> map = new LinkedHashMap<>();

        addDistance(map, "Dhaka", "Gazipur", 40);
        addDistance(map, "Dhaka", "Narayanganj", 25);
        addDistance(map, "Dhaka", "Mymensingh", 115);
        addDistance(map, "Dhaka", "Comilla", 100);
        addDistance(map, "Dhaka", "Chittagong", 250);
        addDistance(map, "Dhaka", "Sylhet", 240);
        addDistance(map, "Dhaka", "Rajshahi", 245);
        addDistance(map, "Dhaka", "Khulna", 270);
        addDistance(map, "Dhaka", "Barishal", 180);
        addDistance(map, "Dhaka", "Rangpur", 300);
        addDistance(map, "Dhaka", "Cox's Bazar", 390);
        addDistance(map, "Dhaka", "Tangail", 95);
        addDistance(map, "Dhaka", "Faridpur", 115);
        addDistance(map, "Dhaka", "Jessore", 210);

        addDistance(map, "Chittagong", "Cox's Bazar", 150);
        addDistance(map, "Chittagong", "Comilla", 150);
        addDistance(map, "Sylhet", "Mymensingh", 270);
        addDistance(map, "Rajshahi", "Rangpur", 210);
        addDistance(map, "Khulna", "Jessore", 60);
        addDistance(map, "Barishal", "Faridpur", 120);

        return map;
    }

    private void addDistance(Map<String, Map<String, BigDecimal>> map, String source, String destination, int km) {
        String sourceKey = normalizeKey(source);
        String destinationKey = normalizeKey(destination);

        map.computeIfAbsent(sourceKey, key -> new LinkedHashMap<>())
                .put(destinationKey, BigDecimal.valueOf(km));

        map.computeIfAbsent(destinationKey, key -> new LinkedHashMap<>())
                .put(sourceKey, BigDecimal.valueOf(km));
    }

    private List<String> corridorCities(String sourceCity, String destinationCity) {
        String source = normalizeKey(sourceCity);
        String destination = normalizeKey(destinationCity);

        if (source.equals("dhaka") || destination.equals("dhaka")) {
            String other = source.equals("dhaka") ? destination : source;

            if (other.equals("chittagong") || other.equals("coxsbazar") || other.equals("comilla")) {
                return List.of("Narayanganj", "Comilla", "Feni", "Chittagong");
            }

            if (other.equals("sylhet")) {
                return List.of("Narayanganj", "Bhairab", "Habiganj", "Sylhet");
            }

            if (other.equals("rajshahi") || other.equals("rangpur")) {
                return List.of("Gazipur", "Tangail", "Sirajganj", "Rajshahi", "Rangpur");
            }

            if (other.equals("khulna") || other.equals("jessore")) {
                return List.of("Faridpur", "Magura", "Jessore", "Khulna");
            }

            if (other.equals("barishal")) {
                return List.of("Mawa", "Faridpur", "Barishal");
            }

            if (other.equals("mymensingh")) {
                return List.of("Gazipur", "Mymensingh");
            }
        }

        return List.of();
    }

    private void validateRequest(RoutePlanRequest request) {
        if (request == null) {
            throw new RuntimeException("Route plan request is required");
        }

        if (request.getVehicleId() == null) {
            throw new RuntimeException("Vehicle is required for route planning");
        }

        if (isBlank(request.getSourceCity())) {
            throw new RuntimeException("Source city is required");
        }

        if (isBlank(request.getDestinationCity())) {
            throw new RuntimeException("Destination city is required");
        }

        if (normalizeKey(request.getSourceCity()).equals(normalizeKey(request.getDestinationCity()))) {
            throw new RuntimeException("Source and destination cannot be the same");
        }

        if (request.getCurrentFuelLiter() != null && request.getCurrentFuelLiter().compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("Current fuel liter cannot be negative");
        }
    }

    private BigDecimal safeMoney(BigDecimal value) {
        if (value == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal safePositive(BigDecimal value, String errorMessage) {
        if (value == null || value.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException(errorMessage);
        }

        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String normalizeKey(String value) {
        if (value == null) {
            return "";
        }

        return value.trim()
                .replace("'", "")
                .replace("’", "")
                .replace("-", "")
                .replace("_", "")
                .replaceAll("\\s+", "")
                .toLowerCase();
    }

    private String normalizeDisplayName(String value) {
        if (value == null || value.trim().isEmpty()) {
            return "-";
        }

        String trimmed = value.trim();

        if (normalizeKey(trimmed).equals("coxsbazar")) {
            return "Cox's Bazar";
        }

        String[] words = trimmed.replace("_", " ").split("\\s+");
        StringBuilder result = new StringBuilder();

        for (String word : words) {
            if (word.isBlank()) {
                continue;
            }

            if (!result.isEmpty()) {
                result.append(" ");
            }

            result.append(word.substring(0, 1).toUpperCase());

            if (word.length() > 1) {
                result.append(word.substring(1).toLowerCase());
            }
        }

        return result.toString();
    }
}