package com.crisiscontrol.service;

import com.crisiscontrol.entity.User;
import com.crisiscontrol.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class HospitalSupportCalculationService {

    private final UserRepository userRepository;

    public User recalculateAndSave(User hospitalUser) {
        double currentReserve = hospitalUser.getHospitalCurrentDieselReserve() == null
                ? 0.0
                : hospitalUser.getHospitalCurrentDieselReserve();

        double backupHours = calculateBackupHours(
                hospitalUser.getHospitalGeneratorCapacity(),
                currentReserve
        );

        hospitalUser.setHospitalEstimatedBackupHours(backupHours);
        hospitalUser.setHospitalDieselStatus(resolveDieselStatus(backupHours));

        return userRepository.save(hospitalUser);
    }

    public double calculateBackupHours(String generatorCapacity, Double dieselReserve) {
        if (generatorCapacity == null || generatorCapacity.trim().isEmpty()) {
            return 0.0;
        }

        if (dieselReserve == null || dieselReserve <= 0) {
            return 0.0;
        }

        Double kva = extractKvaFromGeneratorCapacity(generatorCapacity);

        if (kva == null || kva <= 0) {
            return 0.0;
        }

        double dieselConsumptionPerHour = kva * 0.25;

        if (dieselConsumptionPerHour <= 0) {
            return 0.0;
        }

        double estimatedHours = dieselReserve / dieselConsumptionPerHour;

        return Math.round(estimatedHours * 100.0) / 100.0;
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
}