package com.crisiscontrol.repository;

import com.crisiscontrol.entity.Notification;
import com.crisiscontrol.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Notification> findByUserIdAndReadStatusOrderByCreatedAtDesc(Long userId, Boolean readStatus);

    long countByUserIdAndReadStatus(Long userId, Boolean readStatus);

    List<Notification> findByRoleOrderByCreatedAtDesc(Role role);
}