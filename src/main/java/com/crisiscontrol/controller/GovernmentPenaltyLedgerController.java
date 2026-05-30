package com.crisiscontrol.controller;

import com.crisiscontrol.dto.GovernmentPenaltyLedgerResponse;
import com.crisiscontrol.dto.PumpEarlyOperationRequest;
import com.crisiscontrol.dto.PumpEarningRecordRequest;
import com.crisiscontrol.service.GovernmentPenaltyLedgerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/government-penalty-ledger")
public class GovernmentPenaltyLedgerController {

    private final GovernmentPenaltyLedgerService governmentPenaltyLedgerService;

    @GetMapping
    public ResponseEntity<List<GovernmentPenaltyLedgerResponse>> getAllLedgers() {
        return ResponseEntity.ok(governmentPenaltyLedgerService.getAllLedgers());
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getGovernmentFundSummary() {
        return ResponseEntity.ok(governmentPenaltyLedgerService.getGovernmentFundSummary());
    }

    @GetMapping("/pump-authority/{pumpAuthorityUserId}")
    public ResponseEntity<List<GovernmentPenaltyLedgerResponse>> getLedgersForPumpAuthority(
            @PathVariable Long pumpAuthorityUserId
    ) {
        return ResponseEntity.ok(governmentPenaltyLedgerService.getLedgersForPumpAuthority(pumpAuthorityUserId));
    }

    @PostMapping("/{ledgerId}/start-operation")
    public ResponseEntity<GovernmentPenaltyLedgerResponse> startOperationWithDebt(
            @PathVariable Long ledgerId,
            @RequestBody PumpEarlyOperationRequest request
    ) {
        return ResponseEntity.ok(governmentPenaltyLedgerService.startOperationWithDebt(ledgerId, request));
    }

    @PostMapping("/{ledgerId}/record-earning")
    public ResponseEntity<Map<String, Object>> recordPumpEarning(
            @PathVariable Long ledgerId,
            @RequestBody PumpEarningRecordRequest request
    ) {
        return ResponseEntity.ok(governmentPenaltyLedgerService.recordPumpEarning(ledgerId, request));
    }
}