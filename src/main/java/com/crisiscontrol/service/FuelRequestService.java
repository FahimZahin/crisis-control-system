package com.crisiscontrol.service;

import com.crisiscontrol.dto.BuildingGeneratorFuelRequestCreateRequest;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

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
                    "Extra fuel request submitted. Source: "
                            + savedPendingRequest.getRequestSource()
                            + ", Fuel: "
                            + savedPendingRequest.getFuelType()
                            + ", Liter: "
                            + savedPendingRequest.getRequestedLiter()
                            + ", Cost: "
                            + savedPendingRequest.getEstimatedCost()
                            + " BDT, Current Status: "
                            + savedPendingRequest.getRequestStatus()
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
                "Vehicle fuel request created. Source: "
                        + savedRequest.getRequestSource()
                        + ", Fuel: "
                        + savedRequest.getFuelType()
                        + ", Liter: "
                        + savedRequest.getRequestedLiter()
                        + ", Current Status: "
                        + savedRequest.getRequestStatus()
        );

        if (savedRequest.getRequestStatus() == FuelRequestStatus.APPROVED) {
            savedRequest.setCollectionCode(generateCollectionCode(savedRequest));
            savedRequest = fuelRequestRepository.save(savedRequest);

            auditLogService.logSystem(
                    "FUEL_REQUEST_AUTO_APPROVED",
                    "FUEL_REQUEST",
                    savedRequest.getId(),
                    "Fuel request auto-approved. Fuel: "
                            + savedRequest.getFuelType()
                            + ", Liter: "
                            + savedRequest.getRequestedLiter()
                            + ", Pump: "
                            + (savedRequest.getPumpProfile() == null ? "Not Assigned" : savedRequest.getPumpProfile().getPumpName())
                            + ", Current Status: "
                            + savedRequest.getRequestStatus()
            );
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
        savedRequest = fuelRequestRepository.save(savedRequest);

        auditLogService.log(
                user,
                "EMERGENCY_FUEL_REQUEST_CREATED",
                "FUEL_REQUEST",
                savedRequest.getId(),
                "Emergency fuel request created. Fuel: "
                        + savedRequest.getFuelType()
                        + ", Liter: "
                        + savedRequest.getRequestedLiter()
                        + ", Pump: "
                        + (savedRequest.getPumpProfile() == null ? "Not Assigned" : savedRequest.getPumpProfile().getPumpName())
                        + ", Current Status: "
                        + savedRequest.getRequestStatus()
        );

        auditLogService.logSystem(
                "FUEL_REQUEST_AUTO_APPROVED",
                "FUEL_REQUEST",
                savedRequest.getId(),
                "Emergency fuel request auto-approved. Fuel: "
                        + savedRequest.getFuelType()
                        + ", Liter: "
                        + savedRequest.getRequestedLiter()
                        + ", Current Status: "
                        + savedRequest.getRequestStatus()
        );

        return mapToResponse(savedRequest);
    }

    public FuelRequestResponse createHospitalGeneratorFuelRequest(HospitalGeneratorFuelRequestCreateRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getRole() != Role.HOSPITAL_AUTHORITY) {
            throw new RuntimeException("Only Hospital Authority can request generator diesel support");
        }

        user.setTotalIcuUnits(request.getTotalIcuUnits());
        user.setAcPatientCapacity(request.getAcPatientCapacity());
        user.setNonAcPatientCapacity(request.getNonAcPatientCapacity());
        user = userRepository.save(user);

        user = hospitalSupportCalculationService.recalculateAndSave(user);

        FuelPrice dieselPrice = fuelPriceRepository.findByFuelType(FuelType.DIESEL)
                .orElseThrow(() -> new RuntimeException("Diesel price not set by admin"));

        BigDecimal requestedDiesel = safeAmount(request.getRequiredDieselLiter())
                .setScale(2, java.math.RoundingMode.HALF_UP);

        BigDecimal estimatedCost = requestedDiesel.multiply(dieselPrice.getPricePerUnit())
                .setScale(2, java.math.RoundingMode.HALF_UP);

        Double dieselTankCapacity = user.getHospitalDieselTankCapacity();
        Double currentDieselReserve = user.getHospitalCurrentDieselReserve();

        if (dieselTankCapacity == null || dieselTankCapacity <= 0) {
            throw new RuntimeException("Hospital diesel tank capacity is not configured");
        }

        if (currentDieselReserve == null) {
            currentDieselReserve = 0.0;
        }

        double availableDieselSpace = hospitalSupportCalculationService.calculateAvailableTankSpace(user);

        if (availableDieselSpace <= 0) {
            throw new RuntimeException("Hospital diesel tank is already full. Diesel request is not allowed.");
        }

        if (requestedDiesel.doubleValue() > availableDieselSpace) {
            throw new RuntimeException(
                    "Requested diesel cannot be greater than available diesel space. Available space: "
                            + Math.round(availableDieselSpace * 100.0) / 100.0
                            + " L"
            );
        }

        double currentBackupHours = hospitalSupportCalculationService.calculateBackupHours(user, currentDieselReserve);
        double criticalLoadKw = hospitalSupportCalculationService.calculateCriticalServiceLoadKw(user);
        double effectiveCriticalLoadKw = hospitalSupportCalculationService.calculateEffectiveCriticalLoadKw(user);
        double hourlyDieselConsumption = hospitalSupportCalculationService.calculateHourlyDieselConsumption(user);
        double requiredSixHourDiesel = hospitalSupportCalculationService.calculateRequiredDieselForMinimumBackup(user);
        double dieselShortage = hospitalSupportCalculationService.calculateDieselShortageForMinimumBackup(user);
        double autoApprovalLimit = hospitalSupportCalculationService.calculateAutoApprovalDieselLimit(user);
        boolean overloadRisk = hospitalSupportCalculationService.hasGeneratorOverloadRisk(user);

        boolean eligibleForAutoApproval = currentBackupHours < 6
                && autoApprovalLimit > 0
                && requestedDiesel.doubleValue() <= autoApprovalLimit;

        PumpProfile assignedPump = eligibleForAutoApproval
                ? findAvailablePumpForFuelOrNull(FuelType.DIESEL, requestedDiesel)
                : null;

        FuelRequestStatus status = FuelRequestStatus.PENDING;
        String adminNote;

        if (eligibleForAutoApproval && assignedPump != null) {
            status = FuelRequestStatus.APPROVED;
            adminNote = "Auto-approved for hospital critical service backup. "
                    + "Hospital backup is below 6 hours. "
                    + "Critical service load: " + roundTwo(criticalLoadKw) + " kW, "
                    + "Effective supported load: " + roundTwo(effectiveCriticalLoadKw) + " kW, "
                    + "Hourly diesel consumption: " + roundTwo(hourlyDieselConsumption) + " L/hour, "
                    + "Required diesel for 6 hours: " + roundTwo(requiredSixHourDiesel) + " L, "
                    + "Current reserve: " + roundTwo(currentDieselReserve) + " L, "
                    + "Auto approval limit: " + roundTwo(autoApprovalLimit) + " L.";
        } else if (eligibleForAutoApproval) {
            adminNote = "Hospital qualifies for emergency 6-hour backup support, but no open pump has enough diesel stock. "
                    + "Waiting for admin review/pump assignment. "
                    + "Auto approval limit: " + roundTwo(autoApprovalLimit) + " L.";
        } else {
            adminNote = "Admin approval required. Hospital request is above the automatic 6-hour critical-service support limit. "
                    + "Current backup: " + roundTwo(currentBackupHours) + " hours, "
                    + "Critical service load: " + roundTwo(criticalLoadKw) + " kW, "
                    + "Effective supported load: " + roundTwo(effectiveCriticalLoadKw) + " kW, "
                    + "Hourly diesel consumption: " + roundTwo(hourlyDieselConsumption) + " L/hour, "
                    + "Required diesel for 6 hours: " + roundTwo(requiredSixHourDiesel) + " L, "
                    + "Current reserve: " + roundTwo(currentDieselReserve) + " L, "
                    + "Shortage to reach 6 hours: " + roundTwo(dieselShortage) + " L, "
                    + "Available tank space: " + roundTwo(availableDieselSpace) + " L, "
                    + "Auto approval limit: " + roundTwo(autoApprovalLimit) + " L, "
                    + "Requested: " + requestedDiesel + " L.";
        }

        String hospitalPriorityLevel = hospitalSupportCalculationService.resolveHospitalPriorityLevel(user);

        FuelRequest hospitalRequest = FuelRequest.builder()
                .user(user)
                .pumpProfile(status == FuelRequestStatus.APPROVED ? assignedPump : null)
                .requestSource(FuelRequestSource.HOSPITAL_GENERATOR)
                .fuelType(FuelType.DIESEL)
                .requestedLiter(requestedDiesel)
                .fuelLevelStatus("HOSPITAL_" + valueOrDash(user.getHospitalDieselStatus()))
                .hospitalName(valueOrDefault(request.getHospitalName(), user.getHospitalName()))
                .hospitalRegistrationNumber(user.getHospitalRegistrationNumber())
                .hospitalAddress(user.getHospitalAddress())
                .affectedThana(user.getHospitalUnderThana())
                .generatorCapacity(String.format("%.2f", valueOrZero(user.getHospitalGeneratorCapacity())))
                .hospitalUrgencyLevel(valueOrDash(user.getHospitalDieselStatus()))
                .hospitalReason(request.getReason())
                .hospitalContactNumber(request.getContactNumber())
                .hospitalTotalIcuUnits(user.getTotalIcuUnits())
                .hospitalAcPatientCapacity(user.getAcPatientCapacity())
                .hospitalNonAcPatientCapacity(user.getNonAcPatientCapacity())
                .hospitalPriorityLevel(hospitalPriorityLevel)
                .pricePerUnit(dieselPrice.getPricePerUnit())
                .estimatedCost(estimatedCost)
                .requestStatus(status)
                .adminNote(adminNote)
                .build();

        FuelRequest savedRequest = fuelRequestRepository.save(hospitalRequest);

        auditLogService.log(
                user,
                "HOSPITAL_FUEL_REQUEST_CREATED",
                "FUEL_REQUEST",
                savedRequest.getId(),
                "Hospital diesel request created. Fuel: "
                        + savedRequest.getFuelType()
                        + ", Liter: "
                        + savedRequest.getRequestedLiter()
                        + ", Critical Load: "
                        + roundTwo(criticalLoadKw)
                        + " kW, Effective Load: "
                        + roundTwo(effectiveCriticalLoadKw)
                        + " kW, Auto Approval Limit: "
                        + roundTwo(autoApprovalLimit)
                        + " L, Auto Approved: "
                        + (status == FuelRequestStatus.APPROVED)
                        + ", Current Status: "
                        + savedRequest.getRequestStatus()
        );

        if (savedRequest.getRequestStatus() == FuelRequestStatus.APPROVED) {
            savedRequest.setCollectionCode(generateCollectionCode(savedRequest));
            savedRequest = fuelRequestRepository.save(savedRequest);

            auditLogService.logSystem(
                    "FUEL_REQUEST_AUTO_APPROVED",
                    "FUEL_REQUEST",
                    savedRequest.getId(),
                    "Hospital diesel request auto-approved for minimum 6-hour critical-service support. Fuel: "
                            + savedRequest.getFuelType()
                            + ", Liter: "
                            + savedRequest.getRequestedLiter()
                            + ", Pump: "
                            + (savedRequest.getPumpProfile() == null ? "Not Assigned" : savedRequest.getPumpProfile().getPumpName())
                            + ", Current Status: "
                            + savedRequest.getRequestStatus()
            );
        }

        return mapToResponse(savedRequest);
    }

    public FuelRequestResponse createBuildingGeneratorFuelRequest(BuildingGeneratorFuelRequestCreateRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getRole() != Role.BUILDING_MANAGER) {
            throw new RuntimeException("Only Building Manager can request building generator diesel support");
        }

        FuelPrice dieselPrice = fuelPriceRepository.findByFuelType(FuelType.DIESEL)
                .orElseThrow(() -> new RuntimeException("Diesel price not set by admin"));

        BigDecimal tankCapacity = safeAmount(request.getBuildingDieselTankCapacity());
        BigDecimal currentFuel = safeAmount(request.getBuildingCurrentFuel());
        BigDecimal requestedDiesel = safeAmount(request.getRequiredDieselLiter());

        if (tankCapacity.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Building diesel tank capacity must be greater than 0");
        }

        if (currentFuel.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("Current diesel stock cannot be negative");
        }

        if (currentFuel.compareTo(tankCapacity) > 0) {
            throw new RuntimeException("Current diesel stock cannot be greater than tank capacity");
        }

        if (requestedDiesel.compareTo(BigDecimal.ONE) < 0) {
            throw new RuntimeException("Required diesel liter must be at least 1");
        }

        BigDecimal availableTankSpace = tankCapacity.subtract(currentFuel);

        if (availableTankSpace.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Building diesel tank is already full. Diesel request is not allowed.");
        }

        if (requestedDiesel.compareTo(availableTankSpace) > 0) {
            throw new RuntimeException(
                    "Requested diesel cannot be greater than available tank space. Available space: "
                            + availableTankSpace.setScale(2, java.math.RoundingMode.HALF_UP)
                            + " L"
            );
        }

        BigDecimal weeklyAllocation = getBuildingWeeklyAllocation(user)
                .setScale(2, java.math.RoundingMode.HALF_UP);

        BigDecimal projectedStockAfterRequest = currentFuel.add(requestedDiesel)
                .setScale(2, java.math.RoundingMode.HALF_UP);

        BigDecimal remainingWeeklyAllocation = weeklyAllocation.subtract(currentFuel);

        if (remainingWeeklyAllocation.compareTo(BigDecimal.ZERO) < 0) {
            remainingWeeklyAllocation = BigDecimal.ZERO;
        }

        remainingWeeklyAllocation = remainingWeeklyAllocation.setScale(2, java.math.RoundingMode.HALF_UP);

        boolean withinWeeklyAllocation = projectedStockAfterRequest.compareTo(weeklyAllocation) <= 0;

        PumpProfile assignedPump = withinWeeklyAllocation
                ? findAvailablePumpForFuelOrNull(FuelType.DIESEL, requestedDiesel)
                : null;

        FuelRequestStatus status = FuelRequestStatus.PENDING;
        String adminNote;

        if (withinWeeklyAllocation && assignedPump != null) {
            status = FuelRequestStatus.APPROVED;
            adminNote = "Auto-approved within building weekly allocation. Current stock: "
                    + currentFuel.setScale(2, java.math.RoundingMode.HALF_UP)
                    + " L, Requested: "
                    + requestedDiesel.setScale(2, java.math.RoundingMode.HALF_UP)
                    + " L, Projected stock after request: "
                    + projectedStockAfterRequest
                    + " L, Weekly allocation: "
                    + weeklyAllocation
                    + " L, Remaining before request: "
                    + remainingWeeklyAllocation
                    + " L.";
        } else if (withinWeeklyAllocation) {
            adminNote = "Within building weekly allocation, but no open pump has enough diesel stock. Waiting for admin review/pump assignment. Current stock: "
                    + currentFuel.setScale(2, java.math.RoundingMode.HALF_UP)
                    + " L, Requested: "
                    + requestedDiesel.setScale(2, java.math.RoundingMode.HALF_UP)
                    + " L, Projected stock after request: "
                    + projectedStockAfterRequest
                    + " L, Weekly allocation: "
                    + weeklyAllocation
                    + " L, Remaining before request: "
                    + remainingWeeklyAllocation
                    + " L.";
        } else {
            adminNote = "Admin approval required because current stock plus requested diesel exceeds building weekly allocation. Current stock: "
                    + currentFuel.setScale(2, java.math.RoundingMode.HALF_UP)
                    + " L, Requested: "
                    + requestedDiesel.setScale(2, java.math.RoundingMode.HALF_UP)
                    + " L, Projected stock after request: "
                    + projectedStockAfterRequest
                    + " L, Weekly allocation: "
                    + weeklyAllocation
                    + " L, Remaining before request: "
                    + remainingWeeklyAllocation
                    + " L.";
        }

        BigDecimal estimatedCost = requestedDiesel.multiply(dieselPrice.getPricePerUnit());
        BigDecimal estimatedBackupHours = calculateBuildingBackupHours(user, currentFuel);
        Boolean lowStockAlert = resolveBuildingLowStockAlert(tankCapacity, currentFuel, estimatedBackupHours);

        user.setBuildingDieselTankCapacity(tankCapacity.doubleValue());
        user.setBuildingWeeklyAllocationLiter(weeklyAllocation.doubleValue());
        user.setBuildingCurrentFuel(currentFuel.doubleValue());
        user.setBuildingEstimatedBackupHours(estimatedBackupHours.doubleValue());
        userRepository.save(user);

        FuelRequest buildingRequest = FuelRequest.builder()
                .user(user)
                .pumpProfile(status == FuelRequestStatus.APPROVED ? assignedPump : null)
                .requestSource(FuelRequestSource.BUILDING_GENERATOR)
                .fuelType(FuelType.DIESEL)
                .requestedLiter(requestedDiesel)
                .fuelLevelStatus(Boolean.TRUE.equals(lowStockAlert) ? "BUILDING_LOW_STOCK" : "BUILDING_GENERATOR")
                .buildingName(valueOrDefault(request.getBuildingName(), user.getBuildingName()))
                .buildingHoldingNumber(user.getHoldingNumber())
                .buildingAddress(user.getAddress())
                .buildingThana(user.getBuildingUnderThana())
                .buildingGeneratorPower(valueOrDefault(
                        request.getBuildingGeneratorPower(),
                        user.getGeneratorPower() == null ? "0.0" : String.format("%.2f", user.getGeneratorPower())
                ))
                .buildingNumberOfFlats(user.getNumberOfFlats())
                .buildingReason(request.getReason())
                .buildingContactNumber(request.getContactNumber())
                .buildingDieselTankCapacity(tankCapacity)
                .buildingWeeklyAllocationLiter(weeklyAllocation)
                .buildingCurrentFuel(currentFuel)
                .buildingEstimatedBackupHours(estimatedBackupHours)
                .buildingLowStockAlert(lowStockAlert)
                .pricePerUnit(dieselPrice.getPricePerUnit())
                .estimatedCost(estimatedCost)
                .requestStatus(status)
                .adminNote(adminNote)
                .build();

        FuelRequest savedRequest = fuelRequestRepository.save(buildingRequest);

        auditLogService.log(
                user,
                "BUILDING_FUEL_REQUEST_CREATED",
                "FUEL_REQUEST",
                savedRequest.getId(),
                "Building generator diesel request created. Fuel: "
                        + savedRequest.getFuelType()
                        + ", Liter: "
                        + savedRequest.getRequestedLiter()
                        + ", Weekly Allocation: "
                        + weeklyAllocation
                        + ", Current Stock: "
                        + currentFuel
                        + " L, Projected Stock After Request: "
                        + projectedStockAfterRequest
                        + " L, Auto Approved: "
                        + (status == FuelRequestStatus.APPROVED)
                        + ", Current Status: "
                        + savedRequest.getRequestStatus()
        );

        if (savedRequest.getRequestStatus() == FuelRequestStatus.APPROVED) {
            savedRequest.setCollectionCode(generateCollectionCode(savedRequest));
            savedRequest = fuelRequestRepository.save(savedRequest);

            auditLogService.logSystem(
                    "FUEL_REQUEST_AUTO_APPROVED",
                    "FUEL_REQUEST",
                    savedRequest.getId(),
                    "Building generator diesel request auto-approved within weekly allocation. Fuel: "
                            + savedRequest.getFuelType()
                            + ", Liter: "
                            + savedRequest.getRequestedLiter()
                            + ", Pump: "
                            + (savedRequest.getPumpProfile() == null ? "Not Assigned" : savedRequest.getPumpProfile().getPumpName())
                            + ", Current Status: "
                            + savedRequest.getRequestStatus()
            );
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

        PumpProfile pumpProfile;

        if (
                decisionRequest.getPumpId() == null
                        && (
                        fuelRequest.getRequestSource() == FuelRequestSource.BUILDING_GENERATOR
                                || fuelRequest.getRequestSource() == FuelRequestSource.HOSPITAL_GENERATOR
                                || fuelRequest.getRequestSource() == FuelRequestSource.EMERGENCY
                )
        ) {
            pumpProfile = findAvailablePumpForFuelOrNull(
                    fuelRequest.getFuelType(),
                    fuelRequest.getRequestedLiter()
            );

            if (pumpProfile == null) {
                throw new RuntimeException("No open pump has enough " + fuelRequest.getFuelType() + " stock for this request");
            }
        } else {
            pumpProfile = pumpProfileRepository.findById(decisionRequest.getPumpId())
                    .orElseThrow(() -> new RuntimeException("Pump not found"));
        }

        if (pumpProfile.getPumpStatus() != PumpStatus.OPEN) {
            throw new RuntimeException("Selected pump is closed");
        }

        PumpFuelStock pumpFuelStock = pumpFuelStockRepository
                .findByPumpProfileAndFuelType(pumpProfile, fuelRequest.getFuelType())
                .orElseThrow(() -> new RuntimeException("Selected pump does not have " + fuelRequest.getFuelType()));

        if (pumpFuelStock.getCurrentStock().compareTo(fuelRequest.getRequestedLiter()) < 0) {
            throw new RuntimeException("Selected pump does not have enough " + fuelRequest.getFuelType() + " stock");
        }

        if (fuelRequest.getRequestSource() == FuelRequestSource.HOSPITAL_GENERATOR) {
            validateHospitalDieselSpaceBeforeCollection(fuelRequest);
        }

        if (fuelRequest.getRequestSource() == FuelRequestSource.BUILDING_GENERATOR) {
            validateBuildingDieselSpaceBeforeCollection(fuelRequest);
        }

        fuelRequest.setPumpProfile(pumpProfile);
        fuelRequest.setRequestStatus(FuelRequestStatus.APPROVED);
        fuelRequest.setCollectionCode(generateCollectionCode(fuelRequest));
        fuelRequest.setAdminNote(
                isBlank(decisionRequest.getAdminNote())
                        ? "Approved by admin. Pump auto-assigned: " + pumpProfile.getPumpName() + "."
                        : decisionRequest.getAdminNote() + " Pump auto-assigned: " + pumpProfile.getPumpName() + "."
        );

        FuelRequest savedRequest = fuelRequestRepository.save(fuelRequest);

        auditLogService.logSystem(
                "FUEL_REQUEST_APPROVED",
                "FUEL_REQUEST",
                savedRequest.getId(),
                "Fuel request approved and assigned to pump: "
                        + pumpProfile.getPumpName()
                        + ", Fuel: "
                        + savedRequest.getFuelType()
                        + ", Liter: "
                        + savedRequest.getRequestedLiter()
                        + ", Current Status: "
                        + savedRequest.getRequestStatus()
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
                "Fuel request rejected. Fuel: "
                        + savedRequest.getFuelType()
                        + ", Liter: "
                        + savedRequest.getRequestedLiter()
                        + ", Note: "
                        + savedRequest.getAdminNote()
                        + ", Current Status: "
                        + savedRequest.getRequestStatus()
        );

        return mapToResponse(savedRequest);
    }

    @Transactional
    public FuelRequestResponse collectFuelByCode(FuelCollectionRequest request) {
        if (request.getCollectionCode() == null || request.getCollectionCode().trim().isEmpty()) {
            throw new RuntimeException("Collection code is required");
        }

        String normalizedCode = request.getCollectionCode().trim().toUpperCase();

        FuelRequest fuelRequest = fuelRequestRepository.findByCollectionCode(normalizedCode)
                .orElseThrow(() -> new RuntimeException("Invalid collection code"));

        if (fuelRequest.getCollectedAt() != null || fuelRequest.getRequestStatus() == FuelRequestStatus.COLLECTED) {
            throw new RuntimeException("This collection code has already been used");
        }

        if (fuelRequest.getRequestStatus() != FuelRequestStatus.APPROVED) {
            throw new RuntimeException("This collection code is not valid for collection because the request is not approved");
        }

        if (fuelRequest.getPumpProfile() == null) {
            throw new RuntimeException("No pump assigned for this request");
        }

        if (!fuelRequest.getPumpProfile().getId().equals(request.getPumpId())) {
            throw new RuntimeException("This fuel request is not assigned to your pump");
        }

        String paymentMethod = normalizePaymentMethod(request.getPaymentMethod());
        String bkashTransactionId = normalizeBkashTransactionId(paymentMethod, request.getBkashTransactionId());
        BigDecimal paidAmount = resolvePaymentAmount(fuelRequest);

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

        if (fuelRequest.getRequestSource() == FuelRequestSource.HOSPITAL_GENERATOR) {
            validateHospitalDieselSpaceBeforeCollection(fuelRequest);
        }

        if (fuelRequest.getRequestSource() == FuelRequestSource.BUILDING_GENERATOR) {
            validateBuildingDieselSpaceBeforeCollection(fuelRequest);
        }

        BigDecimal updatedStock = pumpFuelStock.getCurrentStock().subtract(fuelRequest.getRequestedLiter());
        pumpFuelStock.setCurrentStock(updatedStock);

        PumpFuelStock savedPumpFuelStock = pumpFuelStockRepository.save(pumpFuelStock);

        auditLogService.log(
                pumpProfile.getUser(),
                "PUMP_STOCK_UPDATED",
                "PUMP_FUEL_STOCK",
                savedPumpFuelStock.getId(),
                "Pump stock updated after collection. Pump: "
                        + pumpProfile.getPumpName()
                        + ", Fuel: "
                        + savedPumpFuelStock.getFuelType()
                        + ", Current Stock: "
                        + savedPumpFuelStock.getCurrentStock()
                        + " L"
        );

        updatePumpProfileTotalStock(pumpProfile);

        if (fuelRequest.getRequestSource() == FuelRequestSource.HOSPITAL_GENERATOR) {
            updateHospitalDieselReserveAfterCollection(fuelRequest);
        }

        if (fuelRequest.getRequestSource() == FuelRequestSource.BUILDING_GENERATOR) {
            updateBuildingDieselStockAfterCollection(fuelRequest);
        }

        fuelRequest.setRequestStatus(FuelRequestStatus.COLLECTED);
        fuelRequest.setCollectedAt(LocalDateTime.now());
        fuelRequest.setPaymentMethod(paymentMethod);
        fuelRequest.setPaidAmountBdt(paidAmount);
        fuelRequest.setCashAmountBdt("CASH".equals(paymentMethod) ? paidAmount : BigDecimal.ZERO);
        fuelRequest.setBkashTransactionId(bkashTransactionId);
        fuelRequest.setPaymentRecordedAt(LocalDateTime.now());
        fuelRequest.setAdminNote("Fuel collected successfully from assigned pump. Payment method: " + paymentMethod + ".");

        FuelRequest savedRequest = fuelRequestRepository.save(fuelRequest);

        auditLogService.log(
                pumpProfile.getUser(),
                "FUEL_REQUEST_COLLECTED",
                "FUEL_REQUEST",
                savedRequest.getId(),
                "One-time collection code used successfully. Pump: "
                        + pumpProfile.getPumpName()
                        + ", Fuel: "
                        + savedRequest.getFuelType()
                        + ", Liter: "
                        + savedRequest.getRequestedLiter()
                        + ", Payment Method: "
                        + savedRequest.getPaymentMethod()
                        + ", Paid Amount: "
                        + savedRequest.getPaidAmountBdt()
                        + " BDT, Collection code: "
                        + normalizedCode
                        + ", Current Status: "
                        + savedRequest.getRequestStatus()
        );

        return mapToResponse(savedRequest);
    }

    public Map<String, Object> getPumpTransparencyToday(Long pumpId) {
        PumpProfile pumpProfile = pumpProfileRepository.findById(pumpId)
                .orElseThrow(() -> new RuntimeException("Pump profile not found"));

        LocalDate today = LocalDate.now();
        LocalDateTime startDateTime = today.atStartOfDay();
        LocalDateTime endDateTime = startDateTime.plusDays(1);

        List<FuelRequest> collectedRequests =
                fuelRequestRepository.findByPumpProfileIdAndRequestStatusAndCollectedAtBetweenOrderByCollectedAtDesc(
                        pumpId,
                        FuelRequestStatus.COLLECTED,
                        startDateTime,
                        endDateTime
                );

        BigDecimal dailyCashTotal = BigDecimal.ZERO;
        BigDecimal dailyBkashTotal = BigDecimal.ZERO;
        BigDecimal fuelSoldToday = BigDecimal.ZERO;

        for (FuelRequest request : collectedRequests) {
            fuelSoldToday = fuelSoldToday.add(safeAmount(request.getRequestedLiter()));

            if ("CASH".equalsIgnoreCase(valueOrDash(request.getPaymentMethod()))) {
                dailyCashTotal = dailyCashTotal.add(safeAmount(request.getPaidAmountBdt()));
            }

            if ("BKASH".equalsIgnoreCase(valueOrDash(request.getPaymentMethod()))) {
                dailyBkashTotal = dailyBkashTotal.add(safeAmount(request.getPaidAmountBdt()));
            }
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("pumpId", pumpProfile.getId());
        response.put("pumpName", pumpProfile.getPumpName());
        response.put("date", today.toString());
        response.put("dailyCashTotal", dailyCashTotal);
        response.put("dailyBkashTotal", dailyBkashTotal);
        response.put("totalPaymentToday", dailyCashTotal.add(dailyBkashTotal));
        response.put("fuelSoldToday", fuelSoldToday);
        response.put("totalCollectionsToday", collectedRequests.size());

        return response;
    }

    public Map<String, Object> getPumpPaymentRecords(Long pumpId, String paymentMethod, LocalDate selectedDate) {
        PumpProfile pumpProfile = pumpProfileRepository.findById(pumpId)
                .orElseThrow(() -> new RuntimeException("Pump profile not found"));

        String normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);

        LocalDateTime startDateTime = selectedDate.atStartOfDay();
        LocalDateTime endDateTime = startDateTime.plusDays(1);

        List<FuelRequest> collectedRequests =
                fuelRequestRepository.findByPumpProfileIdAndRequestStatusAndCollectedAtBetweenOrderByCollectedAtDesc(
                        pumpId,
                        FuelRequestStatus.COLLECTED,
                        startDateTime,
                        endDateTime
                );

        List<FuelRequestResponse> filteredRecords = collectedRequests
                .stream()
                .filter(request -> normalizedPaymentMethod.equalsIgnoreCase(valueOrDash(request.getPaymentMethod())))
                .map(this::mapToResponse)
                .toList();

        BigDecimal totalAmount = BigDecimal.ZERO;
        BigDecimal totalFuelSold = BigDecimal.ZERO;

        for (FuelRequestResponse record : filteredRecords) {
            totalAmount = totalAmount.add(safeAmount(record.getPaidAmountBdt()));
            totalFuelSold = totalFuelSold.add(safeAmount(record.getRequestedLiter()));
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("pumpId", pumpProfile.getId());
        response.put("pumpName", pumpProfile.getPumpName());
        response.put("paymentMethod", normalizedPaymentMethod);
        response.put("date", selectedDate.toString());
        response.put("totalAmount", totalAmount);
        response.put("totalFuelSold", totalFuelSold);
        response.put("totalRecords", filteredRecords.size());
        response.put("records", filteredRecords);

        return response;
    }


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

    private void validateHospitalDieselSpaceBeforeCollection(FuelRequest fuelRequest) {
        User hospitalUser = fuelRequest.getUser();

        if (hospitalUser == null) {
            throw new RuntimeException("Hospital user information not found for this request");
        }

        Double dieselTankCapacity = hospitalUser.getHospitalDieselTankCapacity();

        if (dieselTankCapacity == null || dieselTankCapacity <= 0) {
            throw new RuntimeException("Hospital diesel tank capacity is not configured");
        }

        Double currentReserve = hospitalUser.getHospitalCurrentDieselReserve();

        if (currentReserve == null) {
            currentReserve = 0.0;
        }

        double requestedDiesel = fuelRequest.getRequestedLiter().doubleValue();
        double availableSpace = dieselTankCapacity - currentReserve;

        if (availableSpace <= 0) {
            throw new RuntimeException("Hospital diesel tank is already full. Collection is not allowed.");
        }

        if (requestedDiesel > availableSpace) {
            throw new RuntimeException(
                    "Collection cannot be completed. Requested diesel is greater than hospital available tank space. Available space: "
                            + Math.round(availableSpace * 100.0) / 100.0
                            + " L"
            );
        }
    }

    private void updateHospitalDieselReserveAfterCollection(FuelRequest fuelRequest) {
        User hospitalUser = fuelRequest.getUser();

        if (hospitalUser == null) {
            throw new RuntimeException("Hospital user information not found for this request");
        }

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

    private void validateBuildingDieselSpaceBeforeCollection(FuelRequest fuelRequest) {
        User buildingUser = fuelRequest.getUser();

        if (buildingUser == null) {
            throw new RuntimeException("Building user information not found for this request");
        }

        Double tankCapacityDouble = buildingUser.getBuildingDieselTankCapacity();
        Double currentFuelDouble = buildingUser.getBuildingCurrentFuel();

        if (tankCapacityDouble == null || tankCapacityDouble <= 0) {
            throw new RuntimeException("Building diesel tank capacity is not configured");
        }

        if (currentFuelDouble == null) {
            currentFuelDouble = 0.0;
        }

        BigDecimal tankCapacity = BigDecimal.valueOf(tankCapacityDouble);
        BigDecimal currentFuel = BigDecimal.valueOf(currentFuelDouble);
        BigDecimal requestedDiesel = fuelRequest.getRequestedLiter();

        BigDecimal availableSpace = tankCapacity.subtract(currentFuel);

        if (availableSpace.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Building diesel tank is already full. Collection is not allowed.");
        }

        if (requestedDiesel.compareTo(availableSpace) > 0) {
            throw new RuntimeException(
                    "Collection cannot be completed. Requested diesel is greater than building available tank space. Available space: "
                            + availableSpace.setScale(2, java.math.RoundingMode.HALF_UP)
                            + " L"
            );
        }
    }

    private void updateBuildingDieselStockAfterCollection(FuelRequest fuelRequest) {
        User buildingUser = fuelRequest.getUser();

        if (buildingUser == null) {
            throw new RuntimeException("Building user information not found for this request");
        }

        Double currentFuelDouble = buildingUser.getBuildingCurrentFuel();

        if (currentFuelDouble == null) {
            currentFuelDouble = 0.0;
        }

        Double tankCapacityDouble = buildingUser.getBuildingDieselTankCapacity();

        if (tankCapacityDouble == null || tankCapacityDouble <= 0) {
            throw new RuntimeException("Building diesel tank capacity is not configured");
        }

        BigDecimal currentFuel = BigDecimal.valueOf(currentFuelDouble);
        BigDecimal tankCapacity = BigDecimal.valueOf(tankCapacityDouble);
        BigDecimal updatedFuel = currentFuel.add(fuelRequest.getRequestedLiter());

        if (updatedFuel.compareTo(tankCapacity) > 0) {
            throw new RuntimeException(
                    "Collection cannot be completed. Building diesel stock would exceed tank capacity. Available space: "
                            + tankCapacity.subtract(currentFuel).max(BigDecimal.ZERO).setScale(2, java.math.RoundingMode.HALF_UP)
                            + " L"
            );
        }

        BigDecimal updatedBackupHours = calculateBuildingBackupHours(buildingUser, updatedFuel);
        Boolean lowStockAlert = resolveBuildingLowStockAlert(tankCapacity, updatedFuel, updatedBackupHours);

        buildingUser.setBuildingCurrentFuel(updatedFuel.doubleValue());
        buildingUser.setBuildingEstimatedBackupHours(updatedBackupHours.doubleValue());
        userRepository.save(buildingUser);

        fuelRequest.setBuildingCurrentFuel(updatedFuel);
        fuelRequest.setBuildingEstimatedBackupHours(updatedBackupHours);
        fuelRequest.setBuildingLowStockAlert(lowStockAlert);
    }

    private BigDecimal calculateBuildingBackupHours(User buildingUser, BigDecimal currentFuel) {
        if (buildingUser == null) {
            return BigDecimal.ZERO;
        }

        if (currentFuel == null || currentFuel.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        Integer numberOfFlats = buildingUser.getNumberOfFlats();

        if (numberOfFlats == null || numberOfFlats <= 0) {
            return BigDecimal.ZERO;
        }

        double perFlatWatt = (2.0 * 20.0) + (2.0 * 75.0);
        double perFlatKw = perFlatWatt / 1000.0;
        double requiredLoadKw = numberOfFlats * perFlatKw;

        double safeGeneratorCapacityKw = 0.0;

        if (buildingUser.getGeneratorPower() != null && buildingUser.getGeneratorPower() > 0) {
            safeGeneratorCapacityKw = buildingUser.getGeneratorPower() * 0.80;
        }

        double effectiveLoadKw = requiredLoadKw;

        if (safeGeneratorCapacityKw > 0 && safeGeneratorCapacityKw < requiredLoadKw) {
            effectiveLoadKw = safeGeneratorCapacityKw;
        }

        double hourlyDieselUse = effectiveLoadKw * 0.27;

        if (hourlyDieselUse <= 0) {
            return BigDecimal.ZERO;
        }

        return currentFuel.divide(
                BigDecimal.valueOf(hourlyDieselUse),
                2,
                java.math.RoundingMode.HALF_UP
        );
    }

    private Boolean resolveBuildingLowStockAlert(
            BigDecimal tankCapacity,
            BigDecimal currentFuel,
            BigDecimal estimatedBackupHours
    ) {
        if (tankCapacity == null || tankCapacity.compareTo(BigDecimal.ZERO) <= 0) {
            return true;
        }

        if (currentFuel == null || currentFuel.compareTo(BigDecimal.ZERO) <= 0) {
            return true;
        }

        BigDecimal stockPercentage = currentFuel
                .multiply(BigDecimal.valueOf(100))
                .divide(tankCapacity, 2, java.math.RoundingMode.HALF_UP);

        return stockPercentage.compareTo(BigDecimal.valueOf(20)) <= 0
                || safeAmount(estimatedBackupHours).compareTo(BigDecimal.valueOf(6)) < 0;
    }

    private BigDecimal getAdminWeeklyDieselAllocation(FuelLimitType limitType, BigDecimal defaultLimit) {
        FuelLimit fuelLimit = fuelLimitRepository.findByLimitType(limitType)
                .orElseGet(() -> fuelLimitRepository.save(
                        FuelLimit.builder()
                                .limitType(limitType)
                                .limitAmount(defaultLimit)
                                .limitUnit("Liter/Week")
                                .description("Admin-set weekly diesel allocation")
                                .build()
                ));

        return safeAmount(fuelLimit.getLimitAmount());
    }

    private BigDecimal calculateWeeklyUsedDiesel(Long userId, FuelRequestSource requestSource) {
        LocalDate today = LocalDate.now();
        LocalDate weekStartDate = today.minusDays(today.getDayOfWeek().getValue() - 1L);
        LocalDateTime weekStart = weekStartDate.atStartOfDay();
        LocalDateTime weekEnd = weekStart.plusDays(7);

        return fuelRequestRepository.findByUserIdAndRequestSourceOrderByCreatedAtDesc(userId, requestSource)
                .stream()
                .filter(request -> request.getRequestStatus() == FuelRequestStatus.APPROVED
                        || request.getRequestStatus() == FuelRequestStatus.COLLECTED)
                .filter(request -> request.getCreatedAt() != null)
                .filter(request -> !request.getCreatedAt().isBefore(weekStart))
                .filter(request -> request.getCreatedAt().isBefore(weekEnd))
                .map(FuelRequest::getRequestedLiter)
                .map(this::safeAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private String resolveHospitalPriorityLevel(
            String dieselStatus,
            Integer totalIcuUnits,
            Integer acPatientCapacity,
            Integer nonAcPatientCapacity
    ) {
        int icu = valueOrZero(totalIcuUnits);
        int acPatients = valueOrZero(acPatientCapacity);
        int nonAcPatients = valueOrZero(nonAcPatientCapacity);
        int totalPatients = acPatients + nonAcPatients;

        if ("CRITICAL".equalsIgnoreCase(valueOrDash(dieselStatus)) && icu > 0) {
            return "CRITICAL_ICU_PRIORITY";
        }

        if ("CRITICAL".equalsIgnoreCase(valueOrDash(dieselStatus)) && totalPatients >= 50) {
            return "CRITICAL_HIGH_PATIENT_PRIORITY";
        }

        if ("CRITICAL".equalsIgnoreCase(valueOrDash(dieselStatus))) {
            return "CRITICAL_STANDARD_PRIORITY";
        }

        if (icu > 0 || totalPatients >= 50) {
            return "PATIENT_SAFETY_PRIORITY";
        }

        return "STANDARD_PRIORITY";
    }

    private int valueOrZero(Integer value) {
        return value == null ? 0 : value;
    }

    private void updatePumpProfileTotalStock(PumpProfile pumpProfile) {
        List<PumpFuelStock> stocks = pumpFuelStockRepository.findByPumpProfileIdOrderByFuelTypeAsc(pumpProfile.getId());

        BigDecimal totalCapacity = BigDecimal.ZERO;
        BigDecimal totalCurrentStock = BigDecimal.ZERO;
        StringBuilder fuelTypesBuilder = new StringBuilder();

        for (PumpFuelStock stock : stocks) {
            totalCapacity = totalCapacity.add(stock.getFuelCapacity());
            totalCurrentStock = totalCurrentStock.add(stock.getCurrentStock());

            if (fuelTypesBuilder.length() > 0) {
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

    private String normalizeFuelLevel(String fuelLevelStatus) {
        if (fuelLevelStatus == null) {
            return "UNKNOWN";
        }

        return fuelLevelStatus.trim().toUpperCase();
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
                .hospitalTotalIcuUnits(fuelRequest.getHospitalTotalIcuUnits())
                .hospitalAcPatientCapacity(fuelRequest.getHospitalAcPatientCapacity())
                .hospitalNonAcPatientCapacity(fuelRequest.getHospitalNonAcPatientCapacity())
                .hospitalPriorityLevel(valueOrDash(fuelRequest.getHospitalPriorityLevel()))

                .buildingName(fuelRequest.getBuildingName())
                .buildingHoldingNumber(fuelRequest.getBuildingHoldingNumber())
                .buildingAddress(fuelRequest.getBuildingAddress())
                .buildingThana(fuelRequest.getBuildingThana())
                .buildingGeneratorPower(fuelRequest.getBuildingGeneratorPower())
                .buildingNumberOfFlats(fuelRequest.getBuildingNumberOfFlats())
                .buildingReason(fuelRequest.getBuildingReason())
                .buildingContactNumber(fuelRequest.getBuildingContactNumber())
                .buildingDieselTankCapacity(fuelRequest.getBuildingDieselTankCapacity())
                .buildingWeeklyAllocationLiter(fuelRequest.getBuildingWeeklyAllocationLiter())
                .buildingCurrentFuel(fuelRequest.getBuildingCurrentFuel())
                .buildingEstimatedBackupHours(fuelRequest.getBuildingEstimatedBackupHours())
                .buildingLowStockAlert(fuelRequest.getBuildingLowStockAlert())

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
                .paymentMethod(fuelRequest.getPaymentMethod())
                .cashAmountBdt(fuelRequest.getCashAmountBdt())
                .bkashTransactionId(fuelRequest.getBkashTransactionId())
                .paidAmountBdt(fuelRequest.getPaidAmountBdt())
                .paymentRecordedAt(fuelRequest.getPaymentRecordedAt())
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

    private String normalizePaymentMethod(String paymentMethod) {
        if (paymentMethod == null || paymentMethod.trim().isEmpty()) {
            throw new RuntimeException("Payment method is required");
        }

        String normalizedPaymentMethod = paymentMethod.trim().toUpperCase();

        if (!"CASH".equals(normalizedPaymentMethod) && !"BKASH".equals(normalizedPaymentMethod)) {
            throw new RuntimeException("Payment method must be CASH or BKASH");
        }

        return normalizedPaymentMethod;
    }

    private String normalizeBkashTransactionId(String paymentMethod, String bkashTransactionId) {
        if ("BKASH".equals(paymentMethod)) {
            if (bkashTransactionId == null || bkashTransactionId.trim().isEmpty()) {
                throw new RuntimeException("bKash transaction ID is required for bKash payment");
            }

            return bkashTransactionId.trim();
        }

        return null;
    }

    private BigDecimal resolvePaymentAmount(FuelRequest fuelRequest) {
        if (fuelRequest.getEstimatedCost() != null) {
            return fuelRequest.getEstimatedCost();
        }

        if (fuelRequest.getRequestedAmountBdt() != null) {
            return fuelRequest.getRequestedAmountBdt();
        }

        if (fuelRequest.getPricePerUnit() != null && fuelRequest.getRequestedLiter() != null) {
            return fuelRequest.getPricePerUnit().multiply(fuelRequest.getRequestedLiter());
        }

        return BigDecimal.ZERO;
    }

    private BigDecimal getBuildingWeeklyAllocation(User user) {
        if (user.getBuildingWeeklyAllocationLiter() != null && user.getBuildingWeeklyAllocationLiter() > 0) {
            return BigDecimal.valueOf(user.getBuildingWeeklyAllocationLiter());
        }

        BigDecimal calculatedAllocation = calculateBuildingWeeklyAllocationFromUser(user);
        user.setBuildingWeeklyAllocationLiter(calculatedAllocation.doubleValue());
        userRepository.save(user);

        return calculatedAllocation;
    }

    private BigDecimal calculateBuildingWeeklyAllocationFromUser(User user) {
        if (user.getNumberOfFlats() == null || user.getNumberOfFlats() <= 0) {
            return BigDecimal.ZERO;
        }

        double perFlatWatt = (2.0 * 20.0) + (2.0 * 75.0);
        double perFlatKw = perFlatWatt / 1000.0;
        double requiredLoadKw = user.getNumberOfFlats() * perFlatKw;

        double safeGeneratorCapacityKw = 0.0;

        if (user.getGeneratorPower() != null && user.getGeneratorPower() > 0) {
            safeGeneratorCapacityKw = user.getGeneratorPower() * 0.80;
        }

        double effectiveLoadKw = requiredLoadKw;

        if (safeGeneratorCapacityKw > 0 && safeGeneratorCapacityKw < requiredLoadKw) {
            effectiveLoadKw = safeGeneratorCapacityKw;
        }

        double weeklyOutageHours = 2.0 * 7.0;
        double weeklyDieselLiter = effectiveLoadKw * weeklyOutageHours * 0.27;

        return BigDecimal.valueOf(Math.ceil(weeklyDieselLiter)).setScale(2, java.math.RoundingMode.HALF_UP);
    }

    private double roundTwo(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private BigDecimal safeAmount(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
