package com.crisiscontrol.service;

import com.crisiscontrol.dto.VehicleRequest;
import com.crisiscontrol.dto.VehicleResponse;
import com.crisiscontrol.entity.CarCategory;
import com.crisiscontrol.entity.User;
import com.crisiscontrol.entity.Vehicle;
import com.crisiscontrol.entity.VehicleType;
import com.crisiscontrol.repository.UserRepository;
import com.crisiscontrol.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class VehicleService {

    private final VehicleRepository vehicleRepository;
    private final UserRepository userRepository;

    public VehicleResponse createVehicle(VehicleRequest request) {

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (vehicleRepository.existsByNumberPlate(request.getNumberPlate())) {
            throw new RuntimeException("Vehicle number plate already exists");
        }

        validateVehicleCategory(request);

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
                .numberPlate(request.getNumberPlate())
                .odometerReading(request.getOdometerReading())
                .vehiclePhotoPath(getPhotoPath(request.getVehiclePhotoPath()))
                .build();

        Vehicle savedVehicle = vehicleRepository.save(vehicle);

        return mapToResponse(savedVehicle);
    }

    public List<VehicleResponse> getVehiclesByUser(Long userId) {
        return vehicleRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public VehicleResponse getVehicleById(Long vehicleId) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new RuntimeException("Vehicle not found"));

        return mapToResponse(vehicle);
    }

    public VehicleResponse updateVehicle(Long vehicleId, VehicleRequest request) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new RuntimeException("Vehicle not found"));

        if (vehicleRepository.existsByNumberPlateAndIdNot(request.getNumberPlate(), vehicleId)) {
            throw new RuntimeException("Vehicle number plate already exists");
        }

        validateVehicleCategory(request);

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        vehicle.setUser(user);
        vehicle.setVehicleType(request.getVehicleType());
        vehicle.setCarCategory(request.getCarCategory());
        vehicle.setBrand(request.getBrand());
        vehicle.setModel(request.getModel());
        vehicle.setFuelType(request.getFuelType());
        vehicle.setEngineCc(request.getEngineCc());
        vehicle.setCompanyMileage(request.getCompanyMileage());
        vehicle.setTankCapacity(request.getTankCapacity());
        vehicle.setNumberPlate(request.getNumberPlate());
        vehicle.setOdometerReading(request.getOdometerReading());
        vehicle.setVehiclePhotoPath(getPhotoPath(request.getVehiclePhotoPath()));

        Vehicle updatedVehicle = vehicleRepository.save(vehicle);

        return mapToResponse(updatedVehicle);
    }

    public void deleteVehicle(Long vehicleId) {
        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new RuntimeException("Vehicle not found"));

        vehicleRepository.delete(vehicle);
    }

    private void validateVehicleCategory(VehicleRequest request) {
        if (request.getVehicleType() == VehicleType.BIKE) {
            request.setCarCategory(CarCategory.NOT_APPLICABLE);
        }

        if (request.getVehicleType() == VehicleType.CAR &&
                request.getCarCategory() == CarCategory.NOT_APPLICABLE) {
            throw new RuntimeException("Car category must be HYBRID or NON_HYBRID");
        }
    }

    private String getPhotoPath(String vehiclePhotoPath) {
        if (vehiclePhotoPath == null || vehiclePhotoPath.isBlank()) {
            return "images/default-vehicle.jpg";
        }

        return vehiclePhotoPath;
    }

    private VehicleResponse mapToResponse(Vehicle vehicle) {
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
                .numberPlate(vehicle.getNumberPlate())
                .odometerReading(vehicle.getOdometerReading())
                .vehiclePhotoPath(vehicle.getVehiclePhotoPath())
                .createdAt(vehicle.getCreatedAt())
                .updatedAt(vehicle.getUpdatedAt())
                .build();
    }
}