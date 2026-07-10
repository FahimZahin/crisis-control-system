package com.crisiscontrol.repository;

import com.crisiscontrol.entity.Vehicle;
import com.crisiscontrol.entity.VehicleType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {

    /*
     * Used for complete user deletion.
     * Must include both active and soft-deleted vehicles.
     */
    List<Vehicle> findByUserIdOrderByCreatedAtDesc(Long userId);

    /*
     * Used for normal vehicle owner dashboard/list.
     * Soft-deleted vehicles are hidden from user.
     */
    List<Vehicle> findByUserIdAndDeletedFalseOrderByCreatedAtDesc(Long userId);

    /*
     * Number plate duplicate check should only block active vehicles.
     * This allows historical deleted plate to stay for report/history,
     * but avoids duplicate active vehicles.
     */
    boolean existsByNumberPlateAndDeletedFalse(String numberPlate);

    boolean existsByNumberPlateAndDeletedFalseAndIdNot(String numberPlate, Long id);

    /*
     * Lifetime crisis-control rule.
     * Deleted vehicles are still counted, so user cannot delete and add another
     * bike/car to misuse the fuel system.
     */
    boolean existsByUserIdAndVehicleType(Long userId, VehicleType vehicleType);

    boolean existsByUserIdAndVehicleTypeAndIdNot(Long userId, VehicleType vehicleType, Long id);
}