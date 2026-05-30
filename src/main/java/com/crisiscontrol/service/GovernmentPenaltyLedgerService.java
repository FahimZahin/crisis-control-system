package com.crisiscontrol.service;

import com.crisiscontrol.dto.GovernmentPenaltyLedgerResponse;
import com.crisiscontrol.dto.PumpEarlyOperationRequest;
import com.crisiscontrol.dto.PumpEarningRecordRequest;
import com.crisiscontrol.entity.*;
import com.crisiscontrol.repository.GovernmentPenaltyLedgerRepository;
import com.crisiscontrol.repository.GovernmentPenaltyTransactionRepository;
import com.crisiscontrol.repository.PumpProfileRepository;
import com.crisiscontrol.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.crisiscontrol.repository.FuelRequestRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class GovernmentPenaltyLedgerService {

    private final GovernmentPenaltyLedgerRepository ledgerRepository;
    private final GovernmentPenaltyTransactionRepository transactionRepository;
    private final PumpProfileRepository pumpProfileRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final FuelRequestRepository fuelRequestRepository;

    public GovernmentPenaltyLedger createLedgerForEnforcementAction(PumpEnforcementAction action) {
        if (action == null || action.getId() == null) {
            throw new RuntimeException("Enforcement action is required");
        }

        if (ledgerRepository.existsByEnforcementActionId(action.getId())) {
            return ledgerRepository.findByEnforcementActionId(action.getId())
                    .orElseThrow(() -> new RuntimeException("Penalty ledger already exists"));
        }

        BigDecimal basePenalty = safeMoney(action.getPenaltyAmount());
        Integer days = action.getTemporaryDeactivationDays() == null ? 0 : action.getTemporaryDeactivationDays();

        BigDecimal earlyOperationAmount = basePenalty
                .multiply(BigDecimal.valueOf(days))
                .setScale(2, RoundingMode.HALF_UP);

        GovernmentPenaltyLedger ledger = GovernmentPenaltyLedger.builder()
                .enforcementAction(action)
                .pumpComplaint(action.getPumpComplaint())
                .pumpProfile(action.getPumpProfile())
                .ruleCode(action.getRuleCode())
                .complaintType(action.getComplaintType())
                .basePenaltyAmount(basePenalty)
                .temporaryDeactivationDays(days)
                .earlyOperationAmount(earlyOperationAmount)
                .totalDebtAmount(earlyOperationAmount)
                .paidAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                .outstandingAmount(earlyOperationAmount)
                .pumpNegativeBalance(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP))
                .status(earlyOperationAmount.compareTo(BigDecimal.ZERO) > 0
                        ? GovernmentPenaltyStatus.PENDING
                        : GovernmentPenaltyStatus.PAID)
                .operationAllowed(false)
                .build();

        GovernmentPenaltyLedger savedLedger = ledgerRepository.save(ledger);

        createTransaction(
                savedLedger,
                GovernmentPenaltyTransactionType.PENALTY_CREATED,
                earlyOperationAmount,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                "Penalty ledger created. Early operation amount = "
                        + days
                        + " × "
                        + basePenalty
                        + " = "
                        + earlyOperationAmount
                        + " BDT."
        );

        return savedLedger;
    }

    public List<GovernmentPenaltyLedgerResponse> getAllLedgers() {
        return ledgerRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<GovernmentPenaltyLedgerResponse> getLedgersForPumpAuthority(Long pumpAuthorityUserId) {
        PumpProfile pumpProfile = pumpProfileRepository.findByUserId(pumpAuthorityUserId)
                .orElseThrow(() -> new RuntimeException("Pump profile not found for this pump authority"));

        return ledgerRepository.findByPumpProfileIdOrderByCreatedAtDesc(pumpProfile.getId())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public Map<String, Object> getGovernmentFundSummary() {
        List<GovernmentPenaltyLedger> ledgers = ledgerRepository.findAll();

        BigDecimal totalReceivable = BigDecimal.ZERO;
        BigDecimal totalCollected = BigDecimal.ZERO;
        BigDecimal totalOutstanding = BigDecimal.ZERO;

        for (GovernmentPenaltyLedger ledger : ledgers) {
            totalReceivable = totalReceivable.add(safeMoney(ledger.getTotalDebtAmount()));
            totalCollected = totalCollected.add(safeMoney(ledger.getPaidAmount()));
            totalOutstanding = totalOutstanding.add(safeMoney(ledger.getOutstandingAmount()));
        }

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalReceivable", totalReceivable.setScale(2, RoundingMode.HALF_UP));
        summary.put("totalCollected", totalCollected.setScale(2, RoundingMode.HALF_UP));
        summary.put("totalOutstanding", totalOutstanding.setScale(2, RoundingMode.HALF_UP));
        summary.put("activeDebtCases", ledgers.stream()
                .filter(ledger -> ledger.getStatus() == GovernmentPenaltyStatus.DEBT_RECOVERY)
                .count());
        summary.put("paidCases", ledgers.stream()
                .filter(ledger -> ledger.getStatus() == GovernmentPenaltyStatus.PAID)
                .count());

        return summary;
    }

    public GovernmentPenaltyLedgerResponse startOperationWithDebt(
            Long ledgerId,
            PumpEarlyOperationRequest request
    ) {
        if (request == null || request.getPumpAuthorityUserId() == null) {
            throw new RuntimeException("Pump authority user ID is required");
        }

        User pumpUser = userRepository.findById(request.getPumpAuthorityUserId())
                .orElseThrow(() -> new RuntimeException("Pump authority user not found"));

        if (pumpUser.getRole() != Role.PUMP_AUTHORITY) {
            throw new RuntimeException("Only pump authority can request early operation");
        }

        PumpProfile pumpProfile = pumpProfileRepository.findByUserId(pumpUser.getId())
                .orElseThrow(() -> new RuntimeException("Pump profile not found"));

        GovernmentPenaltyLedger ledger = ledgerRepository.findById(ledgerId)
                .orElseThrow(() -> new RuntimeException("Government penalty ledger not found"));

        if (!ledger.getPumpProfile().getId().equals(pumpProfile.getId())) {
            throw new RuntimeException("This penalty ledger does not belong to your pump");
        }

        if (ledger.getStatus() == GovernmentPenaltyStatus.PAID) {
            throw new RuntimeException("Penalty already paid");
        }

        if (Boolean.TRUE.equals(ledger.getOperationAllowed())) {
            throw new RuntimeException("Pump operation already allowed");
        }

        BigDecimal requiredStartAmount = safeMoney(ledger.getEarlyOperationAmount());

        BigDecimal totalFuelSalesEarning = calculateTotalFuelSalesEarning(pumpProfile);
        BigDecimal totalGovernmentRecoveredBefore = calculateTotalGovernmentRecovered(pumpProfile);

        BigDecimal availablePumpBalance = totalFuelSalesEarning.subtract(totalGovernmentRecoveredBefore)
                .setScale(2, RoundingMode.HALF_UP);

        if (availablePumpBalance.compareTo(BigDecimal.ZERO) < 0) {
            availablePumpBalance = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        BigDecimal immediateGovernmentPayment = availablePumpBalance.min(requiredStartAmount)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal remainingOutstanding = requiredStartAmount.subtract(immediateGovernmentPayment)
                .setScale(2, RoundingMode.HALF_UP);

        ledger.setOperationAllowed(true);
        ledger.setOperationStartedAt(LocalDateTime.now());
        ledger.setTotalDebtAmount(requiredStartAmount);
        ledger.setPaidAmount(immediateGovernmentPayment);
        ledger.setOutstandingAmount(remainingOutstanding);

        if (remainingOutstanding.compareTo(BigDecimal.ZERO) <= 0) {
            ledger.setStatus(GovernmentPenaltyStatus.PAID);
            ledger.setPaidAt(LocalDateTime.now());
            ledger.setPumpNegativeBalance(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        } else {
            ledger.setStatus(GovernmentPenaltyStatus.DEBT_RECOVERY);
            ledger.setPumpNegativeBalance(remainingOutstanding.negate().setScale(2, RoundingMode.HALF_UP));
        }

        GovernmentPenaltyLedger savedLedger = ledgerRepository.save(ledger);

        if (remainingOutstanding.compareTo(BigDecimal.ZERO) <= 0) {
            pumpProfile.setPumpStatus(PumpStatus.OPEN);
        } else {
            pumpProfile.setPumpStatus(PumpStatus.OPEN_WITH_DEBT);
        }
        pumpProfileRepository.save(pumpProfile);

        createTransaction(
                savedLedger,
                GovernmentPenaltyTransactionType.EARLY_OPERATION_DEBT_CREATED,
                requiredStartAmount,
                immediateGovernmentPayment,
                BigDecimal.ZERO,
                "Pump operation started early. Required amount: "
                        + requiredStartAmount
                        + " BDT. Previous pump earning used immediately: "
                        + immediateGovernmentPayment
                        + " BDT. Remaining outstanding debt: "
                        + remainingOutstanding
                        + " BDT. "
                        + cleanOptional(request.getNote())
        );

        auditLogService.log(
                pumpUser,
                "PUMP_OPERATION_STARTED_WITH_PENALTY_DEBT",
                "GOVERNMENT_PENALTY_LEDGER",
                savedLedger.getId(),
                "Pump started operation. Previous earning used: "
                        + immediateGovernmentPayment
                        + " BDT, Remaining penalty debt: "
                        + remainingOutstanding
                        + " BDT"
        );

        return mapToResponse(savedLedger);
    }

    public Map<String, Object> recordPumpEarning(
            Long ledgerId,
            PumpEarningRecordRequest request
    ) {
        if (request == null || request.getPumpAuthorityUserId() == null) {
            throw new RuntimeException("Pump authority user ID is required");
        }

        if (request.getEarningAmount() == null || request.getEarningAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Earning amount must be greater than zero");
        }

        User pumpUser = userRepository.findById(request.getPumpAuthorityUserId())
                .orElseThrow(() -> new RuntimeException("Pump authority user not found"));

        if (pumpUser.getRole() != Role.PUMP_AUTHORITY) {
            throw new RuntimeException("Only pump authority can record pump earning");
        }

        PumpProfile pumpProfile = pumpProfileRepository.findByUserId(pumpUser.getId())
                .orElseThrow(() -> new RuntimeException("Pump profile not found"));

        GovernmentPenaltyLedger ledger = ledgerRepository.findById(ledgerId)
                .orElseThrow(() -> new RuntimeException("Government penalty ledger not found"));

        if (!ledger.getPumpProfile().getId().equals(pumpProfile.getId())) {
            throw new RuntimeException("This penalty ledger does not belong to your pump");
        }

        BigDecimal earningAmount = safeMoney(request.getEarningAmount());

        if (ledger.getOutstandingAmount().compareTo(BigDecimal.ZERO) <= 0) {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("message", "No outstanding penalty. Pump can keep full earning.");
            result.put("earningAmount", earningAmount);
            result.put("governmentCredit", BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            result.put("pumpKeptAmount", earningAmount);
            result.put("remainingOutstanding", BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            return result;
        }

        BigDecimal governmentCredit = earningAmount.min(ledger.getOutstandingAmount()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal pumpKeptAmount = earningAmount.subtract(governmentCredit).setScale(2, RoundingMode.HALF_UP);

        BigDecimal newPaidAmount = ledger.getPaidAmount().add(governmentCredit).setScale(2, RoundingMode.HALF_UP);
        BigDecimal newOutstanding = ledger.getOutstandingAmount().subtract(governmentCredit).setScale(2, RoundingMode.HALF_UP);

        ledger.setPaidAmount(newPaidAmount);
        ledger.setOutstandingAmount(newOutstanding);
        ledger.setPumpNegativeBalance(newOutstanding.negate().setScale(2, RoundingMode.HALF_UP));

        if (newOutstanding.compareTo(BigDecimal.ZERO) <= 0) {
            ledger.setStatus(GovernmentPenaltyStatus.PAID);
            ledger.setPaidAt(LocalDateTime.now());
            ledger.setPumpNegativeBalance(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        } else {
            ledger.setStatus(GovernmentPenaltyStatus.DEBT_RECOVERY);
        }

        GovernmentPenaltyLedger savedLedger = ledgerRepository.save(ledger);

        createTransaction(
                savedLedger,
                GovernmentPenaltyTransactionType.PUMP_EARNING_REDIRECTED,
                earningAmount,
                governmentCredit,
                pumpKeptAmount,
                "Pump earning recorded. Government received "
                        + governmentCredit
                        + " BDT. Pump kept "
                        + pumpKeptAmount
                        + " BDT. "
                        + cleanOptional(request.getNote())
        );

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", newOutstanding.compareTo(BigDecimal.ZERO) <= 0
                ? "Penalty fully recovered. Pump can now keep future earnings."
                : "Pump earning redirected to government penalty fund.");
        result.put("earningAmount", earningAmount);
        result.put("governmentCredit", governmentCredit);
        result.put("pumpKeptAmount", pumpKeptAmount);
        result.put("remainingOutstanding", savedLedger.getOutstandingAmount());
        result.put("status", savedLedger.getStatus());

        return result;
    }

    private void createTransaction(
            GovernmentPenaltyLedger ledger,
            GovernmentPenaltyTransactionType type,
            BigDecimal amount,
            BigDecimal governmentCredit,
            BigDecimal pumpKeptAmount,
            String note
    ) {
        GovernmentPenaltyTransaction transaction = GovernmentPenaltyTransaction.builder()
                .ledger(ledger)
                .pumpProfile(ledger.getPumpProfile())
                .transactionType(type)
                .amount(safeMoney(amount))
                .governmentCredit(safeMoney(governmentCredit))
                .pumpKeptAmount(safeMoney(pumpKeptAmount))
                .note(cleanOptional(note))
                .build();

        transactionRepository.save(transaction);
    }

    private GovernmentPenaltyLedgerResponse mapToResponse(GovernmentPenaltyLedger ledger) {
        PumpProfile pumpProfile = ledger.getPumpProfile();

        return GovernmentPenaltyLedgerResponse.builder()
                .id(ledger.getId())
                .enforcementActionId(ledger.getEnforcementAction() == null ? null : ledger.getEnforcementAction().getId())
                .complaintId(ledger.getPumpComplaint() == null ? null : ledger.getPumpComplaint().getId())
                .pumpProfileId(pumpProfile == null ? null : pumpProfile.getId())
                .pumpName(pumpProfile == null ? "-" : pumpProfile.getPumpName())
                .pumpAddress(pumpProfile == null ? "-" : pumpProfile.getPumpAddress())
                .ruleCode(ledger.getRuleCode())
                .complaintType(ledger.getComplaintType())
                .basePenaltyAmount(ledger.getBasePenaltyAmount())
                .temporaryDeactivationDays(ledger.getTemporaryDeactivationDays())
                .earlyOperationAmount(ledger.getEarlyOperationAmount())
                .totalDebtAmount(ledger.getTotalDebtAmount())
                .paidAmount(ledger.getPaidAmount())
                .outstandingAmount(ledger.getOutstandingAmount())
                .pumpNegativeBalance(ledger.getPumpNegativeBalance())
                .status(ledger.getStatus())
                .operationAllowed(ledger.getOperationAllowed())
                .createdAt(ledger.getCreatedAt())
                .operationStartedAt(ledger.getOperationStartedAt())
                .paidAt(ledger.getPaidAt())
                .build();
    }

    private BigDecimal safeMoney(BigDecimal value) {
        if (value == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private String cleanOptional(String value) {
        return value == null ? "" : value.trim();
    }
    public Map<String, Object> getPumpPenaltyAccountSummary(Long pumpAuthorityUserId) {
        User pumpUser = userRepository.findById(pumpAuthorityUserId)
                .orElseThrow(() -> new RuntimeException("Pump authority user not found"));

        if (pumpUser.getRole() != Role.PUMP_AUTHORITY) {
            throw new RuntimeException("Only pump authority can view pump penalty account summary");
        }

        PumpProfile pumpProfile = pumpProfileRepository.findByUserId(pumpUser.getId())
                .orElseThrow(() -> new RuntimeException("Pump profile not found"));

        BigDecimal totalFuelSalesEarning = calculateTotalFuelSalesEarning(pumpProfile);
        BigDecimal totalGovernmentRecovered = calculateTotalGovernmentRecovered(pumpProfile);
        BigDecimal totalOutstandingDebt = calculateTotalOutstandingDebt(pumpProfile);
        BigDecimal pumpCurrentBalance = totalFuelSalesEarning.subtract(totalGovernmentRecovered)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal netPosition = pumpCurrentBalance.subtract(totalOutstandingDebt)
                .setScale(2, RoundingMode.HALF_UP);

        boolean hasDebtRecovery = ledgerRepository.findByPumpProfileIdOrderByCreatedAtDesc(pumpProfile.getId())
                .stream()
                .anyMatch(ledger -> ledger.getStatus() == GovernmentPenaltyStatus.DEBT_RECOVERY);

        boolean hasPendingPenalty = ledgerRepository.findByPumpProfileIdOrderByCreatedAtDesc(pumpProfile.getId())
                .stream()
                .anyMatch(ledger -> ledger.getStatus() == GovernmentPenaltyStatus.PENDING);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("pumpProfileId", pumpProfile.getId());
        response.put("pumpName", pumpProfile.getPumpName());
        response.put("totalFuelSalesEarning", totalFuelSalesEarning);
        response.put("totalGovernmentRecovered", totalGovernmentRecovered);
        response.put("totalOutstandingDebt", totalOutstandingDebt);
        response.put("pumpCurrentBalance", pumpCurrentBalance);
        response.put("netPosition", netPosition);
        response.put("hasDebtRecovery", hasDebtRecovery);
        response.put("hasPendingPenalty", hasPendingPenalty);

        if (hasDebtRecovery) {
            response.put("operationStatus", "OPEN WITH DEBT");
            response.put("earningRule", "Earnings go to government until penalty debt is fully recovered");
        } else if (hasPendingPenalty) {
            response.put("operationStatus", "PENDING PENALTY");
            response.put("earningRule", "Previous earning will be used first when operation starts");
        } else {
            response.put("operationStatus", "NORMAL");
            response.put("earningRule", "Pump keeps earnings");
        }

        return response;
    }

    private BigDecimal calculateTotalFuelSalesEarning(PumpProfile pumpProfile) {
        if (pumpProfile == null || pumpProfile.getId() == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        return fuelRequestRepository.findByPumpProfileId(pumpProfile.getId())
                .stream()
                .filter(request -> request.getRequestStatus() == FuelRequestStatus.COLLECTED)
                .map(request -> safeMoney(request.getPaidAmountBdt()))
                .reduce(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP), BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateTotalGovernmentRecovered(PumpProfile pumpProfile) {
        if (pumpProfile == null || pumpProfile.getId() == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        return ledgerRepository.findByPumpProfileIdOrderByCreatedAtDesc(pumpProfile.getId())
                .stream()
                .map(ledger -> safeMoney(ledger.getPaidAmount()))
                .reduce(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP), BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateTotalOutstandingDebt(PumpProfile pumpProfile) {
        if (pumpProfile == null || pumpProfile.getId() == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        return ledgerRepository.findByPumpProfileIdOrderByCreatedAtDesc(pumpProfile.getId())
                .stream()
                .map(ledger -> safeMoney(ledger.getOutstandingAmount()))
                .reduce(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP), BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    @Transactional
    public Map<String, Object> redirectPumpEarningAfterFuelCollection(
            PumpProfile pumpProfile,
            BigDecimal earningAmount,
            String note
    ) {
        if (pumpProfile == null || pumpProfile.getId() == null) {
            throw new RuntimeException("Pump profile is required for penalty recovery");
        }

        BigDecimal earning = safeMoney(earningAmount);

        GovernmentPenaltyLedger activeLedger = ledgerRepository
                .findByPumpProfileIdOrderByCreatedAtDesc(pumpProfile.getId())
                .stream()
                .filter(ledger -> ledger.getStatus() == GovernmentPenaltyStatus.DEBT_RECOVERY)
                .filter(ledger -> ledger.getOutstandingAmount() != null)
                .filter(ledger -> ledger.getOutstandingAmount().compareTo(BigDecimal.ZERO) > 0)
                .findFirst()
                .orElse(null);

        Map<String, Object> result = new LinkedHashMap<>();

        if (activeLedger == null) {
            result.put("penaltyRecoveryApplied", false);
            result.put("governmentRecoveryAmount", BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            result.put("pumpKeptAmount", earning);
            result.put("remainingPenaltyDebt", BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            result.put("message", "No active penalty debt. Pump keeps full earning.");
            return result;
        }

        BigDecimal governmentRecovery = earning.min(activeLedger.getOutstandingAmount())
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal pumpKeptAmount = earning.subtract(governmentRecovery)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal newPaidAmount = safeMoney(activeLedger.getPaidAmount())
                .add(governmentRecovery)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal newOutstanding = safeMoney(activeLedger.getOutstandingAmount())
                .subtract(governmentRecovery)
                .setScale(2, RoundingMode.HALF_UP);

        activeLedger.setPaidAmount(newPaidAmount);
        activeLedger.setOutstandingAmount(newOutstanding);

        if (newOutstanding.compareTo(BigDecimal.ZERO) <= 0) {
            activeLedger.setStatus(GovernmentPenaltyStatus.PAID);
            activeLedger.setPaidAt(LocalDateTime.now());
            activeLedger.setPumpNegativeBalance(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));

            pumpProfile.setPumpStatus(PumpStatus.OPEN);
            pumpProfileRepository.save(pumpProfile);
        } else {
            activeLedger.setStatus(GovernmentPenaltyStatus.DEBT_RECOVERY);
            activeLedger.setPumpNegativeBalance(newOutstanding.negate().setScale(2, RoundingMode.HALF_UP));

            pumpProfile.setPumpStatus(PumpStatus.OPEN_WITH_DEBT);
            pumpProfileRepository.save(pumpProfile);
        }

        GovernmentPenaltyLedger savedLedger = ledgerRepository.save(activeLedger);

        createTransaction(
                savedLedger,
                GovernmentPenaltyTransactionType.PUMP_EARNING_REDIRECTED,
                earning,
                governmentRecovery,
                pumpKeptAmount,
                cleanOptional(note)
        );

        result.put("penaltyRecoveryApplied", true);
        result.put("governmentRecoveryAmount", governmentRecovery);
        result.put("pumpKeptAmount", pumpKeptAmount);
        result.put("remainingPenaltyDebt", savedLedger.getOutstandingAmount());
        result.put("message", savedLedger.getStatus() == GovernmentPenaltyStatus.PAID
                ? "Penalty fully recovered. Pump can now keep future earnings."
                : "Pump earning redirected to government penalty fund.");

        return result;
    }
}