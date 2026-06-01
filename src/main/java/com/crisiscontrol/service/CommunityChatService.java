package com.crisiscontrol.service;

import com.crisiscontrol.dto.CommunityMessageRequest;
import com.crisiscontrol.dto.CommunityMessageResponse;
import com.crisiscontrol.entity.ChatGroup;
import com.crisiscontrol.entity.ChatGroupMessage;
import com.crisiscontrol.entity.ChatGroupType;
import com.crisiscontrol.entity.User;
import com.crisiscontrol.repository.ChatGroupMessageRepository;
import com.crisiscontrol.repository.ChatGroupRepository;
import com.crisiscontrol.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CommunityChatService {

    private final ChatGroupRepository chatGroupRepository;
    private final ChatGroupMessageRepository chatGroupMessageRepository;
    private final UserRepository userRepository;

    public ChatGroup getOrCreateCommonGroup() {
        return chatGroupRepository.findByGroupType(ChatGroupType.COMMON)
                .orElseGet(() -> chatGroupRepository.save(
                        ChatGroup.builder()
                                .groupName("Common Crisis Community")
                                .groupType(ChatGroupType.COMMON)
                                .thanaName(null)
                                .build()
                ));
    }

    public List<CommunityMessageResponse> getCommonMessages() {
        ChatGroup group = getOrCreateCommonGroup();

        return chatGroupMessageRepository.findTop50ByGroupIdAndDeletedFalseOrderByCreatedAtDesc(group.getId())
                .stream()
                .sorted(Comparator.comparing(ChatGroupMessage::getCreatedAt))
                .map(this::mapMessage)
                .toList();
    }

    @Transactional
    public CommunityMessageResponse sendCommonMessage(CommunityMessageRequest request) {
        validateRequest(request);

        User sender = userRepository.findById(request.getSenderId())
                .orElseThrow(() -> new RuntimeException("Sender not found"));

        ChatGroup group = getOrCreateCommonGroup();

        ChatGroupMessage message = ChatGroupMessage.builder()
                .group(group)
                .sender(sender)
                .message(request.getMessage().trim())
                .pinned(false)
                .deleted(false)
                .build();

        return mapMessage(chatGroupMessageRepository.save(message));
    }

    private void validateRequest(CommunityMessageRequest request) {
        if (request == null) {
            throw new RuntimeException("Message request is required");
        }

        if (request.getSenderId() == null) {
            throw new RuntimeException("Sender ID is required");
        }

        if (request.getMessage() == null || request.getMessage().trim().isEmpty()) {
            throw new RuntimeException("Message cannot be empty");
        }

        if (request.getMessage().trim().length() > 1000) {
            throw new RuntimeException("Message cannot exceed 1000 characters");
        }
    }

    private CommunityMessageResponse mapMessage(ChatGroupMessage message) {
        ChatGroup group = message.getGroup();
        User sender = message.getSender();

        return CommunityMessageResponse.builder()
                .id(message.getId())
                .groupId(group.getId())
                .groupName(group.getGroupName())
                .groupType(group.getGroupType())
                .thanaName(group.getThanaName())
                .senderId(sender.getId())
                .senderName(sender.getFullName())
                .senderRole(sender.getRole())
                .message(message.getMessage())
                .pinned(message.getPinned())
                .deleted(message.getDeleted())
                .createdAt(message.getCreatedAt())
                .build();
    }
}