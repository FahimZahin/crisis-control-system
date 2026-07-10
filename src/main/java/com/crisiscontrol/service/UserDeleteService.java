package com.crisiscontrol.service;

import com.crisiscontrol.entity.FuelRequest;
import com.crisiscontrol.entity.FuelRequestStatus;
import com.crisiscontrol.entity.PowerOutageNotice;
import com.crisiscontrol.entity.PumpProfile;
import com.crisiscontrol.entity.User;
import com.crisiscontrol.repository.ActivationRequestRepository;
import com.crisiscontrol.repository.EmergencyVehicleRepository;
import com.crisiscontrol.repository.FuelRequestRepository;
import com.crisiscontrol.repository.HospitalOutageFuelUsageLogRepository;
import com.crisiscontrol.repository.PowerOutageRepository;
import com.crisiscontrol.repository.PumpFuelStockRepository;
import com.crisiscontrol.repository.PumpProfileRepository;
import com.crisiscontrol.repository.UserRepository;
import com.crisiscontrol.repository.UtilityProfileRepository;
import com.crisiscontrol.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserDeleteService {

    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final FuelRequestRepository fuelRequestRepository;
    private final ActivationRequestRepository activationRequestRepository;
    private final EmergencyVehicleRepository emergencyVehicleRepository;
    private final PumpProfileRepository pumpProfileRepository;
    private final PumpFuelStockRepository pumpFuelStockRepository;
    private final UtilityProfileRepository utilityProfileRepository;
    private final PowerOutageRepository powerOutageRepository;
    private final HospitalOutageFuelUsageLogRepository hospitalOutageFuelUsageLogRepository;

    @Transactional
    public void deleteUserCompletely(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        /*
         * 1. Delete activation requests first.
         * Reason: activation_requests has user_id foreign key.
         */
        activationRequestRepository.deleteByUserId(userId);

        /*
         * 2. Delete hospital outage usage logs where this user is hospital authority.
         * Reason: hospital_outage_fuel_usage_logs has hospital_user_id foreign key.
         */
        hospitalOutageFuelUsageLogRepository.deleteByHospitalUserId(userId);

        /*
         * 3. Delete outage notices created by this utility user.
         * First delete usage logs linked with those outage notices.
         */
        List<PowerOutageNotice> powerOutageNotices = powerOutageRepository.findByUserIdOrderByCreatedAtDesc(userId);

        for (PowerOutageNotice notice : powerOutageNotices) {
            hospitalOutageFuelUsageLogRepository.deleteByPowerOutageNoticeId(notice.getId());
        }

        powerOutageRepository.deleteAll(powerOutageNotices);

        /*
         * 4. Delete this user's own fuel requests.
         * Reason: fuel_requests has user_id and vehicle_id foreign keys.
         */
        List<FuelRequest> userFuelRequests = fuelRequestRepository.findByUserIdOrderByCreatedAtDesc(userId);
        fuelRequestRepository.deleteAll(userFuelRequests);

        /*
         * 5. Delete vehicles.
         * Reason: vehicles has user_id foreign key.
         */
        vehicleRepository.deleteAll(vehicleRepository.findByUserIdOrderByCreatedAtDesc(userId));

        /*
         * 6. If this user is a pump authority, unassign requests assigned to that pump,
         * then delete pump stock and pump profile.
         *
         * Important:
         * Do NOT delete other users' fuel requests just because this pump is deleted.
         * Instead, remove pump assignment. Approved requests become pending again.
         */
        pumpProfileRepository.findByUserId(userId).ifPresent(this::deletePumpProfileSafely);

        /*
         * 7. Delete emergency vehicle profile if exists.
         */
        emergencyVehicleRepository.findByUserId(userId)
                .ifPresent(emergencyVehicleRepository::delete);

        /*
         * 8. Delete utility profile if exists.
         */
        utilityProfileRepository.findByUserId(userId)
                .ifPresent(utilityProfileRepository::delete);

        /*
         * 9. Finally delete user.
         */
        userRepository.delete(user);
    }

    private void deletePumpProfileSafely(PumpProfile pumpProfile) {
        List<FuelRequest> assignedRequests = fuelRequestRepository.findByPumpProfileId(pumpProfile.getId());

        for (FuelRequest request : assignedRequests) {
            request.setPumpProfile(null);
            request.setCollectionCode(null);

            if (request.getRequestStatus() == FuelRequestStatus.APPROVED) {
                request.setRequestStatus(FuelRequestStatus.PENDING);
                request.setAdminNote("Assigned pump profile was deleted. Request returned to pending for reassignment.");
            }

            if (request.getRequestStatus() == FuelRequestStatus.COLLECTED) {
                request.setAdminNote("Original pump profile was deleted after collection.");
            }
        }

        fuelRequestRepository.saveAll(assignedRequests);

        pumpFuelStockRepository.deleteByPumpProfileId(pumpProfile.getId());
        pumpProfileRepository.delete(pumpProfile);
    }
}