package com.crisiscontrol.service;

import com.crisiscontrol.entity.HospitalOutageFuelUsageLog;
import com.crisiscontrol.entity.PowerOutageNotice;
import com.crisiscontrol.entity.PowerOutageStatus;
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
     * Runs every 1 minute.
     * Deducts generator fuel ONLY for hospital/building users whose thana has ONGOING outage.
     */
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void deductFuelForStartedOutagesAutomatically() {
        deductFuelForStartedOutages();
    }

    @Transactional
    public void deductFuelForStartedOutages() {
        LocalDateTime now = LocalDateTime.now();

        List<PowerOutageNotice> notices = powerOutageRepository.findAll();

        for (PowerOutageNotice notice : notices) {
            if (!shouldProcessOutageNotice(notice, now)) {
                continue;
            }

            LocalDateTime outageStart = notice.getStartDateTime();
            LocalDateTime outageDeductUntil = getOutageDeductUntil(notice, now);

            if (outageStart == null || outageDeductUntil == null || !outageDeductUntil.isAfter(outageStart)) {
                continue;
            }

            deductHospitalFuelForNotice(notice, outageStart, outageDeductUntil);
            deductBuildingFuelForNotice(notice, outageStart, outageDeductUntil);
        }
    }

    private boolean shouldProcessOutageNotice(PowerOutageNotice notice, LocalDateTime now) {
        if (notice == null) {
            return false;
        }

        if (notice.getStatus() != PowerOutageStatus.ONGOING) {
            return false;
        }

        if (notice.getStartDateTime() == null) {
            return false;
        }

        if (notice.getStartDateTime().isAfter(now)) {
            return false;
        }

        return true;
    }

    private LocalDateTime getOutageDeductUntil(PowerOutageNotice notice, LocalDateTime now) {
        if (notice.getExpectedRestorationDateTime() == null) {
            return now;
        }

        return notice.getExpectedRestorationDateTime().isBefore(now)
                ? notice.getExpectedRestorationDateTime()
                : now;
    }

    private void deductHospitalFuelForNotice(
            PowerOutageNotice notice,
            LocalDateTime outageStart,
            LocalDateTime outageDeductUntil
    ) {
        List<User> hospitals = userRepository.findByRole(Role.HOSPITAL_AUTHORITY);

        for (User hospital : hospitals) {
            if (!isSameThana(resolveHospitalThana(hospital), notice.getThanaName())) {
                continue;
            }

            double generatorCapacity = valueOrZero(hospital.getHospitalGeneratorCapacity());
            double hourlyConsumption = calculateHourlyDieselConsumption(generatorCapacity);

            if (hourlyConsumption <= 0) {
                continue;
            }

            HospitalOutageFuelUsageLog usageLog = getUsageLog(hospital, notice);
            LocalDateTime deductionStart = getDeductionStart(usageLog, outageStart);

            if (!outageDeductUntil.isAfter(deductionStart)) {
                continue;
            }

            double elapsedHours = calculateElapsedHours(deductionStart, outageDeductUntil);
            double dieselToDeduct = roundTwo(elapsedHours * hourlyConsumption);

            if (dieselToDeduct <= 0) {
                continue;
            }

            double currentReserve = valueOrZero(hospital.getHospitalCurrentDieselReserve());
            double updatedReserve = roundTwo(Math.max(0.0, currentReserve - dieselToDeduct));

            hospital.setHospitalCurrentDieselReserve(updatedReserve);
            hospitalSupportCalculationService.recalculateAndSave(hospital);

            saveUsageLog(hospital, notice, usageLog, outageDeductUntil, dieselToDeduct);
        }
    }

    private void deductBuildingFuelForNotice(
            PowerOutageNotice notice,
            LocalDateTime outageStart,
            LocalDateTime outageDeductUntil
    ) {
        List<User> buildings = userRepository.findByRole(Role.BUILDING_MANAGER);

        for (User building : buildings) {
            if (!isSameThana(resolveBuildingThana(building), notice.getThanaName())) {
                continue;
            }

            double generatorPower = valueOrZero(building.getGeneratorPower());
            double hourlyConsumption = calculateHourlyDieselConsumption(generatorPower);

            if (hourlyConsumption <= 0) {
                continue;
            }

            HospitalOutageFuelUsageLog usageLog = getUsageLog(building, notice);
            LocalDateTime deductionStart = getDeductionStart(usageLog, outageStart);

            if (!outageDeductUntil.isAfter(deductionStart)) {
                continue;
            }

            double elapsedHours = calculateElapsedHours(deductionStart, outageDeductUntil);
            double dieselToDeduct = roundTwo(elapsedHours * hourlyConsumption);

            if (dieselToDeduct <= 0) {
                continue;
            }

            double currentFuel = valueOrZero(building.getBuildingCurrentFuel());
            double updatedFuel = roundTwo(Math.max(0.0, currentFuel - dieselToDeduct));

            building.setBuildingCurrentFuel(updatedFuel);
            building.setBuildingEstimatedBackupHours(calculateBackupHours(updatedFuel, hourlyConsumption));

            userRepository.save(building);

            saveUsageLog(building, notice, usageLog, outageDeductUntil, dieselToDeduct);
        }
    }

    private HospitalOutageFuelUsageLog getUsageLog(User user, PowerOutageNotice notice) {
        return hospitalOutageFuelUsageLogRepository
                .findByHospitalUserAndPowerOutageNotice(user, notice)
                .orElse(null);
    }

    private LocalDateTime getDeductionStart(HospitalOutageFuelUsageLog usageLog, LocalDateTime outageStart) {
        if (usageLog == null || usageLog.getLastDeductedUntil() == null) {
            return outageStart;
        }

        if (usageLog.getLastDeductedUntil().isBefore(outageStart)) {
            return outageStart;
        }

        return usageLog.getLastDeductedUntil();
    }

    private void saveUsageLog(
            User user,
            PowerOutageNotice notice,
            HospitalOutageFuelUsageLog usageLog,
            LocalDateTime outageDeductUntil,
            double dieselToDeduct
    ) {
        if (usageLog == null) {
            usageLog = HospitalOutageFuelUsageLog.builder()
                    .hospitalUser(user)
                    .powerOutageNotice(notice)
                    .lastDeductedUntil(outageDeductUntil)
                    .totalDeductedLiter(dieselToDeduct)
                    .build();
        } else {
            double previousTotal = valueOrZero(usageLog.getTotalDeductedLiter());

            usageLog.setLastDeductedUntil(outageDeductUntil);
            usageLog.setTotalDeductedLiter(roundTwo(previousTotal + dieselToDeduct));
        }

        hospitalOutageFuelUsageLogRepository.save(usageLog);
    }

    private double calculateElapsedHours(LocalDateTime start, LocalDateTime end) {
        return Duration.between(start, end).toSeconds() / 3600.0;
    }

    private double calculateHourlyDieselConsumption(double generatorPower) {
        if (generatorPower <= 0) {
            return 0.0;
        }

        return generatorPower * 0.25;
    }

    private double calculateBackupHours(double currentFuel, double hourlyConsumption) {
        if (currentFuel <= 0 || hourlyConsumption <= 0) {
            return 0.0;
        }

        return roundTwo(currentFuel / hourlyConsumption);
    }

    private String resolveHospitalThana(User hospital) {
        return firstNonBlank(
                hospital.getHospitalUnderThana(),
                hospital.getThanaOrUpazila()
        );
    }

    private String resolveBuildingThana(User building) {
        return firstNonBlank(
                building.getBuildingUnderThana(),
                building.getThanaOrUpazila()
        );
    }

    private boolean isSameThana(String userThana, String outageThana) {
        return normalizeThana(userThana).equals(normalizeThana(outageThana));
    }

    private String normalizeThana(String value) {
        if (value == null) {
            return "";
        }

        String normalized = value.toLowerCase()
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

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.trim().isEmpty() && !value.trim().equals("-")) {
                return value.trim();
            }
        }

        return "";
    }

    private double valueOrZero(Double value) {
        return value == null ? 0.0 : value;
    }

    private double roundTwo(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}