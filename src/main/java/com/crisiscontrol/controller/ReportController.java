package com.crisiscontrol.controller;

import com.crisiscontrol.entity.*;
import com.crisiscontrol.repository.FuelRequestRepository;
import com.crisiscontrol.repository.PowerOutageRepository;
import com.crisiscontrol.repository.PumpFuelStockRepository;
import com.crisiscontrol.repository.UserRepository;
import com.crisiscontrol.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final AuditLogService auditLogService;
    private final FuelRequestRepository fuelRequestRepository;
    private final PumpFuelStockRepository pumpFuelStockRepository;
    private final PowerOutageRepository powerOutageRepository;
    private final UserRepository userRepository;

    @GetMapping("/audit-logs")
    public ResponseEntity<List<AuditLog>> getAuditLogs(
            @RequestParam(required = false) String keyword
    ) {
        return ResponseEntity.ok(auditLogService.searchLogs(keyword));
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
    @GetMapping("/audit-logs/fuel")
    public ResponseEntity<List<AuditLog>> getFuelAuditLogs() {
        return ResponseEntity.ok(auditLogService.getFuelLogs());
    }

    @GetMapping("/audit-logs/utility")
    public ResponseEntity<List<AuditLog>> getUtilityAuditLogs() {
        return ResponseEntity.ok(auditLogService.getUtilityLogs());
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