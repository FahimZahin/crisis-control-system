package com.crisiscontrol.service;

import com.crisiscontrol.dto.NotificationResponse;
import com.crisiscontrol.entity.Notification;
import com.crisiscontrol.entity.NotificationType;
import com.crisiscontrol.entity.Role;
import com.crisiscontrol.entity.User;
import com.crisiscontrol.repository.NotificationRepository;
import com.crisiscontrol.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationResponse notifyUser(
            Long userId,
            NotificationType type,
            String title,
            String message,
            String relatedEntityType,
            Long relatedEntityId,
            String targetPage
    ) {
        if (userId == null) {
            return null;
        }

        User user = userRepository.findById(userId).orElse(null);

        if (user == null) {
            return null;
        }

        Notification notification = Notification.builder()
                .user(user)
                .role(user.getRole())
                .notificationType(type)
                .title(clean(title))
                .message(clean(message))
                .relatedEntityType(cleanOptional(relatedEntityType))
                .relatedEntityId(relatedEntityId)
                .targetPage(cleanOptional(targetPage))
                .readStatus(false)
                .build();

        return mapToResponse(notificationRepository.save(notification));
    }

    public void notifyRole(
            Role role,
            NotificationType type,
            String title,
            String message,
            String relatedEntityType,
            Long relatedEntityId,
            String targetPage
    ) {
        if (role == null) {
            return;
        }

        List<User> users = userRepository.findByRole(role);

        for (User user : users) {
            notifyUser(
                    user.getId(),
                    type,
                    title,
                    message,
                    relatedEntityType,
                    relatedEntityId,
                    targetPage
            );
        }
    }

    public void notifyLocalAuthoritiesByThana(
            String thana,
            NotificationType type,
            String title,
            String message,
            String relatedEntityType,
            Long relatedEntityId,
            String targetPage
    ) {
        if (isBlank(thana)) {
            return;
        }

        List<User> localAuthorities = userRepository.findByRole(Role.LOCAL_AUTHORITY);

        for (User localAuthority : localAuthorities) {
            String localThana = localAuthority.getThanaOrUpazila();

            if (sameText(normalizeThanaName(localThana), normalizeThanaName(thana))) {
                notifyUser(
                        localAuthority.getId(),
                        type,
                        title,
                        message,
                        relatedEntityType,
                        relatedEntityId,
                        targetPage
                );
            }
        }
    }

    public List<NotificationResponse> getNotificationsForUser(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<NotificationResponse> getUnreadNotificationsForUser(Long userId) {
        return notificationRepository.findByUserIdAndReadStatusOrderByCreatedAtDesc(userId, false)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndReadStatus(userId, false);
    }

    public NotificationResponse markAsRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));

        if (!notification.getUser().getId().equals(userId)) {
            throw new RuntimeException("This notification does not belong to this user");
        }

        notification.setReadStatus(true);
        notification.setReadAt(LocalDateTime.now());

        return mapToResponse(notificationRepository.save(notification));
    }

    public void markAllAsRead(Long userId) {
        List<Notification> notifications =
                notificationRepository.findByUserIdAndReadStatusOrderByCreatedAtDesc(userId, false);

        for (Notification notification : notifications) {
            notification.setReadStatus(true);
            notification.setReadAt(LocalDateTime.now());
        }

        notificationRepository.saveAll(notifications);
    }

    private NotificationResponse mapToResponse(Notification notification) {
        User user = notification.getUser();

        return NotificationResponse.builder()
                .id(notification.getId())
                .userId(user == null ? null : user.getId())
                .userName(user == null ? "-" : user.getFullName())
                .role(notification.getRole())
                .notificationType(notification.getNotificationType())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .relatedEntityType(notification.getRelatedEntityType())
                .relatedEntityId(notification.getRelatedEntityId())
                .targetPage(notification.getTargetPage())
                .readStatus(notification.getReadStatus())
                .createdAt(notification.getCreatedAt())
                .readAt(notification.getReadAt())
                .build();
    }

    private String clean(String value) {
        if (isBlank(value)) {
            return "Notification";
        }

        return value.trim();
    }

    private String cleanOptional(String value) {
        return value == null ? "" : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private boolean sameText(String first, String second) {
        if (first == null || second == null) {
            return false;
        }

        return first.trim().equalsIgnoreCase(second.trim());
    }

    private String normalizeThanaName(String value) {
        if (isBlank(value)) {
            return "-";
        }

        String normalized = value.trim()
                .replaceAll("\\s+", " ")
                .replace("_", " ")
                .toLowerCase();

        if (normalized.equals("gulsan") || normalized.equals("gulshan")) {
            return "Gulshan";
        }

        if (normalized.equals("sher e bangla nagar")
                || normalized.equals("sher-e-bangla nagar")
                || normalized.equals("sher-e bangla nagar")
                || normalized.equals("shere bangla nagar")
                || normalized.equals("sher bangla nagar")) {
            return "Sher-e-Bangla Nagar";
        }

        if (normalized.equals("sabuj bagh") || normalized.equals("sabujbagh")) {
            return "Sabujbagh";
        }

        if (normalized.equals("ramna")) {
            return "Ramna";
        }

        if (normalized.equals("dhanmondi")) {
            return "Dhanmondi";
        }

        if (normalized.equals("cantonment")) {
            return "Cantonment";
        }

        if (normalized.equals("kafrul")) {
            return "Kafrul";
        }

        if (normalized.equals("paltan")) {
            return "Paltan";
        }

        if (normalized.equals("sutrapur")) {
            return "Sutrapur";
        }

        if (normalized.equals("hazaribagh")) {
            return "Hazaribagh";
        }

        if (normalized.equals("shahbagh")) {
            return "Shahbagh";
        }

        return toTitleCase(normalized);
    }

    private String toTitleCase(String value) {
        if (isBlank(value)) {
            return "-";
        }

        String[] words = value.trim().split("\\s+");
        StringBuilder result = new StringBuilder();

        for (String word : words) {
            if (word.isBlank()) {
                continue;
            }

            if (!result.isEmpty()) {
                result.append(" ");
            }

            result.append(word.substring(0, 1).toUpperCase());

            if (word.length() > 1) {
                result.append(word.substring(1).toLowerCase());
            }
        }

        return result.toString();
    }
}