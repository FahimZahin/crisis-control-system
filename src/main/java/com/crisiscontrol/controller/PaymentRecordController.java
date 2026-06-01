package com.crisiscontrol.controller;

import com.crisiscontrol.dto.PaymentRecordResponse;
import com.crisiscontrol.dto.PaymentSummaryResponse;
import com.crisiscontrol.service.PaymentRecordService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payment-records")
@RequiredArgsConstructor
public class PaymentRecordController {

    private final PaymentRecordService paymentRecordService;

    @GetMapping
    public ResponseEntity<List<PaymentRecordResponse>> getAllPayments() {
        return ResponseEntity.ok(paymentRecordService.getAllPayments());
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<PaymentRecordResponse>> getPaymentsByUser(
            @PathVariable Long userId
    ) {
        return ResponseEntity.ok(paymentRecordService.getPaymentsByUser(userId));
    }

    @GetMapping("/pump/{pumpId}")
    public ResponseEntity<List<PaymentRecordResponse>> getPaymentsByPump(
            @PathVariable Long pumpId
    ) {
        return ResponseEntity.ok(paymentRecordService.getPaymentsByPump(pumpId));
    }

    @GetMapping("/pump-user/{pumpUserId}")
    public ResponseEntity<List<PaymentRecordResponse>> getPaymentsByPumpUser(
            @PathVariable Long pumpUserId
    ) {
        return ResponseEntity.ok(paymentRecordService.getPaymentsByPumpUser(pumpUserId));
    }

    @GetMapping("/summary/today")
    public ResponseEntity<PaymentSummaryResponse> getTodaySummary() {
        return ResponseEntity.ok(paymentRecordService.getTodaySummary());
    }

    @GetMapping("/summary/pump/{pumpId}/today")
    public ResponseEntity<PaymentSummaryResponse> getPumpTodaySummary(
            @PathVariable Long pumpId
    ) {
        return ResponseEntity.ok(paymentRecordService.getPumpTodaySummary(pumpId));
    }

    @GetMapping("/summary/pump-user/{pumpUserId}/today")
    public ResponseEntity<PaymentSummaryResponse> getPumpUserTodaySummary(
            @PathVariable Long pumpUserId
    ) {
        return ResponseEntity.ok(paymentRecordService.getPumpUserTodaySummary(pumpUserId));
    }
}