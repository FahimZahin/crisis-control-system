package com.crisiscontrol.controller;

import com.crisiscontrol.entity.AuditLog;
import com.crisiscontrol.entity.FuelRequest;
import com.crisiscontrol.entity.FuelRequestSource;
import com.crisiscontrol.entity.FuelRequestStatus;
import com.crisiscontrol.entity.PowerOutageNotice;
import com.crisiscontrol.entity.PowerOutageStatus;
import com.crisiscontrol.entity.PumpFuelStock;
import com.crisiscontrol.entity.PumpProfile;
import com.crisiscontrol.entity.Role;
import com.crisiscontrol.entity.User;
import com.crisiscontrol.entity.UserStatus;
import com.crisiscontrol.repository.FuelRequestRepository;
import com.crisiscontrol.repository.PowerOutageRepository;
import com.crisiscontrol.repository.PumpFuelStockRepository;
import com.crisiscontrol.repository.PumpProfileRepository;
import com.crisiscontrol.repository.UserRepository;
import com.crisiscontrol.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final AuditLogService auditLogService;
    private final FuelRequestRepository fuelRequestRepository;
    private final PumpFuelStockRepository pumpFuelStockRepository;
    private final PowerOutageRepository powerOutageRepository;
    private final UserRepository userRepository;
    private final PumpProfileRepository pumpProfileRepository;

    @GetMapping("/audit-logs")
    public ResponseEntity<List<AuditLog>> getAuditLogs(
            @RequestParam(required = false) String keyword
    ) {
        return ResponseEntity.ok(auditLogService.searchLogs(keyword));
    }

    @GetMapping("/audit-logs/fuel")
    public ResponseEntity<List<Map<String, Object>>> getFuelAuditLogs(
            @RequestParam(required = false) String auditPeriod,
            @RequestParam(required = false) String auditDate,
            @RequestParam(required = false) String auditMonth,
            @RequestParam(required = false) Integer auditYear
    ) {
        List<Map<String, Object>> logs = filterAuditLogsByPeriod(
                auditLogService.getFuelLogs(),
                auditPeriod,
                auditDate,
                auditMonth,
                auditYear
        )
                .stream()
                .limit(10)
                .map(this::mapAuditLog)
                .toList();

        return ResponseEntity.ok(logs);
    }

    @GetMapping("/audit-logs/utility")
    public ResponseEntity<List<Map<String, Object>>> getUtilityAuditLogs(
            @RequestParam(required = false) String auditPeriod,
            @RequestParam(required = false) String auditDate,
            @RequestParam(required = false) String auditMonth,
            @RequestParam(required = false) Integer auditYear
    ) {
        List<Map<String, Object>> logs = filterAuditLogsByPeriod(
                auditLogService.getUtilityLogs(),
                auditPeriod,
                auditDate,
                auditMonth,
                auditYear
        )
                .stream()
                .limit(10)
                .map(this::mapAuditLog)
                .toList();

        return ResponseEntity.ok(logs);
    }

    @GetMapping("/audit-logs/fuel/all")
    public ResponseEntity<List<Map<String, Object>>> getAllFuelAuditLogs(
            @RequestParam(required = false) String auditPeriod,
            @RequestParam(required = false) String auditDate,
            @RequestParam(required = false) String auditMonth,
            @RequestParam(required = false) Integer auditYear
    ) {
        List<Map<String, Object>> logs = filterAuditLogsByPeriod(
                auditLogService.getFuelLogs(),
                auditPeriod,
                auditDate,
                auditMonth,
                auditYear
        )
                .stream()
                .map(this::mapAuditLog)
                .toList();

        return ResponseEntity.ok(logs);
    }

    @GetMapping("/audit-logs/utility/all")
    public ResponseEntity<List<Map<String, Object>>> getAllUtilityAuditLogs(
            @RequestParam(required = false) String auditPeriod,
            @RequestParam(required = false) String auditDate,
            @RequestParam(required = false) String auditMonth,
            @RequestParam(required = false) Integer auditYear
    ) {
        List<Map<String, Object>> logs = filterAuditLogsByPeriod(
                auditLogService.getUtilityLogs(),
                auditPeriod,
                auditDate,
                auditMonth,
                auditYear
        )
                .stream()
                .map(this::mapAuditLog)
                .toList();

        return ResponseEntity.ok(logs);
    }

    @GetMapping("/fuel-summary")
    public ResponseEntity<Map<String, Object>> getFuelSummary() {
        List<FuelRequest> requests = fuelRequestRepository.findAllByOrderByCreatedAtDesc();

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalRequests", requests.size());
        summary.put("pendingRequests", countStatus(requests, FuelRequestStatus.PENDING));
        summary.put("approvedRequests", countStatus(requests, FuelRequestStatus.APPROVED));
        summary.put("collectedRequests", countStatus(requests, FuelRequestStatus.COLLECTED));
        summary.put("rejectedRequests", countStatus(requests, FuelRequestStatus.REJECTED));
        summary.put("vehicleOwnerRequests", countSource(requests, FuelRequestSource.VEHICLE_OWNER));
        summary.put("emergencyRequests", countSource(requests, FuelRequestSource.EMERGENCY));
        summary.put("hospitalRequests", countSource(requests, FuelRequestSource.HOSPITAL_GENERATOR));
        summary.put("buildingRequests", countSource(requests, FuelRequestSource.BUILDING_GENERATOR));
        summary.put("totalEstimatedCost", calculateTotalCost(requests));
        summary.put("totalRequestedLiter", calculateTotalLiter(requests));

        return ResponseEntity.ok(summary);
    }

    @GetMapping("/pump-stock-summary")
    public ResponseEntity<Map<String, Object>> getPumpStockSummary() {
        List<PumpFuelStock> stocks = pumpFuelStockRepository.findAll();

        BigDecimal totalCapacity = stocks.stream()
                .map(PumpFuelStock::getFuelCapacity)
                .filter(value -> value != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalCurrentStock = stocks.stream()
                .map(PumpFuelStock::getCurrentStock)
                .filter(value -> value != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long lowStockCount = stocks.stream()
                .filter(stock -> stock.getFuelCapacity() != null)
                .filter(stock -> stock.getCurrentStock() != null)
                .filter(stock -> stock.getFuelCapacity().compareTo(BigDecimal.ZERO) > 0)
                .filter(stock -> stock.getCurrentStock()
                        .compareTo(stock.getFuelCapacity().multiply(BigDecimal.valueOf(0.20))) <= 0)
                .count();

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalFuelStockRows", stocks.size());
        summary.put("totalCapacity", totalCapacity);
        summary.put("totalCurrentStock", totalCurrentStock);
        summary.put("lowStockCount", lowStockCount);

        return ResponseEntity.ok(summary);
    }

    @GetMapping("/power-outage-summary")
    public ResponseEntity<Map<String, Object>> getPowerOutageSummary() {
        List<PowerOutageNotice> notices = powerOutageRepository.findAllByOrderByCreatedAtDesc();

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalNotices", notices.size());
        summary.put("ongoingOutages", countOutageStatus(notices, PowerOutageStatus.ONGOING));
        summary.put("scheduledOutages", countOutageStatus(notices, PowerOutageStatus.SCHEDULED));
        summary.put("restoredOutages", countOutageStatus(notices, PowerOutageStatus.RESTORED));

        return ResponseEntity.ok(summary);
    }

    @GetMapping("/power-outage-details")
    public ResponseEntity<List<Map<String, Object>>> getPowerOutageDetails(
            @RequestParam(defaultValue = "outages-all") String type
    ) {
        List<PowerOutageNotice> notices = powerOutageRepository.findAllByOrderByCreatedAtDesc();

        String normalizedType = type == null ? "outages-all" : type.trim().toLowerCase();

        List<PowerOutageNotice> filteredNotices = notices;

        if ("outages-ongoing".equals(normalizedType)) {
            filteredNotices = notices.stream()
                    .filter(notice -> notice.getStatus() == PowerOutageStatus.ONGOING)
                    .toList();
        } else if ("outages-scheduled".equals(normalizedType)) {
            filteredNotices = notices.stream()
                    .filter(notice -> notice.getStatus() == PowerOutageStatus.SCHEDULED)
                    .toList();
        } else if ("outages-restored".equals(normalizedType)) {
            filteredNotices = notices.stream()
                    .filter(notice -> notice.getStatus() == PowerOutageStatus.RESTORED)
                    .toList();
        }

        return ResponseEntity.ok(
                filteredNotices.stream()
                        .map(this::mapPowerOutage)
                        .toList()
        );
    }

    @GetMapping("/user-summary")
    public ResponseEntity<Map<String, Object>> getUserSummary() {
        List<User> users = userRepository.findAll();

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalUsers", users.size());
        summary.put("vehicleOwners", countRole(users, Role.VEHICLE_OWNER));
        summary.put("pumpAuthorities", countRole(users, Role.PUMP_AUTHORITY));
        summary.put("hospitalAuthorities", countRole(users, Role.HOSPITAL_AUTHORITY));
        summary.put("buildingManagers", countRole(users, Role.BUILDING_MANAGER));
        summary.put("emergencyAuthorities", countRole(users, Role.EMERGENCY_VEHICLE_AUTHORITY));
        summary.put("utilityAuthorities", countRole(users, Role.UTILITY_AUTHORITY));
        summary.put("governmentAuthorities", countRole(users, Role.GOVERNMENT_AUTHORITY));
        summary.put("localAuthorities", countRole(users, Role.LOCAL_AUTHORITY));
        summary.put("activeUsers", users.stream().filter(user -> user.getStatus() == UserStatus.ACTIVE).count());
        summary.put("inactiveUsers", users.stream().filter(user -> user.getStatus() == UserStatus.INACTIVE).count());

        return ResponseEntity.ok(summary);
    }

    @GetMapping("/pump-stock-details")
    public ResponseEntity<List<Map<String, Object>>> getPumpStockDetails() {
        List<PumpFuelStock> stocks = pumpFuelStockRepository.findAll();

        List<Map<String, Object>> result = stocks.stream()
                .map(stock -> {
                    Map<String, Object> map = new LinkedHashMap<>();

                    PumpProfile pump = stock.getPumpProfile();

                    map.put("pumpName", pump == null ? "-" : pump.getPumpName());
                    map.put("pumpAddress", pump == null ? "-" : pump.getPumpAddress());
                    map.put("fuelType", stock.getFuelType());
                    map.put("fuelCapacity", stock.getFuelCapacity());
                    map.put("currentStock", stock.getCurrentStock());

                    boolean lowStock = stock.getFuelCapacity() != null
                            && stock.getCurrentStock() != null
                            && stock.getFuelCapacity().compareTo(BigDecimal.ZERO) > 0
                            && stock.getCurrentStock()
                            .compareTo(stock.getFuelCapacity().multiply(BigDecimal.valueOf(0.20))) <= 0;

                    map.put("lowStock", lowStock);

                    return map;
                })
                .toList();

        return ResponseEntity.ok(result);
    }

    @GetMapping("/role/pump/{userId}")
    public ResponseEntity<Map<String, Object>> getPumpRoleReport(
            @PathVariable Long userId,
            @RequestParam(required = false) String auditPeriod,
            @RequestParam(required = false) String auditDate,
            @RequestParam(required = false) String auditMonth,
            @RequestParam(required = false) Integer auditYear
    ) {
        User user = getUserById(userId, Role.PUMP_AUTHORITY);

        PumpProfile pumpProfile = pumpProfileRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Pump profile not found"));

        List<FuelRequest> requests = fuelRequestRepository.findByPumpProfileId(pumpProfile.getId());
        List<PumpFuelStock> stocks = pumpFuelStockRepository.findByPumpProfileIdOrderByFuelTypeAsc(pumpProfile.getId());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("title", "Pump Reports & Audit Logs");
        response.put("subtitle", "Only your pump stock, assigned requests, and collection records are shown.");
        response.put("summary", buildFuelRequestSummary(requests));
        response.put("stockSummary", buildPumpStockSummary(stocks));
        response.put("fuelRequests", requests.stream().map(this::mapFuelRequest).toList());
        response.put("pumpStocks", stocks.stream().map(this::mapPumpStock).toList());
        response.put(
                "auditLogs",
                getScopedAuditLogs(
                        userId,
                        requests,
                        List.of(),
                        stocks,
                        pumpProfile,
                        auditPeriod,
                        auditDate,
                        auditMonth,
                        auditYear
                )
        );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/role/hospital/{userId}")
    public ResponseEntity<Map<String, Object>> getHospitalRoleReport(
            @PathVariable Long userId,
            @RequestParam(required = false) String auditPeriod,
            @RequestParam(required = false) String auditDate,
            @RequestParam(required = false) String auditMonth,
            @RequestParam(required = false) Integer auditYear
    ) {
        User user = getUserById(userId, Role.HOSPITAL_AUTHORITY);

        List<FuelRequest> requests = fuelRequestRepository.findByUserIdAndRequestSourceOrderByCreatedAtDesc(
                user.getId(),
                FuelRequestSource.HOSPITAL_GENERATOR
        );

        List<PowerOutageNotice> notices = findOutagesByThana(user.getHospitalUnderThana());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("title", "Hospital Reports & Audit Logs");
        response.put("subtitle", "Only your hospital diesel requests, hospital thana outage records, and related audit logs are shown.");
        response.put("summary", buildFuelRequestSummary(requests));
        response.put("outageSummary", buildPowerOutageSummary(notices));
        response.put("hospitalStatus", buildHospitalStatus(user));
        response.put("fuelRequests", requests.stream().map(this::mapFuelRequest).toList());
        response.put("powerOutages", notices.stream().map(this::mapPowerOutage).toList());
        response.put(
                "auditLogs",
                getScopedAuditLogs(
                        userId,
                        requests,
                        notices,
                        List.of(),
                        null,
                        auditPeriod,
                        auditDate,
                        auditMonth,
                        auditYear
                )
        );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/role/building/{userId}")
    public ResponseEntity<Map<String, Object>> getBuildingRoleReport(
            @PathVariable Long userId,
            @RequestParam(required = false) String auditPeriod,
            @RequestParam(required = false) String auditDate,
            @RequestParam(required = false) String auditMonth,
            @RequestParam(required = false) Integer auditYear
    ) {
        User user = getUserById(userId, Role.BUILDING_MANAGER);

        List<FuelRequest> requests = fuelRequestRepository.findByUserIdAndRequestSourceOrderByCreatedAtDesc(
                user.getId(),
                FuelRequestSource.BUILDING_GENERATOR
        );

        List<PowerOutageNotice> notices = findOutagesByThana(user.getBuildingUnderThana());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("title", "Building Reports & Audit Logs");
        response.put("subtitle", "Only your building generator requests, building thana outage records, and related audit logs are shown.");
        response.put("summary", buildFuelRequestSummary(requests));
        response.put("outageSummary", buildPowerOutageSummary(notices));
        response.put("buildingStatus", buildBuildingStatus(user));
        response.put("fuelRequests", requests.stream().map(this::mapFuelRequest).toList());
        response.put("powerOutages", notices.stream().map(this::mapPowerOutage).toList());
        response.put(
                "auditLogs",
                getScopedAuditLogs(
                        userId,
                        requests,
                        notices,
                        List.of(),
                        null,
                        auditPeriod,
                        auditDate,
                        auditMonth,
                        auditYear
                )
        );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/role/emergency/{userId}")
    public ResponseEntity<Map<String, Object>> getEmergencyRoleReport(
            @PathVariable Long userId,
            @RequestParam(required = false) String auditPeriod,
            @RequestParam(required = false) String auditDate,
            @RequestParam(required = false) String auditMonth,
            @RequestParam(required = false) Integer auditYear
    ) {
        User user = getUserById(userId, Role.EMERGENCY_VEHICLE_AUTHORITY);

        List<FuelRequest> requests = fuelRequestRepository.findByUserIdAndRequestSourceOrderByCreatedAtDesc(
                user.getId(),
                FuelRequestSource.EMERGENCY
        );

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("title", "Emergency Vehicle Reports & Audit Logs");
        response.put("subtitle", "Only your emergency fuel requests and priority support records are shown.");
        response.put("summary", buildFuelRequestSummary(requests));
        response.put("emergencyStatus", buildEmergencyStatus(user));
        response.put("fuelRequests", requests.stream().map(this::mapFuelRequest).toList());
        response.put(
                "auditLogs",
                getScopedAuditLogs(
                        userId,
                        requests,
                        List.of(),
                        List.of(),
                        null,
                        auditPeriod,
                        auditDate,
                        auditMonth,
                        auditYear
                )
        );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/role/utility/{userId}")
    public ResponseEntity<Map<String, Object>> getUtilityRoleReport(
            @PathVariable Long userId,
            @RequestParam(required = false) String auditPeriod,
            @RequestParam(required = false) String auditDate,
            @RequestParam(required = false) String auditMonth,
            @RequestParam(required = false) Integer auditYear
    ) {
        User user = getUserById(userId, Role.UTILITY_AUTHORITY);

        List<PowerOutageNotice> notices = powerOutageRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .filter(notice -> notice.getUser() != null)
                .filter(notice -> notice.getUser().getId().equals(user.getId()))
                .toList();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("title", "Utility Reports & Audit Logs");
        response.put("subtitle", "Only your created power outage notices and utility audit records are shown.");
        response.put("utilityStatus", buildUtilityStatus(user));
        response.put("outageSummary", buildPowerOutageSummary(notices));
        response.put("powerOutages", notices.stream().map(this::mapPowerOutage).toList());
        response.put(
                "auditLogs",
                getScopedAuditLogs(
                        userId,
                        List.of(),
                        notices,
                        List.of(),
                        null,
                        auditPeriod,
                        auditDate,
                        auditMonth,
                        auditYear
                )
        );

        return ResponseEntity.ok(response);
    }

    private User getUserById(Long userId, Role expectedRole) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getRole() != expectedRole) {
            throw new RuntimeException("This report is not allowed for your role");
        }

        return user;
    }

    private Map<String, Object> buildFuelRequestSummary(List<FuelRequest> requests) {
        Map<String, Object> summary = new LinkedHashMap<>();

        long pendingRequests = countStatus(requests, FuelRequestStatus.PENDING);
        long approvedOnlyRequests = countStatus(requests, FuelRequestStatus.APPROVED);
        long collectedRequests = countStatus(requests, FuelRequestStatus.COLLECTED);
        long rejectedRequests = countStatus(requests, FuelRequestStatus.REJECTED);

        long totalApprovedRequests = approvedOnlyRequests + collectedRequests;

        summary.put("totalRequests", requests.size());
        summary.put("pendingRequests", pendingRequests);
        summary.put("approvedRequests", totalApprovedRequests);
        summary.put("collectedRequests", collectedRequests);
        summary.put("rejectedRequests", rejectedRequests);
        summary.put("totalRequestedLiter", calculateTotalLiter(requests));
        summary.put("totalEstimatedCost", calculateTotalCost(requests));

        return summary;
    }

    private Map<String, Object> buildPumpStockSummary(List<PumpFuelStock> stocks) {
        BigDecimal totalCapacity = stocks.stream()
                .map(PumpFuelStock::getFuelCapacity)
                .filter(value -> value != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalCurrentStock = stocks.stream()
                .map(PumpFuelStock::getCurrentStock)
                .filter(value -> value != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalFuelTypes", stocks.size());
        summary.put("totalCapacity", totalCapacity);
        summary.put("totalCurrentStock", totalCurrentStock);
        summary.put("availableSpace", totalCapacity.subtract(totalCurrentStock));

        return summary;
    }

    private Map<String, Object> buildPowerOutageSummary(List<PowerOutageNotice> notices) {
        Map<String, Object> summary = new LinkedHashMap<>();

        summary.put("totalNotices", notices.size());
        summary.put("ongoingOutages", countOutageStatus(notices, PowerOutageStatus.ONGOING));
        summary.put("scheduledOutages", countOutageStatus(notices, PowerOutageStatus.SCHEDULED));
        summary.put("restoredOutages", countOutageStatus(notices, PowerOutageStatus.RESTORED));

        return summary;
    }

    private Map<String, Object> buildHospitalStatus(User user) {
        Map<String, Object> map = new LinkedHashMap<>();

        Double totalDieselCapacity = user.getHospitalDieselTankCapacity() == null
                ? 0.0
                : user.getHospitalDieselTankCapacity();

        Double currentDieselReserve = user.getHospitalCurrentDieselReserve() == null
                ? 0.0
                : user.getHospitalCurrentDieselReserve();

        double availableSpace = totalDieselCapacity - currentDieselReserve;

        if (availableSpace < 0) {
            availableSpace = 0.0;
        }

        map.put("hospitalName", valueOrDash(user.getHospitalName()));
        map.put("hospitalUnderThana", valueOrDash(user.getHospitalUnderThana()));
        map.put("totalDieselCapacity", roundTwoDecimal(totalDieselCapacity));
        map.put("currentDieselReserve", roundTwoDecimal(currentDieselReserve));
        map.put("availableDieselSpace", roundTwoDecimal(availableSpace));
        map.put("backupHours", user.getHospitalEstimatedBackupHours());
        map.put("dieselStatus", valueOrDash(user.getHospitalDieselStatus()));

        return map;
    }

    private Map<String, Object> buildBuildingStatus(User user) {
        Map<String, Object> map = new LinkedHashMap<>();

        map.put("buildingName", valueOrDash(user.getBuildingName()));
        map.put("holdingNumber", valueOrDash(user.getHoldingNumber()));
        map.put("buildingUnderThana", valueOrDash(user.getBuildingUnderThana()));
        map.put("generatorPower", user.getGeneratorPower());
        map.put("numberOfFlats", user.getNumberOfFlats());

        return map;
    }

    private Map<String, Object> buildEmergencyStatus(User user) {
        Map<String, Object> map = new LinkedHashMap<>();

        map.put("organizationName", valueOrDash(user.getOrganizationName()));
        map.put("organizationType", valueOrDash(user.getOrganizationType()));
        map.put("assignedArea", valueOrDash(user.getAssignedArea()));
        map.put("officialVerificationId", valueOrDash(user.getOfficialVerificationId()));

        return map;
    }

    private Map<String, Object> buildUtilityStatus(User user) {
        Map<String, Object> map = new LinkedHashMap<>();

        map.put("utilityOrganizationType", valueOrDash(user.getUtilityOrganizationType()));
        map.put("utilityEmployeeId", valueOrDash(user.getUtilityEmployeeId()));
        map.put("serviceArea", valueOrDash(user.getServiceArea()));
        map.put("officeAddress", valueOrDash(user.getOfficeAddress()));

        return map;
    }

    private Map<String, Object> mapFuelRequest(FuelRequest request) {
        Map<String, Object> map = new LinkedHashMap<>();

        User user = request.getUser();
        PumpProfile pump = request.getPumpProfile();

        map.put("id", request.getId());
        map.put("userName", user == null ? "-" : user.getFullName());
        map.put("phoneNumber", user == null ? "-" : user.getPhoneNumber());
        map.put("requestSource", request.getRequestSource());
        map.put("fuelType", request.getFuelType());
        map.put("requestedLiter", request.getRequestedLiter());
        map.put("estimatedCost", request.getEstimatedCost());
        map.put("requestStatus", request.getRequestStatus());
        map.put("collectionCode", valueOrDash(request.getCollectionCode()));
        map.put("pumpName", pump == null ? "Not Assigned" : pump.getPumpName());
        map.put("adminNote", valueOrDash(request.getAdminNote()));
        map.put("createdAt", request.getCreatedAt());
        map.put("collectedAt", request.getCollectedAt());

        if (request.getRequestSource() == FuelRequestSource.HOSPITAL_GENERATOR) {
            map.put("details", "Hospital: " + valueOrDash(request.getHospitalName()));
        } else if (request.getRequestSource() == FuelRequestSource.BUILDING_GENERATOR) {
            map.put("details", "Building: " + valueOrDash(request.getBuildingName()));
        } else if (request.getRequestSource() == FuelRequestSource.EMERGENCY) {
            map.put("details", "Emergency reason: " + valueOrDash(request.getEmergencyReason()));
        } else if (request.getVehicle() != null) {
            map.put("details", request.getVehicle().getBrand()
                    + " "
                    + request.getVehicle().getModel()
                    + " - "
                    + request.getVehicle().getNumberPlate());
        } else {
            map.put("details", "-");
        }

        return map;
    }

    private Map<String, Object> mapPumpStock(PumpFuelStock stock) {
        Map<String, Object> map = new LinkedHashMap<>();

        map.put("fuelType", stock.getFuelType());
        map.put("fuelCapacity", stock.getFuelCapacity());
        map.put("currentStock", stock.getCurrentStock());
        map.put("availableSpace", stock.getFuelCapacity().subtract(stock.getCurrentStock()));
        map.put("updatedAt", stock.getUpdatedAt());

        return map;
    }

    private Map<String, Object> mapPowerOutage(PowerOutageNotice notice) {
        Map<String, Object> map = new LinkedHashMap<>();

        map.put("id", notice.getId());
        map.put("provider", notice.getProvider());
        map.put("cityCorporation", notice.getCityCorporation());
        map.put("thanaName", notice.getThanaName());
        map.put("outageType", notice.getOutageType());
        map.put("cause", notice.getCause());
        map.put("status", notice.getStatus());
        map.put("expectedRestorationDateTime", notice.getExpectedRestorationDateTime());
        map.put("createdAt", notice.getCreatedAt());

        return map;
    }

    private List<Map<String, Object>> getScopedAuditLogs(
            Long userId,
            List<FuelRequest> scopedFuelRequests,
            List<PowerOutageNotice> scopedPowerOutages,
            List<PumpFuelStock> scopedPumpStocks,
            PumpProfile scopedPumpProfile,
            String auditPeriod,
            String auditDate,
            String auditMonth,
            Integer auditYear
    ) {
        Set<Long> fuelRequestIds = new HashSet<>();
        Set<Long> powerOutageIds = new HashSet<>();
        Set<Long> pumpStockIds = new HashSet<>();

        if (scopedFuelRequests != null) {
            scopedFuelRequests.stream()
                    .map(FuelRequest::getId)
                    .filter(id -> id != null)
                    .forEach(fuelRequestIds::add);
        }

        if (scopedPowerOutages != null) {
            scopedPowerOutages.stream()
                    .map(PowerOutageNotice::getId)
                    .filter(id -> id != null)
                    .forEach(powerOutageIds::add);
        }

        if (scopedPumpStocks != null) {
            scopedPumpStocks.stream()
                    .map(PumpFuelStock::getId)
                    .filter(id -> id != null)
                    .forEach(pumpStockIds::add);
        }

        Long pumpProfileId = scopedPumpProfile == null ? null : scopedPumpProfile.getId();

        return filterAuditLogsByPeriod(
                auditLogService.getAllLogs(),
                auditPeriod,
                auditDate,
                auditMonth,
                auditYear
        )
                .stream()
                .filter(log -> isAuditLogAllowedForRoleReport(
                        log,
                        userId,
                        fuelRequestIds,
                        powerOutageIds,
                        pumpStockIds,
                        pumpProfileId
                ))
                .sorted(Comparator.comparing(
                        AuditLog::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())
                ))
                .limit(30)
                .map(this::mapAuditLog)
                .toList();
    }

    private boolean isAuditLogAllowedForRoleReport(
            AuditLog log,
            Long userId,
            Set<Long> fuelRequestIds,
            Set<Long> powerOutageIds,
            Set<Long> pumpStockIds,
            Long pumpProfileId
    ) {
        if (log == null) {
            return false;
        }

        if (userId != null && userId.equals(log.getActorUserId())) {
            return true;
        }

        String entityType = normalizeEntityType(log.getEntityType());
        Long entityId = log.getEntityId();

        if (entityId == null) {
            return false;
        }

        if (isFuelRequestEntity(entityType) && fuelRequestIds.contains(entityId)) {
            return true;
        }

        if (isPowerOutageEntity(entityType) && powerOutageIds.contains(entityId)) {
            return true;
        }

        if (isPumpStockEntity(entityType) && pumpStockIds.contains(entityId)) {
            return true;
        }

        if (isPumpProfileEntity(entityType) && pumpProfileId != null && pumpProfileId.equals(entityId)) {
            return true;
        }

        return false;
    }

    private List<AuditLog> filterAuditLogsByPeriod(
            List<AuditLog> logs,
            String auditPeriod,
            String auditDate,
            String auditMonth,
            Integer auditYear
    ) {
        AuditDateRange range = buildAuditDateRange(auditPeriod, auditDate, auditMonth, auditYear);

        if (range == null) {
            return logs;
        }

        return logs.stream()
                .filter(log -> log.getCreatedAt() != null)
                .filter(log -> !log.getCreatedAt().isBefore(range.startDateTime))
                .filter(log -> log.getCreatedAt().isBefore(range.endDateTime))
                .toList();
    }

    private AuditDateRange buildAuditDateRange(
            String auditPeriod,
            String auditDate,
            String auditMonth,
            Integer auditYear
    ) {
        if (auditPeriod == null || auditPeriod.trim().isEmpty()) {
            return null;
        }

        String period = auditPeriod.trim().toUpperCase();

        try {
            if ("DAILY".equals(period)) {
                if (auditDate == null || auditDate.trim().isEmpty()) {
                    return null;
                }

                LocalDate date = LocalDate.parse(auditDate.trim());

                return new AuditDateRange(
                        date.atStartOfDay(),
                        date.plusDays(1).atStartOfDay()
                );
            }

            if ("MONTHLY".equals(period)) {
                if (auditMonth == null || auditMonth.trim().isEmpty()) {
                    return null;
                }

                YearMonth month = YearMonth.parse(auditMonth.trim());

                return new AuditDateRange(
                        month.atDay(1).atStartOfDay(),
                        month.plusMonths(1).atDay(1).atStartOfDay()
                );
            }

            if ("YEARLY".equals(period)) {
                if (auditYear == null || auditYear <= 0) {
                    return null;
                }

                LocalDate start = LocalDate.of(auditYear, 1, 1);

                return new AuditDateRange(
                        start.atStartOfDay(),
                        start.plusYears(1).atStartOfDay()
                );
            }

            return null;
        } catch (Exception exception) {
            return null;
        }
    }

    private static class AuditDateRange {
        private final LocalDateTime startDateTime;
        private final LocalDateTime endDateTime;

        private AuditDateRange(LocalDateTime startDateTime, LocalDateTime endDateTime) {
            this.startDateTime = startDateTime;
            this.endDateTime = endDateTime;
        }
    }

    private Map<String, Object> mapAuditLog(AuditLog log) {
        Map<String, Object> map = new LinkedHashMap<>();

        map.put("id", log.getId());
        map.put("actorName", log.getActorName());
        map.put("actorRole", log.getActorRole());
        map.put("actorDisplayRole", log.getActorRole());
        map.put("action", log.getAction());
        map.put("entityType", log.getEntityType());
        map.put("entityId", log.getEntityId());
        map.put("createdAt", log.getCreatedAt());

        String description = log.getDescription() == null ? "" : log.getDescription();
        String normalizedEntityType = normalizeEntityType(log.getEntityType());

        if (isPowerOutageEntity(normalizedEntityType) && log.getEntityId() != null) {
            powerOutageRepository.findById(log.getEntityId()).ifPresent(notice -> {
                map.put("currentStatus", notice.getStatus());
                map.put("currentRestoredAt", notice.getRestoredAt());
                map.put("currentThanaName", notice.getThanaName());

                if (notice.getProvider() != null) {
                    map.put("actorDisplayRole", notice.getProvider().name());
                    map.put("utilityProvider", notice.getProvider().name());
                }
            });

            Object currentStatus = map.get("currentStatus");

            if (currentStatus != null) {
                description = cleanStatusFromDescription(description);
                description = description + ", Current Status: " + currentStatus;
            }
        }

        if (isFuelRequestEntity(normalizedEntityType) && log.getEntityId() != null) {
            fuelRequestRepository.findById(log.getEntityId()).ifPresent(request -> {
                map.put("currentStatus", request.getRequestStatus());
                map.put("currentFuelType", request.getFuelType());
                map.put("currentRequestedLiter", request.getRequestedLiter());
                map.put("currentEstimatedCost", request.getEstimatedCost());
                map.put("currentRequestSource", request.getRequestSource());

                if (request.getPumpProfile() != null) {
                    map.put("pumpName", request.getPumpProfile().getPumpName());

                    if ("PUMP_AUTHORITY".equalsIgnoreCase(String.valueOf(log.getActorRole()))) {
                        map.put("actorDisplayRole", request.getPumpProfile().getPumpName());
                    }
                }
            });

            Object currentStatus = map.get("currentStatus");
            Object currentFuelType = map.get("currentFuelType");
            Object currentRequestedLiter = map.get("currentRequestedLiter");
            Object pumpName = map.get("pumpName");

            description = cleanStatusFromDescription(description);

            if (currentFuelType != null && !description.toLowerCase().contains("fuel:")) {
                description = description + ", Fuel: " + currentFuelType;
            }

            if (currentRequestedLiter != null && !description.toLowerCase().contains("liter:")) {
                description = description + ", Liter: " + currentRequestedLiter;
            }

            if (currentStatus != null) {
                description = description + ", Current Status: " + currentStatus;
            }

            if (pumpName != null && !description.toLowerCase().contains("pump:")) {
                description = description + ", Pump: " + pumpName;
            }
        }

        if (isPumpStockEntity(normalizedEntityType) && log.getEntityId() != null) {
            pumpFuelStockRepository.findById(log.getEntityId()).ifPresent(stock -> {
                map.put("currentFuelType", stock.getFuelType());
                map.put("currentStock", stock.getCurrentStock());
                map.put("fuelCapacity", stock.getFuelCapacity());

                if (stock.getPumpProfile() != null) {
                    map.put("pumpName", stock.getPumpProfile().getPumpName());
                    map.put("actorDisplayRole", stock.getPumpProfile().getPumpName());
                }
            });

            Object currentFuelType = map.get("currentFuelType");
            Object currentStock = map.get("currentStock");
            Object pumpName = map.get("pumpName");

            if (currentFuelType != null && !description.toLowerCase().contains("fuel:")) {
                description = description + ", Fuel: " + currentFuelType;
            }

            if (currentStock != null && !description.toLowerCase().contains("stock:")) {
                description = description + ", Current Stock: " + currentStock + " L";
            }

            if (pumpName != null && !description.toLowerCase().contains("pump:")) {
                description = description + ", Pump: " + pumpName;
            }
        }

        map.put("description", description);

        return map;
    }

    private String cleanStatusFromDescription(String description) {
        if (description == null) {
            return "";
        }

        return description
                .replaceAll(",\\s*Status:\\s*[A-Z_ ]+", "")
                .replaceAll("Status:\\s*[A-Z_ ]+", "")
                .replaceAll(",\\s*Previous Status:\\s*[A-Z_ ]+", "")
                .replaceAll("Previous Status:\\s*[A-Z_ ]+", "")
                .replaceAll(",\\s*Current Status:\\s*[A-Z_ ]+", "")
                .replaceAll("Current Status:\\s*[A-Z_ ]+", "")
                .trim();
    }

    private String normalizeEntityType(String value) {
        if (value == null) {
            return "";
        }

        return value
                .trim()
                .toUpperCase()
                .replace("-", "_")
                .replace(" ", "_");
    }

    private boolean isFuelRequestEntity(String entityType) {
        return "FUEL_REQUEST".equals(entityType)
                || "FUEL_REQUESTS".equals(entityType);
    }

    private boolean isPowerOutageEntity(String entityType) {
        return "POWER_OUTAGE".equals(entityType)
                || "POWER_OUTAGE_NOTICE".equals(entityType)
                || "POWER_OUTAGE_NOTICES".equals(entityType)
                || "UTILITY_OUTAGE".equals(entityType);
    }

    private boolean isPumpStockEntity(String entityType) {
        return "PUMP_FUEL_STOCK".equals(entityType)
                || "PUMP_STOCK".equals(entityType)
                || "FUEL_STOCK".equals(entityType);
    }

    private boolean isPumpProfileEntity(String entityType) {
        return "PUMP_PROFILE".equals(entityType)
                || "PUMP".equals(entityType);
    }

    private List<PowerOutageNotice> findOutagesByThana(String thanaName) {
        if (thanaName == null || thanaName.trim().isEmpty()) {
            return List.of();
        }

        String normalizedThana = normalizeText(thanaName);

        return powerOutageRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .filter(notice -> normalizeText(notice.getThanaName()).equals(normalizedThana))
                .toList();
    }

    private String normalizeText(String value) {
        if (value == null) {
            return "";
        }

        return value
                .toLowerCase()
                .replace("_", "")
                .replace("-", "")
                .replace(" ", "")
                .trim();
    }

    private double roundTwoDecimal(Double value) {
        if (value == null) {
            return 0.0;
        }

        return Math.round(value * 100.0) / 100.0;
    }

    private String valueOrDash(String value) {
        if (value == null || value.trim().isEmpty()) {
            return "-";
        }

        return value;
    }

    private long countStatus(List<FuelRequest> requests, FuelRequestStatus status) {
        return requests.stream()
                .filter(request -> request.getRequestStatus() == status)
                .count();
    }

    private long countSource(List<FuelRequest> requests, FuelRequestSource source) {
        return requests.stream()
                .filter(request -> request.getRequestSource() == source)
                .count();
    }

    private BigDecimal calculateTotalCost(List<FuelRequest> requests) {
        return requests.stream()
                .map(FuelRequest::getEstimatedCost)
                .filter(value -> value != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal calculateTotalLiter(List<FuelRequest> requests) {
        return requests.stream()
                .map(FuelRequest::getRequestedLiter)
                .filter(value -> value != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private long countOutageStatus(List<PowerOutageNotice> notices, PowerOutageStatus status) {
        return notices.stream()
                .filter(notice -> notice.getStatus() == status)
                .count();
    }

    private long countRole(List<User> users, Role role) {
        return users.stream()
                .filter(user -> user.getRole() == role)
                .count();
    }
}