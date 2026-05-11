package com.crisiscontrol.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/",
                                "/index.html",
                                "/register.html",
                                "/login.html",
                                "/dashboard.html",
                                "/css/**",
                                "/js/**",
                                "/api/auth/register",
                                "/api/auth/login",
                                "/profile-setup.html",
                                "/images/**",
                                "/vehicle-owner-dashboard.html",
                                "/building-manager-dashboard.html",
                                "/pump-authority-dashboard.html",
                                "/hospital-authority-dashboard.html",
                                "/utility-authority-dashboard.html",
                                "/emergency-vehicle-dashboard.html",
                                "/government-dashboard.html",
                                "/local-authority-dashboard.html",
                                "/profile.html",
                                "/api/admin/**",
                                "/registered-users.html",
                                "/api/users/**",
                                "/admin-dashboard.html"
                        ).permitAll()
                        .anyRequest().authenticated()
                )
                .httpBasic(httpBasic -> httpBasic.disable())
                .formLogin(formLogin -> formLogin.disable());

        return http.build();
    }
}