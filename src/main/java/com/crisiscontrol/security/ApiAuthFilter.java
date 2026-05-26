package com.crisiscontrol.security;

import com.crisiscontrol.service.AuthTokenService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
public class ApiAuthFilter extends OncePerRequestFilter {

    private final AuthTokenService authTokenService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String path = request.getRequestURI();

        if (!path.startsWith("/api/") || path.startsWith("/api/auth/")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = extractToken(request);
        AuthTokenService.AuthenticatedUser authenticatedUser = authTokenService.validateToken(token);

        if (authenticatedUser == null) {
            writeError(response, HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized. Please login again.");
            return;
        }

        if (!isAllowed(path, authenticatedUser.getRole())) {
            writeError(response, HttpServletResponse.SC_FORBIDDEN, "Access denied for role: " + authenticatedUser.getRole());
            return;
        }

        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(
                        authenticatedUser,
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + authenticatedUser.getRole()))
                );

        SecurityContextHolder.getContext().setAuthentication(authentication);

        filterChain.doFilter(request, response);
    }

    private String extractToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return null;
        }

        return authHeader.substring(7).trim();
    }

    private boolean isAllowed(String path, String role) {
        if ("ADMIN".equals(role)) {
            return true;
        }

        if (path.startsWith("/api/admin/")) {
            return false;
        }

        if (path.startsWith("/api/reports/role/pump/")) {
            return "PUMP_AUTHORITY".equals(role);
        }

        if (path.startsWith("/api/reports/role/utility/")) {
            return "UTILITY_AUTHORITY".equals(role);
        }

        if (path.startsWith("/api/reports/role/hospital/")) {
            return "HOSPITAL_AUTHORITY".equals(role);
        }

        if (path.startsWith("/api/reports/role/building/")) {
            return "BUILDING_MANAGER".equals(role);
        }

        if (path.startsWith("/api/reports/role/emergency/")) {
            return "EMERGENCY_VEHICLE_AUTHORITY".equals(role);
        }

        if (path.startsWith("/api/reports/")) {
            return "GOVERNMENT_AUTHORITY".equals(role)
                    || "LOCAL_AUTHORITY".equals(role);
        }

        if (path.startsWith("/api/pumps/")) {
            return "PUMP_AUTHORITY".equals(role);
        }

        if (path.startsWith("/api/vehicles/")) {
            return "VEHICLE_OWNER".equals(role);
        }

        if (path.startsWith("/api/fuel-requests")) {
            return "VEHICLE_OWNER".equals(role);
        }

        if (path.startsWith("/api/emergency-fuel-requests")) {
            return "EMERGENCY_VEHICLE_AUTHORITY".equals(role);
        }

        if (path.startsWith("/api/hospital-generator-fuel-requests")) {
            return "HOSPITAL_AUTHORITY".equals(role);
        }

        if (path.startsWith("/api/building-generator-fuel-requests")) {
            return "BUILDING_MANAGER".equals(role);
        }

        if (path.startsWith("/api/users/")) {
            return true;
        }

        return true;
    }

    private void writeError(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.getWriter().write("{\"message\":\"" + message + "\"}");
    }
}