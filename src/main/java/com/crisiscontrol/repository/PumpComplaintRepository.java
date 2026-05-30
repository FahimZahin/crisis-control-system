package com.crisiscontrol.repository;

import com.crisiscontrol.entity.PumpComplaint;
import com.crisiscontrol.entity.PumpComplaintStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PumpComplaintRepository extends JpaRepository<PumpComplaint, Long> {

    List<PumpComplaint> findAllByOrderByCreatedAtDesc();

    List<PumpComplaint> findByComplainantIdOrderByCreatedAtDesc(Long complainantUserId);

    List<PumpComplaint> findByPumpProfileIdOrderByCreatedAtDesc(Long pumpProfileId);

    List<PumpComplaint> findByPumpThanaIgnoreCaseOrderByCreatedAtDesc(String pumpThana);

    List<PumpComplaint> findByStatusOrderByCreatedAtDesc(PumpComplaintStatus status);
}