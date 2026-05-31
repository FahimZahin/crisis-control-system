package com.crisiscontrol.service;

import com.crisiscontrol.entity.FuelRequest;
import com.crisiscontrol.entity.GovernmentPenaltyLedger;
import com.crisiscontrol.entity.PowerOutageNotice;
import com.crisiscontrol.entity.PumpComplaint;
import com.crisiscontrol.entity.PumpProfile;
import com.crisiscontrol.repository.FuelRequestRepository;
import com.crisiscontrol.repository.GovernmentPenaltyLedgerRepository;
import com.crisiscontrol.repository.PowerOutageRepository;
import com.crisiscontrol.repository.PumpComplaintRepository;
import com.crisiscontrol.repository.PumpProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AnalyticsReportService {

    private final FuelRequestRepository fuelRequestRepository;
    private final PumpProfileRepository pumpProfileRepository;
    private final PumpComplaintRepository pumpComplaintRepository;
    private final GovernmentPenaltyLedgerRepository governmentPenaltyLedgerRepository;
    private final PowerOutageRepository powerOutageRepository;

    public Map<String, Object> getAnalyticsSummary() {
        List<FuelRequest> fuelRequests = fuelRequestRepository.findAllByOrderByCreatedAtDesc();
        List<PumpProfile> pumps = pumpProfileRepository.findAllByOrderByUpdatedAtDesc();
        List<PumpComplaint> complaints = pumpComplaintRepository.findAllByOrderByCreatedAtDesc();
        List<GovernmentPenaltyLedger> ledgers = governmentPenaltyLedgerRepository.findAllByOrderByCreatedAtDesc();
        List<PowerOutageNotice> outages = powerOutageRepository.findAllByOrderByCreatedAtDesc();

        BigDecimal totalPenaltyReceivable = BigDecimal.ZERO;
        BigDecimal totalPenaltyCollected = BigDecimal.ZERO;
        BigDecimal totalPenaltyOutstanding = BigDecimal.ZERO;

        long activeDebtCases = 0;
        long paidPenaltyCases = 0;

        for (GovernmentPenaltyLedger ledger : ledgers) {
            totalPenaltyReceivable = totalPenaltyReceivable.add(safeMoney(ledger.getTotalDebtAmount()));
            totalPenaltyCollected = totalPenaltyCollected.add(safeMoney(ledger.getPaidAmount()));
            totalPenaltyOutstanding = totalPenaltyOutstanding.add(safeMoney(ledger.getOutstandingAmount()));

            if (enumNameEquals(ledger.getStatus(), "DEBT_RECOVERY")) {
                activeDebtCases++;
            }

            if (enumNameEquals(ledger.getStatus(), "PAID")) {
                paidPenaltyCases++;
            }
        }

        long verifiedTrueComplaints = complaints.stream()
                .filter(complaint -> sameText(complaint.getLocalVerificationDecision(), "VERIFIED_TRUE"))
                .count();

        long sentToAdminComplaints = complaints.stream()
                .filter(complaint -> enumNameEquals(complaint.getStatus(), "SENT_TO_ADMIN"))
                .count();

        long adminActionTakenComplaints = complaints.stream()
                .filter(complaint -> enumNameEquals(complaint.getStatus(), "ADMIN_ACTION_TAKEN"))
                .count();

        long hospitalCriticalRequests = fuelRequests.stream()
                .filter(request -> enumNameEquals(request.getRequestSource(), "HOSPITAL_GENERATOR"))
                .filter(request -> containsIgnoreCase(request.getHospitalPriorityLevel(), "CRITICAL")
                        || containsIgnoreCase(request.getHospitalUrgencyLevel(), "CRITICAL")
                        || containsIgnoreCase(request.getFuelLevelStatus(), "CRITICAL"))
                .count();

        long buildingLowStockRequests = fuelRequests.stream()
                .filter(request -> enumNameEquals(request.getRequestSource(), "BUILDING_GENERATOR"))
                .filter(request -> Boolean.TRUE.equals(request.getBuildingLowStockAlert())
                        || containsIgnoreCase(request.getFuelLevelStatus(), "LOW_STOCK"))
                .count();

        long ongoingOutageAreas = outages.stream()
                .filter(outage -> enumNameEquals(outage.getStatus(), "ONGOING"))
                .map(outage -> normalizeValidThana(outage.getThanaName()))
                .filter(area -> !"Unknown".equals(area))
                .distinct()
                .count();

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalFuelRequests", fuelRequests.size());
        summary.put("totalPumps", pumps.size());
        summary.put("totalComplaints", complaints.size());
        summary.put("verifiedTrueComplaints", verifiedTrueComplaints);
        summary.put("sentToAdminComplaints", sentToAdminComplaints);
        summary.put("adminActionTakenComplaints", adminActionTakenComplaints);

        summary.put("totalPenaltyReceivable", money(totalPenaltyReceivable));
        summary.put("totalPenaltyCollected", money(totalPenaltyCollected));
        summary.put("totalPenaltyOutstanding", money(totalPenaltyOutstanding));
        summary.put("activeDebtCases", activeDebtCases);
        summary.put("paidPenaltyCases", paidPenaltyCases);

        summary.put("hospitalCriticalRequests", hospitalCriticalRequests);
        summary.put("buildingLowStockRequests", buildingLowStockRequests);
        summary.put("ongoingOutageAreas", ongoingOutageAreas);
        summary.put("generatedAt", LocalDateTime.now());

        return summary;
    }

    public List<Map<String, Object>> getTopDemandAreas(int limit) {
        List<FuelRequest> requests = fuelRequestRepository.findAllByOrderByCreatedAtDesc();

        Map<String, AreaStats> statsByArea = new LinkedHashMap<>();

        for (FuelRequest request : requests) {
            String area = resolveRequestArea(request);

            if ("Unknown".equals(area)) {
                continue;
            }

            AreaStats stats = statsByArea.computeIfAbsent(area, AreaStats::new);

            stats.requestCount++;
            stats.totalRequestedLiter = stats.totalRequestedLiter.add(safeMoney(request.getRequestedLiter()));
            stats.totalEstimatedCost = stats.totalEstimatedCost.add(safeMoney(request.getEstimatedCost()));

            if (enumNameEquals(request.getRequestStatus(), "COLLECTED")) {
                stats.collectedRequests++;
            }
        }

        return statsByArea.values()
                .stream()
                .sorted(Comparator.comparing(AreaStats::getTotalRequestedLiter).reversed())
                .limit(Math.max(1, limit))
                .map(this::mapAreaStats)
                .toList();
    }

    public List<Map<String, Object>> getRecentPenaltyCases(int limit) {
        return governmentPenaltyLedgerRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .limit(Math.max(1, limit))
                .map(this::mapPenaltyLedger)
                .toList();
    }

    private Map<String, Object> mapAreaStats(AreaStats stats) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("area", stats.area);
        row.put("requestCount", stats.requestCount);
        row.put("totalRequestedLiter", money(stats.totalRequestedLiter));
        row.put("totalEstimatedCost", money(stats.totalEstimatedCost));
        row.put("collectedRequests", stats.collectedRequests);
        return row;
    }

    private Map<String, Object> mapPenaltyLedger(GovernmentPenaltyLedger ledger) {
        PumpProfile pumpProfile = ledger.getPumpProfile();

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", ledger.getId());
        row.put("pumpId", pumpProfile == null ? null : pumpProfile.getId());
        row.put("pumpName", pumpProfile == null ? "-" : pumpProfile.getPumpName());
        row.put("ruleCode", ledger.getRuleCode());
        row.put("complaintType", ledger.getComplaintType());
        row.put("totalDebtAmount", money(ledger.getTotalDebtAmount()));
        row.put("paidAmount", money(ledger.getPaidAmount()));
        row.put("outstandingAmount", money(ledger.getOutstandingAmount()));
        row.put("status", ledger.getStatus() == null ? "-" : ledger.getStatus().name());
        row.put("operationAllowed", Boolean.TRUE.equals(ledger.getOperationAllowed()));
        row.put("createdAt", ledger.getCreatedAt());
        return row;
    }

    private String resolveRequestArea(FuelRequest request) {
        if (request == null) {
            return "Unknown";
        }

        String affectedThana = normalizeValidThana(request.getAffectedThana());

        if (!"Unknown".equals(affectedThana)) {
            return affectedThana;
        }

        String buildingThana = normalizeValidThana(request.getBuildingThana());

        if (!"Unknown".equals(buildingThana)) {
            return buildingThana;
        }

        /*
         * Important:
         * Do NOT fall back to pump address or user address here.
         * Those fields can contain full addresses such as:
         * "102, South Basabo, Sabujbag, Dhaka-1214"
         * or road names such as "Bijoy Sarani".
         * Those are not thana names.
         */

        return "Unknown";
    }

    private String normalizeValidThana(String value) {
        if (isBlank(value)) {
            return "Unknown";
        }

        String normalized = value.trim()
                .replace("_", " ")
                .replace("-", " ")
                .replace(",", " ")
                .replaceAll("\\s+", " ")
                .toLowerCase();

        if (normalized.contains("102 south basabo")
                || normalized.contains("dhaka 1214")
                || normalized.contains("bijoy sarani")
                || normalized.contains("road")
                || normalized.contains("house")
                || normalized.contains("holding")
                || normalized.contains("sector")
                || normalized.contains("block")) {
            return "Unknown";
        }

        if (normalized.equals("gulshan") || normalized.equals("gulsan")) {
            return "Gulshan";
        }

        if (normalized.equals("sher e bangla nagar")
                || normalized.equals("sher bangla nagar")
                || normalized.equals("shere bangla nagar")
                || normalized.equals("sher e bangla")
                || normalized.equals("sher-e-bangla nagar")) {
            return "Sher-e-Bangla Nagar";
        }

        if (normalized.equals("ramna")) {
            return "Ramna";
        }

        if (normalized.equals("sabujbagh")
                || normalized.equals("sabuj bagh")
                || normalized.equals("sabujbag")) {
            return "Sabujbagh";
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

        if (normalized.equals("cantonment")) {
            return "Cantonment";
        }

        return "Unknown";
    }

    private boolean enumNameEquals(Object enumValue, String expectedName) {
        return enumValue != null && expectedName.equalsIgnoreCase(String.valueOf(enumValue));
    }

    private boolean containsIgnoreCase(String value, String expectedText) {
        return value != null && value.toLowerCase().contains(expectedText.toLowerCase());
    }

    private boolean sameText(String first, String second) {
        return first != null && second != null && first.trim().equalsIgnoreCase(second.trim());
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private BigDecimal safeMoney(BigDecimal value) {
        if (value == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal money(BigDecimal value) {
        return safeMoney(value);
    }

    private static class AreaStats {
        private final String area;
        private long requestCount;
        private long collectedRequests;
        private BigDecimal totalRequestedLiter = BigDecimal.ZERO;
        private BigDecimal totalEstimatedCost = BigDecimal.ZERO;

        private AreaStats(String area) {
            this.area = area;
        }

        private BigDecimal getTotalRequestedLiter() {
            return totalRequestedLiter;
        }
    }
}