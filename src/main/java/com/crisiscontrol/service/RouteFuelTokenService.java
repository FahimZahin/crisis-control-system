package com.crisiscontrol.service;

import com.crisiscontrol.dto.RouteFuelTokenCollectRequest;
import com.crisiscontrol.dto.RouteFuelTokenCreateRequest;
import com.crisiscontrol.dto.RouteFuelTokenResponse;
import com.crisiscontrol.entity.*;
import com.crisiscontrol.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RouteFuelTokenService {

    private static final int TOKEN_VALID_HOURS = 2;

    private final RouteFuelTokenRepository routeFuelTokenRepository;
    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final PumpProfileRepository pumpProfileRepository;
    private final PumpFuelStockRepository pumpFuelStockRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;
    private final PaymentRecordService paymentRecordService;
    private final RouteDistanceService routeDistanceService;

    @Transactional
    public RouteFuelTokenResponse createRouteFuelToken(RouteFuelTokenCreateRequest request) {
        validateCreateRequest(request);

        /*
         * This validates that the route is supported by the new Bangladesh 64-district route module.
         * It also prevents the old issue: "Route distance is not configured..."
         */
        routeDistanceService.getEstimatedRoadDistanceKm(
                request.getSourceCity(),
                request.getDestinationCity()
        );

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getRole() != Role.VEHICLE_OWNER) {
            throw new RuntimeException("Only vehicle owners can create route fuel token");
        }

        Vehicle vehicle = vehicleRepository.findById(request.getVehicleId())
                .orElseThrow(() -> new RuntimeException("Vehicle not found"));

        if (!vehicle.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("This vehicle does not belong to the logged-in user");
        }

        PumpProfile pump = pumpProfileRepository.findById(request.getPumpId())
                .orElseThrow(() -> new RuntimeException("Pump not found"));

        if (!isPumpOperational(pump)) {
            throw new RuntimeException("Selected pump is not operational");
        }

        FuelType fuelType = vehicle.getFuelType();
        BigDecimal reservedLiter = safeMoney(request.getReservedLiter());

        BigDecimal availableStock = getAvailableStockAfterActiveReservation(pump.getId(), fuelType);

        if (availableStock.compareTo(reservedLiter) < 0) {
            throw new RuntimeException("Selected pump does not have enough available stock after reservations");
        }

        RouteFuelToken token = RouteFuelToken.builder()
                .tokenCode(generateTokenCode(request.getSourceCity(), request.getDestinationCity()))
                .user(user)
                .vehicle(vehicle)
                .pumpProfile(pump)
                .sourceCity(clean(request.getSourceCity()))
                .destinationCity(clean(request.getDestinationCity()))
                .stopCity(cleanOptional(request.getStopCity()))
                .distanceFromSourceKm(safeMoney(request.getDistanceFromSourceKm()))
                .fuelType(fuelType)
                .reservedLiter(reservedLiter)
                .estimatedCost(safeMoney(request.getEstimatedCost()))
                .currentOdometerAtPlanning(safeMoney(request.getCurrentOdometerAtPlanning()))
                .expectedOdometerAtStop(safeMoney(request.getExpectedOdometerAtStop()))
                .status(RouteFuelTokenStatus.ACTIVE)
                .validUntil(LocalDateTime.now().plusHours(TOKEN_VALID_HOURS))
                .build();

        RouteFuelToken savedToken = routeFuelTokenRepository.save(token);

        auditLogService.log(
                user,
                "ROUTE_FUEL_TOKEN_CREATED",
                "ROUTE_FUEL_TOKEN",
                savedToken.getId(),
                "Route fuel token created for "
                        + savedToken.getSourceCity()
                        + " to "
                        + savedToken.getDestinationCity()
                        + ". Token: "
                        + savedToken.getTokenCode()
        );

        notificationService.notifyUser(
                user.getId(),
                NotificationType.FUEL_REQUEST,
                "Route Fuel Token Created",
                "Your route fuel token " + savedToken.getTokenCode()
                        + " is active until " + savedToken.getValidUntil() + ".",
                "ROUTE_FUEL_TOKEN",
                savedToken.getId(),
                "route-token-history.html"
        );

        if (pump.getUser() != null) {
            notificationService.notifyUser(
                    pump.getUser().getId(),
                    NotificationType.PUMP_ASSIGNMENT,
                    "Route Fuel Token Assigned",
                    "A vehicle owner reserved "
                            + reservedLiter
                            + " L "
                            + fuelType
                            + " for route fuel collection. Token: "
                            + savedToken.getTokenCode(),
                    "ROUTE_FUEL_TOKEN",
                    savedToken.getId(),
                    "pump-route-tokens.html"
            );
        }

        return mapToResponse(savedToken);
    }

    public List<RouteFuelTokenResponse> getTokensByUser(Long userId) {
        expireOldTokens();

        return routeFuelTokenRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<RouteFuelTokenResponse> getTokensByPumpUser(Long pumpUserId) {
        expireOldTokens();

        PumpProfile pump = pumpProfileRepository.findByUserId(pumpUserId)
                .orElseThrow(() -> new RuntimeException("Pump profile not found"));

        return routeFuelTokenRepository.findByPumpProfileIdOrderByCreatedAtDesc(pump.getId())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional
    public RouteFuelTokenResponse collectRouteFuelToken(RouteFuelTokenCollectRequest request) {
        validateCollectRequest(request);

        PumpProfile pump = pumpProfileRepository.findByUserId(request.getPumpUserId())
                .orElseThrow(() -> new RuntimeException("Pump profile not found"));

        RouteFuelToken token = routeFuelTokenRepository.findByTokenCode(clean(request.getTokenCode()).toUpperCase())
                .orElseThrow(() -> new RuntimeException("Route fuel token not found"));

        if (!token.getPumpProfile().getId().equals(pump.getId())) {
            throw new RuntimeException("This route token is not assigned to your pump");
        }

        if (token.getStatus() != RouteFuelTokenStatus.ACTIVE) {
            throw new RuntimeException("This route token is not active. Current status: " + token.getStatus());
        }

        if (token.getValidUntil().isBefore(LocalDateTime.now())) {
            token.setStatus(RouteFuelTokenStatus.EXPIRED);
            token.setExpiredAt(LocalDateTime.now());
            routeFuelTokenRepository.save(token);
            throw new RuntimeException("This route token has expired");
        }

        String actualPlate = clean(request.getVerifiedNumberPlate()).toUpperCase();
        String expectedPlate = clean(token.getVehicle().getNumberPlate()).toUpperCase();

        if (!actualPlate.equals(expectedPlate)) {
            throw new RuntimeException("Vehicle number plate does not match this route token");
        }

        BigDecimal availableStock = getAvailableStockAfterActiveReservation(
                pump.getId(),
                token.getFuelType()
        ).add(token.getReservedLiter());

        if (availableStock.compareTo(token.getReservedLiter()) < 0) {
            throw new RuntimeException("Pump does not have enough stock to complete this token");
        }

        PumpFuelStock matchingStock = pumpFuelStockRepository.findByPumpProfileIdOrderByFuelTypeAsc(pump.getId())
                .stream()
                .filter(stock -> stock.getFuelType() == token.getFuelType())
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Pump stock not found for fuel type: " + token.getFuelType()));

        BigDecimal currentStock = safeMoney(matchingStock.getCurrentStock());

        if (currentStock.compareTo(token.getReservedLiter()) < 0) {
            throw new RuntimeException("Pump current stock is lower than reserved route fuel");
        }

        matchingStock.setCurrentStock(
                currentStock.subtract(token.getReservedLiter()).setScale(2, RoundingMode.HALF_UP)
        );
        pumpFuelStockRepository.save(matchingStock);

        Vehicle vehicle = token.getVehicle();

        BigDecimal oldVehicleFuel = safeMoney(vehicle.getCurrentFuelLiter());
        BigDecimal newVehicleFuel = oldVehicleFuel.add(token.getReservedLiter()).setScale(2, RoundingMode.HALF_UP);

        if (vehicle.getTankCapacity() != null && newVehicleFuel.compareTo(vehicle.getTankCapacity()) > 0) {
            newVehicleFuel = vehicle.getTankCapacity().setScale(2, RoundingMode.HALF_UP);
        }

        vehicle.setCurrentFuelLiter(newVehicleFuel);
        vehicle.setOdometerReading(safeMoney(request.getActualOdometerAtCollection()));

        vehicleRepository.save(vehicle);

        token.setStatus(RouteFuelTokenStatus.USED);
        token.setUsedAt(LocalDateTime.now());
        token.setVerifiedNumberPlate(actualPlate);
        token.setActualOdometerAtCollection(safeMoney(request.getActualOdometerAtCollection()));
        token.setPaymentMethod(clean(request.getPaymentMethod()).toUpperCase());
        token.setBkashTransactionId(cleanOptional(request.getBkashTransactionId()));
        token.setPaidAmountBdt(token.getEstimatedCost());
        token.setCollectionNote("Route fuel token used successfully at assigned pump.");

        RouteFuelToken savedToken = routeFuelTokenRepository.save(token);

        /*
         * PaymentRecordService handles the payment ledger.
         * If pump is OPEN_WITH_DEBT, PaymentRecordService must send payment to government recovery.
         */
        paymentRecordService.recordRouteFuelTokenPayment(savedToken);

        User pumpUser = pump.getUser();
        User vehicleUser = token.getUser();

        auditLogService.log(
                pumpUser,
                "ROUTE_FUEL_TOKEN_USED",
                "ROUTE_FUEL_TOKEN",
                savedToken.getId(),
                "Route fuel token used. Token: "
                        + savedToken.getTokenCode()
                        + ", Reserved liter: "
                        + savedToken.getReservedLiter()
                        + ", Pump: "
                        + pump.getPumpName()
        );

        notificationService.notifyUser(
                vehicleUser.getId(),
                NotificationType.FUEL_COLLECTION,
                "Route Fuel Collected",
                "Your route fuel token "
                        + savedToken.getTokenCode()
                        + " was used successfully at "
                        + pump.getPumpName()
                        + ".",
                "ROUTE_FUEL_TOKEN",
                savedToken.getId(),
                "route-token-history.html"
        );

        if (pumpUser != null) {
            notificationService.notifyUser(
                    pumpUser.getId(),
                    NotificationType.FUEL_COLLECTION,
                    "Route Token Collection Completed",
                    "Token "
                            + savedToken.getTokenCode()
                            + " completed. "
                            + savedToken.getReservedLiter()
                            + " L "
                            + savedToken.getFuelType()
                            + " deducted from stock.",
                    "ROUTE_FUEL_TOKEN",
                    savedToken.getId(),
                    "pump-route-tokens.html"
            );
        }

        return mapToResponse(savedToken);
    }

    @Transactional
    public void expireOldTokens() {
        List<RouteFuelToken> activeTokens = routeFuelTokenRepository.findAll()
                .stream()
                .filter(token -> token.getStatus() == RouteFuelTokenStatus.ACTIVE)
                .filter(token -> token.getValidUntil() != null)
                .filter(token -> token.getValidUntil().isBefore(LocalDateTime.now()))
                .toList();

        for (RouteFuelToken token : activeTokens) {
            token.setStatus(RouteFuelTokenStatus.EXPIRED);
            token.setExpiredAt(LocalDateTime.now());
        }

        routeFuelTokenRepository.saveAll(activeTokens);
    }

    public BigDecimal getAvailableStockAfterActiveReservation(Long pumpId, FuelType fuelType) {
        BigDecimal currentStock = pumpFuelStockRepository.findByPumpProfileIdOrderByFuelTypeAsc(pumpId)
                .stream()
                .filter(stock -> stock.getFuelType() == fuelType)
                .map(PumpFuelStock::getCurrentStock)
                .filter(value -> value != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal activeReserved = routeFuelTokenRepository
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

        BigDecimal available = currentStock.subtract(activeReserved).setScale(2, RoundingMode.HALF_UP);

        if (available.compareTo(BigDecimal.ZERO) < 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        return available;
    }

    private void validateCreateRequest(RouteFuelTokenCreateRequest request) {
        if (request == null) {
            throw new RuntimeException("Route token request is required");
        }

        if (request.getUserId() == null) {
            throw new RuntimeException("User ID is required");
        }

        if (request.getVehicleId() == null) {
            throw new RuntimeException("Vehicle is required");
        }

        if (request.getPumpId() == null) {
            throw new RuntimeException("Pump is required");
        }

        if (isBlank(request.getSourceCity())) {
            throw new RuntimeException("Source city is required");
        }

        if (isBlank(request.getDestinationCity())) {
            throw new RuntimeException("Destination city is required");
        }

        if (clean(request.getSourceCity()).equalsIgnoreCase(clean(request.getDestinationCity()))) {
            throw new RuntimeException("Source and destination cannot be the same district");
        }

        if (request.getReservedLiter() == null || request.getReservedLiter().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Reserved liter must be greater than 0");
        }
    }

    private void validateCollectRequest(RouteFuelTokenCollectRequest request) {
        if (request == null) {
            throw new RuntimeException("Collection request is required");
        }

        if (request.getPumpUserId() == null) {
            throw new RuntimeException("Pump user ID is required");
        }

        if (isBlank(request.getTokenCode())) {
            throw new RuntimeException("Token code is required");
        }

        if (isBlank(request.getVerifiedNumberPlate())) {
            throw new RuntimeException("Verified number plate is required");
        }

        if (request.getActualOdometerAtCollection() == null
                || request.getActualOdometerAtCollection().compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("Valid odometer reading is required");
        }

        if (isBlank(request.getPaymentMethod())) {
            throw new RuntimeException("Payment method is required");
        }

        if ("BKASH".equalsIgnoreCase(request.getPaymentMethod()) && isBlank(request.getBkashTransactionId())) {
            throw new RuntimeException("bKash transaction ID is required for bKash payment");
        }
    }

    public List<RouteFuelTokenResponse> getAllTokens() {
        expireOldTokens();

        return routeFuelTokenRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<RouteFuelTokenResponse> getTokensByStatus(RouteFuelTokenStatus status) {
        expireOldTokens();

        return routeFuelTokenRepository.findByStatusOrderByCreatedAtDesc(status)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public java.util.Map<String, Object> getRouteTokenSummary() {
        expireOldTokens();

        List<RouteFuelToken> tokens = routeFuelTokenRepository.findAllByOrderByCreatedAtDesc();

        BigDecimal totalReservedLiter = BigDecimal.ZERO;
        BigDecimal totalCollectedLiter = BigDecimal.ZERO;
        BigDecimal totalEstimatedCost = BigDecimal.ZERO;
        BigDecimal totalCollectedAmount = BigDecimal.ZERO;

        for (RouteFuelToken token : tokens) {
            totalReservedLiter = totalReservedLiter.add(safeMoney(token.getReservedLiter()));
            totalEstimatedCost = totalEstimatedCost.add(safeMoney(token.getEstimatedCost()));

            if (token.getStatus() == RouteFuelTokenStatus.USED) {
                totalCollectedLiter = totalCollectedLiter.add(safeMoney(token.getReservedLiter()));
                totalCollectedAmount = totalCollectedAmount.add(safeMoney(token.getPaidAmountBdt()));
            }
        }

        java.util.Map<String, Object> summary = new java.util.LinkedHashMap<>();
        summary.put("totalTokens", tokens.size());
        summary.put("activeTokens", routeFuelTokenRepository.countByStatus(RouteFuelTokenStatus.ACTIVE));
        summary.put("usedTokens", routeFuelTokenRepository.countByStatus(RouteFuelTokenStatus.USED));
        summary.put("expiredTokens", routeFuelTokenRepository.countByStatus(RouteFuelTokenStatus.EXPIRED));
        summary.put("cancelledTokens", routeFuelTokenRepository.countByStatus(RouteFuelTokenStatus.CANCELLED));
        summary.put("totalReservedLiter", totalReservedLiter.setScale(2, RoundingMode.HALF_UP));
        summary.put("totalCollectedLiter", totalCollectedLiter.setScale(2, RoundingMode.HALF_UP));
        summary.put("totalEstimatedCost", totalEstimatedCost.setScale(2, RoundingMode.HALF_UP));
        summary.put("totalCollectedAmount", totalCollectedAmount.setScale(2, RoundingMode.HALF_UP));
        summary.put("generatedAt", LocalDateTime.now());

        return summary;
    }

    private boolean isPumpOperational(PumpProfile pump) {
        return pump != null
                && (
                pump.getPumpStatus() == PumpStatus.OPEN
                        || pump.getPumpStatus() == PumpStatus.OPEN_WITH_DEBT
        );
    }

    private String generateTokenCode(String sourceCity, String destinationCity) {
        String source = shortCity(sourceCity);
        String destination = shortCity(destinationCity);
        String random = UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();

        return "RFT-" + source + "-" + destination + "-" + random;
    }

    private String shortCity(String city) {
        String clean = clean(city).replaceAll("[^A-Za-z]", "").toUpperCase();

        if (clean.length() <= 3) {
            return clean;
        }

        return clean.substring(0, 3);
    }

    private RouteFuelTokenResponse mapToResponse(RouteFuelToken token) {
        User user = token.getUser();
        Vehicle vehicle = token.getVehicle();
        PumpProfile pump = token.getPumpProfile();

        return RouteFuelTokenResponse.builder()
                .id(token.getId())
                .tokenCode(token.getTokenCode())
                .userId(user == null ? null : user.getId())
                .userName(user == null ? "-" : user.getFullName())
                .phoneNumber(user == null ? "-" : user.getPhoneNumber())
                .vehicleId(vehicle == null ? null : vehicle.getId())
                .vehicleName(vehicle == null ? "-" : vehicle.getBrand() + " " + vehicle.getModel())
                .numberPlate(vehicle == null ? "-" : vehicle.getNumberPlate())
                .pumpId(pump == null ? null : pump.getId())
                .pumpName(pump == null ? "-" : pump.getPumpName())
                .pumpAddress(pump == null ? "-" : pump.getPumpAddress())
                .sourceCity(token.getSourceCity())
                .destinationCity(token.getDestinationCity())
                .stopCity(token.getStopCity())
                .distanceFromSourceKm(token.getDistanceFromSourceKm())
                .fuelType(token.getFuelType())
                .reservedLiter(token.getReservedLiter())
                .estimatedCost(token.getEstimatedCost())
                .currentOdometerAtPlanning(token.getCurrentOdometerAtPlanning())
                .expectedOdometerAtStop(token.getExpectedOdometerAtStop())
                .actualOdometerAtCollection(token.getActualOdometerAtCollection())
                .paymentMethod(token.getPaymentMethod())
                .bkashTransactionId(token.getBkashTransactionId())
                .paidAmountBdt(token.getPaidAmountBdt())
                .status(token.getStatus())
                .validUntil(token.getValidUntil())
                .usedAt(token.getUsedAt())
                .cancelledAt(token.getCancelledAt())
                .expiredAt(token.getExpiredAt())
                .createdAt(token.getCreatedAt())
                .collectionNote(token.getCollectionNote())
                .build();
    }

    private BigDecimal safeMoney(BigDecimal value) {
        if (value == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private String cleanOptional(String value) {
        return value == null ? "" : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}