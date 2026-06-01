package com.crisiscontrol.service;

import com.crisiscontrol.dto.CrisisAssistantRequest;
import com.crisiscontrol.dto.CrisisAssistantResponse;
import com.crisiscontrol.entity.*;
import com.crisiscontrol.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CrisisAssistantService {

    private final UserRepository userRepository;
    private final PumpProfileRepository pumpProfileRepository;
    private final PumpFuelStockRepository pumpFuelStockRepository;
    private final PowerOutageRepository powerOutageRepository;
    private final FuelRequestRepository fuelRequestRepository;
    private final RouteFuelTokenRepository routeFuelTokenRepository;

    public CrisisAssistantResponse ask(CrisisAssistantRequest request) {
        validateRequest(request);

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        String question = request.getQuestion().trim();
        String normalizedQuestion = normalize(question);
        String userArea = resolveUserArea(user);

        String intent = detectIntent(normalizedQuestion);
        String answer;

        switch (intent) {
            case "PUMP_AVAILABILITY" -> answer = answerPumpAvailability(userArea, normalizedQuestion);
            case "OUTAGE_STATUS" -> answer = answerOutageStatus(userArea, normalizedQuestion);
            case "FUEL_REQUEST_STATUS" -> answer = answerLatestFuelRequest(user);
            case "ROUTE_TOKEN_STATUS" -> answer = answerLatestRouteToken(user);
            case "OPEN_PUMP" -> answer = answerOpenPumps(userArea);
            default -> {
                intent = "HELP";
                answer = answerHelp(userArea);
            }
        }

        return CrisisAssistantResponse.builder()
                .intent(intent)
                .answer(answer)
                .userArea(isBlank(userArea) ? "Not Set" : userArea)
                .suggestedQuestions(getSuggestedQuestions())
                .answeredAt(LocalDateTime.now())
                .build();
    }

    public List<String> getSuggestedQuestions() {
        return List.of(
                "Available Octane near me?",
                "Which pump has petrol?",
                "Which pump is open now?",
                "Any diesel available in my area?",
                "Is there loadshedding in my area?",
                "When will power come back?",
                "My latest fuel request status?",
                "My route token status?",
                "Any low stock pump nearby?",
                "What can you help me with?"
        );
    }

    private String detectIntent(String question) {
        if (containsAny(question,
                "octane", "petrol", "diesel", "cng", "fuel", "pump", "available",
                "ase", "ache", "pabo", "stock", "near me", "nearby", "kothay")) {

            if (containsAny(question, "open", "khola", "opened")) {
                return "OPEN_PUMP";
            }

            return "PUMP_AVAILABILITY";
        }

        if (containsAny(question,
                "loadshedding", "load shedding", "outage", "power", "electricity",
                "current", "bidyut", "biddut", "karent", "current nai", "power nai",
                "restoration", "restore", "ashbe", "asbe")) {
            return "OUTAGE_STATUS";
        }

        if (containsAny(question,
                "fuel request", "request status", "approved", "pending", "rejected",
                "collection code", "amar request", "approve hoise")) {
            return "FUEL_REQUEST_STATUS";
        }

        if (containsAny(question,
                "route token", "token", "reservation", "rft", "route fuel",
                "amar token", "active token")) {
            return "ROUTE_TOKEN_STATUS";
        }

        if (containsAny(question, "open pump", "pump open", "khola pump")) {
            return "OPEN_PUMP";
        }

        return "HELP";
    }

    private String answerPumpAvailability(String userArea, String normalizedQuestion) {
        FuelType requestedFuelType = detectFuelType(normalizedQuestion);

        if (requestedFuelType == null) {
            return "Please mention a fuel type, for example: Octane, Petrol, Diesel, or CNG.\n\n"
                    + "Example: Available Octane near me?";
        }

        List<PumpProfile> pumps = pumpProfileRepository.findAllByOrderByUpdatedAtDesc()
                .stream()
                .filter(this::isPumpUsable)
                .filter(pump -> isBlank(userArea) || isPumpNearArea(pump, userArea))
                .toList();

        StringBuilder answer = new StringBuilder();

        if (isBlank(userArea)) {
            answer.append("Your area/thana is not set, so I checked all available pumps.\n\n");
        } else {
            answer.append("I checked pumps near ").append(userArea).append(".\n\n");
        }

        List<PumpFuelResult> results = pumps.stream()
                .map(pump -> buildPumpFuelResult(pump, requestedFuelType))
                .filter(result -> result.usableStock.compareTo(BigDecimal.ZERO) > 0)
                .sorted(Comparator.comparing((PumpFuelResult result) -> result.usableStock).reversed())
                .limit(5)
                .toList();

        if (results.isEmpty()) {
            return answer
                    + "Sorry, I could not find any open pump with usable "
                    + requestedFuelType
                    + " stock"
                    + (isBlank(userArea) ? "." : " near " + userArea + ".")
                    + "\n\nTry checking the Public Pump Transparency page for all areas.";
        }

        answer.append("I found ")
                .append(results.size())
                .append(" pump(s) with usable ")
                .append(requestedFuelType)
                .append(":\n\n");

        int index = 1;

        for (PumpFuelResult result : results) {
            answer.append(index++).append(". ")
                    .append(result.pump.getPumpName()).append("\n")
                    .append("Address: ").append(result.pump.getPumpAddress()).append("\n")
                    .append("Status: ").append(displayPumpStatus(result.pump.getPumpStatus())).append("\n")
                    .append("Usable ").append(requestedFuelType).append(": ")
                    .append(result.usableStock).append(" L\n")
                    .append("Route reserved: ").append(result.reservedStock).append(" L\n\n");
        }

        return answer.toString().trim();
    }

    private String answerOpenPumps(String userArea) {
        List<PumpProfile> pumps = pumpProfileRepository.findAllByOrderByUpdatedAtDesc()
                .stream()
                .filter(this::isPumpUsable)
                .filter(pump -> isBlank(userArea) || isPumpNearArea(pump, userArea))
                .limit(5)
                .toList();

        if (pumps.isEmpty()) {
            return isBlank(userArea)
                    ? "I could not find any open pump right now."
                    : "I could not find any open pump near " + userArea + " right now.";
        }

        StringBuilder answer = new StringBuilder();

        answer.append(isBlank(userArea)
                ? "Open pumps right now:\n\n"
                : "Open pumps near " + userArea + ":\n\n");

        int index = 1;

        for (PumpProfile pump : pumps) {
            BigDecimal totalUsable = getTotalUsableStock(pump);

            answer.append(index++).append(". ")
                    .append(pump.getPumpName()).append("\n")
                    .append("Address: ").append(pump.getPumpAddress()).append("\n")
                    .append("Status: ").append(displayPumpStatus(pump.getPumpStatus())).append("\n")
                    .append("Fuel Types: ").append(pump.getFuelTypes()).append("\n")
                    .append("Total usable stock: ").append(totalUsable).append(" L\n\n");
        }

        return answer.toString().trim();
    }

    private String answerOutageStatus(String userArea, String normalizedQuestion) {
        String areaFromQuestion = extractKnownArea(normalizedQuestion);
        String finalArea = !isBlank(areaFromQuestion) ? areaFromQuestion : userArea;

        if (isBlank(finalArea)) {
            return "Your thana/area is not set. Please update your profile or ask with area name, for example:\n\n"
                    + "Is there loadshedding in Gulshan?";
        }

        List<PowerOutageNotice> notices = powerOutageRepository
                .findByThanaNameIgnoreCaseOrderByCreatedAtDesc(finalArea);

        if (notices.isEmpty()) {
            return "I found no power outage notice for " + finalArea + ".";
        }

        List<PowerOutageNotice> activeNotices = notices.stream()
                .filter(notice -> notice.getStatus() == PowerOutageStatus.ONGOING
                        || notice.getStatus() == PowerOutageStatus.SCHEDULED)
                .limit(3)
                .toList();

        if (activeNotices.isEmpty()) {
            PowerOutageNotice latest = notices.get(0);

            return "No ongoing or scheduled outage found for "
                    + finalArea
                    + ".\n\nLatest notice status: "
                    + latest.getStatus()
                    + "\nProvider: "
                    + latest.getProvider()
                    + "\nLast updated: "
                    + formatDateTime(latest.getUpdatedAt());
        }

        StringBuilder answer = new StringBuilder();

        answer.append("Yes, I found ")
                .append(activeNotices.size())
                .append(" active outage notice(s) for ")
                .append(finalArea)
                .append(":\n\n");

        int index = 1;

        for (PowerOutageNotice notice : activeNotices) {
            answer.append(index++).append(". Status: ").append(notice.getStatus()).append("\n")
                    .append("Provider: ").append(notice.getProvider()).append("\n")
                    .append("City Corporation: ").append(notice.getCityCorporation()).append("\n")
                    .append("Cause: ").append(notice.getCause()).append("\n")
                    .append("Type: ").append(notice.getOutageType()).append("\n")
                    .append("Start: ").append(formatDateTime(notice.getStartDateTime())).append("\n")
                    .append("Expected restoration: ").append(formatDateTime(notice.getExpectedRestorationDateTime())).append("\n")
                    .append("Message: ").append(nullToDash(notice.getEmergencyMessage())).append("\n")
                    .append("Contact: ").append(nullToDash(notice.getContactNumber())).append("\n\n");
        }

        return answer.toString().trim();
    }

    private String answerLatestFuelRequest(User user) {
        List<FuelRequest> requests = fuelRequestRepository.findByUserIdOrderByCreatedAtDesc(user.getId());

        if (requests.isEmpty()) {
            return "I found no fuel request under your account.";
        }

        FuelRequest latest = requests.get(0);

        StringBuilder answer = new StringBuilder();

        answer.append("Your latest fuel request status:\n\n")
                .append("Request ID: ").append(latest.getId()).append("\n")
                .append("Source: ").append(latest.getRequestSource()).append("\n")
                .append("Fuel Type: ").append(latest.getFuelType()).append("\n")
                .append("Requested Liter: ").append(latest.getRequestedLiter()).append(" L\n")
                .append("Status: ").append(latest.getRequestStatus()).append("\n")
                .append("Estimated Cost: ").append(latest.getEstimatedCost()).append(" BDT\n");

        if (latest.getPumpProfile() != null) {
            answer.append("Assigned Pump: ").append(latest.getPumpProfile().getPumpName()).append("\n");
        }

        if (!isBlank(latest.getCollectionCode())) {
            answer.append("Collection Code: ").append(latest.getCollectionCode()).append("\n");
        }

        if (latest.getCollectedAt() != null) {
            answer.append("Collected At: ").append(formatDateTime(latest.getCollectedAt())).append("\n");
        }

        return answer.toString().trim();
    }

    private String answerLatestRouteToken(User user) {
        List<RouteFuelToken> tokens = routeFuelTokenRepository.findByUserIdOrderByCreatedAtDesc(user.getId());

        if (tokens.isEmpty()) {
            return "I found no route fuel token under your account.";
        }

        RouteFuelToken latest = tokens.get(0);

        StringBuilder answer = new StringBuilder();

        answer.append("Your latest route fuel token:\n\n")
                .append("Token: ").append(latest.getTokenCode()).append("\n")
                .append("Route: ").append(latest.getSourceCity()).append(" → ").append(latest.getDestinationCity()).append("\n")
                .append("Fuel Type: ").append(latest.getFuelType()).append("\n")
                .append("Reserved Fuel: ").append(latest.getReservedLiter()).append(" L\n")
                .append("Estimated Cost: ").append(latest.getEstimatedCost()).append(" BDT\n")
                .append("Status: ").append(latest.getStatus()).append("\n")
                .append("Valid Until: ").append(formatDateTime(latest.getValidUntil())).append("\n");

        if (latest.getPumpProfile() != null) {
            answer.append("Assigned Pump: ").append(latest.getPumpProfile().getPumpName()).append("\n")
                    .append("Pump Address: ").append(latest.getPumpProfile().getPumpAddress()).append("\n");
        }

        if (latest.getUsedAt() != null) {
            answer.append("Used At: ").append(formatDateTime(latest.getUsedAt())).append("\n");
        }

        return answer.toString().trim();
    }

    private String answerHelp(String userArea) {
        return "I am your AI Crisis Assistant. I can answer from the system database.\n\n"
                + "Your detected area: "
                + (isBlank(userArea) ? "Not Set" : userArea)
                + "\n\nYou can ask:\n"
                + "- Available Octane near me?\n"
                + "- Which pump has petrol?\n"
                + "- Which pump is open now?\n"
                + "- Is there loadshedding in my area?\n"
                + "- When will power come back?\n"
                + "- My latest fuel request status?\n"
                + "- My route token status?";
    }

    private PumpFuelResult buildPumpFuelResult(PumpProfile pump, FuelType fuelType) {
        BigDecimal currentStock = pumpFuelStockRepository.findByPumpProfileIdOrderByFuelTypeAsc(pump.getId())
                .stream()
                .filter(stock -> stock.getFuelType() == fuelType)
                .map(PumpFuelStock::getCurrentStock)
                .filter(value -> value != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal reservedStock = routeFuelTokenRepository
                .findByPumpProfileIdAndFuelTypeAndStatusOrderByCreatedAtDesc(
                        pump.getId(),
                        fuelType,
                        RouteFuelTokenStatus.ACTIVE
                )
                .stream()
                .filter(token -> token.getValidUntil() != null)
                .filter(token -> token.getValidUntil().isAfter(LocalDateTime.now()))
                .map(RouteFuelToken::getReservedLiter)
                .filter(value -> value != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal usableStock = currentStock.subtract(reservedStock).setScale(2, RoundingMode.HALF_UP);

        if (usableStock.compareTo(BigDecimal.ZERO) < 0) {
            usableStock = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        return new PumpFuelResult(pump, currentStock, reservedStock, usableStock);
    }

    private BigDecimal getTotalUsableStock(PumpProfile pump) {
        return pumpFuelStockRepository.findByPumpProfileIdOrderByFuelTypeAsc(pump.getId())
                .stream()
                .map(stock -> buildPumpFuelResult(pump, stock.getFuelType()).usableStock)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private FuelType detectFuelType(String question) {
        if (containsAny(question, "octane", "okten", "octen")) {
            return FuelType.OCTANE;
        }

        if (containsAny(question, "petrol", "gasoline")) {
            return FuelType.PETROL;
        }

        if (containsAny(question, "diesel", "disel", "dijel")) {
            return FuelType.DIESEL;
        }

        if (containsAny(question, "cng", "gas")) {
            return FuelType.CNG;
        }

        return null;
    }

    private boolean isPumpUsable(PumpProfile pump) {
        return pump != null
                && (
                pump.getPumpStatus() == PumpStatus.OPEN
                        || pump.getPumpStatus() == PumpStatus.OPEN_WITH_DEBT
        );
    }

    private boolean isPumpNearArea(PumpProfile pump, String area) {
        if (isBlank(area)) {
            return true;
        }

        String normalizedArea = normalizeArea(area);
        String pumpAddress = normalizeArea(pump.getPumpAddress());

        String pumpUserThana = "";

        if (pump.getUser() != null) {
            pumpUserThana = normalizeArea(resolveUserArea(pump.getUser()));
        }

        return pumpAddress.contains(normalizedArea)
                || pumpUserThana.equals(normalizedArea)
                || normalizedArea.contains(pumpUserThana);
    }

    private String resolveUserArea(User user) {
        if (user == null) {
            return "";
        }

        if (!isBlank(user.getThanaOrUpazila())) {
            return cleanArea(user.getThanaOrUpazila());
        }

        if (!isBlank(user.getBuildingUnderThana())) {
            return cleanArea(user.getBuildingUnderThana());
        }

        if (!isBlank(user.getHospitalUnderThana())) {
            return cleanArea(user.getHospitalUnderThana());
        }

        if (!isBlank(user.getServiceArea())) {
            return cleanArea(user.getServiceArea());
        }

        if (!isBlank(user.getAssignedArea())) {
            return cleanArea(user.getAssignedArea());
        }

        if (!isBlank(user.getPumpAddress())) {
            return cleanArea(user.getPumpAddress());
        }

        return "";
    }

    private String extractKnownArea(String question) {
        if (question.contains("gulshan") || question.contains("gulsan")) {
            return "Gulshan";
        }

        if (question.contains("sabujbagh")
                || question.contains("sabujbag")
                || question.contains("basabo")
                || question.contains("bashabo")
                || question.contains("south basabo")) {
            return "Sabujbagh";
        }

        if (question.contains("mirpur")) {
            return "Mirpur";
        }

        if (question.contains("ramna")) {
            return "Ramna";
        }

        if (question.contains("tejgaon")) {
            return "Tejgaon";
        }

        if (question.contains("sher-e-bangla") || question.contains("sherebangla")) {
            return "Sher-e-Bangla Nagar";
        }

        return "";
    }

    private String cleanArea(String value) {
        if (value == null) {
            return "";
        }

        String normalized = normalizeArea(value);

        if (normalized.equals("gulsan") || normalized.equals("gulshan")) {
            return "Gulshan";
        }

        if (normalized.equals("basabo")
                || normalized.equals("bashabo")
                || normalized.equals("southbasabo")
                || normalized.equals("northbasabo")
                || normalized.equals("sabujbag")
                || normalized.equals("sabujbagh")) {
            return "Sabujbagh";
        }

        if (normalized.equals("sherebanglanagar")
                || normalized.equals("sherebangla")
                || normalized.equals("sherabanglanagar")) {
            return "Sher-e-Bangla Nagar";
        }

        return value.trim();
    }

    private String displayPumpStatus(PumpStatus status) {
        if (status == null) {
            return "-";
        }

        if (status == PumpStatus.OPEN_WITH_DEBT) {
            return "OPEN ON DEBT";
        }

        return status.name().replace("_", " ");
    }

    private boolean containsAny(String value, String... keywords) {
        if (value == null) {
            return false;
        }

        for (String keyword : keywords) {
            if (value.contains(keyword.toLowerCase())) {
                return true;
            }
        }

        return false;
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }

        return value.trim().toLowerCase();
    }

    private String normalizeArea(String value) {
        if (value == null) {
            return "";
        }

        return value.trim()
                .replace("-", "")
                .replace("_", "")
                .replaceAll("\\s+", "")
                .toLowerCase();
    }

    private String formatDateTime(LocalDateTime value) {
        if (value == null) {
            return "-";
        }

        return value.toString().replace("T", " ");
    }

    private String nullToDash(String value) {
        return isBlank(value) ? "-" : value;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private void validateRequest(CrisisAssistantRequest request) {
        if (request == null) {
            throw new RuntimeException("Assistant request is required");
        }

        if (request.getUserId() == null) {
            throw new RuntimeException("User ID is required");
        }

        if (isBlank(request.getQuestion())) {
            throw new RuntimeException("Question cannot be empty");
        }

        if (request.getQuestion().trim().length() > 1000) {
            throw new RuntimeException("Question cannot exceed 1000 characters");
        }
    }

    private record PumpFuelResult(
            PumpProfile pump,
            BigDecimal currentStock,
            BigDecimal reservedStock,
            BigDecimal usableStock
    ) {
    }
}