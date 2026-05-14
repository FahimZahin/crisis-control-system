package com.crisiscontrol.service;

import com.crisiscontrol.dto.PowerOutageRequest;
import com.crisiscontrol.dto.PowerOutageResponse;
import com.crisiscontrol.dto.UtilityProfileRequest;
import com.crisiscontrol.dto.UtilityProfileResponse;
import com.crisiscontrol.entity.CityCorporation;
import com.crisiscontrol.entity.PowerOutageNotice;
import com.crisiscontrol.entity.PowerOutageStatus;
import com.crisiscontrol.entity.PowerOutageType;
import com.crisiscontrol.entity.Role;
import com.crisiscontrol.entity.User;
import com.crisiscontrol.entity.UtilityProfile;
import com.crisiscontrol.entity.UtilityProvider;
import com.crisiscontrol.repository.PowerOutageRepository;
import com.crisiscontrol.repository.UserRepository;
import com.crisiscontrol.repository.UtilityProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UtilityPowerService {

    private final UtilityProfileRepository utilityProfileRepository;
    private final PowerOutageRepository powerOutageRepository;
    private final UserRepository userRepository;

    private static final String NOT_AVAILABLE_MESSAGE =
            "System is currently available only for Dhaka city corporation areas under DPDC and DESCO.";

    private static final List<String> DESCO_DNCC_THANAS = List.of(
            "Uttara East", "Uttara West", "Dakshinkhan", "Uttarkhan", "Khilkhet",
            "Turag", "Gulshan", "Banani", "Badda", "Baridhara", "Mirpur",
            "Pallabi", "Rupnagar", "Shah Ali", "Kafrul", "Darus Salam",
            "Agargaon", "Sher-e-Bangla Nagar", "Cantonment"
    );

    private static final List<String> DPDC_DSCC_THANAS = List.of(
            "Ramna", "Shahbagh", "Dhanmondi", "Kalabagan", "New Market",
            "Hazaribagh", "Lalbagh", "Chawkbazar", "Kotwali", "Sutrapur",
            "Wari", "Gendaria", "Bangshal", "Motijheel", "Paltan", "Shyampur",
            "Kadamtali", "Jatrabari", "Demra", "Kamrangirchar", "Khilgaon",
            "Sabujbagh", "Mugda"
    );

    public UtilityProfileResponse createOrUpdateUtilityProfile(UtilityProfileRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        validateUtilityUser(user);

        if (request.getProvider() == UtilityProvider.BPDB || request.getProvider() == UtilityProvider.PALLI_BIDYUT) {
            throw new RuntimeException(NOT_AVAILABLE_MESSAGE);
        }

        CityCorporation cityCorporation = getCityCorporationByProvider(request.getProvider());

        UtilityProfile profile = utilityProfileRepository.findByUserId(user.getId()).orElse(null);

        if (profile == null) {
            if (utilityProfileRepository.existsByEmployeeId(request.getEmployeeId())) {
                throw new RuntimeException("Employee ID already exists");
            }

            profile = UtilityProfile.builder()
                    .user(user)
                    .build();
        } else {
            if (utilityProfileRepository.existsByEmployeeIdAndIdNot(request.getEmployeeId(), profile.getId())) {
                throw new RuntimeException("Employee ID already exists");
            }
        }

        profile.setProvider(request.getProvider());
        profile.setCityCorporation(cityCorporation);
        profile.setOfficerName(request.getOfficerName());
        profile.setEmployeeId(request.getEmployeeId());
        profile.setOfficialPhone(request.getOfficialPhone());
        profile.setOfficeAddress(request.getOfficeAddress());
        profile.setServiceZone(request.getServiceZone());

        return mapProfileToResponse(utilityProfileRepository.save(profile));
    }

    public UtilityProfileResponse getUtilityProfileByUser(Long userId) {
        UtilityProfile profile = utilityProfileRepository.findByUserId(userId)
                .orElse(null);

        if (profile != null) {
            return mapProfileToResponse(profile);
        }

        return mapProfileToResponse(createProfileFromRegistration(userId));
    }

    private UtilityProfile createProfileFromRegistration(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        validateUtilityUser(user);

        UtilityProvider provider = parseProviderFromRegistration(user);

        if (provider == UtilityProvider.BPDB || provider == UtilityProvider.PALLI_BIDYUT) {
            throw new RuntimeException(NOT_AVAILABLE_MESSAGE);
        }

        if (provider != UtilityProvider.DPDC && provider != UtilityProvider.DESCO) {
            throw new RuntimeException("Utility provider must be DPDC or DESCO");
        }

        String employeeId = valueOrDefault(user.getUtilityEmployeeId(), "UTILITY-" + user.getId());

        if (utilityProfileRepository.existsByEmployeeId(employeeId)) {
            employeeId = employeeId + "-" + user.getId();
        }

        UtilityProfile profile = UtilityProfile.builder()
                .user(user)
                .provider(provider)
                .cityCorporation(getCityCorporationByProvider(provider))
                .officerName(valueOrDefault(user.getFullName(), "Utility Officer"))
                .employeeId(employeeId)
                .officialPhone(valueOrDefault(user.getPhoneNumber(), "Not Provided"))
                .officeAddress(valueOrDefault(user.getOfficeAddress(), valueOrDefault(user.getAddress(), "Not Provided")))
                .serviceZone(valueOrDefault(user.getServiceArea(), "Dhaka City"))
                .build();

        return utilityProfileRepository.save(profile);
    }

    public PowerOutageResponse createPowerOutage(PowerOutageRequest request) {
        UtilityProfile profile = utilityProfileRepository.findByUserId(request.getUserId())
                .orElseGet(() -> createProfileFromRegistration(request.getUserId()));

        validateThanaForProvider(profile, request.getThanaName());

        PowerOutageStatus status = resolveStatus(request);

        boolean ongoing = powerOutageRepository.existsByThanaNameIgnoreCaseAndStatus(
                request.getThanaName(),
                PowerOutageStatus.ONGOING
        );

        boolean recent = powerOutageRepository.existsByThanaNameIgnoreCaseAndCreatedAtAfter(
                request.getThanaName(),
                LocalDateTime.now().minusHours(24)
        );

        if ((ongoing || recent) && !Boolean.TRUE.equals(request.getWarningAcknowledged())) {
            if (ongoing) {
                throw new RuntimeException("This thana already has an ongoing outage notice. Creating another current outage may confuse users.");
            }

            throw new RuntimeException("Recent outage happened here. Please confirm before creating another notice.");
        }

        PowerOutageNotice notice = PowerOutageNotice.builder()
                .user(profile.getUser())
                .utilityProfile(profile)
                .provider(profile.getProvider())
                .cityCorporation(profile.getCityCorporation())
                .thanaName(request.getThanaName())
                .outageType(request.getOutageType())
                .cause(request.getCause())
                .status(status)
                .startDateTime(parseDateTime(request.getStartDateTime()))
                .expectedRestorationDateTime(parseDateTime(request.getExpectedRestorationDateTime()))
                .dailyStartTime(parseTime(request.getDailyStartTime()))
                .dailyEndTime(parseTime(request.getDailyEndTime()))
                .emergencyMessage(request.getEmergencyMessage())
                .contactNumber(request.getContactNumber())
                .warningAcknowledged(Boolean.TRUE.equals(request.getWarningAcknowledged()))
                .build();

        return mapNoticeToResponse(powerOutageRepository.save(notice));
    }

    public List<PowerOutageResponse> getAllPowerOutages() {
        return powerOutageRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::mapNoticeToResponse)
                .toList();
    }

    public List<PowerOutageResponse> getActivePowerOutages() {
        return powerOutageRepository.findByStatusInOrderByCreatedAtDesc(
                        List.of(PowerOutageStatus.ONGOING, PowerOutageStatus.SCHEDULED, PowerOutageStatus.RESTORED)
                )
                .stream()
                .filter(notice -> {
                    PowerOutageNotice updatedNotice = autoRestoreIfExpired(notice);

                    if (updatedNotice.getStatus() == PowerOutageStatus.RESTORED) {
                        LocalDateTime restoredTime = updatedNotice.getUpdatedAt();

                        if (restoredTime == null) {
                            return false;
                        }

                        return restoredTime.isAfter(LocalDateTime.now().minusHours(1));
                    }

                    return true;
                })
                .map(this::mapNoticeToResponse)
                .toList();
    }

    public List<PowerOutageResponse> getPowerOutagesByUser(Long userId) {
        UtilityProfile profile = utilityProfileRepository.findByUserId(userId)
                .orElseGet(() -> createProfileFromRegistration(userId));

        return powerOutageRepository.findByUserIdOrderByCreatedAtDesc(profile.getUser().getId())
                .stream()
                .map(this::mapNoticeToResponse)
                .toList();
    }

    public List<PowerOutageResponse> getRecentPowerOutagesByThana(String thanaName) {
        return powerOutageRepository.findByThanaNameIgnoreCaseOrderByCreatedAtDesc(thanaName)
                .stream()
                .filter(notice ->
                        notice.getStatus() == PowerOutageStatus.ONGOING ||
                                notice.getCreatedAt().isAfter(LocalDateTime.now().minusHours(24)) ||
                                notice.getUpdatedAt().isAfter(LocalDateTime.now().minusHours(24))
                )
                .map(this::mapNoticeToResponse)
                .toList();
    }

    public PowerOutageResponse updatePowerOutage(Long id, PowerOutageRequest request) {
        PowerOutageNotice notice = powerOutageRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Power outage notice not found"));

        UtilityProfile profile = notice.getUtilityProfile();

        validateThanaForProvider(profile, request.getThanaName());

        notice.setThanaName(request.getThanaName());
        notice.setOutageType(request.getOutageType());
        notice.setCause(request.getCause());
        notice.setStatus(resolveStatus(request));
        notice.setStartDateTime(parseDateTime(request.getStartDateTime()));
        notice.setExpectedRestorationDateTime(parseDateTime(request.getExpectedRestorationDateTime()));
        notice.setDailyStartTime(parseTime(request.getDailyStartTime()));
        notice.setDailyEndTime(parseTime(request.getDailyEndTime()));
        notice.setEmergencyMessage(request.getEmergencyMessage());
        notice.setContactNumber(request.getContactNumber());
        notice.setWarningAcknowledged(Boolean.TRUE.equals(request.getWarningAcknowledged()));

        return mapNoticeToResponse(powerOutageRepository.save(notice));
    }

    public void deletePowerOutage(Long id) {
        PowerOutageNotice notice = powerOutageRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Power outage notice not found"));

        powerOutageRepository.delete(notice);
    }

    private void validateUtilityUser(User user) {
        if (user.getRole() != Role.UTILITY_AUTHORITY) {
            throw new RuntimeException("Only Utility Authority can use utility power module");
        }
    }

    private UtilityProvider parseProviderFromRegistration(User user) {
        String providerText = user.getUtilityOrganizationType();

        if (providerText == null || providerText.trim().isEmpty()) {
            providerText = user.getOrganizationName();
        }

        if (providerText == null || providerText.trim().isEmpty()) {
            throw new RuntimeException("Utility provider is missing from registration data");
        }

        String normalized = providerText.trim().toUpperCase()
                .replace(" ", "_")
                .replace("-", "_");

        if (normalized.contains("PALLI")) {
            return UtilityProvider.PALLI_BIDYUT;
        }

        return UtilityProvider.valueOf(normalized);
    }

    private void validateThanaForProvider(UtilityProfile profile, String thanaName) {
        List<String> allowedThanas = getAllowedThanas(profile.getProvider());

        boolean matched = allowedThanas.stream()
                .anyMatch(thana -> thana.equalsIgnoreCase(thanaName));

        if (!matched) {
            throw new RuntimeException("Selected thana is not allowed for " + profile.getProvider());
        }
    }

    private PowerOutageStatus resolveStatus(PowerOutageRequest request) {
        if (request.getStatus() != null) {
            return request.getStatus();
        }

        if (request.getOutageType() == PowerOutageType.CURRENT) {
            return PowerOutageStatus.ONGOING;
        }

        return PowerOutageStatus.SCHEDULED;
    }

    private CityCorporation getCityCorporationByProvider(UtilityProvider provider) {
        if (provider == UtilityProvider.DESCO) {
            return CityCorporation.DHAKA_NORTH_CITY_CORPORATION;
        }

        if (provider == UtilityProvider.DPDC) {
            return CityCorporation.DHAKA_SOUTH_CITY_CORPORATION;
        }

        return CityCorporation.NOT_AVAILABLE;
    }

    private List<String> getAllowedThanas(UtilityProvider provider) {
        if (provider == UtilityProvider.DESCO) {
            return DESCO_DNCC_THANAS;
        }

        if (provider == UtilityProvider.DPDC) {
            return DPDC_DSCC_THANAS;
        }

        return List.of();
    }

    private LocalDateTime parseDateTime(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return LocalDateTime.parse(value);
    }

    private LocalTime parseTime(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return LocalTime.parse(value);
    }

    private UtilityProfileResponse mapProfileToResponse(UtilityProfile profile) {
        return UtilityProfileResponse.builder()
                .id(profile.getId())
                .userId(profile.getUser().getId())
                .provider(profile.getProvider())
                .cityCorporation(profile.getCityCorporation())
                .officerName(profile.getOfficerName())
                .employeeId(profile.getEmployeeId())
                .officialPhone(profile.getOfficialPhone())
                .officeAddress(profile.getOfficeAddress())
                .serviceZone(profile.getServiceZone())
                .allowedThanas(getAllowedThanas(profile.getProvider()))
                .createdAt(profile.getCreatedAt())
                .updatedAt(profile.getUpdatedAt())
                .build();
    }
    private PowerOutageNotice autoRestoreIfExpired(PowerOutageNotice notice) {
        if (
                notice.getStatus() == PowerOutageStatus.ONGOING &&
                        notice.getExpectedRestorationDateTime() != null &&
                        !notice.getExpectedRestorationDateTime().isAfter(LocalDateTime.now())
        ) {
            notice.setStatus(PowerOutageStatus.RESTORED);
            return powerOutageRepository.save(notice);
        }

        return notice;
    }
    private PowerOutageResponse mapNoticeToResponse(PowerOutageNotice notice) {
        notice = autoRestoreIfExpired(notice);
        boolean ongoing = powerOutageRepository.existsByThanaNameIgnoreCaseAndStatus(
                notice.getThanaName(),
                PowerOutageStatus.ONGOING
        );

        boolean recent = powerOutageRepository.existsByThanaNameIgnoreCaseAndCreatedAtAfter(
                notice.getThanaName(),
                LocalDateTime.now().minusHours(1)
        );

        return PowerOutageResponse.builder()
                .id(notice.getId())
                .userId(notice.getUser().getId())
                .utilityProfileId(notice.getUtilityProfile().getId())
                .officerName(notice.getUtilityProfile().getOfficerName())
                .officialPhone(notice.getUtilityProfile().getOfficialPhone())
                .provider(notice.getProvider())
                .cityCorporation(notice.getCityCorporation())
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
                .ongoingInSameThana(ongoing)
                .recentOutageInSameThana(recent)
                .createdAt(notice.getCreatedAt())
                .updatedAt(notice.getUpdatedAt())
                .build();
    }

    private String valueOrDefault(String value, String defaultValue) {
        if (value == null || value.trim().isEmpty()) {
            return defaultValue;
        }

        return value;
    }
}