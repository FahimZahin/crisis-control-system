package com.crisiscontrol.service;

import com.crisiscontrol.entity.FuelRequest;
import com.crisiscontrol.entity.FuelRequestSource;
import com.crisiscontrol.entity.FuelRequestStatus;
import com.crisiscontrol.entity.FuelType;
import com.crisiscontrol.entity.PowerOutageNotice;
import com.crisiscontrol.entity.PowerOutageStatus;
import com.crisiscontrol.entity.PumpFuelStock;
import com.crisiscontrol.entity.PumpProfile;
import com.crisiscontrol.entity.PumpStatus;
import com.crisiscontrol.entity.Role;
import com.crisiscontrol.entity.User;
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
        response.put("outageSummary", buildOutageSummary(outages));
        response.put("pumpSummary", buildPumpSummary(pumps, stocks));
        response.put("criticalRequests", buildCriticalRequestList(fuelRequests));
        response.put("criticalHospitals", buildCriticalHospitalList(users));
        response.put("lowStockBuildings", buildLowStockBuildingList(users));
        response.put("lowStockPumps", buildLowStockPumpList(stocks));
        response.put("recentOutages", buildOutageList(outages));
        response.put("thanaCrisisSummary", buildThanaCrisisSummary(users, pumps, stocks, fuelRequests, outages));

        return response;
    }

    public Map<String, Object> getLocalAuthorityDashboard(Long userId) {
        User localUser = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Local authority user not found"));

        if (localUser.getRole() != Role.LOCAL_AUTHORITY) {
            throw new RuntimeException("Only Local Authority can access local authority dashboard");
        }

        String district = safe(localUser.getDistrict());
        String thanaOrUpazila = normalizeThanaName(localUser.getThanaOrUpazila());

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
                .filter(outage -> sameText(normalizeThanaName(outage.getThanaName()), thanaOrUpazila)
                        || matchesText(outage.getThanaName(), district, thanaOrUpazila))
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
        response.put("outageSummary", buildOutageSummary(localOutages));
        response.put("pumpSummary", buildPumpSummary(localPumps, localStocks));
        response.put("localPumps", buildPumpList(localPumps));
        response.put("criticalRequests", buildCriticalRequestList(localFuelRequests));
        response.put("criticalHospitals", buildCriticalHospitalList(localUsers));
        response.put("lowStockBuildings", buildLowStockBuildingList(localUsers));
        response.put("lowStockPumps", buildLowStockPumpList(localStocks));
        response.put("recentOutages", buildOutageList(localOutages));
        response.put("thanaCrisisSummary", buildThanaCrisisSummary(localUsers, localPumps, localStocks, localFuelRequests, localOutages));

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
        summary.put("criticalHospitals", buildCriticalHospitalList(users).size());
        summary.put("lowStockBuildings", buildLowStockBuildingList(users).size());
        summary.put("lowStockPumps", buildLowStockPumpList(stocks).size());

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

    private Map<String, Object> buildOutageSummary(List<PowerOutageNotice> outages) {
        Map<String, Object> outageSummary = new LinkedHashMap<>();

        outageSummary.put("ongoingOutages", countOutageStatus(outages, PowerOutageStatus.ONGOING));
        outageSummary.put("scheduledOutages", countOutageStatus(outages, PowerOutageStatus.SCHEDULED));
        outageSummary.put("restoredOutages", countOutageStatus(outages, PowerOutageStatus.RESTORED));
        outageSummary.put("cancelledOutages", countOutageStatus(outages, PowerOutageStatus.CANCELLED));

        return outageSummary;
    }

    private Map<String, Object> buildPumpSummary(List<PumpProfile> pumps, List<PumpFuelStock> stocks) {
        Map<String, Object> pumpSummary = new LinkedHashMap<>();

        pumpSummary.put("openPumps", pumps.stream().filter(pump -> pump.getPumpStatus() == PumpStatus.OPEN).count());
        pumpSummary.put("closedPumps", pumps.stream().filter(pump -> pump.getPumpStatus() == PumpStatus.CLOSED).count());
        pumpSummary.put("lowStockPumps", buildLowStockPumpList(stocks).size());

        return pumpSummary;
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

    private List<Map<String, Object>> buildCriticalHospitalList(List<User> users) {
        return users.stream()
                .filter(user -> user.getRole() == Role.HOSPITAL_AUTHORITY)
                .filter(user -> {
                    String status = safe(user.getHospitalDieselStatus());
                    Double backup = user.getHospitalEstimatedBackupHours();

                    return "CRITICAL".equalsIgnoreCase(status)
                            || "MIDDLE".equalsIgnoreCase(status)
                            || backup == null
                            || backup < 8;
                })
                .sorted(Comparator.comparing(
                        user -> user.getHospitalEstimatedBackupHours() == null ? 0.0 : user.getHospitalEstimatedBackupHours()
                ))
                .limit(10)
                .map(this::mapCriticalHospital)
                .toList();
    }

    private List<Map<String, Object>> buildLowStockBuildingList(List<User> users) {
        return users.stream()
                .filter(user -> user.getRole() == Role.BUILDING_MANAGER)
                .filter(this::isBuildingLowStock)
                .limit(10)
                .map(this::mapLowStockBuilding)
                .toList();
    }

    private List<Map<String, Object>> buildLowStockPumpList(List<PumpFuelStock> stocks) {
        return stocks.stream()
                .filter(this::isLowStock)
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

    private List<Map<String, Object>> buildThanaCrisisSummary(
            List<User> users,
            List<PumpProfile> pumps,
            List<PumpFuelStock> stocks,
            List<FuelRequest> fuelRequests,
            List<PowerOutageNotice> outages
    ) {
        Map<String, Map<String, Object>> thanaMap = new LinkedHashMap<>();

        outages.forEach(outage -> {
            String thana = normalizeThanaName(outage.getThanaName());

            if (isInvalidThanaForSummary(thana)) {
                return;
            }

            Map<String, Object> row = getOrCreateThanaRow(thanaMap, thana);

            if (outage.getStatus() == PowerOutageStatus.ONGOING) {
                row.put("ongoingOutages", ((Long) row.get("ongoingOutages")) + 1);
            }

            if (outage.getStatus() == PowerOutageStatus.SCHEDULED) {
                row.put("scheduledOutages", ((Long) row.get("scheduledOutages")) + 1);
            }
        });

        users.stream()
                .filter(user -> user.getRole() == Role.HOSPITAL_AUTHORITY)
                .filter(this::isHospitalCritical)
                .forEach(user -> {
                    String thana = normalizeThanaName(firstValid(user.getHospitalUnderThana(), user.getThanaOrUpazila()));

                    if (isInvalidThanaForSummary(thana)) {
                        return;
                    }

                    Map<String, Object> row = getOrCreateThanaRow(thanaMap, thana);
                    row.put("criticalHospitals", ((Long) row.get("criticalHospitals")) + 1);
                });

        users.stream()
                .filter(user -> user.getRole() == Role.BUILDING_MANAGER)
                .filter(this::isBuildingLowStock)
                .forEach(user -> {
                    String thana = normalizeThanaName(firstValid(user.getBuildingUnderThana(), user.getThanaOrUpazila()));

                    if (isInvalidThanaForSummary(thana)) {
                        return;
                    }

                    Map<String, Object> row = getOrCreateThanaRow(thanaMap, thana);
                    row.put("lowStockBuildings", ((Long) row.get("lowStockBuildings")) + 1);
                });

        fuelRequests.forEach(request -> {
            String thana = normalizeThanaName(resolveFuelRequestThana(request));

            if (isInvalidThanaForSummary(thana)) {
                return;
            }

            Map<String, Object> row = getOrCreateThanaRow(thanaMap, thana);

            if (request.getRequestStatus() == FuelRequestStatus.PENDING) {
                row.put("pendingRequests", ((Long) row.get("pendingRequests")) + 1);
            }

            if (request.getFuelType() == FuelType.DIESEL && request.getRequestedLiter() != null) {
                BigDecimal currentDemand = (BigDecimal) row.get("totalDieselDemand");

                row.put(
                        "totalDieselDemand",
                        currentDemand.add(request.getRequestedLiter()).setScale(2, RoundingMode.HALF_UP)
                );
            }
        });

        stocks.forEach(stock -> {
            if (!isLowStock(stock)) {
                return;
            }

            PumpProfile pump = stock.getPumpProfile();

            if (pump == null) {
                return;
            }

            String thana = normalizeThanaName(resolvePumpThana(pump));

            if (isInvalidThanaForSummary(thana)) {
                return;
            }

            Map<String, Object> row = getOrCreateThanaRow(thanaMap, thana);
            row.put("lowStockPumps", ((Long) row.get("lowStockPumps")) + 1);
        });

        return thanaMap.values()
                .stream()
                .sorted((first, second) -> {
                    Long firstOngoing = (Long) first.get("ongoingOutages");
                    Long secondOngoing = (Long) second.get("ongoingOutages");

                    int ongoingCompare = Long.compare(secondOngoing, firstOngoing);

                    if (ongoingCompare != 0) {
                        return ongoingCompare;
                    }

                    BigDecimal firstDemand = (BigDecimal) first.get("totalDieselDemand");
                    BigDecimal secondDemand = (BigDecimal) second.get("totalDieselDemand");

                    int demandCompare = secondDemand.compareTo(firstDemand);

                    if (demandCompare != 0) {
                        return demandCompare;
                    }

                    Long firstScheduled = (Long) first.get("scheduledOutages");
                    Long secondScheduled = (Long) second.get("scheduledOutages");

                    return Long.compare(secondScheduled, firstScheduled);
                })
                .toList();
    }

    private Map<String, Object> getOrCreateThanaRow(Map<String, Map<String, Object>> thanaMap, String thana) {
        String key = normalizeThanaName(thana);

        if (!thanaMap.containsKey(key)) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("thana", key);
            row.put("ongoingOutages", 0L);
            row.put("scheduledOutages", 0L);
            row.put("pendingRequests", 0L);
            row.put("criticalHospitals", 0L);
            row.put("lowStockBuildings", 0L);
            row.put("lowStockPumps", 0L);
            row.put("totalDieselDemand", BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            thanaMap.put(key, row);
        }

        return thanaMap.get(key);
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
            map.put("area", valueOrDash(normalizeThanaName(request.getAffectedThana())));
        } else if (request.getRequestSource() == FuelRequestSource.BUILDING_GENERATOR) {
            map.put("details", "Building: " + valueOrDash(request.getBuildingName()));
            map.put("area", valueOrDash(normalizeThanaName(request.getBuildingThana())));
        } else if (request.getRequestSource() == FuelRequestSource.EMERGENCY) {
            map.put("details", "Emergency vehicle request");
            map.put("area", user == null ? "-" : valueOrDash(user.getAssignedArea()));
        } else {
            map.put("details", "-");
            map.put("area", "-");
        }

        return map;
    }

    private Map<String, Object> mapCriticalHospital(User user) {
        Map<String, Object> map = new LinkedHashMap<>();

        map.put("hospitalName", valueOrDash(user.getHospitalName()));
        map.put("phoneNumber", valueOrDash(user.getPhoneNumber()));
        map.put("thana", valueOrDash(normalizeThanaName(firstValid(user.getHospitalUnderThana(), user.getThanaOrUpazila()))));
        map.put("currentDieselReserve", roundDouble(user.getHospitalCurrentDieselReserve()));
        map.put("backupHours", roundDouble(user.getHospitalEstimatedBackupHours()));
        map.put("dieselStatus", valueOrDash(user.getHospitalDieselStatus()));
        map.put("icuUnits", user.getTotalIcuUnits() == null ? 0 : user.getTotalIcuUnits());
        map.put("patientCapacity", safeInt(user.getAcPatientCapacity()) + safeInt(user.getNonAcPatientCapacity()));

        return map;
    }

    private Map<String, Object> mapLowStockBuilding(User user) {
        Map<String, Object> map = new LinkedHashMap<>();

        map.put("buildingName", valueOrDash(user.getBuildingName()));
        map.put("phoneNumber", valueOrDash(user.getPhoneNumber()));
        map.put("thana", valueOrDash(normalizeThanaName(firstValid(user.getBuildingUnderThana(), user.getThanaOrUpazila()))));
        map.put("currentFuel", roundDouble(user.getBuildingCurrentFuel()));
        map.put("tankCapacity", roundDouble(user.getBuildingDieselTankCapacity()));
        map.put("backupHours", roundDouble(user.getBuildingEstimatedBackupHours()));
        map.put("numberOfFlats", user.getNumberOfFlats() == null ? 0 : user.getNumberOfFlats());

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
        map.put("thanaName", normalizeThanaName(outage.getThanaName()));
        map.put("outageType", outage.getOutageType());
        map.put("cause", outage.getCause());
        map.put("status", outage.getStatus());
        map.put("expectedRestorationDateTime", outage.getExpectedRestorationDateTime());
        map.put("createdAt", outage.getCreatedAt());

        return map;
    }

    private boolean isHospitalCritical(User user) {
        String status = safe(user.getHospitalDieselStatus());
        Double backup = user.getHospitalEstimatedBackupHours();

        return "CRITICAL".equalsIgnoreCase(status)
                || backup == null
                || backup < 6;
    }

    private boolean isBuildingLowStock(User user) {
        double currentFuel = safeDouble(user.getBuildingCurrentFuel());
        double tankCapacity = safeDouble(user.getBuildingDieselTankCapacity());
        double backupHours = safeDouble(user.getBuildingEstimatedBackupHours());

        if (tankCapacity <= 0 || currentFuel <= 0) {
            return true;
        }

        double percentage = (currentFuel * 100.0) / tankCapacity;

        return percentage <= 20.0 || backupHours < 6.0;
    }

    private boolean isLowStock(PumpFuelStock stock) {
        if (stock == null || stock.getFuelCapacity() == null || stock.getCurrentStock() == null) {
            return false;
        }

        if (stock.getFuelCapacity().compareTo(BigDecimal.ZERO) <= 0) {
            return false;
        }

        BigDecimal twentyPercent = stock.getFuelCapacity().multiply(BigDecimal.valueOf(0.20));

        return stock.getCurrentStock().compareTo(twentyPercent) <= 0;
    }

    private boolean matchesFuelRequestArea(FuelRequest request, String district, String thanaOrUpazila) {
        if (request.getUser() != null && matchesArea(request.getUser(), district, thanaOrUpazila)) {
            return true;
        }

        String normalizedRequestThana = normalizeThanaName(resolveFuelRequestThana(request));

        return sameText(normalizedRequestThana, thanaOrUpazila)
                || matchesText(request.getHospitalAddress(), district, thanaOrUpazila)
                || matchesText(request.getBuildingAddress(), district, thanaOrUpazila);
    }

    private boolean matchesArea(User user, String district, String thanaOrUpazila) {
        if (user == null) {
            return false;
        }

        String userThana = normalizeThanaName(firstValid(
                user.getThanaOrUpazila(),
                firstValid(user.getBuildingUnderThana(), user.getHospitalUnderThana())
        ));

        return sameText(userThana, thanaOrUpazila)
                || matchesText(user.getAddress(), district, thanaOrUpazila)
                || matchesText(user.getDistrict(), district, thanaOrUpazila)
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

    private String resolveFuelRequestThana(FuelRequest request) {
        if (request == null) {
            return "-";
        }

        if (request.getRequestSource() == FuelRequestSource.HOSPITAL_GENERATOR) {
            return firstValid(
                    request.getAffectedThana(),
                    request.getUser() == null ? null : firstValid(
                            request.getUser().getHospitalUnderThana(),
                            request.getUser().getThanaOrUpazila()
                    )
            );
        }

        if (request.getRequestSource() == FuelRequestSource.BUILDING_GENERATOR) {
            return firstValid(
                    request.getBuildingThana(),
                    request.getUser() == null ? null : firstValid(
                            request.getUser().getBuildingUnderThana(),
                            request.getUser().getThanaOrUpazila()
                    )
            );
        }

        if (request.getUser() != null) {
            return firstValid(
                    request.getUser().getThanaOrUpazila(),
                    firstValid(
                            request.getUser().getBuildingUnderThana(),
                            request.getUser().getHospitalUnderThana()
                    )
            );
        }

        return "-";
    }

    private String resolvePumpThana(PumpProfile pump) {
        if (pump == null) {
            return "-";
        }

        if (pump.getUser() != null) {
            return normalizeThanaName(pump.getUser().getThanaOrUpazila());
        }

        return "-";
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

    private long countOutageStatus(List<PowerOutageNotice> outages, PowerOutageStatus status) {
        return outages.stream()
                .filter(outage -> outage.getStatus() == status)
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
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        return currentStock
                .multiply(BigDecimal.valueOf(100))
                .divide(capacity, 2, RoundingMode.HALF_UP);
    }

    private boolean isInvalidThanaForSummary(String value) {
        if (value == null || value.isBlank() || "-".equals(value.trim())) {
            return true;
        }

        String normalized = value.trim().toLowerCase();

        return normalized.contains(",")
                || normalized.contains("road")
                || normalized.contains("street")
                || normalized.contains("house")
                || normalized.contains("holding")
                || normalized.contains("dhaka-")
                || normalized.matches(".*\\d{3,}.*");
    }

    private String normalizeThanaName(String value) {
        if (value == null || value.isBlank()) {
            return "-";
        }

        String normalized = value.trim()
                .replaceAll("\\s+", " ")
                .replace("_", " ")
                .toLowerCase();

        normalized = normalized.replace("–", "-").replace("—", "-");

        if (normalized.equals("gulsan") || normalized.equals("gulshan")) {
            return "Gulshan";
        }

        if (normalized.equals("sher e bangla nagar")
                || normalized.equals("sher-e-bangla nagar")
                || normalized.equals("sher-e bangla nagar")
                || normalized.equals("sher e-bangla nagar")
                || normalized.equals("shere bangla nagar")
                || normalized.equals("sher bangla nagar")) {
            return "Sher-e-Bangla Nagar";
        }

        if (normalized.equals("sabuj bagh") || normalized.equals("sabujbagh")) {
            return "Sabujbagh";
        }

        if (normalized.equals("cantonment")) {
            return "Cantonment";
        }

        if (normalized.equals("ramna")) {
            return "Ramna";
        }

        if (normalized.equals("kafrul")) {
            return "Kafrul";
        }

        if (normalized.equals("paltan")) {
            return "Paltan";
        }

        if (normalized.equals("sutrapur")) {
            return "Sutrapur";
        }

        if (normalized.equals("hazaribagh")) {
            return "Hazaribagh";
        }

        if (normalized.equals("shahbagh")) {
            return "Shahbagh";
        }

        if (normalized.equals("dhanmondi")) {
            return "Dhanmondi";
        }

        return toTitleCase(normalized);
    }

    private String toTitleCase(String value) {
        if (value == null || value.isBlank()) {
            return "-";
        }

        String[] words = value.trim().split("\\s+");
        StringBuilder result = new StringBuilder();

        for (String word : words) {
            if (word.isBlank()) {
                continue;
            }

            if (!result.isEmpty()) {
                result.append(" ");
            }

            result.append(word.substring(0, 1).toUpperCase());

            if (word.length() > 1) {
                result.append(word.substring(1).toLowerCase());
            }
        }

        return result.toString();
    }

    private boolean sameText(String first, String second) {
        if (first == null || second == null) {
            return false;
        }

        return first.trim().equalsIgnoreCase(second.trim());
    }

    private String firstValid(String first, String second) {
        if (first != null && !first.isBlank()) {
            return first;
        }

        if (second != null && !second.isBlank()) {
            return second;
        }

        return "-";
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private String valueOrDash(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : value;
    }

    private double safeDouble(Double value) {
        return value == null ? 0.0 : value;
    }

    private double roundDouble(Double value) {
        if (value == null) {
            return 0.0;
        }

        return Math.round(value * 100.0) / 100.0;
    }
}