package com.crisiscontrol.repository;

import com.crisiscontrol.entity.HospitalOutageFuelUsageLog;
import com.crisiscontrol.entity.PowerOutageNotice;
import com.crisiscontrol.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface HospitalOutageFuelUsageLogRepository extends JpaRepository<HospitalOutageFuelUsageLog, Long> {

    Optional<HospitalOutageFuelUsageLog> findByHospitalUserAndPowerOutageNotice(
            User hospitalUser,
            PowerOutageNotice powerOutageNotice
    );
}