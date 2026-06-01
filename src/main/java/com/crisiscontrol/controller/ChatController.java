package com.crisiscontrol.controller;

import com.crisiscontrol.dto.ChatContactResponse;
import com.crisiscontrol.dto.ChatMessageResponse;
import com.crisiscontrol.dto.ChatSendRequest;
import com.crisiscontrol.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chats")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @GetMapping("/contacts/{userId}")
    public ResponseEntity<List<ChatContactResponse>> getAvailableContacts(
            @PathVariable Long userId
    ) {
        return ResponseEntity.ok(chatService.getAvailableContacts(userId));
    }

    @GetMapping("/conversations/{userId}")
    public ResponseEntity<List<ChatContactResponse>> getConversations(
            @PathVariable Long userId
    ) {
        return ResponseEntity.ok(chatService.getConversations(userId));
    }

    @GetMapping("/thread")
    public ResponseEntity<List<ChatMessageResponse>> getThread(
            @RequestParam Long userId,
            @RequestParam Long otherUserId
    ) {
        return ResponseEntity.ok(chatService.getThread(userId, otherUserId));
    }

    @PostMapping("/send")
    public ResponseEntity<ChatMessageResponse> sendMessage(
            @RequestBody ChatSendRequest request
    ) {
        return ResponseEntity.ok(chatService.sendMessage(request));
    }

    @PutMapping("/read")
    public ResponseEntity<Map<String, String>> markThreadAsRead(
            @RequestParam Long userId,
            @RequestParam Long otherUserId
    ) {
        chatService.markThreadAsRead(userId, otherUserId);
        return ResponseEntity.ok(Map.of("message", "Thread marked as read"));
    }
}