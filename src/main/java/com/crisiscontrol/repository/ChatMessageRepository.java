package com.crisiscontrol.repository;

import com.crisiscontrol.entity.ChatMessage;
import com.crisiscontrol.entity.ChatMessageStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findBySenderIdAndReceiverIdOrReceiverIdAndSenderIdOrderByCreatedAtAsc(
            Long senderId,
            Long receiverId,
            Long receiverIdAgain,
            Long senderIdAgain
    );

    List<ChatMessage> findBySenderIdOrReceiverIdOrderByCreatedAtDesc(
            Long senderId,
            Long receiverId
    );

    List<ChatMessage> findByReceiverIdAndSenderIdAndStatusOrderByCreatedAtAsc(
            Long receiverId,
            Long senderId,
            ChatMessageStatus status
    );

    long countByReceiverIdAndSenderIdAndStatus(
            Long receiverId,
            Long senderId,
            ChatMessageStatus status
    );

    long countByReceiverIdAndStatus(
            Long receiverId,
            ChatMessageStatus status
    );
}