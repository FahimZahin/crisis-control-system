package com.crisiscontrol.service;

import com.crisiscontrol.dto.EmergencyFuelRequestCreateRequest;
import com.crisiscontrol.dto.FuelCollectionRequest;
import com.crisiscontrol.dto.FuelRequestCreateRequest;
import com.crisiscontrol.dto.FuelRequestDecisionRequest;
import com.crisiscontrol.dto.FuelRequestResponse;
import com.crisiscontrol.dto.HospitalGeneratorFuelRequestCreateRequest;
import com.crisiscontrol.entity.EmergencyVehicleApprovalStatus;
import com.crisiscontrol.entity.EmergencyVehicleProfile;
import com.crisiscontrol.entity.FuelLimit;
import com.crisiscontrol.entity.FuelLimitType;
import com.crisiscontrol.entity.FuelPrice;
import com.crisiscontrol.entity.FuelRequest;
import com.crisiscontrol.entity.FuelRequestSource;
import com.crisiscontrol.entity.FuelRequestStatus;
import com.crisiscontrol.entity.FuelType;
import com.crisiscontrol.entity.PumpFuelStock;
import com.crisiscontrol.entity.PumpProfile;
import com.crisiscontrol.entity.PumpStatus;
import com.crisiscontrol.entity.Role;
import com.crisiscontrol.entity.User;
import com.crisiscontrol.entity.Vehicle;
import com.crisiscontrol.entity.VehicleType;
import com.crisiscontrol.repository.EmergencyVehicleRepository;
import com.crisiscontrol.repository.FuelLimitRepository;
import com.crisiscontrol.repository.FuelPriceRepository;
import com.crisiscontrol.repository.FuelRequestRepository;
import com.crisiscontrol.repository.PumpFuelStockRepository;
import com.crisiscontrol.repository.PumpProfileRepository;
import com.crisiscontrol.repository.UserRepository;
import com.crisiscontrol.repository.VehicleRepository;
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
    private final EmergencyVehicleRepository emergencyVehicleRepository;
    private final HospitalSupportCalculationService hospitalSupportCalculationService;

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
                    .requestSource(FuelRequestSource.VEHICLE_OWNER)
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
                    .requestSource(FuelRequestSource.VEHICLE_OWNER)
                    .fuelType(request.getFuelType())
                    .requestedLiter(request.getRequestedLiter())
                    .fuelLevelStatus(fuelLevelStatus)
                    .pricePerUnit(fuelPrice.getPricePerUnit())
                    .estimatedCost(estimatedCost)
                    .requestStatus(FuelRequestStatus.APPROVED)
                    .adminNote("Auto-approved by system because vehicle fuel level is low. Collect from assigned pump.")
                    .build();

            FuelRequest savedRequest = fuelRequestRepository.save(autoApprovedRequest);
            savedRequest.setCollectionCode(generateCollectionCode(savedRequest));

            return mapToResponse(fuelRequestRepository.save(savedRequest));
        }

        FuelRequest pendingRequest = FuelRequest.builder()
                .user(user)
                .vehicle(vehicle)
                .requestSource(FuelRequestSource.VEHICLE_OWNER)
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

    public FuelRequestResponse createEmergencyFuelRequest(EmergencyFuelRequestCreateRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getRole() != Role.EMERGENCY_VEHICLE_AUTHORITY) {
            throw new RuntimeException("Only Emergency Vehicle Authority can request emergency fuel");
        }

        EmergencyVehicleProfile emergencyProfile = emergencyVehicleRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Emergency vehicle profile not found. Submit profile first."));

        if (emergencyProfile.getApprovalStatus() != EmergencyVehicleApprovalStatus.APPROVED) {
            throw new RuntimeException("Emergency vehicle profile is not approved yet");
        }

        if (!Boolean.TRUE.equals(emergencyProfile.getPriorityFuelAccess())) {
            throw new RuntimeException("Priority fuel access is locked. Admin approval is required first.");
        }

        FuelPrice fuelPrice = fuelPriceRepository.findByFuelType(request.getFuelType())
                .orElseThrow(() -> new RuntimeException("Fuel price not set by admin"));

        BigDecimal estimatedCost = request.getRequestedLiter().multiply(fuelPrice.getPricePerUnit());

        fuelLimitRepository.findByLimitType(FuelLimitType.EMERGENCY_VEHICLE)
                .orElseThrow(() -> new RuntimeException("Emergency vehicle fuel limit not set by admin"));

        PumpProfile assignedPump = findAvailablePumpForFuel(
                request.getFuelType(),
                request.getRequestedLiter()
        );

        FuelRequest emergencyRequest = FuelRequest.builder()
                .user(user)
                .emergencyVehicleProfile(emergencyProfile)
                .pumpProfile(assignedPump)
                .requestSource(FuelRequestSource.EMERGENCY)
                .fuelType(request.getFuelType())
                .requestedLiter(request.getRequestedLiter())
                .fuelLevelStatus("EMERGENCY_PRIORITY")
                .emergencyReason(request.getEmergencyReason())
                .pricePerUnit(fuelPrice.getPricePerUnit())
                .estimatedCost(estimatedCost)
                .requestStatus(FuelRequestStatus.APPROVED)
                .adminNote("Emergency request auto-approved. Priority fuel access was unlocked by admin profile approval.")
                .build();

        FuelRequest savedRequest = fuelRequestRepository.save(emergencyRequest);
        savedRequest.setCollectionCode(generateCollectionCode(savedRequest));

        return mapToResponse(fuelRequestRepository.save(savedRequest));
    }

    public FuelRequestResponse createHospitalGeneratorFuelRequest(HospitalGeneratorFuelRequestCreateRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getRole() != Role.HOSPITAL_AUTHORITY) {
            throw new RuntimeException("Only Hospital Authority can request generator diesel support");
        }

        user = hospitalSupportCalculationService.recalculateAndSave(user);

        if (!hospitalSupportCalculationService.canApplyForGeneratorDiesel(user)) {
            throw new RuntimeException(
                    "Generator diesel request is not allowed. Current backup is "
                            + valueOrZero(user.getHospitalEstimatedBackupHours())
                            + " hours and status is "
                            + valueOrDash(user.getHospitalDieselStatus())
                            + ". Hospital can apply only when backup is less than 6 hours and status is CRITICAL."
            );
        }

        FuelPrice dieselPrice = fuelPriceRepository.findByFuelType(FuelType.DIESEL)
                .orElseThrow(() -> new RuntimeException("Diesel price not set by admin"));

        FuelLimit generatorLimit = fuelLimitRepository.findByLimitType(FuelLimitType.GENERATOR_DIESEL)
                .orElseThrow(() -> new RuntimeException("Generator diesel limit not set by admin"));

        BigDecimal estimatedCost = request.getRequiredDieselLiter().multiply(dieselPrice.getPricePerUnit());

        PumpProfile assignedPump = findAvailablePumpForFuelOrNull(FuelType.DIESEL, request.getRequiredDieselLiter());

        FuelRequestStatus status = FuelRequestStatus.PENDING;
        String adminNote = "Hospital generator diesel request is waiting for admin review.";

        if (estimatedCost.compareTo(generatorLimit.getLimitAmount()) <= 0 && assignedPump != null) {
            status = FuelRequestStatus.APPROVED;
            adminNote = "Auto-approved because hospital backup is CRITICAL and an open pump has enough DIESEL stock.";
        } else if (estimatedCost.compareTo(generatorLimit.getLimitAmount()) > 0) {
            adminNote = "Request exceeds generator diesel limit. Waiting for admin review.";
        } else if (assignedPump == null) {
            adminNote = "No open pump has enough DIESEL stock right now. Waiting for admin review.";
        }

        FuelRequest hospitalRequest = FuelRequest.builder()
                .user(user)
                .pumpProfile(status == FuelRequestStatus.APPROVED ? assignedPump : null)
                .requestSource(FuelRequestSource.HOSPITAL_GENERATOR)
                .fuelType(FuelType.DIESEL)
                .requestedLiter(request.getRequiredDieselLiter())
                .fuelLevelStatus("HOSPITAL_" + user.getHospitalDieselStatus())
                .hospitalName(valueOrDefault(request.getHospitalName(), user.getHospitalName()))
                .hospitalRegistrationNumber(user.getHospitalRegistrationNumber())
                .hospitalAddress(user.getHospitalAddress())
                .affectedThana(user.getHospitalUnderThana())
                .generatorCapacity(user.getHospitalGeneratorCapacity())
                .hospitalUrgencyLevel(user.getHospitalDieselStatus())
                .hospitalReason(request.getReason())
                .hospitalContactNumber(request.getContactNumber())
                .pricePerUnit(dieselPrice.getPricePerUnit())
                .estimatedCost(estimatedCost)
                .requestStatus(status)
                .adminNote(adminNote)
                .build();

        FuelRequest savedRequest = fuelRequestRepository.save(hospitalRequest);

        if (savedRequest.getRequestStatus() == FuelRequestStatus.APPROVED) {
            savedRequest.setCollectionCode(generateCollectionCode(savedRequest));
            savedRequest = fuelRequestRepository.save(savedRequest);
        }

        return mapToResponse(savedRequest);
    }

    public List<FuelRequestResponse> getUserFuelRequests(Long userId) {
        return fuelRequestRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<FuelRequestResponse> getEmergencyFuelRequestsByUser(Long userId) {
        return fuelRequestRepository
                .findByUserIdAndRequestSourceOrderByCreatedAtDesc(userId, FuelRequestSource.EMERGENCY)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<FuelRequestResponse> getHospitalGeneratorFuelRequestsByUser(Long userId) {
        User user = userRepository.findById(userId).orElse(null);

        if (user != null && user.getRole() == Role.HOSPITAL_AUTHORITY) {
            hospitalSupportCalculationService.recalculateAndSave(user);
        }

        return fuelRequestRepository
                .findByUserIdAndRequestSourceOrderByCreatedAtDesc(userId, FuelRequestSource.HOSPITAL_GENERATOR)
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
        fuelRequest.setCollectionCode(generateCollectionCode(fuelRequest));
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

        if (fuelRequest.getRequestSource() == FuelRequestSource.HOSPITAL_GENERATOR) {
            updateHospitalDieselReserveAfterCollection(fuelRequest);
        }

        fuelRequest.setRequestStatus(FuelRequestStatus.COLLECTED);
        fuelRequest.setCollectedAt(LocalDateTime.now());
        fuelRequest.setAdminNote("Fuel collected successfully from assigned pump.");

        return mapToResponse(fuelRequestRepository.save(fuelRequest));
    }

    private void updateHospitalDieselReserveAfterCollection(FuelRequest fuelRequest) {
        User hospitalUser = fuelRequest.getUser();

        Double currentReserve = hospitalUser.getHospitalCurrentDieselReserve();

        if (currentReserve == null) {
            currentReserve = 0.0;
        }

        double collectedDiesel = fuelRequest.getRequestedLiter().doubleValue();
        double updatedReserve = currentReserve + collectedDiesel;

        updatedReserve = Math.round(updatedReserve * 100.0) / 100.0;

        hospitalUser.setHospitalCurrentDieselReserve(updatedReserve);
        hospitalSupportCalculationService.recalculateAndSave(hospitalUser);
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
        PumpProfile pump = findAvailablePumpForFuelOrNull(fuelType, requestedLiter);

        if (pump == null) {
            throw new RuntimeException("No open pump has enough " + fuelType + " stock right now");
        }

        return pump;
    }

    private PumpProfile findAvailablePumpForFuelOrNull(FuelType fuelType, BigDecimal requestedLiter) {
        List<PumpProfile> openPumps = pumpProfileRepository.findByPumpStatusOrderByUpdatedAtDesc(PumpStatus.OPEN);

        for (PumpProfile pump : openPumps) {
            PumpFuelStock stock = pumpFuelStockRepository
                    .findByPumpProfileAndFuelType(pump, fuelType)
                    .orElse(null);

            if (stock != null && stock.getCurrentStock().compareTo(requestedLiter) >= 0) {
                return pump;
            }
        }

        return null;
    }

    private String generateCollectionCode(FuelRequest fuelRequest) {
        if (fuelRequest.getRequestSource() == FuelRequestSource.HOSPITAL_GENERATOR) {
            return "CCS-HOSPITAL-FUEL-" + fuelRequest.getId();
        }

        return "CCS-FUEL-REQ-" + fuelRequest.getId();
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
        Vehicle vehicle = fuelRequest.getVehicle();
        EmergencyVehicleProfile emergencyProfile = fuelRequest.getEmergencyVehicleProfile();
        User requestUser = fuelRequest.getUser();

        if (requestUser.getRole() == Role.HOSPITAL_AUTHORITY) {
            requestUser = hospitalSupportCalculationService.recalculateAndSave(requestUser);
        }

        return FuelRequestResponse.builder()
                .id(fuelRequest.getId())
                .userId(requestUser.getId())
                .userName(requestUser.getFullName())
                .phoneNumber(requestUser.getPhoneNumber())
                .requestSource(fuelRequest.getRequestSource())

                .vehicleId(vehicle == null ? null : vehicle.getId())
                .vehicleBrand(vehicle == null ? "-" : vehicle.getBrand())
                .vehicleModel(vehicle == null ? "-" : vehicle.getModel())
                .vehicleNumberPlate(vehicle == null ? "-" : vehicle.getNumberPlate())
                .vehicleType(vehicle == null ? "-" : vehicle.getVehicleType().name())

                .emergencyProfileId(emergencyProfile == null ? null : emergencyProfile.getId())
                .emergencyAuthorityName(emergencyProfile == null ? "-" : emergencyProfile.getAuthorityName())
                .emergencyOrganizationName(emergencyProfile == null ? "-" : emergencyProfile.getOrganizationName())
                .emergencyVehicleType(emergencyProfile == null ? "-" : emergencyProfile.getEmergencyVehicleType().name())
                .emergencyVehicleNumber(emergencyProfile == null ? "-" : emergencyProfile.getVehicleNumber())
                .emergencyDriverName(emergencyProfile == null ? "-" : emergencyProfile.getDriverName())
                .emergencyDriverLicenseNumber(emergencyProfile == null ? "-" : emergencyProfile.getDriverLicenseNumber())
                .emergencyAssignedArea(emergencyProfile == null ? "-" : emergencyProfile.getAssignedArea())
                .emergencyVerificationId(emergencyProfile == null ? "-" : emergencyProfile.getVerificationId())
                .emergencyReason(fuelRequest.getEmergencyReason())

                .hospitalName(valueOrDash(fuelRequest.getHospitalName()))
                .hospitalRegistrationNumber(valueOrDash(fuelRequest.getHospitalRegistrationNumber()))
                .hospitalAddress(valueOrDash(fuelRequest.getHospitalAddress()))
                .affectedThana(valueOrDash(fuelRequest.getAffectedThana()))
                .generatorCapacity(valueOrDash(fuelRequest.getGeneratorCapacity()))
                .hospitalUrgencyLevel(valueOrDash(fuelRequest.getHospitalUrgencyLevel()))
                .hospitalReason(valueOrDash(fuelRequest.getHospitalReason()))
                .hospitalContactNumber(valueOrDash(fuelRequest.getHospitalContactNumber()))
                .hospitalCurrentDieselReserve(requestUser.getHospitalCurrentDieselReserve())
                .hospitalEstimatedBackupHours(requestUser.getHospitalEstimatedBackupHours())
                .hospitalDieselStatus(requestUser.getHospitalDieselStatus())

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

    private String valueOrDefault(String value, String defaultValue) {
        if (value == null || value.trim().isEmpty()) {
            return defaultValue;
        }

        return value;
    }

    private String valueOrDash(String value) {
        if (value == null || value.trim().isEmpty()) {
            return "-";
        }

        return value;
    }

    private double valueOrZero(Double value) {
        if (value == null) {
            return 0.0;
        }

        return value;
    }
}