package com.crisiscontrol.controller;

import com.crisiscontrol.dto.CommunityMessageRequest;
import com.crisiscontrol.dto.CommunityMessageResponse;
import com.crisiscontrol.dto.LocalCommunityGroupResponse;
import com.crisiscontrol.dto.LocalCommunityMessageRequest;
import com.crisiscontrol.service.CommunityChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/community-chat")
@RequiredArgsConstructor
public class CommunityChatController {

    private final CommunityChatService communityChatService;

    @GetMapping("/common/messages")
    public ResponseEntity<List<CommunityMessageResponse>> getCommonMessages() {
        return ResponseEntity.ok(communityChatService.getCommonMessages());
    }

    @PostMapping("/common/send")
    public ResponseEntity<CommunityMessageResponse> sendCommonMessage(
            @RequestBody CommunityMessageRequest request
    ) {
        return ResponseEntity.ok(communityChatService.sendCommonMessage(request));
    }

    @GetMapping("/common/unread-count/{userId}")
    public ResponseEntity<Map<String, Long>> getCommonUnreadCount(
            @PathVariable Long userId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime lastSeenAt
    ) {
        return ResponseEntity.ok(Map.of(
                "unreadCount",
                communityChatService.getCommonUnreadCount(userId, lastSeenAt)
        ));
    }

    @GetMapping("/local/unread-count/{userId}")
    public ResponseEntity<Map<String, Long>> getLocalUnreadCount(
            @PathVariable Long userId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime lastSeenAt
    ) {
        return ResponseEntity.ok(Map.of(
                "unreadCount",
                communityChatService.getLocalUnreadCount(userId, lastSeenAt)
        ));
    }

    @GetMapping("/local/groups/{userId}")
    public ResponseEntity<List<LocalCommunityGroupResponse>> getLocalGroupsForUser(
            @PathVariable Long userId
    ) {
        return ResponseEntity.ok(communityChatService.getLocalGroupsForUser(userId));
    }

    @GetMapping("/local/messages")
    public ResponseEntity<List<CommunityMessageResponse>> getLocalMessages(
            @RequestParam Long userId,
            @RequestParam(required = false) String thanaName
    ) {
        return ResponseEntity.ok(communityChatService.getLocalMessages(userId, thanaName));
    }

    @PostMapping("/local/send")
    public ResponseEntity<CommunityMessageResponse> sendLocalMessage(
            @RequestBody LocalCommunityMessageRequest request
    ) {
        return ResponseEntity.ok(communityChatService.sendLocalMessage(request));
    }
}