package com.crisiscontrol.controller;

import com.crisiscontrol.dto.CrisisAssistantRequest;
import com.crisiscontrol.dto.CrisisAssistantResponse;
import com.crisiscontrol.service.CrisisAssistantService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/crisis-assistant")
@RequiredArgsConstructor
public class CrisisAssistantController {

    private final CrisisAssistantService crisisAssistantService;

    @GetMapping("/suggested-questions")
    public ResponseEntity<Map<String, List<String>>> getSuggestedQuestions() {
        return ResponseEntity.ok(
                Map.of("questions", crisisAssistantService.getSuggestedQuestions())
        );
    }

    @PostMapping("/ask")
    public ResponseEntity<CrisisAssistantResponse> ask(
            @RequestBody CrisisAssistantRequest request
    ) {
        return ResponseEntity.ok(crisisAssistantService.ask(request));
    }
}