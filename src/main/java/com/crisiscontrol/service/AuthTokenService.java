package com.crisiscontrol.service;

import com.crisiscontrol.entity.User;
import com.crisiscontrol.entity.UserStatus;
import com.crisiscontrol.repository.UserRepository;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class AuthTokenService {

    private static final int TOKEN_VALID_HOURS = 8;

    private final UserRepository userRepository;

    private final Map<String, AuthenticatedUser> activeTokens = new ConcurrentHashMap<>();

    public String createToken(User user) {
        String token = UUID.randomUUID().toString();

        activeTokens.put(
                token,
                new AuthenticatedUser(
                        user.getId(),
                        user.getFullName(),
                        user.getRole().name(),
                        LocalDateTime.now().plusHours(TOKEN_VALID_HOURS)
                )
        );

        return token;
    }

    public AuthenticatedUser validateToken(String token) {
        if (token == null || token.trim().isEmpty()) {
            return null;
        }

        AuthenticatedUser authenticatedUser = activeTokens.get(token);

        if (authenticatedUser == null) {
            return null;
        }

        if (authenticatedUser.getExpiresAt().isBefore(LocalDateTime.now())) {
            activeTokens.remove(token);
            return null;
        }

        User user = userRepository.findById(authenticatedUser.getUserId()).orElse(null);

        if (user == null || user.getStatus() != UserStatus.ACTIVE) {
            activeTokens.remove(token);
            return null;
        }

        return authenticatedUser;
    }

    public void removeToken(String token) {
        if (token != null) {
            activeTokens.remove(token);
        }
    }

    @Getter
    public static class AuthenticatedUser {
        private final Long userId;
        private final String fullName;
        private final String role;
        private final LocalDateTime expiresAt;

        public AuthenticatedUser(Long userId, String fullName, String role, LocalDateTime expiresAt) {
            this.userId = userId;
            this.fullName = fullName;
            this.role = role;
            this.expiresAt = expiresAt;
        }
    }
}