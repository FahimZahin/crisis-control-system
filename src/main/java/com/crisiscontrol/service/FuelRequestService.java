package com.crisiscontrol.service;

import com.crisiscontrol.dto.FuelRequestCreateRequest;
import com.crisiscontrol.dto.FuelRequestDecisionRequest;
import com.crisiscontrol.dto.FuelRequestResponse;
import com.crisiscontrol.entity.*;
import com.crisiscontrol.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
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

        if (estimatedCost.compareTo(fuelLimit.getLimitAmount()) > 0) {
            FuelRequest pendingRequest = FuelRequest.builder()
                    .user(user)
                    .vehicle(vehicle)
                    .fuelType(request.getFuelType())
                    .requestedLiter(request.getRequestedLiter())
                    .fuelLevelStatus(normalizeFuelLevel(request.getFuelLevelStatus()))
                    .pricePerUnit(fuelPrice.getPricePerUnit())
                    .estimatedCost(estimatedCost)
                    .requestStatus(FuelRequestStatus.PENDING)
                    .adminNote("Request exceeds admin fuel limit. Waiting for admin review.")
                    .build();

            return mapToResponse(fuelRequestRepository.save(pendingRequest));
        }

        String fuelLevelStatus = normalizeFuelLevel(request.getFuelLevelStatus());

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

            return mapToResponse(fuelRequestRepository.save(autoApprovedRequest));
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
        fuelRequest.setAdminNote(
                isBlank(decisionRequest.getAdminNote())
                        ? "Rejected by admin"
                        : decisionRequest.getAdminNote()
        );

        return mapToResponse(fuelRequestRepository.save(fuelRequest));
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
                .requestStatus(fuelRequest.getRequestStatus())
                .adminNote(fuelRequest.getAdminNote())
                .createdAt(fuelRequest.getCreatedAt())
                .updatedAt(fuelRequest.getUpdatedAt())
                .build();
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}