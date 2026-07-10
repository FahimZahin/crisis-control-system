package com.crisiscontrol.controller;

import com.crisiscontrol.dto.DistrictOptionResponse;
import com.crisiscontrol.dto.RouteDistanceResponse;
import com.crisiscontrol.service.BangladeshDistrictService;
import com.crisiscontrol.service.RouteDistanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bangladesh-districts")
@RequiredArgsConstructor
public class BangladeshDistrictController {

    private final BangladeshDistrictService bangladeshDistrictService;
    private final RouteDistanceService routeDistanceService;

    @GetMapping
    public ResponseEntity<List<DistrictOptionResponse>> getAllDistricts() {
        return ResponseEntity.ok(bangladeshDistrictService.getAllDistricts());
    }

    @GetMapping("/distance")
    public ResponseEntity<RouteDistanceResponse> calculateDistance(
            @RequestParam String source,
            @RequestParam String destination
    ) {
        return ResponseEntity.ok(routeDistanceService.calculateDistance(source, destination));
    }
}