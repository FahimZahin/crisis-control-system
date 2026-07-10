package com.crisiscontrol.controller;

import com.crisiscontrol.dto.PublicPumpTransparencyResponse;
import com.crisiscontrol.dto.PublicPumpTransparencySummaryResponse;
import com.crisiscontrol.service.PublicPumpTransparencyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/public-pump-transparency")
@RequiredArgsConstructor
public class PublicPumpTransparencyController {

    private final PublicPumpTransparencyService publicPumpTransparencyService;

    @GetMapping("/summary")
    public ResponseEntity<PublicPumpTransparencySummaryResponse> getSummary(
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String role
    ) {
        return ResponseEntity.ok(publicPumpTransparencyService.getSummary(userId, role));
    }

    @GetMapping("/pumps")
    public ResponseEntity<List<PublicPumpTransparencyResponse>> getPumps(
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String role
    ) {
        return ResponseEntity.ok(publicPumpTransparencyService.getPumps(userId, role));
    }

    @GetMapping("/pumps/{pumpId}")
    public ResponseEntity<PublicPumpTransparencyResponse> getPumpDetails(
            @PathVariable Long pumpId
    ) {
        return ResponseEntity.ok(publicPumpTransparencyService.getPumpDetails(pumpId));
    }
}