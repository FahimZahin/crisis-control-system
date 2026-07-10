package com.crisiscontrol.service;

import com.crisiscontrol.dto.DistrictOptionResponse;
import com.crisiscontrol.dto.RoutePlanRequest;
import com.crisiscontrol.dto.RoutePlanResponse;
import com.crisiscontrol.dto.RoutePumpSuggestionResponse;
import com.crisiscontrol.entity.FuelType;
import com.crisiscontrol.entity.PumpFuelStock;
import com.crisiscontrol.entity.PumpProfile;
import com.crisiscontrol.entity.PumpStatus;
import com.crisiscontrol.entity.RouteFuelToken;
import com.crisiscontrol.entity.RouteFuelTokenStatus;
import com.crisiscontrol.entity.Vehicle;
import com.crisiscontrol.repository.PumpFuelStockRepository;
import com.crisiscontrol.repository.PumpProfileRepository;
import com.crisiscontrol.repository.RouteFuelTokenRepository;
import com.crisiscontrol.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RoutePlanningService {

    /*
     * 50 km reserve means the system does not wait until the vehicle is almost empty.
     * This is better for crisis fuel planning because fuel may not be available everywhere.
     */
    private static final BigDecimal SAFETY_BUFFER_KM = BigDecimal.valueOf(50.00);

    private final VehicleRepository vehicleRepository;
    private final PumpProfileRepository pumpProfileRepository;
    private final PumpFuelStockRepository pumpFuelStockRepository;
    private final RouteFuelTokenRepository routeFuelTokenRepository;
    private final RouteDistanceService routeDistanceService;
    private final BangladeshDistrictService bangladeshDistrictService;

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

        BigDecimal distanceKm = routeDistanceService.getEstimatedRoadDistanceKm(
                request.getSourceCity(),
                request.getDestinationCity()
        );

        BigDecimal totalPlannedDistance = distanceKm.add(SAFETY_BUFFER_KM)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal mileage = safePositive(vehicle.getCompanyMileage(), "Vehicle mileage is missing or invalid");

        BigDecimal currentFuel = request.getCurrentFuelLiter() == null
                ? safeMoney(vehicle.getCurrentFuelLiter())
                : safeMoney(request.getCurrentFuelLiter());

        BigDecimal currentRange = currentFuel.multiply(mileage)
                .setScale(2, RoundingMode.HALF_UP);

        /*
         * Required fuel includes full route distance + 50 km reserve.
         */
        BigDecimal requiredFuel = totalPlannedDistance.divide(mileage, 2, RoundingMode.CEILING);

        BigDecimal shortage = requiredFuel.subtract(currentFuel)
                .setScale(2, RoundingMode.HALF_UP);

        if (shortage.compareTo(BigDecimal.ZERO) < 0) {
            shortage = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        boolean canCompleteTrip = shortage.compareTo(BigDecimal.ZERO) <= 0;

        String decision = canCompleteTrip ? "ENOUGH_FUEL" : "REFUEL_RECOMMENDED";

        String message = canCompleteTrip
                ? "Your current fuel is enough for this route with a 50 km safety reserve."
                : "Your current fuel is not enough with the 50 km safety reserve. Suggested pumps are listed below.";

        List<RoutePumpSuggestionResponse> suggestions = suggestPumps(
                vehicle.getFuelType(),
                request.getSourceCity(),
                request.getDestinationCity(),
                shortage,
                canCompleteTrip
        );

        return RoutePlanResponse.builder()
                .sourceCity(bangladeshDistrictService.normalizeDisplayName(request.getSourceCity()))
                .destinationCity(bangladeshDistrictService.normalizeDisplayName(request.getDestinationCity()))
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
        return bangladeshDistrictService.getAllDistricts()
                .stream()
                .map(DistrictOptionResponse::getDistrictName)
                .sorted()
                .toList();
    }

    private List<RoutePumpSuggestionResponse> suggestPumps(
            FuelType fuelType,
            String sourceCity,
            String destinationCity,
            BigDecimal shortageFuelLiter,
            boolean canCompleteTrip
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

            BigDecimal activeReserved = getActiveReservedStock(pump.getId(), fuelType);

            BigDecimal usableMatchingStock = matchingStock.subtract(activeReserved)
                    .setScale(2, RoundingMode.HALF_UP);

            if (usableMatchingStock.compareTo(BigDecimal.ZERO) < 0) {
                usableMatchingStock = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
            }

            if (usableMatchingStock.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            String routeMatchNote = resolveRouteMatchNote(pump, sourceCity, destinationCity);
            String recommendationLevel = resolveRecommendationLevel(usableMatchingStock, shortageFuelLiter, routeMatchNote, canCompleteTrip);
            String reason = buildRecommendationReason(fuelType, usableMatchingStock, shortageFuelLiter, routeMatchNote, canCompleteTrip);

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
                    .matchingFuelStock(usableMatchingStock)
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

    private BigDecimal getActiveReservedStock(Long pumpId, FuelType fuelType) {
        return routeFuelTokenRepository
                .findByPumpProfileIdAndFuelTypeAndStatusOrderByCreatedAtDesc(
                        pumpId,
                        fuelType,
                        RouteFuelTokenStatus.ACTIVE
                )
                .stream()
                .filter(token -> token.getValidUntil() != null)
                .filter(token -> token.getValidUntil().isAfter(LocalDateTime.now()))
                .map(RouteFuelToken::getReservedLiter)
                .filter(value -> value != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private int routePriority(RoutePumpSuggestionResponse response) {
        if (response == null || response.getRecommendationLevel() == null) {
            return 0;
        }

        return switch (response.getRecommendationLevel()) {
            case "BEST" -> 4;
            case "GOOD" -> 3;
            case "AVAILABLE" -> 2;
            case "OPTIONAL" -> 1;
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

    private String resolveRecommendationLevel(
            BigDecimal matchingStock,
            BigDecimal shortageFuelLiter,
            String routeMatchNote,
            boolean canCompleteTrip
    ) {
        BigDecimal shortage = safeMoney(shortageFuelLiter);

        if (canCompleteTrip) {
            return "OPTIONAL";
        }

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
            String routeMatchNote,
            boolean canCompleteTrip
    ) {
        BigDecimal shortage = safeMoney(shortageFuelLiter);

        if (canCompleteTrip) {
            return "Your route is possible, but this pump has "
                    + matchingStock
                    + " L usable "
                    + fuelType
                    + " if you want extra preparation.";
        }

        if (matchingStock.compareTo(shortage) >= 0) {
            return "This pump has enough usable "
                    + fuelType
                    + " stock for your estimated shortage of "
                    + shortage
                    + " L.";
        }

        return "This pump has "
                + matchingStock
                + " L usable "
                + fuelType
                + ", which may partially support your shortage of "
                + shortage
                + " L.";
    }

    private String resolveRouteMatchNote(PumpProfile pump, String sourceCity, String destinationCity) {
        String address = normalizeArea(pump.getPumpAddress());
        String source = normalizeArea(sourceCity);
        String destination = normalizeArea(destinationCity);

        if (!address.isBlank() && address.contains(source)) {
            return "Near source district";
        }

        if (!address.isBlank() && address.contains(destination)) {
            return "Near destination district";
        }

        List<String> corridorDistricts = corridorDistricts(sourceCity, destinationCity);

        for (String district : corridorDistricts) {
            if (!address.isBlank() && address.contains(normalizeArea(district))) {
                return "Possible route corridor: " + bangladeshDistrictService.normalizeDisplayName(district);
            }
        }

        return "General available pump";
    }

    private List<String> corridorDistricts(String sourceCity, String destinationCity) {
        String source = normalizeArea(sourceCity);
        String destination = normalizeArea(destinationCity);

        if (source.equals("dhaka") || destination.equals("dhaka")) {
            String other = source.equals("dhaka") ? destination : source;

            if (other.equals("chattogram") || other.equals("coxsbazar") || other.equals("cumilla")) {
                return List.of("Narayanganj", "Cumilla", "Feni", "Chattogram");
            }

            if (other.equals("sylhet")) {
                return List.of("Narayanganj", "Brahmanbaria", "Habiganj", "Sylhet");
            }

            if (other.equals("rajshahi") || other.equals("rangpur")) {
                return List.of("Gazipur", "Tangail", "Sirajganj", "Rajshahi", "Rangpur");
            }

            if (other.equals("khulna") || other.equals("jashore")) {
                return List.of("Faridpur", "Magura", "Jashore", "Khulna");
            }

            if (other.equals("barishal")) {
                return List.of("Munshiganj", "Faridpur", "Barishal");
            }

            if (other.equals("mymensingh")) {
                return List.of("Gazipur", "Mymensingh");
            }

            if (other.equals("faridpur")) {
                return List.of("Munshiganj", "Faridpur");
            }
        }

        if ((source.equals("coxsbazar") && destination.equals("rangpur"))
                || (source.equals("rangpur") && destination.equals("coxsbazar"))) {
            return List.of("Cox's Bazar", "Chattogram", "Cumilla", "Dhaka", "Tangail", "Sirajganj", "Bogura", "Rangpur");
        }

        if ((source.equals("faridpur") && destination.equals("coxsbazar"))
                || (source.equals("coxsbazar") && destination.equals("faridpur"))) {
            return List.of("Faridpur", "Dhaka", "Cumilla", "Feni", "Chattogram", "Cox's Bazar");
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
            throw new RuntimeException("Source district is required");
        }

        if (isBlank(request.getDestinationCity())) {
            throw new RuntimeException("Destination district is required");
        }

        if (normalizeArea(request.getSourceCity()).equals(normalizeArea(request.getDestinationCity()))) {
            throw new RuntimeException("Source and destination cannot be the same district");
        }

        if (!bangladeshDistrictService.districtExists(request.getSourceCity())) {
            throw new RuntimeException("Source district is not supported: " + request.getSourceCity());
        }

        if (!bangladeshDistrictService.districtExists(request.getDestinationCity())) {
            throw new RuntimeException("Destination district is not supported: " + request.getDestinationCity());
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

    private String normalizeArea(String value) {
        if (value == null) {
            return "";
        }

        return value.trim()
                .toLowerCase()
                .replace("’", "'")
                .replace("`", "'")
                .replace("'", "")
                .replace(".", "")
                .replace("-", "")
                .replace("_", "")
                .replaceAll("\\s+", "");
    }
}