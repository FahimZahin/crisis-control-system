package com.crisiscontrol.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/",
                                "/index.html",
                                "/login.html",
                                "/register.html",
                                "/dashboard.html",

                                "/vehicle-owner-dashboard.html",
                                "/admin-dashboard.html",
                                "/pump-authority-dashboard.html",
                                "/emergency-vehicle-dashboard.html",
                                "/utility-authority-dashboard.html",
                                "/hospital-authority-dashboard.html",
                                "/building-manager-dashboard.html",
                                "/government-dashboard.html",
                                "/local-authority-dashboard.html",

                                "/profile.html",
                                "/profile-setup.html",

                                "/registered-users.html",
                                "/admin-fuel-settings.html",
                                "/admin-fuel-requests.html",
                                "/admin-emergency-vehicles.html",

                                "/fuel-request.html",
                                "/fuel-request-history.html",

                                "/pump-stock-management.html",
                                "/pump-fuel-requests.html",

                                "/emergency-vehicle-setup.html",
                                "/emergency-fuel-request.html",
                                "/emergency-fuel-request-history.html",

                                "/utility-profile-setup.html",
                                "/utility-outage-management.html",
                                "/power-outage-notices.html",

                                "/hospital-generator-request.html",
                                "/hospital-generator-request-history.html",

                                "/css/**",
                                "/js/**",
                                "/images/**",
                                "/api/**"
                        ).permitAll()
                        .anyRequest().permitAll()
                );

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}