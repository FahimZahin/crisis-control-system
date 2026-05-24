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
                        containsIgnoreCase(log.getAction(), "FUEL")
                                || containsIgnoreCase(log.getEntityType(), "FUEL")
                                || containsIgnoreCase(log.getDescription(), "fuel")
                                || containsIgnoreCase(log.getAction(), "PUMP")
                                || containsIgnoreCase(log.getDescription(), "pump")
                                || containsIgnoreCase(log.getDescription(), "odometer")
                )
                .toList();
    }

    public List<AuditLog> getUtilityLogs() {
        return getAllLogs()
                .stream()
                .filter(log ->
                        containsIgnoreCase(log.getAction(), "POWER_OUTAGE")
                                || containsIgnoreCase(log.getEntityType(), "POWER_OUTAGE")
                                || containsIgnoreCase(log.getDescription(), "outage")
                                || containsIgnoreCase(log.getDescription(), "utility")
                                || containsIgnoreCase(log.getDescription(), "thana")
                )
                .toList();
    }

    private boolean containsIgnoreCase(String value, String keyword) {
        if (value == null || keyword == null) {
            return false;
        }

        return value.toLowerCase().contains(keyword.toLowerCase());
    }
}