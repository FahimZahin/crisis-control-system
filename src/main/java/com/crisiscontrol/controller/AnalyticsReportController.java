package com.crisiscontrol.controller;

import com.crisiscontrol.service.AnalyticsReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/analytics-reports")
public class AnalyticsReportController {

    private final AnalyticsReportService analyticsReportService;

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getAnalyticsSummary() {
        return ResponseEntity.ok(analyticsReportService.getAnalyticsSummary());
    }

    @GetMapping("/top-demand-areas")
    public ResponseEntity<List<Map<String, Object>>> getTopDemandAreas(
            @RequestParam(defaultValue = "5") int limit
    ) {
        return ResponseEntity.ok(analyticsReportService.getTopDemandAreas(limit));
    }

    @GetMapping("/recent-penalty-cases")
    public ResponseEntity<List<Map<String, Object>>> getRecentPenaltyCases(
            @RequestParam(defaultValue = "10") int limit
    ) {
        return ResponseEntity.ok(analyticsReportService.getRecentPenaltyCases(limit));
    }
}
