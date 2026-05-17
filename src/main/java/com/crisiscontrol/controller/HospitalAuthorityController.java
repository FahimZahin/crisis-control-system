package com.crisiscontrol.controller;

import com.crisiscontrol.dto.AuthResponse;
import com.crisiscontrol.entity.Role;
import com.crisiscontrol.entity.User;
import com.crisiscontrol.repository.UserRepository;
import com.crisiscontrol.service.HospitalOutageFuelConsumptionService;
import com.crisiscontrol.service.HospitalSupportCalculationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/hospital-authority")
@RequiredArgsConstructor
public class HospitalAuthorityController {

    private final UserRepository userRepository;
    private final HospitalSupportCalculationService hospitalSupportCalculationService;
    private final HospitalOutageFuelConsumptionService hospitalOutageFuelConsumptionService;

    @GetMapping("/profile/{userId}")
    public ResponseEntity<AuthResponse> getLatestHospitalProfile(@PathVariable Long userId) {
        /*
         * First deduct generator diesel for any outage time that already happened.
         * Then reload the hospital profile.
         */
        hospitalOutageFuelConsumptionService.deductFuelForStartedOutages();

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Hospital user not found"));

        if (user.getRole() != Role.HOSPITAL_AUTHORITY) {
            throw new RuntimeException("Only Hospital Authority profile can be loaded here");
        }

        User updatedUser = hospitalSupportCalculationService.recalculateAndSave(user);

        return ResponseEntity.ok(buildAuthResponse("Hospital profile refreshed", updatedUser));
    }

    private AuthResponse buildAuthResponse(String message, User user) {
        return AuthResponse.builder()
                .message(message)
                .userId(user.getId())
                .fullName(user.getFullName())
                .phoneNumber(user.getPhoneNumber())
                .address(user.getAddress())
                .role(user.getRole())
                .status(user.getStatus())

                .drivingLicenseNumber(user.getDrivingLicenseNumber())

                .buildingName(user.getBuildingName())
                .holdingNumber(user.getHoldingNumber())
                .numberOfFlats(user.getNumberOfFlats())
                .generatorPower(user.getGeneratorPower())

                .pumpName(user.getPumpName())
                .businessLicenseNumber(user.getBusinessLicenseNumber())
                .pumpAddress(user.getPumpAddress())
                .fuelCapacity(user.getFuelCapacity())
                .fuelTypes(user.getFuelTypes())
                .currentStock(user.getCurrentStock())
                .open24Hours(user.getOpen24Hours())
                .openingTime(user.getOpeningTime())
                .closingTime(user.getClosingTime())

                .hospitalName(user.getHospitalName())
                .hospitalRegistrationNumber(user.getHospitalRegistrationNumber())
                .hospitalAddress(user.getHospitalAddress())
                .hospitalUnderThana(user.getHospitalUnderThana())
                .hospitalGeneratorCapacity(user.getHospitalGeneratorCapacity())
                .hospitalCurrentDieselReserve(user.getHospitalCurrentDieselReserve())
                .hospitalEstimatedBackupHours(user.getHospitalEstimatedBackupHours())
                .hospitalDieselStatus(user.getHospitalDieselStatus())
                .emergencyContactNumber(user.getEmergencyContactNumber())

                .utilityOrganizationType(user.getUtilityOrganizationType())
                .utilityEmployeeId(user.getUtilityEmployeeId())
                .serviceArea(user.getServiceArea())
                .officeAddress(user.getOfficeAddress())

                .organizationName(user.getOrganizationName())
                .organizationType(user.getOrganizationType())
                .officialVerificationId(user.getOfficialVerificationId())
                .assignedArea(user.getAssignedArea())

                .governmentEmployeeId(user.getGovernmentEmployeeId())
                .departmentName(user.getDepartmentName())
                .designation(user.getDesignation())

                .localAuthorityId(user.getLocalAuthorityId())
                .district(user.getDistrict())
                .thanaOrUpazila(user.getThanaOrUpazila())
                .build();
    }
}