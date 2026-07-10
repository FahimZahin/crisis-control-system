package com.crisiscontrol.service;

import com.crisiscontrol.dto.PaymentRecordResponse;
import com.crisiscontrol.dto.PaymentSummaryResponse;
import com.crisiscontrol.entity.*;
import com.crisiscontrol.repository.GovernmentPenaltyLedgerRepository;
import com.crisiscontrol.repository.PaymentRecordRepository;
import com.crisiscontrol.repository.PumpProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PaymentRecordService {

    private final PaymentRecordRepository paymentRecordRepository;
    private final PumpProfileRepository pumpProfileRepository;
    private final GovernmentPenaltyLedgerRepository governmentPenaltyLedgerRepository;

    @Transactional
    public PaymentRecord recordFuelRequestPayment(FuelRequest fuelRequest) {
        if (fuelRequest == null || fuelRequest.getId() == null) {
            throw new RuntimeException("Fuel request is required for payment record");
        }

        if (paymentRecordRepository.existsByFuelRequestIdAndPaymentPurpose(
                fuelRequest.getId(),
                PaymentPurpose.NORMAL_FUEL_REQUEST
        )) {
            return paymentRecordRepository.findAll()
                    .stream()
                    .filter(record -> record.getFuelRequest() != null)
                    .filter(record -> record.getFuelRequest().getId().equals(fuelRequest.getId()))
                    .filter(record -> record.getPaymentPurpose() == PaymentPurpose.NORMAL_FUEL_REQUEST)
                    .findFirst()
                    .orElse(null);
        }

        String method = clean(fuelRequest.getPaymentMethod()).toUpperCase();

        BigDecimal paidAmount = safeMoney(fuelRequest.getPaidAmountBdt());

        BigDecimal cashAmount = BigDecimal.ZERO;
        BigDecimal bkashAmount = BigDecimal.ZERO;

        if ("CASH".equalsIgnoreCase(method)) {
            cashAmount = paidAmount;
        }

        if ("BKASH".equalsIgnoreCase(method)) {
            bkashAmount = paidAmount;
        }

        /*
         * Permanent rule:
         * If the pump has active outstanding government penalty debt,
         * fuel-sale income goes to government recovery first.
         * Only the extra amount after clearing debt can be kept by pump.
         */
        PaymentSplit split = calculatePaymentSplit(fuelRequest.getPumpProfile(), paidAmount);

        if (split.governmentRecoveryAmount.compareTo(BigDecimal.ZERO) > 0
                && fuelRequest.getPumpProfile() != null) {
            applyGovernmentRecoveryToPenaltyLedgers(
                    fuelRequest.getPumpProfile().getId(),
                    split.governmentRecoveryAmount
            );
        }

        PaymentRecord record = PaymentRecord.builder()
                .user(fuelRequest.getUser())
                .pumpProfile(fuelRequest.getPumpProfile())
                .fuelRequest(fuelRequest)
                .routeFuelToken(null)
                .paymentPurpose(PaymentPurpose.NORMAL_FUEL_REQUEST)
                .paymentMethod(isBlank(method) ? "UNKNOWN" : method)
                .bkashTransactionId(cleanOptional(fuelRequest.getBkashTransactionId()))
                .cashAmountBdt(cashAmount)
                .bkashAmountBdt(bkashAmount)
                .paidAmountBdt(paidAmount)
                .governmentRecoveryAmountBdt(split.governmentRecoveryAmount)
                .pumpKeptAmountBdt(split.pumpKeptAmount)
                .description("Payment recorded for normal fuel request ID: " + fuelRequest.getId())
                .status(PaymentRecordStatus.RECORDED)
                .recordedAt(fuelRequest.getPaymentRecordedAt() == null
                        ? LocalDateTime.now()
                        : fuelRequest.getPaymentRecordedAt())
                .build();

        return paymentRecordRepository.save(record);
    }

    @Transactional
    public PaymentRecord recordRouteFuelTokenPayment(RouteFuelToken token) {
        if (token == null || token.getId() == null) {
            throw new RuntimeException("Route fuel token is required for payment record");
        }

        if (paymentRecordRepository.existsByRouteFuelTokenIdAndPaymentPurpose(
                token.getId(),
                PaymentPurpose.ROUTE_FUEL_TOKEN
        )) {
            return paymentRecordRepository.findAll()
                    .stream()
                    .filter(record -> record.getRouteFuelToken() != null)
                    .filter(record -> record.getRouteFuelToken().getId().equals(token.getId()))
                    .filter(record -> record.getPaymentPurpose() == PaymentPurpose.ROUTE_FUEL_TOKEN)
                    .findFirst()
                    .orElse(null);
        }

        String method = clean(token.getPaymentMethod()).toUpperCase();

        BigDecimal paidAmount = safeMoney(token.getPaidAmountBdt());

        BigDecimal cashAmount = BigDecimal.ZERO;
        BigDecimal bkashAmount = BigDecimal.ZERO;

        if ("CASH".equalsIgnoreCase(method)) {
            cashAmount = paidAmount;
        }

        if ("BKASH".equalsIgnoreCase(method)) {
            bkashAmount = paidAmount;
        }

        /*
         * Permanent rule:
         * Do not depend only on pump_profiles.pump_status.
         * If government_penalty_ledgers has outstanding debt,
         * route-token payment goes to government recovery first.
         */
        PaymentSplit split = calculatePaymentSplit(token.getPumpProfile(), paidAmount);

        if (split.governmentRecoveryAmount.compareTo(BigDecimal.ZERO) > 0
                && token.getPumpProfile() != null) {
            applyGovernmentRecoveryToPenaltyLedgers(
                    token.getPumpProfile().getId(),
                    split.governmentRecoveryAmount
            );
        }

        PaymentRecord record = PaymentRecord.builder()
                .user(token.getUser())
                .pumpProfile(token.getPumpProfile())
                .fuelRequest(null)
                .routeFuelToken(token)
                .paymentPurpose(PaymentPurpose.ROUTE_FUEL_TOKEN)
                .paymentMethod(isBlank(method) ? "UNKNOWN" : method)
                .bkashTransactionId(cleanOptional(token.getBkashTransactionId()))
                .cashAmountBdt(cashAmount)
                .bkashAmountBdt(bkashAmount)
                .paidAmountBdt(paidAmount)
                .governmentRecoveryAmountBdt(split.governmentRecoveryAmount)
                .pumpKeptAmountBdt(split.pumpKeptAmount)
                .description("Payment recorded for route fuel token: " + token.getTokenCode())
                .status(PaymentRecordStatus.RECORDED)
                .recordedAt(token.getUsedAt() == null ? LocalDateTime.now() : token.getUsedAt())
                .build();

        return paymentRecordRepository.save(record);
    }

    public List<PaymentRecordResponse> getAllPayments() {
        return paymentRecordRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<PaymentRecordResponse> getPaymentsByUser(Long userId) {
        return paymentRecordRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<PaymentRecordResponse> getPaymentsByPump(Long pumpId) {
        return paymentRecordRepository.findByPumpProfileIdOrderByCreatedAtDesc(pumpId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<PaymentRecordResponse> getPaymentsByPumpUser(Long pumpUserId) {
        PumpProfile pump = pumpProfileRepository.findByUserId(pumpUserId)
                .orElseThrow(() -> new RuntimeException("Pump profile not found"));

        return getPaymentsByPump(pump.getId());
    }

    public PaymentSummaryResponse getTodaySummary() {
        LocalDate today = LocalDate.now();
        LocalDateTime start = today.atStartOfDay();
        LocalDateTime end = start.plusDays(1);

        List<PaymentRecord> records = paymentRecordRepository.findByRecordedAtBetweenOrderByRecordedAtDesc(
                start,
                end
        );

        return buildSummary(records);
    }

    public PaymentSummaryResponse getPumpTodaySummary(Long pumpId) {
        LocalDate today = LocalDate.now();
        LocalDateTime start = today.atStartOfDay();
        LocalDateTime end = start.plusDays(1);

        List<PaymentRecord> records =
                paymentRecordRepository.findByPumpProfileIdAndRecordedAtBetweenOrderByRecordedAtDesc(
                        pumpId,
                        start,
                        end
                );

        return buildSummary(records);
    }

    public PaymentSummaryResponse getPumpUserTodaySummary(Long pumpUserId) {
        PumpProfile pump = pumpProfileRepository.findByUserId(pumpUserId)
                .orElseThrow(() -> new RuntimeException("Pump profile not found"));

        return getPumpTodaySummary(pump.getId());
    }

    private PaymentSplit calculatePaymentSplit(PumpProfile pump, BigDecimal paidAmount) {
        BigDecimal cleanPaidAmount = safeMoney(paidAmount);

        if (cleanPaidAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return new PaymentSplit(
                    BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
                    BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
            );
        }

        if (pump == null || pump.getId() == null) {
            return new PaymentSplit(
                    BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
                    cleanPaidAmount
            );
        }

        BigDecimal outstandingDebt = getActiveOutstandingDebt(pump.getId());

        /*
         * Main source of truth: government_penalty_ledgers outstanding amount.
         */
        if (outstandingDebt.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal governmentRecovery = cleanPaidAmount.min(outstandingDebt).setScale(2, RoundingMode.HALF_UP);
            BigDecimal pumpKept = cleanPaidAmount.subtract(governmentRecovery).setScale(2, RoundingMode.HALF_UP);

            if (pumpKept.compareTo(BigDecimal.ZERO) < 0) {
                pumpKept = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
            }

            return new PaymentSplit(governmentRecovery, pumpKept);
        }

        /*
         * Fallback: if status is OPEN_WITH_DEBT but ledger is missing,
         * still send money to government recovery for safety.
         */
        if (pump.getPumpStatus() == PumpStatus.OPEN_WITH_DEBT) {
            return new PaymentSplit(
                    cleanPaidAmount,
                    BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
            );
        }

        return new PaymentSplit(
                BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
                cleanPaidAmount
        );
    }

    private BigDecimal getActiveOutstandingDebt(Long pumpId) {
        if (pumpId == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        return governmentPenaltyLedgerRepository.findByPumpProfileIdOrderByCreatedAtDesc(pumpId)
                .stream()
                .filter(this::isRecoverableLedger)
                .map(GovernmentPenaltyLedger::getOutstandingAmount)
                .filter(value -> value != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private boolean isRecoverableLedger(GovernmentPenaltyLedger ledger) {
        if (ledger == null) {
            return false;
        }

        if (ledger.getStatus() != GovernmentPenaltyStatus.PENDING
                && ledger.getStatus() != GovernmentPenaltyStatus.DEBT_RECOVERY) {
            return false;
        }

        return safeMoney(ledger.getOutstandingAmount()).compareTo(BigDecimal.ZERO) > 0;
    }

    private void applyGovernmentRecoveryToPenaltyLedgers(Long pumpId, BigDecimal recoveryAmount) {
        if (pumpId == null) {
            return;
        }

        BigDecimal remainingRecovery = safeMoney(recoveryAmount);

        if (remainingRecovery.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        List<GovernmentPenaltyLedger> ledgers = governmentPenaltyLedgerRepository
                .findByPumpProfileIdOrderByCreatedAtDesc(pumpId)
                .stream()
                .filter(this::isRecoverableLedger)
                .sorted(Comparator.comparing(
                        GovernmentPenaltyLedger::getCreatedAt,
                        Comparator.nullsLast(Comparator.naturalOrder())
                ))
                .toList();

        for (GovernmentPenaltyLedger ledger : ledgers) {
            if (remainingRecovery.compareTo(BigDecimal.ZERO) <= 0) {
                break;
            }

            BigDecimal outstanding = safeMoney(ledger.getOutstandingAmount());

            if (outstanding.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            BigDecimal recoveryForThisLedger = remainingRecovery.min(outstanding).setScale(2, RoundingMode.HALF_UP);

            BigDecimal newPaidAmount = safeMoney(ledger.getPaidAmount())
                    .add(recoveryForThisLedger)
                    .setScale(2, RoundingMode.HALF_UP);

            BigDecimal newOutstanding = outstanding
                    .subtract(recoveryForThisLedger)
                    .setScale(2, RoundingMode.HALF_UP);

            if (newOutstanding.compareTo(BigDecimal.ZERO) < 0) {
                newOutstanding = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
            }

            ledger.setPaidAmount(newPaidAmount);
            ledger.setOutstandingAmount(newOutstanding);
            ledger.setOperationAllowed(true);

            if (newOutstanding.compareTo(BigDecimal.ZERO) <= 0) {
                ledger.setStatus(GovernmentPenaltyStatus.PAID);
                ledger.setPaidAt(LocalDateTime.now());
            } else {
                ledger.setStatus(GovernmentPenaltyStatus.DEBT_RECOVERY);
            }

            remainingRecovery = remainingRecovery
                    .subtract(recoveryForThisLedger)
                    .setScale(2, RoundingMode.HALF_UP);

            governmentPenaltyLedgerRepository.save(ledger);
        }
    }

    private PaymentSummaryResponse buildSummary(List<PaymentRecord> records) {
        BigDecimal totalCash = BigDecimal.ZERO;
        BigDecimal totalBkash = BigDecimal.ZERO;
        BigDecimal totalPaid = BigDecimal.ZERO;
        BigDecimal totalGovernmentRecovery = BigDecimal.ZERO;
        BigDecimal totalPumpKept = BigDecimal.ZERO;

        int normalFuelRecords = 0;
        int routeTokenRecords = 0;
        int penaltyRecoveryRecords = 0;

        for (PaymentRecord record : records) {
            totalCash = totalCash.add(safeMoney(record.getCashAmountBdt()));
            totalBkash = totalBkash.add(safeMoney(record.getBkashAmountBdt()));
            totalPaid = totalPaid.add(safeMoney(record.getPaidAmountBdt()));
            totalGovernmentRecovery = totalGovernmentRecovery.add(safeMoney(record.getGovernmentRecoveryAmountBdt()));
            totalPumpKept = totalPumpKept.add(safeMoney(record.getPumpKeptAmountBdt()));

            if (record.getPaymentPurpose() == PaymentPurpose.NORMAL_FUEL_REQUEST) {
                normalFuelRecords++;
            }

            if (record.getPaymentPurpose() == PaymentPurpose.ROUTE_FUEL_TOKEN) {
                routeTokenRecords++;
            }

            if (record.getPaymentPurpose() == PaymentPurpose.PENALTY_RECOVERY) {
                penaltyRecoveryRecords++;
            }
        }

        return PaymentSummaryResponse.builder()
                .totalCash(formatMoney(totalCash))
                .totalBkash(formatMoney(totalBkash))
                .totalPaid(formatMoney(totalPaid))
                .totalGovernmentRecovery(formatMoney(totalGovernmentRecovery))
                .totalPumpKept(formatMoney(totalPumpKept))
                .totalRecords(records.size())
                .normalFuelPaymentRecords(normalFuelRecords)
                .routeTokenPaymentRecords(routeTokenRecords)
                .penaltyRecoveryRecords(penaltyRecoveryRecords)
                .generatedAt(LocalDateTime.now())
                .build();
    }

    private PaymentRecordResponse mapToResponse(PaymentRecord record) {
        User user = record.getUser();
        PumpProfile pump = record.getPumpProfile();
        FuelRequest fuelRequest = record.getFuelRequest();
        RouteFuelToken token = record.getRouteFuelToken();

        return PaymentRecordResponse.builder()
                .id(record.getId())
                .userId(user == null ? null : user.getId())
                .userName(user == null ? "-" : user.getFullName())
                .userPhone(user == null ? "-" : user.getPhoneNumber())
                .pumpId(pump == null ? null : pump.getId())
                .pumpName(pump == null ? "-" : pump.getPumpName())
                .pumpAddress(pump == null ? "-" : pump.getPumpAddress())
                .fuelRequestId(fuelRequest == null ? null : fuelRequest.getId())
                .routeFuelTokenId(token == null ? null : token.getId())
                .routeTokenCode(token == null ? "-" : token.getTokenCode())
                .collectionCode(fuelRequest == null ? "-" : fuelRequest.getCollectionCode())
                .paymentPurpose(record.getPaymentPurpose())
                .paymentMethod(record.getPaymentMethod())
                .bkashTransactionId(record.getBkashTransactionId())
                .cashAmountBdt(formatMoney(record.getCashAmountBdt()))
                .bkashAmountBdt(formatMoney(record.getBkashAmountBdt()))
                .paidAmountBdt(formatMoney(record.getPaidAmountBdt()))
                .governmentRecoveryAmountBdt(formatMoney(record.getGovernmentRecoveryAmountBdt()))
                .pumpKeptAmountBdt(formatMoney(record.getPumpKeptAmountBdt()))
                .description(record.getDescription())
                .status(record.getStatus())
                .recordedAt(record.getRecordedAt())
                .createdAt(record.getCreatedAt())
                .build();
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

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private String cleanOptional(String value) {
        return value == null ? "" : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private record PaymentSplit(
            BigDecimal governmentRecoveryAmount,
            BigDecimal pumpKeptAmount
    ) {
    }
}