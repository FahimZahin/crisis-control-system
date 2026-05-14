package com.crisiscontrol.service;

import com.crisiscontrol.dto.FuelCollectionRequest;
import com.crisiscontrol.dto.FuelRequestCreateRequest;
import com.crisiscontrol.dto.FuelRequestDecisionRequest;
import com.crisiscontrol.dto.FuelRequestResponse;
import com.crisiscontrol.entity.*;
import com.crisiscontrol.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FuelRequestService {

    private final FuelRequestRepository fuelRequestRepository;
    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final FuelPriceRepository fuelPriceRepository;
    private final FuelLimitRepository fuelLimitRepository;
    private final PumpProfileRepository pumpProfileRepository;
    private final PumpFuelStockRepository pumpFuelStockRepository;

    public FuelRequestResponse createFuelRequest(FuelRequestCreateRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Vehicle vehicle = vehicleRepository.findById(request.getVehicleId())
                .orElseThrow(() -> new RuntimeException("Vehicle not found"));

        if (!vehicle.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("This vehicle does not belong to this user");
        }

        if (vehicle.getVehicleType() == VehicleType.BIKE && request.getFuelType() == FuelType.CNG) {
            throw new RuntimeException("Bike cannot request CNG");
        }

        if (vehicle.getFuelType() != request.getFuelType()) {
            throw new RuntimeException("Selected fuel type does not match vehicle fuel type");
        }

        FuelPrice fuelPrice = fuelPriceRepository.findByFuelType(request.getFuelType())
                .orElseThrow(() -> new RuntimeException("Fuel price not set by admin"));

        BigDecimal estimatedCost = request.getRequestedLiter().multiply(fuelPrice.getPricePerUnit());

        FuelLimitType limitType = getLimitTypeByVehicle(vehicle);

        FuelLimit fuelLimit = fuelLimitRepository.findByLimitType(limitType)
                .orElseThrow(() -> new RuntimeException("Fuel limit not set by admin"));

        String fuelLevelStatus = normalizeFuelLevel(request.getFuelLevelStatus());

        if (estimatedCost.compareTo(fuelLimit.getLimitAmount()) > 0) {
            FuelRequest pendingRequest = FuelRequest.builder()
                    .user(user)
                    .vehicle(vehicle)
                    .fuelType(request.getFuelType())
                    .requestedLiter(request.getRequestedLiter())
                    .fuelLevelStatus(fuelLevelStatus)
                    .pricePerUnit(fuelPrice.getPricePerUnit())
                    .estimatedCost(estimatedCost)
                    .requestStatus(FuelRequestStatus.PENDING)
                    .adminNote("Request exceeds admin fuel limit. Waiting for admin review.")
                    .build();

            return mapToResponse(fuelRequestRepository.save(pendingRequest));
        }

        if (isLowFuel(fuelLevelStatus)) {
            PumpProfile assignedPump = findAvailablePumpForFuel(
                    request.getFuelType(),
                    request.getRequestedLiter()
            );

            FuelRequest autoApprovedRequest = FuelRequest.builder()
                    .user(user)
                    .vehicle(vehicle)
                    .pumpProfile(assignedPump)
                    .fuelType(request.getFuelType())
                    .requestedLiter(request.getRequestedLiter())
                    .fuelLevelStatus(fuelLevelStatus)
                    .pricePerUnit(fuelPrice.getPricePerUnit())
                    .estimatedCost(estimatedCost)
                    .requestStatus(FuelRequestStatus.APPROVED)
                    .adminNote("Auto-approved by system because vehicle fuel level is low. Collect from assigned pump.")
                    .build();

            FuelRequest savedRequest = fuelRequestRepository.save(autoApprovedRequest);
            savedRequest.setCollectionCode(generateCollectionCode(savedRequest.getId()));

            return mapToResponse(fuelRequestRepository.save(savedRequest));
        }

        FuelRequest pendingRequest = FuelRequest.builder()
                .user(user)
                .vehicle(vehicle)
                .fuelType(request.getFuelType())
                .requestedLiter(request.getRequestedLiter())
                .fuelLevelStatus(fuelLevelStatus)
                .pricePerUnit(fuelPrice.getPricePerUnit())
                .estimatedCost(estimatedCost)
                .requestStatus(FuelRequestStatus.PENDING)
                .adminNote("Fuel level is not low. Waiting for admin review.")
                .build();

        return mapToResponse(fuelRequestRepository.save(pendingRequest));
    }

    public List<FuelRequestResponse> getUserFuelRequests(Long userId) {
        return fuelRequestRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<FuelRequestResponse> getAllFuelRequests() {
        return fuelRequestRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<FuelRequestResponse> getApprovedRequestsByPump(Long pumpId) {
        return fuelRequestRepository
                .findByPumpProfileIdAndRequestStatusOrderByCreatedAtDesc(pumpId, FuelRequestStatus.APPROVED)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public FuelRequestResponse approveFuelRequest(Long requestId, FuelRequestDecisionRequest decisionRequest) {
        FuelRequest fuelRequest = fuelRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Fuel request not found"));

        if (fuelRequest.getRequestStatus() != FuelRequestStatus.PENDING) {
            throw new RuntimeException("Only pending requests can be approved");
        }

        PumpProfile pumpProfile = pumpProfileRepository.findById(decisionRequest.getPumpId())
                .orElseThrow(() -> new RuntimeException("Pump not found"));

        if (pumpProfile.getPumpStatus() != PumpStatus.OPEN) {
            throw new RuntimeException("Selected pump is closed");
        }

        PumpFuelStock pumpFuelStock = pumpFuelStockRepository
                .findByPumpProfileAndFuelType(pumpProfile, fuelRequest.getFuelType())
                .orElseThrow(() -> new RuntimeException("Selected pump does not have " + fuelRequest.getFuelType()));

        if (pumpFuelStock.getCurrentStock().compareTo(fuelRequest.getRequestedLiter()) < 0) {
            throw new RuntimeException("Selected pump does not have enough " + fuelRequest.getFuelType() + " stock");
        }

        fuelRequest.setPumpProfile(pumpProfile);
        fuelRequest.setRequestStatus(FuelRequestStatus.APPROVED);
        fuelRequest.setCollectionCode(generateCollectionCode(fuelRequest.getId()));
        fuelRequest.setAdminNote(
                isBlank(decisionRequest.getAdminNote())
                        ? "Approved by admin. Please collect from assigned pump."
                        : decisionRequest.getAdminNote()
        );

        return mapToResponse(fuelRequestRepository.save(fuelRequest));
    }

    public FuelRequestResponse rejectFuelRequest(Long requestId, FuelRequestDecisionRequest decisionRequest) {
        FuelRequest fuelRequest = fuelRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Fuel request not found"));

        if (fuelRequest.getRequestStatus() != FuelRequestStatus.PENDING) {
            throw new RuntimeException("Only pending requests can be rejected");
        }

        fuelRequest.setRequestStatus(FuelRequestStatus.REJECTED);
        fuelRequest.setCollectionCode(null);
        fuelRequest.setAdminNote(
                isBlank(decisionRequest.getAdminNote())
                        ? "Rejected by admin"
                        : decisionRequest.getAdminNote()
        );

        return mapToResponse(fuelRequestRepository.save(fuelRequest));
    }

    @Transactional
    public FuelRequestResponse collectFuelByCode(FuelCollectionRequest request) {
        String normalizedCode = request.getCollectionCode().trim().toUpperCase();

        FuelRequest fuelRequest = fuelRequestRepository.findByCollectionCode(normalizedCode)
                .orElseThrow(() -> new RuntimeException("Invalid collection code"));

        if (fuelRequest.getRequestStatus() != FuelRequestStatus.APPROVED) {
            throw new RuntimeException("This request is not approved or already collected");
        }

        if (fuelRequest.getPumpProfile() == null) {
            throw new RuntimeException("No pump assigned for this request");
        }

        if (!fuelRequest.getPumpProfile().getId().equals(request.getPumpId())) {
            throw new RuntimeException("This fuel request is not assigned to your pump");
        }

        PumpProfile pumpProfile = fuelRequest.getPumpProfile();

        if (pumpProfile.getPumpStatus() != PumpStatus.OPEN) {
            throw new RuntimeException("Pump is currently closed");
        }

        PumpFuelStock pumpFuelStock = pumpFuelStockRepository
                .findByPumpProfileAndFuelType(pumpProfile, fuelRequest.getFuelType())
                .orElseThrow(() -> new RuntimeException("This pump does not have " + fuelRequest.getFuelType() + " stock"));

        if (pumpFuelStock.getCurrentStock().compareTo(fuelRequest.getRequestedLiter()) < 0) {
            throw new RuntimeException("Not enough " + fuelRequest.getFuelType() + " stock to complete collection");
        }

        BigDecimal updatedStock = pumpFuelStock.getCurrentStock().subtract(fuelRequest.getRequestedLiter());
        pumpFuelStock.setCurrentStock(updatedStock);
        pumpFuelStockRepository.save(pumpFuelStock);

        updatePumpProfileTotalStock(pumpProfile);

        fuelRequest.setRequestStatus(FuelRequestStatus.COLLECTED);
        fuelRequest.setCollectedAt(LocalDateTime.now());
        fuelRequest.setAdminNote("Fuel collected successfully from assigned pump.");

        return mapToResponse(fuelRequestRepository.save(fuelRequest));
    }

    private void updatePumpProfileTotalStock(PumpProfile pumpProfile) {
        List<PumpFuelStock> stocks = pumpFuelStockRepository.findByPumpProfileIdOrderByFuelTypeAsc(pumpProfile.getId());

        BigDecimal totalCapacity = BigDecimal.ZERO;
        BigDecimal totalCurrentStock = BigDecimal.ZERO;
        StringBuilder fuelTypesBuilder = new StringBuilder();

        for (PumpFuelStock stock : stocks) {
            totalCapacity = totalCapacity.add(stock.getFuelCapacity());
            totalCurrentStock = totalCurrentStock.add(stock.getCurrentStock());

            if (!fuelTypesBuilder.isEmpty()) {
                fuelTypesBuilder.append(",");
            }

            fuelTypesBuilder.append(stock.getFuelType().name());
        }

        pumpProfile.setFuelCapacity(totalCapacity);
        pumpProfile.setCurrentStock(totalCurrentStock);
        pumpProfile.setFuelTypes(fuelTypesBuilder.toString());

        pumpProfileRepository.save(pumpProfile);
    }

    private PumpProfile findAvailablePumpForFuel(FuelType fuelType, BigDecimal requestedLiter) {
        List<PumpProfile> openPumps = pumpProfileRepository.findByPumpStatusOrderByUpdatedAtDesc(PumpStatus.OPEN);

        for (PumpProfile pump : openPumps) {
            PumpFuelStock stock = pumpFuelStockRepository
                    .findByPumpProfileAndFuelType(pump, fuelType)
                    .orElse(null);

            if (stock != null && stock.getCurrentStock().compareTo(requestedLiter) >= 0) {
                return pump;
            }
        }

        throw new RuntimeException("No open pump has enough " + fuelType + " stock right now");
    }

    private String generateCollectionCode(Long requestId) {
        return "CCS-FUEL-REQ-" + requestId;
    }

    private boolean isLowFuel(String fuelLevelStatus) {
        return fuelLevelStatus.equals("EMPTY") || fuelLevelStatus.equals("LOW");
    }

    private String normalizeFuelLevel(String fuelLevelStatus) {
        if (fuelLevelStatus == null) {
            return "UNKNOWN";
        }

        return fuelLevelStatus.trim().toUpperCase();
    }

    private FuelLimitType getLimitTypeByVehicle(Vehicle vehicle) {
        if (vehicle.getVehicleType() == VehicleType.BIKE) {
            return FuelLimitType.BIKE;
        }

        return FuelLimitType.CAR;
    }

    private FuelRequestResponse mapToResponse(FuelRequest fuelRequest) {
        PumpProfile pumpProfile = fuelRequest.getPumpProfile();

        return FuelRequestResponse.builder()
                .id(fuelRequest.getId())
                .userId(fuelRequest.getUser().getId())
                .userName(fuelRequest.getUser().getFullName())
                .phoneNumber(fuelRequest.getUser().getPhoneNumber())
                .vehicleId(fuelRequest.getVehicle().getId())
                .vehicleBrand(fuelRequest.getVehicle().getBrand())
                .vehicleModel(fuelRequest.getVehicle().getModel())
                .vehicleNumberPlate(fuelRequest.getVehicle().getNumberPlate())
                .vehicleType(fuelRequest.getVehicle().getVehicleType().name())
                .pumpId(pumpProfile == null ? null : pumpProfile.getId())
                .pumpName(pumpProfile == null ? "Not Assigned" : pumpProfile.getPumpName())
                .pumpAddress(pumpProfile == null ? "Not Assigned" : pumpProfile.getPumpAddress())
                .fuelType(fuelRequest.getFuelType())
                .requestedLiter(fuelRequest.getRequestedLiter())
                .fuelLevelStatus(fuelRequest.getFuelLevelStatus())
                .pricePerUnit(fuelRequest.getPricePerUnit())
                .estimatedCost(fuelRequest.getEstimatedCost())
                .collectionCode(fuelRequest.getCollectionCode())
                .requestStatus(fuelRequest.getRequestStatus())
                .adminNote(fuelRequest.getAdminNote())
                .collectedAt(fuelRequest.getCollectedAt())
                .createdAt(fuelRequest.getCreatedAt())
                .updatedAt(fuelRequest.getUpdatedAt())
                .build();
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}