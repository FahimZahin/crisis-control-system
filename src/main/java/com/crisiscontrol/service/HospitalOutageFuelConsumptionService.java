package com.crisiscontrol.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class HospitalOutageFuelConsumptionService {

    /*
     * Diesel auto-deduction is disabled.
     *
     * This method is kept only so existing code does not break if another
     * controller or service still calls it.
     *
     * It does NOT reduce hospitalCurrentDieselReserve.
     * It does NOT run automatically.
     * It does NOT update outage fuel usage logs.
     */
    @Transactional
    public void deductFuelForStartedOutages() {
        // Intentionally empty.
        // Do not deduct diesel on dashboard refresh or scheduled background run.
    }
}