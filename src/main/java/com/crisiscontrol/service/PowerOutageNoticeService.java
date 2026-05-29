package com.crisiscontrol.service;

import com.crisiscontrol.dto.PowerOutageNoticeRequest;
import com.crisiscontrol.dto.PowerOutageNoticeResponse;
import com.crisiscontrol.entity.PowerOutageNotice;
import com.crisiscontrol.entity.PowerOutageStatus;
import com.crisiscontrol.entity.PowerOutageType;
import com.crisiscontrol.entity.Role;
import com.crisiscontrol.entity.User;
import com.crisiscontrol.entity.UtilityProfile;
import com.crisiscontrol.repository.PowerOutageRepository;
import com.crisiscontrol.repository.UserRepository;
import com.crisiscontrol.repository.UtilityProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PowerOutageNoticeService {

    private final PowerOutageRepository powerOutageRepository;
    private final UserRepository userRepository;
    private final UtilityProfileRepository utilityProfileRepository;
    private final AuditLogService auditLogService;
    private final GeneratorUsageService generatorUsageService;

    public PowerOutageNoticeResponse createNotice(PowerOutageNoticeRequest request) {
        User user = resolveUtilityUser(request.getUserId());
        UtilityProfile utilityProfile = resolveUtilityProfile(user.getId());

        validateRequest(request);

        PowerOutageNotice notice = PowerOutageNotice.builder()
                .user(user)
                .utilityProfile(utilityProfile)
                .provider(utilityProfile.getProvider())
                .cityCorporation(utilityProfile.getCityCorporation())
                .thanaName(request.getThanaName().trim())
                .outageType(request.getOutageType())
                .cause(request.getCause())
                .status(request.getStatus())
                .startDateTime(request.getStartDateTime())
                .expectedRestorationDateTime(request.getExpectedRestorationDateTime())
                .dailyStartTime(request.getDailyStartTime())
                .dailyEndTime(request.getDailyEndTime())
                .emergencyMessage(request.getEmergencyMessage().trim())
                .contactNumber(request.getContactNumber().trim())
                .warningAcknowledged(Boolean.TRUE.equals(request.getWarningAcknowledged()))
                .build();

        PowerOutageNotice savedNotice = powerOutageRepository.save(notice);

        auditLogService.log(
                user,
                "POWER_OUTAGE_NOTICE_CREATED",
                "POWER_OUTAGE_NOTICE",
                savedNotice.getId(),
                "Power outage notice created. Provider: "
                        + savedNotice.getProvider()
                        + ", Thana: "
                        + savedNotice.getThanaName()
                        + ", Type: "
                        + savedNotice.getOutageType()
                        + ", Status: "
                        + savedNotice.getStatus()
        );

        return mapToResponse(savedNotice);
    }

    public PowerOutageNoticeResponse updateNotice(Long noticeId, PowerOutageNoticeRequest request) {
        PowerOutageNotice notice = powerOutageRepository.findById(noticeId)
                .orElseThrow(() -> new RuntimeException("Power outage notice not found"));

        User user = resolveUtilityUser(request.getUserId());

        if (!notice.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("You can update only your own outage notices");
        }

        validateRequest(request);

        notice.setThanaName(request.getThanaName().trim());
        notice.setOutageType(request.getOutageType());
        notice.setCause(request.getCause());
        notice.setStatus(request.getStatus());
        notice.setStartDateTime(request.getStartDateTime());
        notice.setExpectedRestorationDateTime(request.getExpectedRestorationDateTime());
        notice.setDailyStartTime(request.getDailyStartTime());
        notice.setDailyEndTime(request.getDailyEndTime());
        notice.setEmergencyMessage(request.getEmergencyMessage().trim());
        notice.setContactNumber(request.getContactNumber().trim());
        notice.setWarningAcknowledged(Boolean.TRUE.equals(request.getWarningAcknowledged()));

        PowerOutageNotice savedNotice = powerOutageRepository.save(notice);
        if (savedNotice.getStatus() == PowerOutageStatus.RESTORED) {
            generatorUsageService.recordUsageFromOutage(savedNotice);
        }

        auditLogService.log(
                user,
                "POWER_OUTAGE_NOTICE_UPDATED",
                "POWER_OUTAGE_NOTICE",
                savedNotice.getId(),
                "Power outage notice updated. Provider: "
                        + savedNotice.getProvider()
                        + ", Thana: "
                        + savedNotice.getThanaName()
                        + ", Type: "
                        + savedNotice.getOutageType()
                        + ", Status: "
                        + savedNotice.getStatus()
        );

        return mapToResponse(savedNotice);
    }

    public Map<String, String> deleteNotice(Long noticeId) {
        PowerOutageNotice notice = powerOutageRepository.findById(noticeId)
                .orElseThrow(() -> new RuntimeException("Power outage notice not found"));

        User user = notice.getUser();

        powerOutageRepository.delete(notice);

        auditLogService.log(
                user,
                "POWER_OUTAGE_NOTICE_DELETED",
                "POWER_OUTAGE_NOTICE",
                noticeId,
                "Power outage notice deleted. Thana: " + notice.getThanaName()
        );

        return Map.of("message", "Outage notice deleted successfully.");
    }

    public List<PowerOutageNoticeResponse> getActiveNotices() {
        autoRestoreExpiredOutages();
        List<PowerOutageStatus> activeStatuses = Arrays.asList(
                PowerOutageStatus.ONGOING,
                PowerOutageStatus.SCHEDULED,
                PowerOutageStatus.RESTORED
        );

        return powerOutageRepository.findByStatusInOrderByCreatedAtDesc(activeStatuses)
                .stream()
                .filter(this::shouldShowInPublicActiveList)
                .map(this::mapToResponse)
                .toList();


    }

    public List<PowerOutageNoticeResponse> getNoticesByUser(Long userId) {
        autoRestoreExpiredOutages();
        return powerOutageRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<PowerOutageNoticeResponse> getNoticesByThana(String thanaName) {
        autoRestoreExpiredOutages();
        return powerOutageRepository.findByThanaNameIgnoreCaseOrderByCreatedAtDesc(thanaName)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<PowerOutageNoticeResponse> getRecentNoticesByThana(String thanaName) {
        autoRestoreExpiredOutages();
        LocalDateTime recentStart = LocalDateTime.now().minusHours(1);
        LocalDateTime now = LocalDateTime.now();

        return powerOutageRepository.findByThanaNameIgnoreCaseOrderByCreatedAtDesc(thanaName)
                .stream()
                .filter(notice ->
                        notice.getRestoredAt() != null
                                && notice.getRestoredAt().isAfter(recentStart)
                                ||
                                notice.getExpectedRestorationDateTime() != null
                                        && !notice.getExpectedRestorationDateTime().isAfter(now)
                                        && notice.getExpectedRestorationDateTime().isAfter(recentStart)
                                ||
                                notice.getStatus() == PowerOutageStatus.RESTORED
                                        && notice.getUpdatedAt() != null
                                        && notice.getUpdatedAt().isAfter(recentStart)
                )
                .map(this::mapToResponse)
                .toList();
    }

    private User resolveUtilityUser(Long userId) {
        if (userId == null) {
            throw new RuntimeException("User ID is required");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utility authority user not found"));

        if (user.getRole() != Role.UTILITY_AUTHORITY) {
            throw new RuntimeException("Only Utility Authority can manage power outage notices");
        }

        return user;
    }

    private UtilityProfile resolveUtilityProfile(Long userId) {
        return utilityProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Utility profile not found. Please complete utility profile setup first."));
    }

    private void validateRequest(PowerOutageNoticeRequest request) {
        if (request.getThanaName() == null || request.getThanaName().trim().isEmpty()) {
            throw new RuntimeException("Thana name is required");
        }

        if (request.getOutageType() == null) {
            throw new RuntimeException("Outage type is required");
        }

        if (request.getCause() == null) {
            throw new RuntimeException("Outage cause is required");
        }

        if (request.getStatus() == null) {
            throw new RuntimeException("Outage status is required");
        }

        if (request.getEmergencyMessage() == null || request.getEmergencyMessage().trim().isEmpty()) {
            throw new RuntimeException("Emergency message is required");
        }

        if (request.getContactNumber() == null || request.getContactNumber().trim().isEmpty()) {
            throw new RuntimeException("Contact number is required");
        }

        if (request.getOutageType() == PowerOutageType.DAILY_RECURRING) {
            if (request.getDailyStartTime() == null || request.getDailyEndTime() == null) {
                throw new RuntimeException("Daily start and end time are required for daily recurring outage");
            }
            return;
        }

        if (request.getStartDateTime() == null) {
            throw new RuntimeException("Start date/time is required");
        }

        if (request.getExpectedRestorationDateTime() == null) {
            throw new RuntimeException("Expected restoration date/time is required");
        }

        if (!request.getExpectedRestorationDateTime().isAfter(request.getStartDateTime())) {
            throw new RuntimeException("Expected restoration time must be after start time");
        }
    }

    private boolean shouldShowInPublicActiveList(PowerOutageNotice notice) {
        if (notice.getStatus() == PowerOutageStatus.ONGOING || notice.getStatus() == PowerOutageStatus.SCHEDULED) {
            return true;
        }

        if (notice.getStatus() == PowerOutageStatus.RESTORED && notice.getRestoredAt() != null) {
            return notice.getRestoredAt().isAfter(LocalDateTime.now().minusHours(1));
        }

        return false;
    }

    private PowerOutageNoticeResponse mapToResponse(PowerOutageNotice notice) {
        UtilityProfile profile = notice.getUtilityProfile();

        return PowerOutageNoticeResponse.builder()
                .id(notice.getId())
                .userId(notice.getUser() == null ? null : notice.getUser().getId())
                .utilityProfileId(profile == null ? null : profile.getId())
                .provider(notice.getProvider())
                .cityCorporation(notice.getCityCorporation())
                .officerName(profile == null ? "-" : profile.getOfficerName())
                .serviceZone(profile == null ? "-" : profile.getServiceZone())
                .thanaName(notice.getThanaName())
                .outageType(notice.getOutageType())
                .cause(notice.getCause())
                .status(notice.getStatus())
                .startDateTime(notice.getStartDateTime())
                .expectedRestorationDateTime(notice.getExpectedRestorationDateTime())
                .dailyStartTime(notice.getDailyStartTime())
                .dailyEndTime(notice.getDailyEndTime())
                .emergencyMessage(notice.getEmergencyMessage())
                .contactNumber(notice.getContactNumber())
                .warningAcknowledged(notice.getWarningAcknowledged())
                .restoredAt(notice.getRestoredAt())
                .createdAt(notice.getCreatedAt())
                .updatedAt(notice.getUpdatedAt())
                .build();
    }

    private void autoRestoreExpiredOutages() {
        List<PowerOutageNotice> expiredNotices =
                powerOutageRepository.findByStatusAndExpectedRestorationDateTimeLessThanEqual(
                        PowerOutageStatus.ONGOING,
                        LocalDateTime.now()
                );

        for (PowerOutageNotice notice : expiredNotices) {
            notice.setStatus(PowerOutageStatus.RESTORED);

            if (notice.getRestoredAt() == null) {
                notice.setRestoredAt(notice.getExpectedRestorationDateTime());
            }

            PowerOutageNotice savedNotice = powerOutageRepository.save(notice);
            generatorUsageService.recordUsageFromOutage(savedNotice);
        }
    }
}