package com.crisiscontrol.service;

import com.crisiscontrol.entity.HospitalOutageFuelUsageLog;
import com.crisiscontrol.entity.PowerOutageNotice;
import com.crisiscontrol.entity.Role;
import com.crisiscontrol.entity.User;
import com.crisiscontrol.repository.HospitalOutageFuelUsageLogRepository;
import com.crisiscontrol.repository.PowerOutageRepository;
import com.crisiscontrol.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class HospitalOutageFuelConsumptionService {

    private final PowerOutageRepository powerOutageRepository;
    private final UserRepository userRepository;
    private final HospitalOutageFuelUsageLogRepository hospitalOutageFuelUsageLogRepository;
    private final HospitalSupportCalculationService hospitalSupportCalculationService;

    /*
     * Runs automatically every 1 minute.
     * It deducts hospital generator diesel for outage time that has already passed.
     */
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void deductFuelForStartedOutagesAutomatically() {
        deductFuelForStartedOutages();
    }

    /*
     * Can also be called manually from hospital profile refresh.
     */
    @Transactional
    public void deductFuelForStartedOutages() {
        LocalDateTime now = LocalDateTime.now();

        List<PowerOutageNotice> allNotices = powerOutageRepository.findAll();
        List<User> hospitals = userRepository.findByRole(Role.HOSPITAL_AUTHORITY);

        for (PowerOutageNotice notice : allNotices) {
            if (!shouldProcessOutageNotice(notice, now)) {
                continue;
            }

            LocalDateTime outageStart = notice.getStartDateTime();
            LocalDateTime outageDeductUntil = getOutageDeductUntil(notice, now);

            if (outageStart == null || outageDeductUntil == null || !outageDeductUntil.isAfter(outageStart)) {
                continue;
            }

            for (User hospital : hospitals) {
                if (!isSameThana(hospital.getHospitalUnderThana(), notice.getThanaName())) {
                    continue;
                }

                deductHospitalFuelForNotice(hospital, notice, outageStart, outageDeductUntil);
            }
        }
    }

    private boolean shouldProcessOutageNotice(PowerOutageNotice notice, LocalDateTime now) {
        if (notice == null) {
            return false;
        }

        if (notice.getStartDateTime() == null) {
            return false;
        }

        if (notice.getExpectedRestorationDateTime() == null) {
            return false;
        }

        if (notice.getStartDateTime().isAfter(now)) {
            return false;
        }

        if ("CANCELLED".equalsIgnoreCase(String.valueOf(notice.getStatus()))) {
            return false;
        }

        if ("REJECTED".equalsIgnoreCase(String.valueOf(notice.getStatus()))) {
            return false;
        }

        /*
         * Scheduled notice becomes fuel-consuming only after start time passes.
         * Current outage consumes fuel immediately.
         * Restored notice may still need final deduction from last deducted time until restoration time.
         */
        return true;
    }

    private LocalDateTime getOutageDeductUntil(PowerOutageNotice notice, LocalDateTime now) {
        LocalDateTime expectedRestoration = notice.getExpectedRestorationDateTime();

        if (expectedRestoration == null) {
            return now;
        }

        if (expectedRestoration.isBefore(now)) {
            return expectedRestoration;
        }

        return now;
    }

    private void deductHospitalFuelForNotice(
            User hospital,
            PowerOutageNotice notice,
            LocalDateTime outageStart,
            LocalDateTime outageDeductUntil
    ) {
        HospitalOutageFuelUsageLog usageLog = hospitalOutageFuelUsageLogRepository
                .findByHospitalUserAndPowerOutageNotice(hospital, notice)
                .orElse(null);

        LocalDateTime deductionStart;

        if (usageLog == null) {
            deductionStart = outageStart;

            usageLog = HospitalOutageFuelUsageLog.builder()
                    .hospitalUser(hospital)
                    .powerOutageNotice(notice)
                    .lastDeductedUntil(outageStart)
                    .totalDeductedLiter(0.0)
                    .build();
        } else {
            deductionStart = usageLog.getLastDeductedUntil();
        }

        if (deductionStart == null) {
            deductionStart = outageStart;
        }

        if (deductionStart.isBefore(outageStart)) {
            deductionStart = outageStart;
        }

        if (!outageDeductUntil.isAfter(deductionStart)) {
            hospitalOutageFuelUsageLogRepository.save(usageLog);
            return;
        }

        double elapsedHours = Duration.between(deductionStart, outageDeductUntil).toSeconds() / 3600.0;

        if (elapsedHours <= 0) {
            hospitalOutageFuelUsageLogRepository.save(usageLog);
            return;
        }

        double hourlyDieselConsumption = calculateHourlyDieselConsumption(hospital.getHospitalGeneratorCapacity());

        if (hourlyDieselConsumption <= 0) {
            hospitalOutageFuelUsageLogRepository.save(usageLog);
            return;
        }

        double dieselToDeduct = elapsedHours * hourlyDieselConsumption;
        dieselToDeduct = roundTwo(dieselToDeduct);

        double currentReserve = hospital.getHospitalCurrentDieselReserve() == null
                ? 0.0
                : hospital.getHospitalCurrentDieselReserve();

        double updatedReserve = currentReserve - dieselToDeduct;

        if (updatedReserve < 0) {
            updatedReserve = 0.0;
        }

        updatedReserve = roundTwo(updatedReserve);

        hospital.setHospitalCurrentDieselReserve(updatedReserve);

        /*
         * This recalculates:
         * - hospital_estimated_backup_hours
         * - hospital_diesel_status
         */
        hospitalSupportCalculationService.recalculateAndSave(hospital);

        usageLog.setLastDeductedUntil(outageDeductUntil);
        usageLog.setTotalDeductedLiter(
                roundTwo((usageLog.getTotalDeductedLiter() == null ? 0.0 : usageLog.getTotalDeductedLiter()) + dieselToDeduct)
        );

        hospitalOutageFuelUsageLogRepository.save(usageLog);
    }

    private double calculateHourlyDieselConsumption(String generatorCapacity) {
        double kva = extractKvaFromGeneratorCapacity(generatorCapacity);

        if (kva <= 0) {
            return 0.0;
        }

        /*
         * Demo formula:
         * 1 kVA consumes 0.25 liter/hour.
         */
        return kva * 0.25;
    }

    private double extractKvaFromGeneratorCapacity(String generatorCapacity) {
        if (generatorCapacity == null || generatorCapacity.trim().isEmpty()) {
            return 0.0;
        }

        String cleanedValue = generatorCapacity
                .toUpperCase()
                .replace("KVA", "")
                .replace("KW", "")
                .replace(",", "")
                .trim();

        StringBuilder numberBuilder = new StringBuilder();

        for (int i = 0; i < cleanedValue.length(); i++) {
            char character = cleanedValue.charAt(i);

            if (Character.isDigit(character) || character == '.') {
                numberBuilder.append(character);
            } else if (!numberBuilder.isEmpty()) {
                break;
            }
        }

        if (numberBuilder.isEmpty()) {
            return 0.0;
        }

        try {
            return Double.parseDouble(numberBuilder.toString());
        } catch (NumberFormatException exception) {
            return 0.0;
        }
    }

    private boolean isSameThana(String hospitalThana, String outageThana) {
        return normalizeThana(hospitalThana).equals(normalizeThana(outageThana));
    }

    private String normalizeThana(String value) {
        if (value == null) {
            return "";
        }

        String normalized = value
                .toLowerCase()
                .replace(" ", "")
                .replace("-", "")
                .replace("_", "")
                .trim();

        if ("gulsan".equals(normalized)) {
            return "gulshan";
        }

        if ("shahbag".equals(normalized)) {
            return "shahbagh";
        }

        return normalized;
    }

    private double roundTwo(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}