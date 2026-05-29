package com.crisiscontrol.service;

import com.crisiscontrol.dto.GeneratorUsageResponse;
import com.crisiscontrol.entity.GeneratorUsage;
import com.crisiscontrol.entity.PowerOutageNotice;
import com.crisiscontrol.entity.PowerOutageStatus;
import com.crisiscontrol.entity.Role;
import com.crisiscontrol.entity.User;
import com.crisiscontrol.repository.GeneratorUsageRepository;
import com.crisiscontrol.repository.PowerOutageRepository;
import com.crisiscontrol.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class GeneratorUsageService {

    private static final double LIGHT_WATT = 20.0;
    private static final double FAN_WATT = 75.0;
    private static final double LIGHTS_PER_FLAT = 2.0;
    private static final double FANS_PER_FLAT = 2.0;
    private static final double DIESEL_LITER_PER_KWH = 0.27;
    private static final double GENERATOR_SAFE_LOAD_FACTOR = 0.80;

    private static final double BASE_CRITICAL_SERVICE_LOAD_KW = 5.0;
    private static final double ICU_UNIT_LOAD_KW = 1.5;
    private static final double AC_PATIENT_LOAD_KW = 0.08;
    private static final double NON_AC_PATIENT_LOAD_KW = 0.04;

    private final GeneratorUsageRepository generatorUsageRepository;
    private final UserRepository userRepository;
    private final PowerOutageRepository powerOutageRepository;

    public void recordUsageFromOutage(PowerOutageNotice notice) {
        if (notice == null || notice.getId() == null) {
            return;
        }

        if (notice.getThanaName() == null || notice.getThanaName().isBlank()) {
            return;
        }

        if (notice.getStartDateTime() == null) {
            return;
        }

        LocalDateTime outageEndTime = resolveOutageEndTime(notice);

        if (outageEndTime == null || !outageEndTime.isAfter(notice.getStartDateTime())) {
            return;
        }

        double usedHours = calculateUsedHours(notice.getStartDateTime(), outageEndTime);

        if (usedHours <= 0) {
            return;
        }

        recordBuildingUsagesForOutage(notice, outageEndTime, usedHours);
        recordHospitalUsagesForOutage(notice, outageEndTime, usedHours);
    }

    public List<GeneratorUsageResponse> getUsageHistoryByUser(Long userId) {
        generateMissingPreviousUsageForUser(userId);

        return generatorUsageRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    private void generateMissingPreviousUsageForUser(Long userId) {
        if (userId == null) {
            return;
        }

        User user = userRepository.findById(userId).orElse(null);

        if (user == null) {
            return;
        }

        if (user.getRole() != Role.BUILDING_MANAGER && user.getRole() != Role.HOSPITAL_AUTHORITY) {
            return;
        }

        String userThana;

        if (user.getRole() == Role.BUILDING_MANAGER) {
            userThana = firstValid(user.getBuildingUnderThana(), user.getThanaOrUpazila());
        } else {
            userThana = firstValid(user.getHospitalUnderThana(), user.getThanaOrUpazila());
        }

        if (userThana == null || userThana.isBlank()) {
            return;
        }

        List<PowerOutageNotice> notices =
                powerOutageRepository.findByThanaNameIgnoreCaseOrderByCreatedAtDesc(userThana);

        for (PowerOutageNotice notice : notices) {
            if (!isFinishedOutage(notice)) {
                continue;
            }

            if (generatorUsageRepository.existsByPowerOutageNoticeIdAndUserId(notice.getId(), user.getId())) {
                continue;
            }

            LocalDateTime outageEndTime = resolveOutageEndTime(notice);

            if (outageEndTime == null || notice.getStartDateTime() == null) {
                continue;
            }

            if (!outageEndTime.isAfter(notice.getStartDateTime())) {
                continue;
            }

            double usedHours = calculateUsedHours(notice.getStartDateTime(), outageEndTime);

            if (usedHours <= 0) {
                continue;
            }

            if (user.getRole() == Role.BUILDING_MANAGER) {
                recordBuildingUsage(user, notice, outageEndTime, usedHours);
            } else {
                recordHospitalUsage(user, notice, outageEndTime, usedHours);
            }
        }
    }

    private boolean isFinishedOutage(PowerOutageNotice notice) {
        if (notice == null) {
            return false;
        }

        if (notice.getStatus() == PowerOutageStatus.RESTORED) {
            return true;
        }

        return notice.getExpectedRestorationDateTime() != null
                && !notice.getExpectedRestorationDateTime().isAfter(LocalDateTime.now());
    }

    private LocalDateTime resolveOutageEndTime(PowerOutageNotice notice) {
        if (notice.getRestoredAt() != null) {
            return notice.getRestoredAt();
        }

        if (notice.getExpectedRestorationDateTime() != null
                && !notice.getExpectedRestorationDateTime().isAfter(LocalDateTime.now())) {
            return notice.getExpectedRestorationDateTime();
        }

        return null;
    }

    private void recordBuildingUsagesForOutage(
            PowerOutageNotice notice,
            LocalDateTime outageEndTime,
            double usedHours
    ) {
        List<User> buildings = userRepository.findByRole(Role.BUILDING_MANAGER);

        for (User user : buildings) {
            String buildingThana = firstValid(user.getBuildingUnderThana(), user.getThanaOrUpazila());

            if (!sameText(buildingThana, notice.getThanaName())) {
                continue;
            }

            if (generatorUsageRepository.existsByPowerOutageNoticeIdAndUserId(notice.getId(), user.getId())) {
                continue;
            }

            recordBuildingUsage(user, notice, outageEndTime, usedHours);
        }
    }

    private void recordHospitalUsagesForOutage(
            PowerOutageNotice notice,
            LocalDateTime outageEndTime,
            double usedHours
    ) {
        List<User> hospitals = userRepository.findByRole(Role.HOSPITAL_AUTHORITY);

        for (User user : hospitals) {
            String hospitalThana = firstValid(user.getHospitalUnderThana(), user.getThanaOrUpazila());

            if (!sameText(hospitalThana, notice.getThanaName())) {
                continue;
            }

            if (generatorUsageRepository.existsByPowerOutageNoticeIdAndUserId(notice.getId(), user.getId())) {
                continue;
            }

            recordHospitalUsage(user, notice, outageEndTime, usedHours);
        }
    }

    private void recordBuildingUsage(
            User user,
            PowerOutageNotice notice,
            LocalDateTime outageEndTime,
            double usedHours
    ) {
        double currentStock = valueOrZero(user.getBuildingCurrentFuel());
        double hourlyConsumption = calculateBuildingHourlyDieselConsumption(user);
        double dieselDeducted = roundTwo(hourlyConsumption * usedHours);

        if (currentStock <= 0 || hourlyConsumption <= 0 || dieselDeducted <= 0) {
            return;
        }

        if (dieselDeducted > currentStock) {
            dieselDeducted = roundTwo(currentStock);
        }

        double dieselAfter = roundTwo(currentStock - dieselDeducted);
        double backupAfter = calculateBuildingBackupHours(user, dieselAfter);

        user.setBuildingCurrentFuel(dieselAfter);
        user.setBuildingEstimatedBackupHours(backupAfter);
        userRepository.save(user);

        GeneratorUsage usage = GeneratorUsage.builder()
                .user(user)
                .powerOutageNotice(notice)
                .authorityType("BUILDING_MANAGER")
                .organizationName(user.getBuildingName())
                .outageThana(notice.getThanaName())
                .outageStartTime(notice.getStartDateTime())
                .outageEndTime(outageEndTime)
                .usedHours(roundTwo(usedHours))
                .generatorCapacity(valueOrZero(user.getGeneratorPower()))
                .dieselBeforeUsage(roundTwo(currentStock))
                .hourlyDieselConsumption(roundTwo(hourlyConsumption))
                .dieselDeducted(dieselDeducted)
                .dieselAfterUsage(dieselAfter)
                .estimatedBackupAfterUsage(backupAfter)
                .finalReason("Diesel deducted automatically because previous utility outage affected this building thana.")
                .build();

        generatorUsageRepository.save(usage);
    }

    private void recordHospitalUsage(
            User user,
            PowerOutageNotice notice,
            LocalDateTime outageEndTime,
            double usedHours
    ) {
        double currentReserve = valueOrZero(user.getHospitalCurrentDieselReserve());
        double hourlyConsumption = calculateHospitalHourlyDieselConsumption(user);
        double dieselDeducted = roundTwo(hourlyConsumption * usedHours);

        if (currentReserve <= 0 || hourlyConsumption <= 0 || dieselDeducted <= 0) {
            return;
        }

        if (dieselDeducted > currentReserve) {
            dieselDeducted = roundTwo(currentReserve);
        }

        double dieselAfter = roundTwo(currentReserve - dieselDeducted);
        double backupAfter = calculateHospitalBackupHours(user, dieselAfter);
        String dieselStatus = resolveHospitalDieselStatus(backupAfter);

        user.setHospitalCurrentDieselReserve(dieselAfter);
        user.setHospitalEstimatedBackupHours(backupAfter);
        user.setHospitalDieselStatus(dieselStatus);
        userRepository.save(user);

        GeneratorUsage usage = GeneratorUsage.builder()
                .user(user)
                .powerOutageNotice(notice)
                .authorityType("HOSPITAL_AUTHORITY")
                .organizationName(user.getHospitalName())
                .outageThana(notice.getThanaName())
                .outageStartTime(notice.getStartDateTime())
                .outageEndTime(outageEndTime)
                .usedHours(roundTwo(usedHours))
                .generatorCapacity(valueOrZero(user.getHospitalGeneratorCapacity()))
                .dieselBeforeUsage(roundTwo(currentReserve))
                .hourlyDieselConsumption(roundTwo(hourlyConsumption))
                .dieselDeducted(dieselDeducted)
                .dieselAfterUsage(dieselAfter)
                .estimatedBackupAfterUsage(backupAfter)
                .finalReason("Diesel deducted automatically because previous utility outage affected this hospital thana.")
                .build();

        generatorUsageRepository.save(usage);
    }

    private double calculateUsedHours(LocalDateTime startTime, LocalDateTime endTime) {
        long minutes = Duration.between(startTime, endTime).toMinutes();

        if (minutes <= 0) {
            return 0.0;
        }

        return roundTwo(minutes / 60.0);
    }

    private double calculateBuildingHourlyDieselConsumption(User user) {
        double flats = valueOrZero(user.getNumberOfFlats());
        double generatorKva = valueOrZero(user.getGeneratorPower());

        if (flats <= 0) {
            return 0.0;
        }

        double perFlatKw = ((LIGHTS_PER_FLAT * LIGHT_WATT) + (FANS_PER_FLAT * FAN_WATT)) / 1000.0;
        double requiredLoadKw = flats * perFlatKw;
        double safeGeneratorKw = generatorKva > 0 ? generatorKva * GENERATOR_SAFE_LOAD_FACTOR : 0.0;

        double effectiveLoadKw = requiredLoadKw;

        if (safeGeneratorKw > 0 && safeGeneratorKw < requiredLoadKw) {
            effectiveLoadKw = safeGeneratorKw;
        }

        return roundTwo(effectiveLoadKw * DIESEL_LITER_PER_KWH);
    }

    private double calculateBuildingBackupHours(User user, double currentFuel) {
        double hourlyConsumption = calculateBuildingHourlyDieselConsumption(user);

        if (currentFuel <= 0 || hourlyConsumption <= 0) {
            return 0.0;
        }

        return roundTwo(currentFuel / hourlyConsumption);
    }

    private double calculateHospitalHourlyDieselConsumption(User user) {
        double generatorKva = valueOrZero(user.getHospitalGeneratorCapacity());
        double safeGeneratorKw = generatorKva > 0 ? generatorKva * GENERATOR_SAFE_LOAD_FACTOR : 0.0;

        double criticalLoadKw = BASE_CRITICAL_SERVICE_LOAD_KW;
        criticalLoadKw += valueOrZero(user.getTotalIcuUnits()) * ICU_UNIT_LOAD_KW;
        criticalLoadKw += valueOrZero(user.getAcPatientCapacity()) * AC_PATIENT_LOAD_KW;
        criticalLoadKw += valueOrZero(user.getNonAcPatientCapacity()) * NON_AC_PATIENT_LOAD_KW;

        double effectiveLoadKw = criticalLoadKw;

        if (safeGeneratorKw > 0 && safeGeneratorKw < criticalLoadKw) {
            effectiveLoadKw = safeGeneratorKw;
        }

        return roundTwo(effectiveLoadKw * DIESEL_LITER_PER_KWH);
    }

    private double calculateHospitalBackupHours(User user, double currentReserve) {
        double hourlyConsumption = calculateHospitalHourlyDieselConsumption(user);

        if (currentReserve <= 0 || hourlyConsumption <= 0) {
            return 0.0;
        }

        return roundTwo(currentReserve / hourlyConsumption);
    }

    private String resolveHospitalDieselStatus(double backupHours) {
        if (backupHours < 6) {
            return "CRITICAL";
        }

        if (backupHours < 8) {
            return "MIDDLE";
        }

        if (backupHours < 12) {
            return "RISK_FREE";
        }

        return "ENOUGH";
    }

    private GeneratorUsageResponse mapToResponse(GeneratorUsage usage) {
        return GeneratorUsageResponse.builder()
                .id(usage.getId())
                .userId(usage.getUser().getId())
                .powerOutageNoticeId(usage.getPowerOutageNotice() == null ? null : usage.getPowerOutageNotice().getId())
                .authorityType(usage.getAuthorityType())
                .organizationName(usage.getOrganizationName())
                .outageThana(usage.getOutageThana())
                .outageStartTime(usage.getOutageStartTime())
                .outageEndTime(usage.getOutageEndTime())
                .usedHours(usage.getUsedHours())
                .generatorCapacity(usage.getGeneratorCapacity())
                .dieselBeforeUsage(usage.getDieselBeforeUsage())
                .hourlyDieselConsumption(usage.getHourlyDieselConsumption())
                .dieselDeducted(usage.getDieselDeducted())
                .dieselAfterUsage(usage.getDieselAfterUsage())
                .estimatedBackupAfterUsage(usage.getEstimatedBackupAfterUsage())
                .finalReason(usage.getFinalReason())
                .createdAt(usage.getCreatedAt())
                .build();
    }

    private boolean sameText(String first, String second) {
        if (first == null || second == null) {
            return false;
        }

        return first.trim().equalsIgnoreCase(second.trim());
    }

    private String firstValid(String first, String second) {
        if (first != null && !first.isBlank()) {
            return first;
        }

        if (second != null && !second.isBlank()) {
            return second;
        }

        return "";
    }

    private double valueOrZero(Double value) {
        return value == null ? 0.0 : value;
    }

    private double valueOrZero(Integer value) {
        return value == null ? 0.0 : value;
    }

    private double roundTwo(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}