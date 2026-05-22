package com.crisiscontrol.controller;

import com.crisiscontrol.dto.HospitalGeneratorFuelRequestCreateRequest;
import com.crisiscontrol.entity.Role;
import com.crisiscontrol.entity.User;
import com.crisiscontrol.repository.UserRepository;
import com.crisiscontrol.service.FuelRequestService;
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
    private final FuelRequestService fuelRequestService;

    /**
     * Get hospital profile and recalculate backup/diesel.
     * This method must NOT deduct diesel reserve.
     */
    @GetMapping("/profile/{userId}")
    public ResponseEntity<User> getHospitalProfile(@PathVariable Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Hospital user not found"));

        if (user.getRole() != Role.HOSPITAL_AUTHORITY) {
            throw new RuntimeException("Only Hospital Authority profile can be loaded here");
        }

        User updatedUser = hospitalSupportCalculationService.recalculateAndSave(user);

        return ResponseEntity.ok(updatedUser);
    }

    /**
     * Submit generator fuel request.
     * Allows hospital to request diesel regardless of backup level.
     * Request is stored with status PENDING for admin approval.
     */
    @PostMapping("/generator-fuel-request")
    public ResponseEntity<String> createGeneratorFuelRequest(
            @RequestBody HospitalGeneratorFuelRequestCreateRequest request
    ) {
        User hospitalUser = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("Hospital user not found"));

        if (hospitalUser.getRole() != Role.HOSPITAL_AUTHORITY) {
            throw new RuntimeException("Only Hospital Authority can request generator diesel support");
        }

        hospitalUser.setTotalIcuUnits(request.getTotalIcuUnits());
        hospitalUser.setAcPatientCapacity(request.getAcPatientCapacity());
        hospitalUser.setNonAcPatientCapacity(request.getNonAcPatientCapacity());

        userRepository.save(hospitalUser);

        fuelRequestService.createHospitalGeneratorFuelRequest(request);

        return ResponseEntity.ok("Generator fuel request submitted successfully and is pending admin approval.");
    }
}