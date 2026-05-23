package com.crisiscontrol.service;

import com.crisiscontrol.entity.*;
import com.crisiscontrol.repository.FuelRequestRepository;
import com.crisiscontrol.repository.PowerOutageRepository;
import com.crisiscontrol.repository.PumpFuelStockRepository;
import com.crisiscontrol.repository.PumpProfileRepository;
import com.crisiscontrol.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthorityDashboardService {

    private final UserRepository userRepository;
    private final PumpProfileRepository pumpProfileRepository;
    private final PumpFuelStockRepository pumpFuelStockRepository;
    private final FuelRequestRepository fuelRequestRepository;
    private final PowerOutageRepository powerOutageRepository;

    public Map<String, Object> getGovernmentDashboard() {
        List<User> users = userRepository.findAll();
        List<PumpProfile> pumps = pumpProfileRepository.findAll();
        List<PumpFuelStock> stocks = pumpFuelStockRepository.findAll();
        List<FuelRequest> fuelRequests = fuelRequestRepository.findAllByOrderByCreatedAtDesc();
        List<PowerOutageNotice> outages = powerOutageRepository.findAllByOrderByCreatedAtDesc();

        Map<String, Object> response = new LinkedHashMap<>();

        response.put("summary", buildSummary(users, pumps, stocks, fuelRequests, outages));
        response.put("roleSummary", buildRoleSummary(users));
        response.put("requestSummary", buildRequestSummary(fuelRequests));
        response.put("criticalRequests", buildCriticalRequestList(fuelRequests));
        response.put("lowStockPumps", buildLowStockPumpList(stocks));
        response.put("recentOutages", buildOutageList(outages));

        return response;
    }

    public Map<String, Object> getLocalAuthorityDashboard(Long userId) {
        User localUser = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Local authority user not found"));

        if (localUser.getRole() != Role.LOCAL_AUTHORITY) {
            throw new RuntimeException("Only Local Authority can access local authority dashboard");
        }

        String district = safe(localUser.getDistrict());
        String thanaOrUpazila = safe(localUser.getThanaOrUpazila());

        List<User> localUsers = userRepository.findAll()
                .stream()
                .filter(user -> matchesArea(user, district, thanaOrUpazila))
                .toList();

        List<PumpProfile> localPumps = pumpProfileRepository.findAll()
                .stream()
                .filter(pump -> matchesText(pump.getPumpAddress(), district, thanaOrUpazila)
                        || matchesArea(pump.getUser(), district, thanaOrUpazila))
                .toList();

        List<FuelRequest> localFuelRequests = fuelRequestRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .filter(request -> matchesFuelRequestArea(request, district, thanaOrUpazila))
                .toList();

        List<PowerOutageNotice> localOutages = powerOutageRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .filter(outage -> matchesText(outage.getThanaName(), district, thanaOrUpazila))
                .toList();

        List<PumpFuelStock> localStocks = pumpFuelStockRepository.findAll()
                .stream()
                .filter(stock -> stock.getPumpProfile() != null)
                .filter(stock -> localPumps.stream()
                        .anyMatch(pump -> pump.getId().equals(stock.getPumpProfile().getId())))
                .toList();

        Map<String, Object> response = new LinkedHashMap<>();

        response.put("district", valueOrDash(district));
        response.put("thanaOrUpazila", valueOrDash(thanaOrUpazila));
        response.put("summary", buildSummary(localUsers, localPumps, localStocks, localFuelRequests, localOutages));
        response.put("requestSummary", buildRequestSummary(localFuelRequests));
        response.put("localPumps", buildPumpList(localPumps));
        response.put("criticalRequests", buildCriticalRequestList(localFuelRequests));
        response.put("lowStockPumps", buildLowStockPumpList(localStocks));
        response.put("recentOutages", buildOutageList(localOutages));

        return response;
    }

    private Map<String, Object> buildSummary(
            List<User> users,
            List<PumpProfile> pumps,
            List<PumpFuelStock> stocks,
            List<FuelRequest> fuelRequests,
            List<PowerOutageNotice> outages
    ) {
        Map<String, Object> summary = new LinkedHashMap<>();

        summary.put("totalUsers", users.size());
        summary.put("totalPumps", pumps.size());
        summary.put("openPumps", pumps.stream().filter(pump -> pump.getPumpStatus() == PumpStatus.OPEN).count());
        summary.put("closedPumps", pumps.stream().filter(pump -> pump.getPumpStatus() == PumpStatus.CLOSED).count());
        summary.put("totalFuelRequests", fuelRequests.size());
        summary.put("pendingRequests", countRequestStatus(fuelRequests, FuelRequestStatus.PENDING));
        summary.put("approvedRequests", countRequestStatus(fuelRequests, FuelRequestStatus.APPROVED));
        summary.put("collectedRequests", countRequestStatus(fuelRequests, FuelRequestStatus.COLLECTED));
        summary.put("rejectedRequests", countRequestStatus(fuelRequests, FuelRequestStatus.REJECTED));
        summary.put("totalFuelStock", calculateTotalStock(stocks));
        summary.put("activeOutages", outages.stream()
                .filter(outage -> outage.getStatus() == PowerOutageStatus.ONGOING
                        || outage.getStatus() == PowerOutageStatus.SCHEDULED)
                .count());

        return summary;
    }

    private Map<String, Object> buildRoleSummary(List<User> users) {
        Map<String, Object> roleSummary = new LinkedHashMap<>();

        roleSummary.put("vehicleOwners", countRole(users, Role.VEHICLE_OWNER));
        roleSummary.put("pumpAuthorities", countRole(users, Role.PUMP_AUTHORITY));
        roleSummary.put("emergencyAuthorities", countRole(users, Role.EMERGENCY_VEHICLE_AUTHORITY));
        roleSummary.put("buildingManagers", countRole(users, Role.BUILDING_MANAGER));
        roleSummary.put("hospitalAuthorities", countRole(users, Role.HOSPITAL_AUTHORITY));
        roleSummary.put("utilityAuthorities", countRole(users, Role.UTILITY_AUTHORITY));
        roleSummary.put("localAuthorities", countRole(users, Role.LOCAL_AUTHORITY));
        roleSummary.put("governmentAuthorities", countRole(users, Role.GOVERNMENT_AUTHORITY));

        return roleSummary;
    }

    private Map<String, Object> buildRequestSummary(List<FuelRequest> fuelRequests) {
        Map<String, Object> requestSummary = new LinkedHashMap<>();

        requestSummary.put("vehicleOwnerRequests", countRequestSource(fuelRequests, FuelRequestSource.VEHICLE_OWNER));
        requestSummary.put("emergencyRequests", countRequestSource(fuelRequests, FuelRequestSource.EMERGENCY));
        requestSummary.put("hospitalRequests", countRequestSource(fuelRequests, FuelRequestSource.HOSPITAL_GENERATOR));
        requestSummary.put("buildingRequests", countRequestSource(fuelRequests, FuelRequestSource.BUILDING_GENERATOR));

        return requestSummary;
    }

    private List<Map<String, Object>> buildCriticalRequestList(List<FuelRequest> fuelRequests) {
        return fuelRequests.stream()
                .filter(request -> request.getRequestStatus() == FuelRequestStatus.PENDING
                        || request.getRequestSource() == FuelRequestSource.HOSPITAL_GENERATOR
                        || request.getRequestSource() == FuelRequestSource.EMERGENCY
                        || request.getRequestSource() == FuelRequestSource.BUILDING_GENERATOR
                        || Boolean.TRUE.equals(request.getExtraFuelRequested()))
                .sorted(Comparator.comparing(FuelRequest::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(10)
                .map(this::mapFuelRequest)
                .toList();
    }

    private List<Map<String, Object>> buildLowStockPumpList(List<PumpFuelStock> stocks) {
        return stocks.stream()
                .filter(stock -> stock.getFuelCapacity() != null
                        && stock.getFuelCapacity().compareTo(BigDecimal.ZERO) > 0)
                .filter(stock -> {
                    BigDecimal twentyPercent = stock.getFuelCapacity().multiply(BigDecimal.valueOf(0.20));
                    return stock.getCurrentStock().compareTo(twentyPercent) <= 0;
                })
                .limit(10)
                .map(this::mapPumpStock)
                .toList();
    }

    private List<Map<String, Object>> buildOutageList(List<PowerOutageNotice> outages) {
        return outages.stream()
                .limit(10)
                .map(this::mapOutage)
                .toList();
    }

    private List<Map<String, Object>> buildPumpList(List<PumpProfile> pumps) {
        return pumps.stream()
                .limit(10)
                .map(this::mapPump)
                .toList();
    }

    private Map<String, Object> mapFuelRequest(FuelRequest request) {
        Map<String, Object> map = new LinkedHashMap<>();

        User user = request.getUser();

        map.put("id", request.getId());
        map.put("userName", user == null ? "-" : user.getFullName());
        map.put("phoneNumber", user == null ? "-" : user.getPhoneNumber());
        map.put("requestSource", request.getRequestSource());
        map.put("fuelType", request.getFuelType());
        map.put("requestedLiter", request.getRequestedLiter());
        map.put("estimatedCost", request.getEstimatedCost());
        map.put("requestStatus", request.getRequestStatus());
        map.put("extraFuelRequested", request.getExtraFuelRequested());
        map.put("extraFuelReasonType", request.getExtraFuelReasonType());
        map.put("adminNote", request.getAdminNote());
        map.put("createdAt", request.getCreatedAt());

        if (request.getVehicle() != null) {
            map.put("details", request.getVehicle().getBrand()
                    + " " + request.getVehicle().getModel()
                    + " - " + request.getVehicle().getNumberPlate());
            map.put("area", valueOrDash(user == null ? null : user.getAddress()));
        } else if (request.getRequestSource() == FuelRequestSource.HOSPITAL_GENERATOR) {
            map.put("details", "Hospital: " + valueOrDash(request.getHospitalName()));
            map.put("area", valueOrDash(request.getAffectedThana()));
        } else if (request.getRequestSource() == FuelRequestSource.BUILDING_GENERATOR) {
            map.put("details", "Building: " + valueOrDash(request.getBuildingName()));
            map.put("area", valueOrDash(request.getBuildingThana()));
        } else if (request.getRequestSource() == FuelRequestSource.EMERGENCY) {
            map.put("details", "Emergency vehicle request");
            map.put("area", user == null ? "-" : valueOrDash(user.getAssignedArea()));
        } else {
            map.put("details", "-");
            map.put("area", "-");
        }

        return map;
    }

    private Map<String, Object> mapPumpStock(PumpFuelStock stock) {
        Map<String, Object> map = new LinkedHashMap<>();

        PumpProfile pump = stock.getPumpProfile();

        map.put("pumpName", pump == null ? "-" : pump.getPumpName());
        map.put("pumpAddress", pump == null ? "-" : pump.getPumpAddress());
        map.put("fuelType", stock.getFuelType());
        map.put("capacity", stock.getFuelCapacity());
        map.put("currentStock", stock.getCurrentStock());
        map.put("stockPercentage", calculateStockPercentage(stock.getCurrentStock(), stock.getFuelCapacity()));

        return map;
    }

    private Map<String, Object> mapPump(PumpProfile pump) {
        Map<String, Object> map = new LinkedHashMap<>();

        map.put("id", pump.getId());
        map.put("pumpName", pump.getPumpName());
        map.put("pumpAddress", pump.getPumpAddress());
        map.put("fuelTypes", pump.getFuelTypes());
        map.put("currentStock", pump.getCurrentStock());
        map.put("fuelCapacity", pump.getFuelCapacity());
        map.put("pumpStatus", pump.getPumpStatus());

        return map;
    }

    private Map<String, Object> mapOutage(PowerOutageNotice outage) {
        Map<String, Object> map = new LinkedHashMap<>();

        map.put("id", outage.getId());
        map.put("provider", outage.getProvider());
        map.put("cityCorporation", outage.getCityCorporation());
        map.put("thanaName", outage.getThanaName());
        map.put("outageType", outage.getOutageType());
        map.put("cause", outage.getCause());
        map.put("status", outage.getStatus());
        map.put("expectedRestorationDateTime", outage.getExpectedRestorationDateTime());
        map.put("createdAt", outage.getCreatedAt());

        return map;
    }

    private boolean matchesFuelRequestArea(FuelRequest request, String district, String thanaOrUpazila) {
        if (request.getUser() != null && matchesArea(request.getUser(), district, thanaOrUpazila)) {
            return true;
        }

        return matchesText(request.getAffectedThana(), district, thanaOrUpazila)
                || matchesText(request.getHospitalAddress(), district, thanaOrUpazila)
                || matchesText(request.getBuildingThana(), district, thanaOrUpazila)
                || matchesText(request.getBuildingAddress(), district, thanaOrUpazila);
    }

    private boolean matchesArea(User user, String district, String thanaOrUpazila) {
        if (user == null) {
            return false;
        }

        return matchesText(user.getAddress(), district, thanaOrUpazila)
                || matchesText(user.getDistrict(), district, thanaOrUpazila)
                || matchesText(user.getThanaOrUpazila(), district, thanaOrUpazila)
                || matchesText(user.getBuildingUnderThana(), district, thanaOrUpazila)
                || matchesText(user.getHospitalUnderThana(), district, thanaOrUpazila)
                || matchesText(user.getServiceArea(), district, thanaOrUpazila)
                || matchesText(user.getAssignedArea(), district, thanaOrUpazila)
                || matchesText(user.getPumpAddress(), district, thanaOrUpazila);
    }

    private boolean matchesText(String value, String district, String thanaOrUpazila) {
        if (value == null || value.isBlank()) {
            return false;
        }

        String normalizedValue = value.toLowerCase();
        String normalizedDistrict = district == null ? "" : district.toLowerCase();
        String normalizedThana = thanaOrUpazila == null ? "" : thanaOrUpazila.toLowerCase();

        return (!normalizedDistrict.isBlank() && normalizedValue.contains(normalizedDistrict))
                || (!normalizedThana.isBlank() && normalizedValue.contains(normalizedThana));
    }

    private long countRole(List<User> users, Role role) {
        return users.stream()
                .filter(user -> user.getRole() == role)
                .count();
    }

    private long countRequestStatus(List<FuelRequest> fuelRequests, FuelRequestStatus status) {
        return fuelRequests.stream()
                .filter(request -> request.getRequestStatus() == status)
                .count();
    }

    private long countRequestSource(List<FuelRequest> fuelRequests, FuelRequestSource source) {
        return fuelRequests.stream()
                .filter(request -> request.getRequestSource() == source)
                .count();
    }

    private BigDecimal calculateTotalStock(List<PumpFuelStock> stocks) {
        return stocks.stream()
                .map(PumpFuelStock::getCurrentStock)
                .filter(value -> value != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateStockPercentage(BigDecimal currentStock, BigDecimal capacity) {
        if (currentStock == null || capacity == null || capacity.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        return currentStock
                .multiply(BigDecimal.valueOf(100))
                .divide(capacity, 2, RoundingMode.HALF_UP);
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private String valueOrDash(String value) {
        if (value == null || value.isBlank()) {
            return "-";
        }

        return value;
    }
}