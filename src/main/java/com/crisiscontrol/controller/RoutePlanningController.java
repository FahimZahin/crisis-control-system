package com.crisiscontrol.controller;

import com.crisiscontrol.dto.RoutePlanRequest;
import com.crisiscontrol.dto.RoutePlanResponse;
import com.crisiscontrol.service.RoutePlanningService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/routes")
public class RoutePlanningController {

    private final RoutePlanningService routePlanningService;

    @GetMapping("/supported-cities")
    public ResponseEntity<List<String>> getSupportedCities() {
        return ResponseEntity.ok(routePlanningService.getSupportedCities());
    }

    @PostMapping("/plan")
    public ResponseEntity<RoutePlanResponse> planRoute(
            @RequestBody RoutePlanRequest request
    ) {
        return ResponseEntity.ok(routePlanningService.planRoute(request));
    }
}