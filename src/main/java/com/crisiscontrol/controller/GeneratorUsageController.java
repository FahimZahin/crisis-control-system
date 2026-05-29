package com.crisiscontrol.controller;

import com.crisiscontrol.dto.GeneratorUsageResponse;
import com.crisiscontrol.service.GeneratorUsageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class GeneratorUsageController {

    private final GeneratorUsageService generatorUsageService;

    @GetMapping("/api/generator-usages/user/{userId}")
    public ResponseEntity<List<GeneratorUsageResponse>> getUsageHistoryByUser(
            @PathVariable Long userId
    ) {
        return ResponseEntity.ok(generatorUsageService.getUsageHistoryByUser(userId));
    }
}