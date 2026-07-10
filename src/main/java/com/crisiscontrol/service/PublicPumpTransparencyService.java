package com.crisiscontrol.service;

import com.crisiscontrol.dto.PublicPumpFuelStockResponse;
import com.crisiscontrol.dto.PublicPumpTransparencyResponse;
import com.crisiscontrol.dto.PublicPumpTransparencySummaryResponse;
import com.crisiscontrol.entity.FuelType;
import com.crisiscontrol.entity.PaymentPurpose;
import com.crisiscontrol.entity.PaymentRecord;
import com.crisiscontrol.entity.PaymentRecordStatus;
import com.crisiscontrol.entity.PumpFuelStock;
import com.crisiscontrol.entity.PumpProfile;
import com.crisiscontrol.entity.PumpStatus;
import com.crisiscontrol.entity.RouteFuelToken;
import com.crisiscontrol.entity.RouteFuelTokenStatus;
import com.crisiscontrol.entity.User;
import com.crisiscontrol.repository.PaymentRecordRepository;
import com.crisiscontrol.repository.PumpFuelStockRepository;
import com.crisiscontrol.repository.PumpProfileRepository;
import com.crisiscontrol.repository.RouteFuelTokenRepository;
import com.crisiscontrol.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;


import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PublicPumpTransparencyService {

    private static final BigDecimal LOW_STOCK_PERCENT = BigDecimal.valueOf(20);

    private final PumpProfileRepository pumpProfileRepository;
    private final PumpFuelStockRepository pumpFuelStockRepository;
    private final RouteFuelTokenRepository routeFuelTokenRepository;
    private final PaymentRecordRepository paymentRecordRepository;
    private final UserRepository userRepository;

    public PublicPumpTransparencySummaryResponse getSummary(Long userId, String role) {
        List<PublicPumpTransparencyResponse> pumps = getPumps(userId, role);

        int totalPumps = pumps.size();
        int openPumps = 0;
        int openWithDebtPumps = 0;
        int closedPumps = 0;
        int penaltyLockedPumps = 0;
        int lowStockPumps = 0;

        BigDecimal totalCapacity = BigDecimal.ZERO;
        BigDecimal totalCurrentStock = BigDecimal.ZERO;
        BigDecimal totalReserved = BigDecimal.ZERO;
        BigDecimal totalUsable = BigDecimal.ZERO;
        BigDecimal totalEmpty = BigDecimal.ZERO;

        BigDecimal todayFuelSold = BigDecimal.ZERO;
        BigDecimal todayCash = BigDecimal.ZERO;
        BigDecimal todayBkash = BigDecimal.ZERO;
        BigDecimal todayCollection = BigDecimal.ZERO;

        for (PublicPumpTransparencyResponse pump : pumps) {
            if (pump.getPumpStatus() == PumpStatus.OPEN) {
                openPumps++;
            } else if (pump.getPumpStatus() == PumpStatus.OPEN_WITH_DEBT) {
                openWithDebtPumps++;
            } else if (pump.getPumpStatus() == PumpStatus.CLOSED) {
                closedPumps++;
            } else if (pump.getPumpStatus() == PumpStatus.PENALTY_LOCKED) {
                penaltyLockedPumps++;
            }

            if (Boolean.TRUE.equals(pump.getLowStock())) {
                lowStockPumps++;
            }

            totalCapacity = totalCapacity.add(safeMoney(pump.getTotalCapacity()));
            totalCurrentStock = totalCurrentStock.add(safeMoney(pump.getTotalCurrentStock()));
            totalReserved = totalReserved.add(safeMoney(pump.getTotalRouteReservedStock()));
            totalUsable = totalUsable.add(safeMoney(pump.getTotalUsableStock()));
            totalEmpty = totalEmpty.add(safeMoney(pump.getTotalEmptySpace()));

            todayFuelSold = todayFuelSold.add(safeMoney(pump.getTodayTotalFuelSold()));
            todayCash = todayCash.add(safeMoney(pump.getTodayCashCollection()));
            todayBkash = todayBkash.add(safeMoney(pump.getTodayBkashCollection()));
            todayCollection = todayCollection.add(safeMoney(pump.getTodayTotalCollection()));
        }

        return PublicPumpTransparencySummaryResponse.builder()
                .totalPumps(totalPumps)
                .openPumps(openPumps)
                .openWithDebtPumps(openWithDebtPumps)
                .closedPumps(closedPumps)
                .penaltyLockedPumps(penaltyLockedPumps)
                .lowStockPumps(lowStockPumps)
                .totalCapacity(formatMoney(totalCapacity))
                .totalCurrentStock(formatMoney(totalCurrentStock))
                .totalRouteReservedStock(formatMoney(totalReserved))
                .totalUsableStock(formatMoney(totalUsable))
                .totalEmptySpace(formatMoney(totalEmpty))
                .todayFuelSold(formatMoney(todayFuelSold))
                .todayCashCollection(formatMoney(todayCash))
                .todayBkashCollection(formatMoney(todayBkash))
                .todayTotalCollection(formatMoney(todayCollection))
                .generatedAt(LocalDateTime.now())
                .build();
    }

    public List<PublicPumpTransparencyResponse> getPumps(Long userId, String role) {
        List<PumpProfile> pumps = pumpProfileRepository.findAllByOrderByUpdatedAtDesc();

        if (isLocalAuthority(role) && userId != null) {
            String localThana = userRepository.findById(userId)
                    .map(User::getThanaOrUpazila)
                    .orElse("");

            pumps = pumps.stream()
                    .filter(pump -> belongsToLocalThana(pump, localThana))
                    .toList();
        }

        return pumps.stream()
                .map(this::mapPump)
                .toList();
    }

    public PublicPumpTransparencyResponse getPumpDetails(Long pumpId) {
        PumpProfile pump = pumpProfileRepository.findById(pumpId)
                .orElseThrow(() -> new RuntimeException("Pump profile not found"));

        return mapPump(pump);
    }

    private PublicPumpTransparencyResponse mapPump(PumpProfile pump) {
        List<PumpFuelStock> stocks = pumpFuelStockRepository.findByPumpProfileIdOrderByFuelTypeAsc(pump.getId());

        List<PublicPumpFuelStockResponse> stockResponses = stocks.stream()
                .map(stock -> mapStock(pump.getId(), stock))
                .toList();

        BigDecimal totalCapacity = BigDecimal.ZERO;
        BigDecimal totalCurrentStock = BigDecimal.ZERO;
        BigDecimal totalReserved = BigDecimal.ZERO;
        BigDecimal totalUsable = BigDecimal.ZERO;
        BigDecimal totalEmpty = BigDecimal.ZERO;

        boolean lowStock = false;

        for (PublicPumpFuelStockResponse stock : stockResponses) {
            totalCapacity = totalCapacity.add(safeMoney(stock.getFuelCapacity()));
            totalCurrentStock = totalCurrentStock.add(safeMoney(stock.getCurrentStock()));
            totalReserved = totalReserved.add(safeMoney(stock.getRouteReservedStock()));
            totalUsable = totalUsable.add(safeMoney(stock.getUsableStock()));
            totalEmpty = totalEmpty.add(safeMoney(stock.getEmptySpace()));

            if (Boolean.TRUE.equals(stock.getLowStock())) {
                lowStock = true;
            }
        }

        TodayPaymentSummary today = calculateTodayPaymentSummary(pump.getId());

        return PublicPumpTransparencyResponse.builder()
                .pumpId(pump.getId())
                .pumpName(valueOrDash(pump.getPumpName()))
                .pumpAddress(valueOrDash(pump.getPumpAddress()))
                .pumpThana(resolvePumpThana(pump))
                .ownerName(pump.getUser() == null ? "-" : valueOrDash(pump.getUser().getFullName()))
                .phoneNumber(pump.getUser() == null ? "-" : valueOrDash(pump.getUser().getPhoneNumber()))
                .fuelTypes(valueOrDash(pump.getFuelTypes()))
                .pumpStatus(pump.getPumpStatus())
                .displayStatus(displayPumpStatus(pump.getPumpStatus()))
                .open24Hours(Boolean.TRUE.equals(pump.getOpen24Hours()))
                .openingTime(valueOrDash(pump.getOpeningTime()))
                .closingTime(valueOrDash(pump.getClosingTime()))
                .totalCapacity(formatMoney(totalCapacity))
                .totalCurrentStock(formatMoney(totalCurrentStock))
                .totalRouteReservedStock(formatMoney(totalReserved))
                .totalUsableStock(formatMoney(totalUsable))
                .totalEmptySpace(formatMoney(totalEmpty))
                .lowStock(lowStock)
                .todayNormalFuelSold(formatMoney(today.normalFuelSold))
                .todayRouteTokenFuelSold(formatMoney(today.routeTokenFuelSold))
                .todayTotalFuelSold(formatMoney(today.normalFuelSold.add(today.routeTokenFuelSold)))
                .todayCashCollection(formatMoney(today.cashCollection))
                .todayBkashCollection(formatMoney(today.bkashCollection))
                .todayTotalCollection(formatMoney(today.totalCollection))
                .todayNormalCollections(today.normalCollections)
                .todayRouteTokenCollections(today.routeTokenCollections)
                .todayTotalCollections(today.normalCollections + today.routeTokenCollections)
                .fuelStocks(stockResponses)
                .build();
    }

    private PublicPumpFuelStockResponse mapStock(Long pumpId, PumpFuelStock stock) {
        BigDecimal capacity = safeMoney(stock.getFuelCapacity());
        BigDecimal currentStock = safeMoney(stock.getCurrentStock());
        BigDecimal reserved = getActiveReservedStock(pumpId, stock.getFuelType());

        BigDecimal usable = currentStock.subtract(reserved).setScale(2, RoundingMode.HALF_UP);

        if (usable.compareTo(BigDecimal.ZERO) < 0) {
            usable = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal emptySpace = capacity.subtract(currentStock).setScale(2, RoundingMode.HALF_UP);

        if (emptySpace.compareTo(BigDecimal.ZERO) < 0) {
            emptySpace = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal stockPercentage = BigDecimal.ZERO;

        if (capacity.compareTo(BigDecimal.ZERO) > 0) {
            stockPercentage = usable
                    .multiply(BigDecimal.valueOf(100))
                    .divide(capacity, 2, RoundingMode.HALF_UP);
        }

        boolean lowStock = stockPercentage.compareTo(LOW_STOCK_PERCENT) <= 0;

        return PublicPumpFuelStockResponse.builder()
                .fuelType(stock.getFuelType())
                .fuelCapacity(formatMoney(capacity))
                .currentStock(formatMoney(currentStock))
                .routeReservedStock(formatMoney(reserved))
                .usableStock(formatMoney(usable))
                .emptySpace(formatMoney(emptySpace))
                .stockPercentage(formatMoney(stockPercentage))
                .lowStock(lowStock)
                .build();
    }

    private BigDecimal getActiveReservedStock(Long pumpId, FuelType fuelType) {
        return routeFuelTokenRepository
                .findByPumpProfileIdAndFuelTypeAndStatusOrderByCreatedAtDesc(
                        pumpId,
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
    }

    /*
     * PaymentRecord is now the single source of truth for payment transparency.
     * Fuel sold is still calculated from linked FuelRequest / RouteFuelToken.
     */
    private TodayPaymentSummary calculateTodayPaymentSummary(Long pumpId) {
        LocalDate today = LocalDate.now();
        LocalDateTime start = today.atStartOfDay();
        LocalDateTime end = start.plusDays(1);

        List<PaymentRecord> records =
                paymentRecordRepository.findByPumpProfileIdAndRecordedAtBetweenOrderByRecordedAtDesc(
                        pumpId,
                        start,
                        end
                );

        TodayPaymentSummary summary = new TodayPaymentSummary();

        for (PaymentRecord record : records) {
            if (record.getStatus() != PaymentRecordStatus.RECORDED) {
                continue;
            }

            summary.cashCollection = summary.cashCollection.add(safeMoney(record.getCashAmountBdt()));
            summary.bkashCollection = summary.bkashCollection.add(safeMoney(record.getBkashAmountBdt()));
            summary.totalCollection = summary.totalCollection.add(safeMoney(record.getPaidAmountBdt()));

            if (record.getPaymentPurpose() == PaymentPurpose.NORMAL_FUEL_REQUEST) {
                summary.normalCollections++;

                if (record.getFuelRequest() != null) {
                    summary.normalFuelSold = summary.normalFuelSold.add(
                            safeMoney(record.getFuelRequest().getRequestedLiter())
                    );
                }
            }

            if (record.getPaymentPurpose() == PaymentPurpose.ROUTE_FUEL_TOKEN) {
                summary.routeTokenCollections++;

                if (record.getRouteFuelToken() != null) {
                    summary.routeTokenFuelSold = summary.routeTokenFuelSold.add(
                            safeMoney(record.getRouteFuelToken().getReservedLiter())
                    );
                }
            }
        }

        return summary;
    }

    private boolean belongsToLocalThana(PumpProfile pump, String localThana) {
        if (localThana == null || localThana.trim().isEmpty()) {
            return false;
        }

        String normalizedLocal = normalizeArea(cleanArea(localThana));
        String pumpThana = normalizeArea(cleanArea(resolvePumpThana(pump)));
        String pumpAddress = normalizeArea(cleanArea(pump.getPumpAddress()));

        return pumpThana.equals(normalizedLocal) || pumpAddress.contains(normalizedLocal);
    }

    private String resolvePumpThana(PumpProfile pump) {
        if (pump == null || pump.getUser() == null) {
            return "-";
        }

        if (!isBlank(pump.getUser().getThanaOrUpazila())) {
            return cleanArea(pump.getUser().getThanaOrUpazila());
        }

        return "-";
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

    private boolean isLocalAuthority(String role) {
        return "LOCAL_AUTHORITY".equalsIgnoreCase(valueOrDash(role));
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

    private BigDecimal safeMoney(BigDecimal value) {
        if (value == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal formatMoney(BigDecimal value) {
        return safeMoney(value);
    }

    private String valueOrDash(String value) {
        if (value == null || value.trim().isEmpty()) {
            return "-";
        }

        return value.trim();
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

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private static class TodayPaymentSummary {
        private BigDecimal normalFuelSold = BigDecimal.ZERO;
        private BigDecimal routeTokenFuelSold = BigDecimal.ZERO;
        private BigDecimal cashCollection = BigDecimal.ZERO;
        private BigDecimal bkashCollection = BigDecimal.ZERO;
        private BigDecimal totalCollection = BigDecimal.ZERO;
        private int normalCollections = 0;
        private int routeTokenCollections = 0;
    }
}