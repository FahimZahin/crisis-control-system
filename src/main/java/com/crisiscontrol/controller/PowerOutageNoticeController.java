package com.crisiscontrol.controller;

import com.crisiscontrol.dto.PowerOutageNoticeRequest;
import com.crisiscontrol.dto.PowerOutageNoticeResponse;
import com.crisiscontrol.service.PowerOutageNoticeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/power-outages")
public class PowerOutageNoticeController {

    private final PowerOutageNoticeService powerOutageNoticeService;

    @PostMapping
    public ResponseEntity<PowerOutageNoticeResponse> createNotice(
            @RequestBody PowerOutageNoticeRequest request
    ) {
        return ResponseEntity.ok(powerOutageNoticeService.createNotice(request));
    }

    @PutMapping("/{noticeId}")
    public ResponseEntity<PowerOutageNoticeResponse> updateNotice(
            @PathVariable Long noticeId,
            @RequestBody PowerOutageNoticeRequest request
    ) {
        return ResponseEntity.ok(powerOutageNoticeService.updateNotice(noticeId, request));
    }

    @DeleteMapping("/{noticeId}")
    public ResponseEntity<Map<String, String>> deleteNotice(@PathVariable Long noticeId) {
        return ResponseEntity.ok(powerOutageNoticeService.deleteNotice(noticeId));
    }

    @GetMapping("/active")
    public ResponseEntity<List<PowerOutageNoticeResponse>> getActiveNotices() {
        return ResponseEntity.ok(powerOutageNoticeService.getActiveNotices());
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<PowerOutageNoticeResponse>> getNoticesByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(powerOutageNoticeService.getNoticesByUser(userId));
    }

    @GetMapping("/thana/{thanaName}")
    public ResponseEntity<List<PowerOutageNoticeResponse>> getNoticesByThana(@PathVariable String thanaName) {
        return ResponseEntity.ok(powerOutageNoticeService.getNoticesByThana(thanaName));
    }

    @GetMapping("/recent/{thanaName}")
    public ResponseEntity<List<PowerOutageNoticeResponse>> getRecentNoticesByThana(@PathVariable String thanaName) {
        return ResponseEntity.ok(powerOutageNoticeService.getRecentNoticesByThana(thanaName));
    }
}