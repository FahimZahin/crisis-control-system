package com.crisiscontrol.controller;

import com.crisiscontrol.dto.CommunityMessageRequest;
import com.crisiscontrol.dto.CommunityMessageResponse;
import com.crisiscontrol.service.CommunityChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
}