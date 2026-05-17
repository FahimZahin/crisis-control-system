package com.crisiscontrol.service;

import com.crisiscontrol.dto.AuthResponse;
import com.crisiscontrol.dto.LoginRequest;
import com.crisiscontrol.dto.RegisterRequest;
import com.crisiscontrol.entity.Role;
import com.crisiscontrol.entity.User;
import com.crisiscontrol.entity.UserStatus;
import com.crisiscontrol.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final String ADMIN_SECRET_CODE = "CCS-ADMIN-2026";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final HospitalSupportCalculationService hospitalSupportCalculationService;

    public AuthResponse register(RegisterRequest request) {
        validateCommonFields(request);
        validateRoleSpecificFields(request);

        User user = User.builder()
                .fullName(request.getFullName())
                .phoneNumber(request.getPhoneNumber())
                .address(request.getAddress())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .status(UserStatus.ACTIVE)

                .drivingLicenseNumber(emptyToNull(request.getDrivingLicenseNumber()))

                .buildingName(emptyToNull(request.getBuildingName()))
                .holdingNumber(emptyToNull(request.getHoldingNumber()))
                .numberOfFlats(request.getNumberOfFlats())
                .generatorPower(emptyToNull(request.getGeneratorPower()))

                .pumpName(emptyToNull(request.getPumpName()))
                .businessLicenseNumber(emptyToNull(request.getBusinessLicenseNumber()))
                .pumpAddress(emptyToNull(request.getPumpAddress()))
                .fuelCapacity(request.getFuelCapacity())
                .fuelTypes(emptyToNull(request.getFuelTypes()))
                .currentStock(request.getCurrentStock())
                .open24Hours(request.getOpen24Hours())
                .openingTime(emptyToNull(request.getOpeningTime()))
                .closingTime(emptyToNull(request.getClosingTime()))

                .hospitalName(emptyToNull(request.getHospitalName()))
                .hospitalRegistrationNumber(emptyToNull(request.getHospitalRegistrationNumber()))
                .hospitalAddress(emptyToNull(request.getHospitalAddress()))
                .hospitalUnderThana(emptyToNull(request.getHospitalUnderThana()))
                .hospitalGeneratorCapacity(emptyToNull(request.getHospitalGeneratorCapacity()))
                .hospitalCurrentDieselReserve(request.getHospitalCurrentDieselReserve())
                .emergencyContactNumber(emptyToNull(request.getEmergencyContactNumber()))

                .utilityOrganizationType(emptyToNull(request.getUtilityOrganizationType()))
                .utilityEmployeeId(emptyToNull(request.getUtilityEmployeeId()))
                .serviceArea(emptyToNull(request.getServiceArea()))
                .officeAddress(emptyToNull(request.getOfficeAddress()))

                .organizationName(emptyToNull(request.getOrganizationName()))
                .organizationType(emptyToNull(request.getOrganizationType()))
                .officialVerificationId(emptyToNull(request.getOfficialVerificationId()))
                .assignedArea(emptyToNull(request.getAssignedArea()))

                .governmentEmployeeId(emptyToNull(request.getGovernmentEmployeeId()))
                .departmentName(emptyToNull(request.getDepartmentName()))
                .designation(emptyToNull(request.getDesignation()))

                .localAuthorityId(emptyToNull(request.getLocalAuthorityId()))
                .district(emptyToNull(request.getDistrict()))
                .thanaOrUpazila(emptyToNull(request.getThanaOrUpazila()))

                .adminCode(emptyToNull(request.getAdminCode()))
                .build();

        if (request.getRole() == Role.HOSPITAL_AUTHORITY) {
            double backupHours = hospitalSupportCalculationService.calculateBackupHours(
                    request.getHospitalGeneratorCapacity(),
                    request.getHospitalCurrentDieselReserve()
            );

            user.setHospitalEstimatedBackupHours(backupHours);
            user.setHospitalDieselStatus(hospitalSupportCalculationService.resolveDieselStatus(backupHours));
        }

        User savedUser = userRepository.save(user);

        return buildAuthResponse("Registration successful", savedUser);
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByPhoneNumber(request.getPhoneNumber())
                .orElseThrow(() -> new RuntimeException("Invalid phone number or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid phone number or password");
        }

        if (user.getStatus() == UserStatus.BLOCKED) {
            throw new RuntimeException("User account is blocked");
        }

        if (user.getRole() == Role.HOSPITAL_AUTHORITY) {
            user = hospitalSupportCalculationService.recalculateAndSave(user);
        }

        return buildAuthResponse("Login successful", user);
    }

    private void validateCommonFields(RegisterRequest request) {
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new RuntimeException("Password and confirm password do not match");
        }

        if (userRepository.existsByPhoneNumber(request.getPhoneNumber())) {
            throw new RuntimeException("Phone number already registered");
        }

        if (request.getRole() == null) {
            throw new RuntimeException("Role is required");
        }
    }

    private void validateRoleSpecificFields(RegisterRequest request) {
        Role role = request.getRole();

        if (role == Role.VEHICLE_OWNER) {
            validateVehicleOwner(request);
        } else if (role == Role.BUILDING_MANAGER) {
            validateBuildingManager(request);
        } else if (role == Role.PUMP_AUTHORITY) {
            validatePumpAuthority(request);
        } else if (role == Role.HOSPITAL_AUTHORITY) {
            validateHospitalAuthority(request);
        } else if (role == Role.UTILITY_AUTHORITY) {
            validateUtilityAuthority(request);
        } else if (role == Role.EMERGENCY_VEHICLE_AUTHORITY) {
            validateEmergencyVehicleAuthority(request);
        } else if (role == Role.GOVERNMENT_AUTHORITY) {
            validateGovernmentAuthority(request);
        } else if (role == Role.LOCAL_AUTHORITY) {
            validateLocalAuthority(request);
        } else if (role == Role.ADMIN) {
            validateAdmin(request);
        }
    }

    private void validateVehicleOwner(RegisterRequest request) {
        if (isBlank(request.getDrivingLicenseNumber())) {
            throw new RuntimeException("Driving license number is required for vehicle owner");
        }

        if (userRepository.existsByDrivingLicenseNumber(request.getDrivingLicenseNumber())) {
            throw new RuntimeException("Driving license number already registered");
        }
    }

    private void validateBuildingManager(RegisterRequest request) {
        if (isBlank(request.getBuildingName())) {
            throw new RuntimeException("Building name is required for building manager");
        }

        if (isBlank(request.getHoldingNumber())) {
            throw new RuntimeException("Holding number is required for building manager");
        }

        if (request.getNumberOfFlats() == null || request.getNumberOfFlats() <= 0) {
            throw new RuntimeException("Valid number of flats is required for building manager");
        }

        if (isBlank(request.getGeneratorPower())) {
            throw new RuntimeException("Generator power is required for building manager");
        }

        if (userRepository.existsByHoldingNumber(request.getHoldingNumber())) {
            throw new RuntimeException("Holding number already registered");
        }
    }

    private void validatePumpAuthority(RegisterRequest request) {
        if (isBlank(request.getPumpName())) {
            throw new RuntimeException("Pump name is required for pump authority");
        }

        if (isBlank(request.getBusinessLicenseNumber())) {
            throw new RuntimeException("Business license number is required for pump authority");
        }

        if (isBlank(request.getPumpAddress())) {
            throw new RuntimeException("Pump address is required for pump authority");
        }

        if (request.getFuelCapacity() == null || request.getFuelCapacity() <= 0) {
            throw new RuntimeException("Valid fuel capacity is required for pump authority");
        }

        if (isBlank(request.getFuelTypes())) {
            throw new RuntimeException("At least one fuel type is required for pump authority");
        }

        if (request.getCurrentStock() == null || request.getCurrentStock() < 0) {
            throw new RuntimeException("Valid current stock is required for pump authority");
        }

        if (request.getCurrentStock() > request.getFuelCapacity()) {
            throw new RuntimeException("Current stock cannot be greater than fuel capacity");
        }

        boolean open24Hours = Boolean.TRUE.equals(request.getOpen24Hours());

        if (!open24Hours) {
            if (isBlank(request.getOpeningTime())) {
                throw new RuntimeException("Opening time is required if pump is not open 24 hours");
            }

            if (isBlank(request.getClosingTime())) {
                throw new RuntimeException("Closing time is required if pump is not open 24 hours");
            }
        }

        if (userRepository.existsByBusinessLicenseNumber(request.getBusinessLicenseNumber())) {
            throw new RuntimeException("Business license number already registered");
        }
    }

    private void validateHospitalAuthority(RegisterRequest request) {
        if (isBlank(request.getHospitalName())) {
            throw new RuntimeException("Hospital name is required for hospital authority");
        }

        if (isBlank(request.getHospitalRegistrationNumber())) {
            throw new RuntimeException("Hospital registration number is required for hospital authority");
        }

        if (isBlank(request.getHospitalAddress())) {
            throw new RuntimeException("Hospital address is required for hospital authority");
        }

        if (isBlank(request.getHospitalUnderThana())) {
            throw new RuntimeException("Hospital under thana is required for hospital authority");
        }

        if (isBlank(request.getHospitalGeneratorCapacity())) {
            throw new RuntimeException("Hospital generator capacity is required for hospital authority");
        }

        if (request.getHospitalCurrentDieselReserve() == null || request.getHospitalCurrentDieselReserve() < 0) {
            throw new RuntimeException("Valid hospital current diesel reserve is required");
        }

        if (isBlank(request.getEmergencyContactNumber())) {
            throw new RuntimeException("Emergency contact number is required for hospital authority");
        }

        if (userRepository.existsByHospitalRegistrationNumber(request.getHospitalRegistrationNumber())) {
            throw new RuntimeException("Hospital registration number already registered");
        }
    }

    private void validateUtilityAuthority(RegisterRequest request) {
        if (isBlank(request.getUtilityOrganizationType())) {
            throw new RuntimeException("Utility organization type is required");
        }

        if (isBlank(request.getUtilityEmployeeId())) {
            throw new RuntimeException("Utility employee ID is required");
        }

        if (isBlank(request.getServiceArea())) {
            throw new RuntimeException("Service area is required for utility authority");
        }

        if (isBlank(request.getOfficeAddress())) {
            throw new RuntimeException("Office address is required for utility authority");
        }

        if (userRepository.existsByUtilityEmployeeId(request.getUtilityEmployeeId())) {
            throw new RuntimeException("Utility employee ID already registered");
        }
    }

    private void validateEmergencyVehicleAuthority(RegisterRequest request) {
        if (isBlank(request.getOrganizationName())) {
            throw new RuntimeException("Organization name is required");
        }

        if (isBlank(request.getOrganizationType())) {
            throw new RuntimeException("Organization type is required");
        }

        if (isBlank(request.getOfficialVerificationId())) {
            throw new RuntimeException("Official verification ID is required");
        }

        if (isBlank(request.getAssignedArea())) {
            throw new RuntimeException("Assigned area is required");
        }

        if (userRepository.existsByOfficialVerificationId(request.getOfficialVerificationId())) {
            throw new RuntimeException("Official verification ID already registered");
        }
    }

    private void validateGovernmentAuthority(RegisterRequest request) {
        if (isBlank(request.getGovernmentEmployeeId())) {
            throw new RuntimeException("Government employee ID is required");
        }

        if (isBlank(request.getDepartmentName())) {
            throw new RuntimeException("Department name is required");
        }

        if (isBlank(request.getDesignation())) {
            throw new RuntimeException("Designation is required");
        }

        if (isBlank(request.getOfficeAddress())) {
            throw new RuntimeException("Office address is required");
        }

        if (userRepository.existsByGovernmentEmployeeId(request.getGovernmentEmployeeId())) {
            throw new RuntimeException("Government employee ID already registered");
        }
    }

    private void validateLocalAuthority(RegisterRequest request) {
        if (isBlank(request.getLocalAuthorityId())) {
            throw new RuntimeException("Local authority ID is required");
        }

        if (isBlank(request.getDistrict())) {
            throw new RuntimeException("District is required");
        }

        if (isBlank(request.getThanaOrUpazila())) {
            throw new RuntimeException("Thana or Upazila is required");
        }

        if (isBlank(request.getDesignation())) {
            throw new RuntimeException("Designation is required");
        }

        if (isBlank(request.getOfficeAddress())) {
            throw new RuntimeException("Office address is required");
        }

        if (userRepository.existsByLocalAuthorityId(request.getLocalAuthorityId())) {
            throw new RuntimeException("Local authority ID already registered");
        }
    }

    private void validateAdmin(RegisterRequest request) {
        if (isBlank(request.getAdminCode())) {
            throw new RuntimeException("Admin secret code is required");
        }

        if (!ADMIN_SECRET_CODE.equals(request.getAdminCode())) {
            throw new RuntimeException("Invalid admin secret code");
        }
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

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String emptyToNull(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }

        return value.trim();
    }
}