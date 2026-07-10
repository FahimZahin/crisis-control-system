package com.crisiscontrol.service;

import com.crisiscontrol.entity.User;
import com.crisiscontrol.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class HospitalSupportCalculationService {

    private static final double MINIMUM_HOSPITAL_BACKUP_HOURS = 6.0;

    private static final double BASE_CRITICAL_SERVICE_LOAD_KW = 5.0;
    private static final double ICU_UNIT_LOAD_KW = 1.5;
    private static final double AC_PATIENT_LOAD_KW = 0.08;
    private static final double NON_AC_PATIENT_LOAD_KW = 0.04;

    private static final double DIESEL_LITER_PER_KWH = 0.27;
    private static final double GENERATOR_SAFE_LOAD_FACTOR = 0.80;

    private final UserRepository userRepository;

    public User recalculateAndSave(User hospitalUser) {
        double currentReserve = valueOrZero(hospitalUser.getHospitalCurrentDieselReserve());
        double backupHours = calculateBackupHours(hospitalUser, currentReserve);

        hospitalUser.setHospitalEstimatedBackupHours(backupHours);
        hospitalUser.setHospitalDieselStatus(resolveDieselStatus(backupHours));

        return userRepository.save(hospitalUser);
    }

    public double calculateBackupHours(User hospitalUser, Double dieselReserve) {
        double reserve = valueOrZero(dieselReserve);
        double hourlyConsumption = calculateHourlyDieselConsumption(hospitalUser);

        if (reserve <= 0 || hourlyConsumption <= 0) {
            return 0.0;
        }

        return roundTwo(reserve / hourlyConsumption);
    }

    public double calculateBackupHours(String generatorCapacity, Double dieselReserve) {
        double reserve = valueOrZero(dieselReserve);
        double generatorKva = valueOrZero(extractKvaFromGeneratorCapacity(generatorCapacity));

        if (reserve <= 0 || generatorKva <= 0) {
            return 0.0;
        }

        double hourlyConsumption = generatorKva * 0.25;

        if (hourlyConsumption <= 0) {
            return 0.0;
        }

        return roundTwo(reserve / hourlyConsumption);
    }

    public double calculateHourlyDieselConsumption(User hospitalUser) {
        double effectiveCriticalLoadKw = calculateEffectiveCriticalLoadKw(hospitalUser);

        if (effectiveCriticalLoadKw <= 0) {
            return 0.0;
        }

        return roundTwo(effectiveCriticalLoadKw * DIESEL_LITER_PER_KWH);
    }

    public double calculateRequiredDieselForMinimumBackup(User hospitalUser) {
        double hourlyConsumption = calculateHourlyDieselConsumption(hospitalUser);

        if (hourlyConsumption <= 0) {
            return 0.0;
        }

        return roundTwo(hourlyConsumption * MINIMUM_HOSPITAL_BACKUP_HOURS);
    }

    public double calculateDieselShortageForMinimumBackup(User hospitalUser) {
        double requiredDiesel = calculateRequiredDieselForMinimumBackup(hospitalUser);
        double currentReserve = valueOrZero(hospitalUser.getHospitalCurrentDieselReserve());

        return roundTwo(Math.max(0.0, requiredDiesel - currentReserve));
    }

    public double calculateAvailableTankSpace(User hospitalUser) {
        double tankCapacity = valueOrZero(hospitalUser.getHospitalDieselTankCapacity());
        double currentReserve = valueOrZero(hospitalUser.getHospitalCurrentDieselReserve());

        return roundTwo(Math.max(0.0, tankCapacity - currentReserve));
    }

    public double calculateAutoApprovalDieselLimit(User hospitalUser) {
        double shortage = calculateDieselShortageForMinimumBackup(hospitalUser);
        double availableSpace = calculateAvailableTankSpace(hospitalUser);

        return roundTwo(Math.min(shortage, availableSpace));
    }

    public double calculateCriticalServiceLoadKw(User hospitalUser) {
        int icuUnits = valueOrZero(hospitalUser.getTotalIcuUnits());
        int acPatients = valueOrZero(hospitalUser.getAcPatientCapacity());
        int nonAcPatients = valueOrZero(hospitalUser.getNonAcPatientCapacity());

        double loadKw = BASE_CRITICAL_SERVICE_LOAD_KW;
        loadKw += icuUnits * ICU_UNIT_LOAD_KW;
        loadKw += acPatients * AC_PATIENT_LOAD_KW;
        loadKw += nonAcPatients * NON_AC_PATIENT_LOAD_KW;

        return roundTwo(loadKw);
    }

    public double calculateSafeGeneratorCapacityKw(User hospitalUser) {
        double generatorKva = valueOrZero(hospitalUser.getHospitalGeneratorCapacity());

        if (generatorKva <= 0) {
            return 0.0;
        }

        return roundTwo(generatorKva * GENERATOR_SAFE_LOAD_FACTOR);
    }

    public double calculateEffectiveCriticalLoadKw(User hospitalUser) {
        double criticalLoadKw = calculateCriticalServiceLoadKw(hospitalUser);
        double safeGeneratorCapacityKw = calculateSafeGeneratorCapacityKw(hospitalUser);

        if (criticalLoadKw <= 0) {
            return 0.0;
        }

        if (safeGeneratorCapacityKw > 0 && safeGeneratorCapacityKw < criticalLoadKw) {
            return safeGeneratorCapacityKw;
        }

        return criticalLoadKw;
    }

    public boolean hasGeneratorOverloadRisk(User hospitalUser) {
        double criticalLoadKw = calculateCriticalServiceLoadKw(hospitalUser);
        double safeGeneratorCapacityKw = calculateSafeGeneratorCapacityKw(hospitalUser);

        return criticalLoadKw > 0
                && safeGeneratorCapacityKw > 0
                && criticalLoadKw > safeGeneratorCapacityKw;
    }

    public String resolveDieselStatus(Double backupHours) {
        if (backupHours == null || backupHours < 6) {
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

    public String resolveHospitalPriorityLevel(User hospitalUser) {
        double backupHours = calculateBackupHours(
                hospitalUser,
                hospitalUser.getHospitalCurrentDieselReserve()
        );

        int icuUnits = valueOrZero(hospitalUser.getTotalIcuUnits());
        int totalPatients = valueOrZero(hospitalUser.getAcPatientCapacity())
                + valueOrZero(hospitalUser.getNonAcPatientCapacity());

        if (backupHours < 6 && icuUnits > 0) {
            return "CRITICAL ICU PRIORITY";
        }

        if (backupHours < 6 && totalPatients >= 50) {
            return "CRITICAL HIGH PATIENT PRIORITY";
        }

        if (backupHours < 6) {
            return "CRITICAL STANDARD PRIORITY";
        }

        if (backupHours < 8) {
            return "MONITORING PRIORITY";
        }

        return "SAFE";
    }

    public boolean canApplyForGeneratorDiesel(User hospitalUser) {
        double backupHours = hospitalUser.getHospitalEstimatedBackupHours() == null
                ? 0.0
                : hospitalUser.getHospitalEstimatedBackupHours();

        return backupHours < 6;
    }

    private Double extractKvaFromGeneratorCapacity(String generatorCapacity) {
        if (generatorCapacity == null) {
            return null;
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
            return null;
        }

        try {
            return Double.parseDouble(numberBuilder.toString());
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private double valueOrZero(Double value) {
        return value == null ? 0.0 : value;
    }

    private int valueOrZero(Integer value) {
        return value == null ? 0 : value;
    }

    private double roundTwo(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}