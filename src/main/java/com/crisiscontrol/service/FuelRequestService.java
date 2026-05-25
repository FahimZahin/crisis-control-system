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
import com.crisiscontrol.dto.BuildingGeneratorFuelRequestCreateRequest;
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
    private final AuditLogService auditLogService;

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

        if (request.getCurrentOdometerReading() == null) {
            throw new RuntimeException("Current odometer reading is required");
        }

        if (request.getCurrentOdometerReading().compareTo(vehicle.getOdometerReading()) < 0) {
            throw new RuntimeException("Current odometer cannot be less than last verified odometer");
        }

        BigDecimal previousOdometer = vehicle.getOdometerReading();
        BigDecimal requestOdometer = request.getCurrentOdometerReading();
        BigDecimal distanceTravelled = requestOdometer.subtract(previousOdometer);

        BigDecimal effectiveMileage = calculateEffectiveMileage(vehicle.getCompanyMileage());
        BigDecimal fullTankRange = vehicle.getTankCapacity().multiply(effectiveMileage);

        BigDecimal currentFuelLiter = vehicle.getCurrentFuelLiter() == null
                ? BigDecimal.ZERO
                : vehicle.getCurrentFuelLiter();

        BigDecimal availableRangeFromSavedFuel = currentFuelLiter.multiply(effectiveMileage);
        BigDecimal estimatedRemainingRange = availableRangeFromSavedFuel.subtract(distanceTravelled);
        BigDecimal tankCapacity = vehicle.getTankCapacity() == null
                ? BigDecimal.ZERO
                : vehicle.getTankCapacity();

        BigDecimal availableTankSpace = tankCapacity.subtract(currentFuelLiter);

        if (availableTankSpace.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Vehicle fuel tank is already full. Fuel request is not allowed.");
        }

        if (request.getRequestedLiter().compareTo(availableTankSpace) > 0) {
            throw new RuntimeException(
                    "Requested fuel cannot be greater than available tank space. Available space: "
                            + availableTankSpace.setScale(2, java.math.RoundingMode.HALF_UP)
                            + " L"
            );
        }

        if (estimatedRemainingRange.compareTo(BigDecimal.ZERO) < 0) {
            estimatedRemainingRange = BigDecimal.ZERO;
        }

        boolean odometerEligible = estimatedRemainingRange.compareTo(BigDecimal.valueOf(5)) <= 0;

        if (!odometerEligible) {
            throw new RuntimeException(
                    "Fuel request is not eligible yet. Estimated remaining range is "
                            + estimatedRemainingRange.setScale(2, java.math.RoundingMode.HALF_UP)
                            + " km. You can request fuel only when remaining range is 5 km or less."
            );
        }

        FuelPrice fuelPrice = fuelPriceRepository.findByFuelType(request.getFuelType())
                .orElseThrow(() -> new RuntimeException("Fuel price not set by admin"));

        BigDecimal estimatedCost = request.getRequestedLiter().multiply(fuelPrice.getPricePerUnit());

        BigDecimal allowedLimitAmount = getFixedVehicleFuelLimit(vehicle);
        boolean extraFuelRequested = estimatedCost.compareTo(allowedLimitAmount) > 0;

        String fuelLevelStatus = normalizeFuelLevel(request.getFuelLevelStatus());

        if (extraFuelRequested && isBlank(request.getExtraFuelReasonType())) {
            throw new RuntimeException("Extra fuel reason is required because request exceeds normal limit");
        }

        String extraFuelDemandMessage = buildExtraFuelDemandMessage(
                user,
                vehicle,
                request,
                estimatedCost,
                allowedLimitAmount
        );

        if (extraFuelRequested) {
            FuelRequest pendingRequest = FuelRequest.builder()
                    .user(user)
                    .vehicle(vehicle)
                    .requestSource(FuelRequestSource.VEHICLE_OWNER)
                    .fuelType(request.getFuelType())
                    .requestedLiter(request.getRequestedLiter())
                    .fuelLevelStatus(fuelLevelStatus)
                    .previousOdometerReading(previousOdometer)
                    .requestOdometerReading(requestOdometer)
                    .distanceTravelled(distanceTravelled)
                    .fullTankRangeKm(fullTankRange)
                    .estimatedRemainingRangeKm(estimatedRemainingRange)
                    .odometerEligible(true)
                    .requestedAmountBdt(estimatedCost)
                    .extraFuelRequested(true)
                    .extraFuelReasonType(request.getExtraFuelReasonType())
                    .extraFuelDemandMessage(extraFuelDemandMessage)
                    .pricePerUnit(fuelPrice.getPricePerUnit())
                    .estimatedCost(estimatedCost)
                    .requestStatus(FuelRequestStatus.PENDING)
                    .adminNote("Extra fuel request. Admin approval required.")
                    .build();

            FuelRequest savedPendingRequest = fuelRequestRepository.save(pendingRequest);

            auditLogService.log(
                    user,
                    "EXTRA_FUEL_REQUEST_CREATED",
                    "FUEL_REQUEST",
                    savedPendingRequest.getId(),
                    "Extra fuel request submitted. Requested: "
                            + savedPendingRequest.getRequestedLiter()
                            + " L, Cost: "
                            + savedPendingRequest.getEstimatedCost()
                            + " BDT, Reason: "
                            + savedPendingRequest.getExtraFuelReasonType()
            );

            return mapToResponse(savedPendingRequest);
        }

        PumpProfile assignedPump = findAvailablePumpForFuelOrNull(
                request.getFuelType(),
                request.getRequestedLiter()
        );

        FuelRequestStatus status = assignedPump == null
                ? FuelRequestStatus.PENDING
                : FuelRequestStatus.APPROVED;

        String adminNote = assignedPump == null
                ? "Odometer eligible, but no open pump has enough stock. Waiting for admin review."
                : "Auto-approved by odometer rule. Estimated remaining range is 5 km or less.";

        FuelRequest fuelRequest = FuelRequest.builder()
                .user(user)
                .vehicle(vehicle)
                .pumpProfile(assignedPump)
                .requestSource(FuelRequestSource.VEHICLE_OWNER)
                .fuelType(request.getFuelType())
                .requestedLiter(request.getRequestedLiter())
                .fuelLevelStatus(fuelLevelStatus)
                .previousOdometerReading(previousOdometer)
                .requestOdometerReading(requestOdometer)
                .distanceTravelled(distanceTravelled)
                .fullTankRangeKm(fullTankRange)
                .estimatedRemainingRangeKm(estimatedRemainingRange)
                .odometerEligible(true)
                .requestedAmountBdt(estimatedCost)
                .extraFuelRequested(false)
                .extraFuelReasonType(null)
                .extraFuelDemandMessage(null)
                .pricePerUnit(fuelPrice.getPricePerUnit())
                .estimatedCost(estimatedCost)
                .requestStatus(status)
                .adminNote(adminNote)
                .build();

        FuelRequest savedRequest = fuelRequestRepository.save(fuelRequest);

        auditLogService.log(
                user,
                "FUEL_REQUEST_CREATED",
                "FUEL_REQUEST",
                savedRequest.getId(),
                "Vehicle fuel request created. Status: "
                        + savedRequest.getRequestStatus()
                        + ", Requested: "
                        + savedRequest.getRequestedLiter()
                        + " L"
        );

        if (savedRequest.getRequestStatus() == FuelRequestStatus.APPROVED) {
            savedRequest.setCollectionCode(generateCollectionCode(savedRequest));
            savedRequest = fuelRequestRepository.save(savedRequest);
        }

        return mapToResponse(savedRequest);
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

        FuelPrice dieselPrice = fuelPriceRepository.findByFuelType(FuelType.DIESEL)
                .orElseThrow(() -> new RuntimeException("Diesel price not set by admin"));

        BigDecimal estimatedCost = request.getRequiredDieselLiter().multiply(dieselPrice.getPricePerUnit());
        Double dieselTankCapacity = user.getHospitalDieselTankCapacity();
        Double currentDieselReserve = user.getHospitalCurrentDieselReserve();

        if (dieselTankCapacity == null || dieselTankCapacity <= 0) {
            throw new RuntimeException("Hospital diesel tank capacity is not configured");
        }

        if (currentDieselReserve == null) {
            currentDieselReserve = 0.0;
        }

        double availableDieselSpace = dieselTankCapacity - currentDieselReserve;

        if (availableDieselSpace <= 0) {
            throw new RuntimeException("Hospital diesel tank is already full. Diesel request is not allowed.");
        }

        if (request.getRequiredDieselLiter().doubleValue() > availableDieselSpace) {
            throw new RuntimeException(
                    "Requested diesel cannot be greater than available diesel space. Available space: "
                            + Math.round(availableDieselSpace * 100.0) / 100.0
                            + " L"
            );
        }

        PumpProfile assignedPump = findAvailablePumpForFuelOrNull(FuelType.DIESEL, request.getRequiredDieselLiter());

        FuelRequestStatus status = FuelRequestStatus.PENDING; // Always PENDING for admin approval
        String adminNote = "Hospital diesel request received. Waiting for admin approval.";

        if ("CRITICAL".equals(user.getHospitalDieselStatus()) && assignedPump != null) {
            status = FuelRequestStatus.APPROVED;
            adminNote = "Auto-approved: CRITICAL backup and pump has sufficient diesel.";
        }

        FuelRequest hospitalRequest = FuelRequest.builder()
                .user(user)
                .pumpProfile(status == FuelRequestStatus.APPROVED ? assignedPump : null)
                .requestSource(FuelRequestSource.HOSPITAL_GENERATOR)
                .fuelType(FuelType.DIESEL)
                .requestedLiter(request.getRequiredDieselLiter())
                .fuelLevelStatus("HOSPITAL_" + valueOrDash(user.getHospitalDieselStatus()))
                .hospitalName(valueOrDefault(request.getHospitalName(), user.getHospitalName()))
                .hospitalRegistrationNumber(user.getHospitalRegistrationNumber())
                .hospitalAddress(user.getHospitalAddress())
                .affectedThana(user.getHospitalUnderThana())
                .generatorCapacity(String.format("%.2f", valueOrZero(user.getHospitalGeneratorCapacity())))
                .hospitalUrgencyLevel(valueOrDash(user.getHospitalDieselStatus()))
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

    public FuelRequestResponse createBuildingGeneratorFuelRequest(BuildingGeneratorFuelRequestCreateRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getRole() != Role.BUILDING_MANAGER) {
            throw new RuntimeException("Only Building Manager can request building generator diesel support");
        }

        FuelPrice dieselPrice = fuelPriceRepository.findByFuelType(FuelType.DIESEL)
                .orElseThrow(() -> new RuntimeException("Diesel price not set by admin"));

        BigDecimal estimatedCost = request.getRequiredDieselLiter().multiply(dieselPrice.getPricePerUnit());

        String adminNote = "Building generator diesel request received. Building: "
                + valueOrDash(user.getBuildingName())
                + ", Thana: "
                + valueOrDash(user.getBuildingUnderThana())
                + ". Waiting for admin approval.";

        FuelRequest buildingRequest = FuelRequest.builder()
                .user(user)
                .pumpProfile(null)
                .requestSource(FuelRequestSource.BUILDING_GENERATOR)
                .fuelType(FuelType.DIESEL)
                .requestedLiter(request.getRequiredDieselLiter())
                .fuelLevelStatus("BUILDING_GENERATOR")
                .buildingName(valueOrDefault(request.getBuildingName(), user.getBuildingName()))
                .buildingHoldingNumber(user.getHoldingNumber())
                .buildingAddress(user.getAddress())
                .buildingThana(user.getBuildingUnderThana())
                .buildingGeneratorPower(valueOrDefault(
                        request.getBuildingGeneratorPower(),
                        user.getGeneratorPower() == null ? "0.0" : String.format("%.2f", user.getGeneratorPower())
                ))              .buildingNumberOfFlats(user.getNumberOfFlats())
                .buildingReason(request.getReason())
                .buildingContactNumber(request.getContactNumber())
                .pricePerUnit(dieselPrice.getPricePerUnit())
                .estimatedCost(estimatedCost)
                .requestStatus(FuelRequestStatus.PENDING)
                .adminNote(adminNote)
                .build();

        return mapToResponse(fuelRequestRepository.save(buildingRequest));
    }

    public List<FuelRequestResponse> getBuildingGeneratorFuelRequestsByUser(Long userId) {
        return fuelRequestRepository
                .findByUserIdAndRequestSourceOrderByCreatedAtDesc(userId, FuelRequestSource.BUILDING_GENERATOR)
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

        FuelRequest savedRequest = fuelRequestRepository.save(fuelRequest);

        auditLogService.logSystem(
                "FUEL_REQUEST_APPROVED",
                "FUEL_REQUEST",
                savedRequest.getId(),
                "Fuel request approved and assigned to pump: " + pumpProfile.getPumpName()
        );

        return mapToResponse(savedRequest);
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

        FuelRequest savedRequest = fuelRequestRepository.save(fuelRequest);

        auditLogService.logSystem(
                "FUEL_REQUEST_REJECTED",
                "FUEL_REQUEST",
                savedRequest.getId(),
                "Fuel request rejected. Note: " + savedRequest.getAdminNote()
        );

        return mapToResponse(savedRequest);    }

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

        if (fuelRequest.getRequestSource() == FuelRequestSource.VEHICLE_OWNER) {
            validateAndUpdateVehicleOdometerAfterCollection(fuelRequest, request);
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

        FuelRequest savedRequest = fuelRequestRepository.save(fuelRequest);

        auditLogService.log(
                savedRequest.getPumpProfile() == null ? null : savedRequest.getPumpProfile().getUser(),
                "FUEL_COLLECTED",
                "FUEL_REQUEST",
                savedRequest.getId(),
                "Fuel collected from pump. Requested: "
                        + savedRequest.getRequestedLiter()
                        + " L, Collection code: "
                        + savedRequest.getCollectionCode()
        );

        return mapToResponse(savedRequest);    }

    private void validateAndUpdateVehicleOdometerAfterCollection(
            FuelRequest fuelRequest,
            FuelCollectionRequest request
    ) {
        Vehicle vehicle = fuelRequest.getVehicle();

        if (vehicle == null) {
            throw new RuntimeException("Vehicle information not found for this request");
        }

        if (request.getVerifiedNumberPlate() == null || request.getVerifiedNumberPlate().trim().isEmpty()) {
            throw new RuntimeException("Verified number plate is required for vehicle fuel collection");
        }

        if (!normalizeText(vehicle.getNumberPlate()).equals(normalizeText(request.getVerifiedNumberPlate()))) {
            throw new RuntimeException("Verified number plate does not match the approved vehicle");
        }

        if (request.getCurrentOdometerReading() == null) {
            throw new RuntimeException("Pump must enter current odometer reading before collection");
        }

        if (request.getCurrentOdometerReading().compareTo(vehicle.getOdometerReading()) < 0) {
            throw new RuntimeException("Collection odometer cannot be less than last verified odometer");
        }

        if (
                fuelRequest.getRequestOdometerReading() != null
                        && request.getCurrentOdometerReading().compareTo(fuelRequest.getRequestOdometerReading()) < 0
        ) {
            throw new RuntimeException("Collection odometer cannot be less than request odometer");
        }

        fuelRequest.setCollectionOdometerReading(request.getCurrentOdometerReading());

        vehicle.setOdometerReading(request.getCurrentOdometerReading());
        BigDecimal updatedVehicleFuel = vehicle.getCurrentFuelLiter() == null
                ? fuelRequest.getRequestedLiter()
                : vehicle.getCurrentFuelLiter().add(fuelRequest.getRequestedLiter());

        if (updatedVehicleFuel.compareTo(vehicle.getTankCapacity()) > 0) {
            updatedVehicleFuel = vehicle.getTankCapacity();
        }

        vehicle.setCurrentFuelLiter(updatedVehicleFuel);

        vehicleRepository.save(vehicle);
    }

    private void updateHospitalDieselReserveAfterCollection(FuelRequest fuelRequest) {
        User hospitalUser = fuelRequest.getUser();

        Double currentReserve = hospitalUser.getHospitalCurrentDieselReserve();

        if (currentReserve == null) {
            currentReserve = 0.0;
        }

        Double dieselTankCapacity = hospitalUser.getHospitalDieselTankCapacity();

        if (dieselTankCapacity == null || dieselTankCapacity <= 0) {
            throw new RuntimeException("Hospital diesel tank capacity is not configured");
        }

        double collectedDiesel = fuelRequest.getRequestedLiter().doubleValue();
        double updatedReserve = currentReserve + collectedDiesel;

        if (updatedReserve > dieselTankCapacity) {
            throw new RuntimeException(
                    "Collection cannot be completed. Hospital diesel reserve would exceed tank capacity. Available space: "
                            + Math.max(0, Math.round((dieselTankCapacity - currentReserve) * 100.0) / 100.0)
                            + " L"
            );
        }

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

        if (fuelRequest.getRequestSource() == FuelRequestSource.BUILDING_GENERATOR) {
            return "CCS-BUILDING-FUEL-" + fuelRequest.getId();
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
                .previousOdometerReading(fuelRequest.getPreviousOdometerReading())
                .requestOdometerReading(fuelRequest.getRequestOdometerReading())
                .collectionOdometerReading(fuelRequest.getCollectionOdometerReading())
                .distanceTravelled(fuelRequest.getDistanceTravelled())
                .fullTankRangeKm(fuelRequest.getFullTankRangeKm())
                .estimatedRemainingRangeKm(fuelRequest.getEstimatedRemainingRangeKm())
                .odometerEligible(fuelRequest.getOdometerEligible())

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

                .buildingName(fuelRequest.getBuildingName())
                .buildingHoldingNumber(fuelRequest.getBuildingHoldingNumber())
                .buildingAddress(fuelRequest.getBuildingAddress())
                .buildingThana(fuelRequest.getBuildingThana())
                .buildingGeneratorPower(fuelRequest.getBuildingGeneratorPower())
                .buildingNumberOfFlats(fuelRequest.getBuildingNumberOfFlats())
                .buildingReason(fuelRequest.getBuildingReason())
                .buildingContactNumber(fuelRequest.getBuildingContactNumber())

                .pumpId(pumpProfile == null ? null : pumpProfile.getId())
                .pumpName(pumpProfile == null ? "Not Assigned" : pumpProfile.getPumpName())
                .pumpAddress(pumpProfile == null ? "Not Assigned" : pumpProfile.getPumpAddress())

                .fuelType(fuelRequest.getFuelType())
                .requestedLiter(fuelRequest.getRequestedLiter())
                .requestedAmountBdt(fuelRequest.getRequestedAmountBdt())
                .extraFuelRequested(fuelRequest.getExtraFuelRequested())
                .extraFuelReasonType(fuelRequest.getExtraFuelReasonType())
                .extraFuelDemandMessage(fuelRequest.getExtraFuelDemandMessage())
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

    private String normalizeText(String value) {
        if (value == null) {
            return "";
        }

        return value.toLowerCase()
                .replace(" ", "")
                .replace("-", "")
                .replace("_", "")
                .trim();
    }

    private BigDecimal calculateEffectiveMileage(BigDecimal companyMileage) {
        if (companyMileage == null || companyMileage.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.valueOf(6);
        }

        BigDecimal mileageReduction;

        if (companyMileage.compareTo(BigDecimal.valueOf(10)) <= 0) {
            mileageReduction = BigDecimal.valueOf(3);
        } else {
            mileageReduction = BigDecimal.valueOf(8);
        }

        BigDecimal effectiveMileage = companyMileage.subtract(mileageReduction);

        if (effectiveMileage.compareTo(BigDecimal.valueOf(6)) < 0) {
            return BigDecimal.valueOf(6);
        }

        return effectiveMileage;
    }

    private double valueOrZero(Double value) {
        if (value == null) {
            return 0.0;
        }

        return value;
    }

    private BigDecimal getFixedVehicleFuelLimit(Vehicle vehicle) {
        if (vehicle.getVehicleType() == VehicleType.BIKE) {
            return BigDecimal.valueOf(500);
        }

        return BigDecimal.valueOf(2000);
    }

    private String buildExtraFuelDemandMessage(
            User user,
            Vehicle vehicle,
            FuelRequestCreateRequest request,
            BigDecimal estimatedCost,
            BigDecimal allowedLimitAmount
    ) {
        if (estimatedCost.compareTo(allowedLimitAmount) <= 0) {
            return null;
        }

        String reason = isBlank(request.getExtraFuelReasonType())
                ? "Extra fuel requested"
                : request.getExtraFuelReasonType();

        return "Extra fuel request submitted by "
                + valueOrDash(user.getFullName())
                + ". Vehicle: "
                + valueOrDash(vehicle.getBrand())
                + " "
                + valueOrDash(vehicle.getModel())
                + ", Plate: "
                + valueOrDash(vehicle.getNumberPlate())
                + ", Type: "
                + valueOrDash(vehicle.getVehicleType().name())
                + ". Requested: "
                + request.getRequestedLiter()
                + " L. Estimated cost: "
                + estimatedCost
                + " BDT. Normal limit: "
                + allowedLimitAmount
                + " BDT. Reason: "
                + reason
                + ". Admin approval is required.";
    }

}

