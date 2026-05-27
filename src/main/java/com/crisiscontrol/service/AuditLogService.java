package com.crisiscontrol.service;

import com.crisiscontrol.entity.AuditLog;
import com.crisiscontrol.entity.User;
import com.crisiscontrol.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public void log(User actor, String action, String entityType, Long entityId, String description) {
        AuditLog auditLog = AuditLog.builder()
                .actorUserId(actor == null ? null : actor.getId())
                .actorName(actor == null ? "SYSTEM" : actor.getFullName())
                .actorRole(actor == null || actor.getRole() == null ? "SYSTEM" : actor.getRole().name())
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .description(description)
                .build();

        auditLogRepository.save(auditLog);
    }

    public void logSystem(String action, String entityType, Long entityId, String description) {
        log(null, action, entityType, entityId, description);
    }

    public List<AuditLog> getAllLogs() {
        return auditLogRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<AuditLog> searchLogs(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return getAllLogs();
        }

        return auditLogRepository
                .findByActionContainingIgnoreCaseOrEntityTypeContainingIgnoreCaseOrDescriptionContainingIgnoreCaseOrderByCreatedAtDesc(
                        keyword,
                        keyword,
                        keyword
                );
    }

    public List<AuditLog> getFuelLogs() {
        return getAllLogs()
                .stream()
                .filter(log ->
                        containsAny(
                                log.getAction(),
                                "fuel",
                                "fuel_request",
                                "request approved",
                                "request rejected",
                                "collected",
                                "collection",
                                "pump",
                                "stock",
                                "odometer",
                                "diesel",
                                "octane",
                                "petrol",
                                "cng"
                        )
                                || containsAny(
                                log.getEntityType(),
                                "fuel",
                                "fuel_request",
                                "fuel request",
                                "pump",
                                "pump_profile",
                                "pump profile",
                                "pump_stock",
                                "pump stock",
                                "pump_fuel_stock",
                                "pump fuel stock"
                        )
                                || containsAny(
                                log.getDescription(),
                                "fuel",
                                "fuel request",
                                "approved",
                                "rejected",
                                "collected",
                                "collection",
                                "pump",
                                "stock",
                                "odometer",
                                "diesel",
                                "octane",
                                "petrol",
                                "cng",
                                "liter",
                                "litre"
                        )
                )
                .toList();
    }

    public List<AuditLog> getUtilityLogs() {
        return getAllLogs()
                .stream()
                .filter(log ->
                        containsAny(
                                log.getAction(),
                                "power",
                                "outage",
                                "utility",
                                "restore",
                                "restored",
                                "schedule",
                                "scheduled"
                        )
                                || containsAny(
                                log.getEntityType(),
                                "power",
                                "outage",
                                "power_outage",
                                "power outage",
                                "power_outage_notice",
                                "power outage notice",
                                "utility"
                        )
                                || containsAny(
                                log.getDescription(),
                                "power",
                                "outage",
                                "utility",
                                "thana",
                                "desco",
                                "dpdc",
                                "restored",
                                "scheduled",
                                "ongoing"
                        )
                )
                .toList();
    }

    private boolean containsAny(String value, String... keywords) {
        if (value == null) {
            return false;
        }

        String normalizedValue = value
                .toLowerCase()
                .replace("_", " ")
                .replace("-", " ");

        for (String keyword : keywords) {
            if (keyword == null) {
                continue;
            }

            String normalizedKeyword = keyword
                    .toLowerCase()
                    .replace("_", " ")
                    .replace("-", " ");

            if (normalizedValue.contains(normalizedKeyword)) {
                return true;
            }
        }

        return false;
    }
}