package com.crisiscontrol.service;

import com.crisiscontrol.dto.PublicPumpFuelStockResponse;
import com.crisiscontrol.dto.PublicPumpTransparencyResponse;
import com.crisiscontrol.dto.PublicPumpTransparencySummaryResponse;
import com.crisiscontrol.entity.*;
import com.crisiscontrol.repository.FuelRequestRepository;
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
    private final FuelRequestRepository fuelRequestRepository;
    private final RouteFuelTokenRepository routeFuelTokenRepository;
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

        TodayCollection today = calculateTodayCollection(pump.getId());

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
                .todayTotalCollection(formatMoney(today.cashCollection.add(today.bkashCollection)))
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

    private TodayCollection calculateTodayCollection(Long pumpId) {
        LocalDate today = LocalDate.now();
        LocalDateTime start = today.atStartOfDay();
        LocalDateTime end = start.plusDays(1);

        List<FuelRequest> normalCollections =
                fuelRequestRepository.findByPumpProfileIdAndRequestStatusAndCollectedAtBetweenOrderByCollectedAtDesc(
                        pumpId,
                        FuelRequestStatus.COLLECTED,
                        start,
                        end
                );

        List<RouteFuelToken> routeTokenCollections =
                routeFuelTokenRepository.findByPumpProfileIdAndStatusAndUsedAtBetweenOrderByUsedAtDesc(
                        pumpId,
                        RouteFuelTokenStatus.USED,
                        start,
                        end
                );

        TodayCollection todayCollection = new TodayCollection();

        todayCollection.normalCollections = normalCollections.size();
        todayCollection.routeTokenCollections = routeTokenCollections.size();

        for (FuelRequest request : normalCollections) {
            todayCollection.normalFuelSold = todayCollection.normalFuelSold.add(safeMoney(request.getRequestedLiter()));

            if ("CASH".equalsIgnoreCase(valueOrDash(request.getPaymentMethod()))) {
                todayCollection.cashCollection = todayCollection.cashCollection.add(safeMoney(request.getPaidAmountBdt()));
            }

            if ("BKASH".equalsIgnoreCase(valueOrDash(request.getPaymentMethod()))) {
                todayCollection.bkashCollection = todayCollection.bkashCollection.add(safeMoney(request.getPaidAmountBdt()));
            }
        }

        for (RouteFuelToken token : routeTokenCollections) {
            todayCollection.routeTokenFuelSold = todayCollection.routeTokenFuelSold.add(safeMoney(token.getReservedLiter()));

            if ("CASH".equalsIgnoreCase(valueOrDash(token.getPaymentMethod()))) {
                todayCollection.cashCollection = todayCollection.cashCollection.add(safeMoney(token.getPaidAmountBdt()));
            }

            if ("BKASH".equalsIgnoreCase(valueOrDash(token.getPaymentMethod()))) {
                todayCollection.bkashCollection = todayCollection.bkashCollection.add(safeMoney(token.getPaidAmountBdt()));
            }
        }

        return todayCollection;
    }

    private boolean belongsToLocalThana(PumpProfile pump, String localThana) {
        if (localThana == null || localThana.trim().isEmpty()) {
            return false;
        }

        String normalizedLocal = normalizeArea(localThana);
        String pumpThana = normalizeArea(resolvePumpThana(pump));
        String pumpAddress = normalizeArea(pump.getPumpAddress());

        return pumpThana.equals(normalizedLocal) || pumpAddress.contains(normalizedLocal);
    }

    private String resolvePumpThana(PumpProfile pump) {
        if (pump == null || pump.getUser() == null) {
            return "-";
        }

        if (!isBlank(pump.getUser().getThanaOrUpazila())) {
            return pump.getUser().getThanaOrUpazila();
        }

        return "-";
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

    private static class TodayCollection {
        private BigDecimal normalFuelSold = BigDecimal.ZERO;
        private BigDecimal routeTokenFuelSold = BigDecimal.ZERO;
        private BigDecimal cashCollection = BigDecimal.ZERO;
        private BigDecimal bkashCollection = BigDecimal.ZERO;
        private int normalCollections = 0;
        private int routeTokenCollections = 0;
    }
}