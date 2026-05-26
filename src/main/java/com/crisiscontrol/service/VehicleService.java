package com.crisiscontrol.service;

import com.crisiscontrol.dto.VehicleRequest;
import com.crisiscontrol.dto.VehicleResponse;
import com.crisiscontrol.entity.CarCategory;
import com.crisiscontrol.entity.FuelRequest;
import com.crisiscontrol.entity.FuelRequestStatus;
import com.crisiscontrol.entity.User;
import com.crisiscontrol.entity.Vehicle;
import com.crisiscontrol.entity.VehicleType;
import com.crisiscontrol.repository.FuelRequestRepository;
import com.crisiscontrol.repository.UserRepository;
import com.crisiscontrol.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class VehicleService {

    private final VehicleRepository vehicleRepository;
    private final UserRepository userRepository;
    private final FuelRequestRepository fuelRequestRepository;

    public VehicleResponse createVehicle(VehicleRequest request) {

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (vehicleRepository.existsByNumberPlateAndDeletedFalse(request.getNumberPlate())) {
            throw new RuntimeException("Vehicle number plate already exists");
        }

        validateVehicleCategory(request);
        validateOneBikeOneCarRule(user.getId(), request.getVehicleType(), null);
        validateSmartNumberPlate(request.getNumberPlate());
        validateCurrentFuelLiter(request);

        Vehicle vehicle = Vehicle.builder()
                .user(user)
                .vehicleType(request.getVehicleType())
                .carCategory(request.getCarCategory())
                .brand(request.getBrand())
                .model(request.getModel())
                .fuelType(request.getFuelType())
                .engineCc(request.getEngineCc())
                .companyMileage(request.getCompanyMileage())
                .tankCapacity(request.getTankCapacity())
                .currentFuelLiter(request.getCurrentFuelLiter())
                .numberPlate(request.getNumberPlate())
                .odometerReading(request.getOdometerReading())
                .vehiclePhotoPath(getPhotoPath(request.getVehiclePhotoPath()))
                .deleted(false)
                .deletedAt(null)
                .build();

        Vehicle savedVehicle = vehicleRepository.save(vehicle);

        return mapToResponse(savedVehicle);
    }

    public List<VehicleResponse> getVehiclesByUser(Long userId) {
        return vehicleRepository.findByUserIdAndDeletedFalseOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public VehicleResponse getVehicleById(Long vehicleId) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new RuntimeException("Vehicle not found"));

        if (Boolean.TRUE.equals(vehicle.getDeleted())) {
            throw new RuntimeException("Vehicle not found");
        }

        return mapToResponse(vehicle);
    }

    public VehicleResponse updateVehicle(Long vehicleId, VehicleRequest request) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new RuntimeException("Vehicle not found"));

        if (Boolean.TRUE.equals(vehicle.getDeleted())) {
            throw new RuntimeException("Deleted vehicle cannot be updated");
        }

        if (vehicleRepository.existsByNumberPlateAndDeletedFalseAndIdNot(request.getNumberPlate(), vehicleId)) {
            throw new RuntimeException("Vehicle number plate already exists");
        }

        validateCurrentFuelLiter(request);
        validateVehicleCategory(request);

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        validateOneBikeOneCarRule(user.getId(), request.getVehicleType(), vehicleId);
        validateSmartNumberPlate(request.getNumberPlate());

        vehicle.setUser(user);
        vehicle.setVehicleType(request.getVehicleType());
        vehicle.setCarCategory(request.getCarCategory());
        vehicle.setBrand(request.getBrand());
        vehicle.setModel(request.getModel());
        vehicle.setFuelType(request.getFuelType());
        vehicle.setEngineCc(request.getEngineCc());
        vehicle.setCompanyMileage(request.getCompanyMileage());
        vehicle.setTankCapacity(request.getTankCapacity());
        vehicle.setCurrentFuelLiter(request.getCurrentFuelLiter());
        vehicle.setNumberPlate(request.getNumberPlate());
        vehicle.setOdometerReading(request.getOdometerReading());
        vehicle.setVehiclePhotoPath(getPhotoPath(request.getVehiclePhotoPath()));

        Vehicle updatedVehicle = vehicleRepository.save(vehicle);

        return mapToResponse(updatedVehicle);
    }

    public void deleteVehicle(Long vehicleId) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new RuntimeException("Vehicle not found"));

        if (Boolean.TRUE.equals(vehicle.getDeleted())) {
            throw new RuntimeException("Vehicle is already deleted");
        }

        vehicle.setDeleted(true);
        vehicle.setDeletedAt(LocalDateTime.now());

        vehicleRepository.save(vehicle);
    }

    private void validateVehicleCategory(VehicleRequest request) {
        if (request.getVehicleType() == null) {
            throw new RuntimeException("Vehicle type is required");
        }

        if (request.getVehicleType() == VehicleType.BIKE) {
            request.setCarCategory(CarCategory.NOT_APPLICABLE);
        }

        if (request.getVehicleType() == VehicleType.CAR &&
                request.getCarCategory() == CarCategory.NOT_APPLICABLE) {
            throw new RuntimeException("Car category must be HYBRID or NON_HYBRID");
        }
    }

    private void validateOneBikeOneCarRule(Long userId, VehicleType vehicleType, Long currentVehicleId) {
        if (vehicleType == null) {
            throw new RuntimeException("Vehicle type is required");
        }

        boolean alreadyExists;

        /*
         * Crisis-control rule:
         * Deleted vehicles are still counted.
         * A user cannot delete a bike/car and then register another same type vehicle.
         * This prevents misuse during crisis fuel control.
         */
        if (currentVehicleId == null) {
            alreadyExists = vehicleRepository.existsByUserIdAndVehicleType(userId, vehicleType);
        } else {
            alreadyExists = vehicleRepository.existsByUserIdAndVehicleTypeAndIdNot(
                    userId,
                    vehicleType,
                    currentVehicleId
            );
        }

        if (alreadyExists && vehicleType == VehicleType.BIKE) {
            throw new RuntimeException("Only one bike can ever be registered under one account/license, even if a previous bike was deleted.");
        }

        if (alreadyExists && vehicleType == VehicleType.CAR) {
            throw new RuntimeException("Only one car can ever be registered under one account/license, even if a previous car was deleted.");
        }
    }

    private String getPhotoPath(String vehiclePhotoPath) {
        if (vehiclePhotoPath == null || vehiclePhotoPath.isBlank()) {
            return "images/default-vehicle.jpg";
        }

        return vehiclePhotoPath;
    }

    private VehicleResponse mapToResponse(Vehicle vehicle) {
        Optional<FuelRequest> latestCollectedFuelRequest =
                fuelRequestRepository.findFirstByVehicleIdAndRequestStatusOrderByCollectedAtDesc(
                        vehicle.getId(),
                        FuelRequestStatus.COLLECTED
                );

        String lastFuelPumpName = latestCollectedFuelRequest
                .map(FuelRequest::getPumpProfile)
                .map(pumpProfile -> pumpProfile == null ? "Not collected yet" : pumpProfile.getPumpName())
                .orElse("Not collected yet");

        BigDecimal fuelAfterLastInsertionLiter = vehicle.getCurrentFuelLiter() == null
                ? BigDecimal.ZERO
                : vehicle.getCurrentFuelLiter();

        return VehicleResponse.builder()
                .id(vehicle.getId())
                .userId(vehicle.getUser().getId())
                .ownerName(vehicle.getUser().getFullName())
                .vehicleType(vehicle.getVehicleType())
                .carCategory(vehicle.getCarCategory())
                .brand(vehicle.getBrand())
                .model(vehicle.getModel())
                .fuelType(vehicle.getFuelType())
                .engineCc(vehicle.getEngineCc())
                .companyMileage(vehicle.getCompanyMileage())
                .tankCapacity(vehicle.getTankCapacity())
                .currentFuelLiter(vehicle.getCurrentFuelLiter())
                .lastFuelPumpName(lastFuelPumpName)
                .fuelAfterLastInsertionLiter(fuelAfterLastInsertionLiter)
                .numberPlate(vehicle.getNumberPlate())
                .odometerReading(vehicle.getOdometerReading())
                .vehiclePhotoPath(vehicle.getVehiclePhotoPath())
                .deleted(vehicle.getDeleted())
                .deletedAt(vehicle.getDeletedAt())
                .createdAt(vehicle.getCreatedAt())
                .updatedAt(vehicle.getUpdatedAt())
                .build();
    }

    private void validateSmartNumberPlate(String numberPlate) {
        if (numberPlate == null || numberPlate.trim().isEmpty()) {
            throw new RuntimeException("Vehicle number plate is required");
        }

        String trimmedPlate = numberPlate.trim();

        if (!trimmedPlate.matches("^[A-Z ]+ [A-Z]+ \\d{6}$")) {
            throw new RuntimeException("Vehicle number plate must include metro/district, auto series, and exactly 6 digit number");
        }
    }

    private void validateCurrentFuelLiter(VehicleRequest request) {
        if (request.getCurrentFuelLiter() == null) {
            throw new RuntimeException("Current fuel liter is required");
        }

        if (request.getCurrentFuelLiter().compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("Current fuel liter cannot be negative");
        }

        if (
                request.getTankCapacity() != null
                        && request.getCurrentFuelLiter().compareTo(request.getTankCapacity()) > 0
        ) {
            throw new RuntimeException("Current fuel liter cannot be greater than tank capacity");
        }
    }
}