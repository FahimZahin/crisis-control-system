package com.crisiscontrol.repository;

import com.crisiscontrol.entity.ChatGroupMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ChatGroupMessageRepository extends JpaRepository<ChatGroupMessage, Long> {

    List<ChatGroupMessage> findByGroupIdAndDeletedFalseOrderByCreatedAtAsc(Long groupId);

    List<ChatGroupMessage> findTop50ByGroupIdAndDeletedFalseOrderByCreatedAtDesc(Long groupId);

    long countByGroupIdAndDeletedFalseAndSenderIdNotAndCreatedAtAfter(
            Long groupId,
            Long senderId,
            LocalDateTime createdAt
    );
}