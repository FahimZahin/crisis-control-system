package com.crisiscontrol.repository;

import com.crisiscontrol.entity.PaymentPurpose;
import com.crisiscontrol.entity.PaymentRecord;
import com.crisiscontrol.entity.PaymentRecordStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface PaymentRecordRepository extends JpaRepository<PaymentRecord, Long> {

    boolean existsByFuelRequestIdAndPaymentPurpose(
            Long fuelRequestId,
            PaymentPurpose paymentPurpose
    );

    boolean existsByRouteFuelTokenIdAndPaymentPurpose(
            Long routeFuelTokenId,
            PaymentPurpose paymentPurpose
    );

    List<PaymentRecord> findAllByOrderByCreatedAtDesc();

    List<PaymentRecord> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<PaymentRecord> findByPumpProfileIdOrderByCreatedAtDesc(Long pumpId);

    List<PaymentRecord> findByPaymentPurposeOrderByCreatedAtDesc(PaymentPurpose paymentPurpose);

    List<PaymentRecord> findByPumpProfileIdAndRecordedAtBetweenOrderByRecordedAtDesc(
            Long pumpId,
            LocalDateTime start,
            LocalDateTime end
    );

    List<PaymentRecord> findByRecordedAtBetweenOrderByRecordedAtDesc(
            LocalDateTime start,
            LocalDateTime end
    );

    long countByStatus(PaymentRecordStatus status);
}