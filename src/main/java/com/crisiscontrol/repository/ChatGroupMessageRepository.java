package com.crisiscontrol.repository;

import com.crisiscontrol.entity.ChatGroupMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.time.LocalDateTime;
public interface ChatGroupMessageRepository extends JpaRepository<ChatGroupMessage, Long> {

    List<ChatGroupMessage> findByGroupIdAndDeletedFalseOrderByCreatedAtAsc(Long groupId);

    List<ChatGroupMessage> findTop50ByGroupIdAndDeletedFalseOrderByCreatedAtDesc(Long groupId);

    long countByGroupIdAndDeletedFalseAndSenderIdNotAndCreatedAtAfter(
            Long groupId,
            Long senderId,
            LocalDateTime createdAt
    );
}