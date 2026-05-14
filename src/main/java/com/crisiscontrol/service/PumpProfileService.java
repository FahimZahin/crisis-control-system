package com.crisiscontrol.service;

import com.crisiscontrol.dto.PumpFuelStockRequest;
import com.crisiscontrol.dto.PumpFuelStockResponse;
import com.crisiscontrol.dto.PumpProfileResponse;
import com.crisiscontrol.dto.PumpStatusUpdateRequest;
import com.crisiscontrol.dto.PumpStockUpdateRequest;
import com.crisiscontrol.entity.*;
import com.crisiscontrol.repository.PumpFuelStockRepository;
import com.crisiscontrol.repository.PumpProfileRepository;
import com.crisiscontrol.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PumpProfileService {

    private final PumpProfileRepository pumpProfileRepository;
    private final PumpFuelStockRepository pumpFuelStockRepository;
    private final UserRepository userRepository;

    @Transactional
    public PumpProfileResponse createFromUser(Long userId) {

        if (pumpProfileRepository.existsByUserId(userId)) {
            PumpProfile existingPump = pumpProfileRepository.findByUserId(userId)
                    .orElseThrow(() -> new RuntimeException("Pump profile not found"));

            return mapToResponse(existingPump);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getRole() != Role.PUMP_AUTHORITY) {
            throw new RuntimeException("Only pump authority can create pump profile");
        }

        if (isBlank(user.getPumpName())) {
            throw new RuntimeException("Pump name is missing from registration data");
        }

        if (isBlank(user.getBusinessLicenseNumber())) {
            throw new RuntimeException("Business license number is missing from registration data");
        }

        if (isBlank(user.getPumpAddress())) {
            throw new RuntimeException("Pump address is missing from registration data");
        }

        if (isBlank(user.getFuelTypes())) {
            throw new RuntimeException("Fuel types are missing from registration data");
        }

        BigDecimal registrationCapacity = user.getFuelCapacity() == null
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(user.getFuelCapacity());

        BigDecimal registrationStock = user.getCurrentStock() == null
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(user.getCurrentStock());

        if (registrationCapacity.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Fuel capacity is missing from registration data");
        }

        if (registrationStock.compareTo(registrationCapacity) > 0) {
            throw new RuntimeException("Current stock cannot be greater than fuel capacity");
        }

        PumpProfile pumpProfile = PumpProfile.builder()
                .user(user)
                .pumpName(user.getPumpName())
                .businessLicenseNumber(user.getBusinessLicenseNumber())
                .pumpAddress(user.getPumpAddress())
                .fuelCapacity(registrationCapacity)
                .currentStock(registrationStock)
                .fuelTypes(user.getFuelTypes())
                .open24Hours(Boolean.TRUE.equals(user.getOpen24Hours()))
                .openingTime(user.getOpeningTime())
                .closingTime(user.getClosingTime())
                .pumpStatus(PumpStatus.OPEN)
                .build();

        PumpProfile savedPump = pumpProfileRepository.save(pumpProfile);

        createDefaultFuelStocksFromRegistration(savedPump, user.getFuelTypes(), registrationCapacity, registrationStock);

        return mapToResponse(savedPump);
    }

    public PumpProfileResponse getPumpByUser(Long userId) {
        PumpProfile pumpProfile = pumpProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Pump profile not found. Please create pump profile first."));

        return mapToResponse(pumpProfile);
    }

    public PumpProfileResponse getPumpById(Long pumpId) {
        PumpProfile pumpProfile = pumpProfileRepository.findById(pumpId)
                .orElseThrow(() -> new RuntimeException("Pump profile not found"));

        return mapToResponse(pumpProfile);
    }

    public List<PumpProfileResponse> getAvailablePumps() {
        return pumpProfileRepository.findByPumpStatusOrderByUpdatedAtDesc(PumpStatus.OPEN)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<PumpProfileResponse> getAllPumps() {
        return pumpProfileRepository.findAllByOrderByUpdatedAtDesc()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional
    public PumpProfileResponse updateStock(Long pumpId, PumpStockUpdateRequest request) {
        PumpProfile pumpProfile = pumpProfileRepository.findById(pumpId)
                .orElseThrow(() -> new RuntimeException("Pump profile not found"));

        validateStockRequest(request);

        pumpFuelStockRepository.deleteByPumpProfileId(pumpId);

        BigDecimal totalCapacity = BigDecimal.ZERO;
        BigDecimal totalCurrentStock = BigDecimal.ZERO;
        StringBuilder fuelTypesBuilder = new StringBuilder();

        for (PumpFuelStockRequest stockRequest : request.getFuelStocks()) {
            if (stockRequest.getCurrentStock().compareTo(stockRequest.getFuelCapacity()) > 0) {
                throw new RuntimeException(stockRequest.getFuelType() + " current stock cannot be greater than capacity");
            }

            PumpFuelStock stock = PumpFuelStock.builder()
                    .pumpProfile(pumpProfile)
                    .fuelType(stockRequest.getFuelType())
                    .fuelCapacity(stockRequest.getFuelCapacity())
                    .currentStock(stockRequest.getCurrentStock())
                    .build();

            pumpFuelStockRepository.save(stock);

            totalCapacity = totalCapacity.add(stockRequest.getFuelCapacity());
            totalCurrentStock = totalCurrentStock.add(stockRequest.getCurrentStock());

            if (!fuelTypesBuilder.isEmpty()) {
                fuelTypesBuilder.append(",");
            }

            fuelTypesBuilder.append(stockRequest.getFuelType().name());
        }

        pumpProfile.setFuelCapacity(totalCapacity);
        pumpProfile.setCurrentStock(totalCurrentStock);
        pumpProfile.setFuelTypes(fuelTypesBuilder.toString());
        pumpProfile.setOpen24Hours(request.getOpen24Hours());

        if (Boolean.TRUE.equals(request.getOpen24Hours())) {
            pumpProfile.setOpeningTime(null);
            pumpProfile.setClosingTime(null);
        } else {
            pumpProfile.setOpeningTime(request.getOpeningTime());
            pumpProfile.setClosingTime(request.getClosingTime());
        }

        PumpProfile updatedPump = pumpProfileRepository.save(pumpProfile);

        return mapToResponse(updatedPump);
    }

    public PumpProfileResponse updateStatus(Long pumpId, PumpStatusUpdateRequest request) {
        PumpProfile pumpProfile = pumpProfileRepository.findById(pumpId)
                .orElseThrow(() -> new RuntimeException("Pump profile not found"));

        pumpProfile.setPumpStatus(request.getPumpStatus());

        PumpProfile updatedPump = pumpProfileRepository.save(pumpProfile);

        return mapToResponse(updatedPump);
    }

    private void createDefaultFuelStocksFromRegistration(
            PumpProfile pumpProfile,
            String fuelTypes,
            BigDecimal totalCapacity,
            BigDecimal totalStock
    ) {
        List<String> types = Arrays.stream(fuelTypes.split(","))
                .map(String::trim)
                .filter(type -> !type.isEmpty())
                .toList();

        if (types.isEmpty()) {
            return;
        }

        BigDecimal typeCount = BigDecimal.valueOf(types.size());

        BigDecimal capacityPerType = totalCapacity.divide(typeCount, 2, java.math.RoundingMode.HALF_UP);
        BigDecimal stockPerType = totalStock.divide(typeCount, 2, java.math.RoundingMode.HALF_UP);

        for (String type : types) {
            FuelType fuelType = FuelType.valueOf(type);

            PumpFuelStock stock = PumpFuelStock.builder()
                    .pumpProfile(pumpProfile)
                    .fuelType(fuelType)
                    .fuelCapacity(capacityPerType)
                    .currentStock(stockPerType)
                    .build();

            pumpFuelStockRepository.save(stock);
        }
    }

    private void validateStockRequest(PumpStockUpdateRequest request) {
        if (request.getFuelStocks() == null || request.getFuelStocks().isEmpty()) {
            throw new RuntimeException("At least one fuel stock is required");
        }

        if (!Boolean.TRUE.equals(request.getOpen24Hours())) {
            if (isBlank(request.getOpeningTime())) {
                throw new RuntimeException("Opening time is required if pump is not open 24 hours");
            }

            if (isBlank(request.getClosingTime())) {
                throw new RuntimeException("Closing time is required if pump is not open 24 hours");
            }
        }
    }

    private PumpProfileResponse mapToResponse(PumpProfile pumpProfile) {
        List<PumpFuelStockResponse> stockResponses = pumpFuelStockRepository
                .findByPumpProfileIdOrderByFuelTypeAsc(pumpProfile.getId())
                .stream()
                .map(this::mapToFuelStockResponse)
                .toList();

        BigDecimal totalCapacity = stockResponses.stream()
                .map(PumpFuelStockResponse::getFuelCapacity)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalCurrentStock = stockResponses.stream()
                .map(PumpFuelStockResponse::getCurrentStock)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalAvailableStock = totalCapacity.subtract(totalCurrentStock);

        return PumpProfileResponse.builder()
                .id(pumpProfile.getId())
                .userId(pumpProfile.getUser().getId())
                .ownerName(pumpProfile.getUser().getFullName())
                .phoneNumber(pumpProfile.getUser().getPhoneNumber())
                .pumpName(pumpProfile.getPumpName())
                .businessLicenseNumber(pumpProfile.getBusinessLicenseNumber())
                .pumpAddress(pumpProfile.getPumpAddress())
                .totalFuelCapacity(totalCapacity)
                .totalCurrentStock(totalCurrentStock)
                .totalAvailableStock(totalAvailableStock)
                .fuelTypes(pumpProfile.getFuelTypes())
                .open24Hours(pumpProfile.getOpen24Hours())
                .openingTime(pumpProfile.getOpeningTime())
                .closingTime(pumpProfile.getClosingTime())
                .pumpStatus(pumpProfile.getPumpStatus())
                .fuelStocks(stockResponses)
                .createdAt(pumpProfile.getCreatedAt())
                .updatedAt(pumpProfile.getUpdatedAt())
                .build();
    }

    private PumpFuelStockResponse mapToFuelStockResponse(PumpFuelStock stock) {
        return PumpFuelStockResponse.builder()
                .id(stock.getId())
                .fuelType(stock.getFuelType())
                .fuelCapacity(stock.getFuelCapacity())
                .currentStock(stock.getCurrentStock())
                .availableStock(stock.getFuelCapacity().subtract(stock.getCurrentStock()))
                .updatedAt(stock.getUpdatedAt())
                .build();
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}