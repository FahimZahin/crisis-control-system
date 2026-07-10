package com.crisiscontrol.controller;

import com.crisiscontrol.dto.NotificationResponse;
import com.crisiscontrol.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<NotificationResponse>> getNotificationsForUser(
            @PathVariable Long userId
    ) {
        return ResponseEntity.ok(notificationService.getNotificationsForUser(userId));
    }

    @GetMapping("/user/{userId}/unread")
    public ResponseEntity<List<NotificationResponse>> getUnreadNotificationsForUser(
            @PathVariable Long userId
    ) {
        return ResponseEntity.ok(notificationService.getUnreadNotificationsForUser(userId));
    }

    @GetMapping("/user/{userId}/unread-count")
    public ResponseEntity<Map<String, Object>> getUnreadCount(
            @PathVariable Long userId
    ) {
        return ResponseEntity.ok(Map.of(
                "userId", userId,
                "unreadCount", notificationService.getUnreadCount(userId)
        ));
    }

    @PutMapping("/{notificationId}/read/user/{userId}")
    public ResponseEntity<NotificationResponse> markAsRead(
            @PathVariable Long notificationId,
            @PathVariable Long userId
    ) {
        return ResponseEntity.ok(notificationService.markAsRead(notificationId, userId));
    }

    @PutMapping("/user/{userId}/read-all")
    public ResponseEntity<Map<String, String>> markAllAsRead(
            @PathVariable Long userId
    ) {
        notificationService.markAllAsRead(userId);

        return ResponseEntity.ok(Map.of(
                "message", "All notifications marked as read"
        ));
    }
}