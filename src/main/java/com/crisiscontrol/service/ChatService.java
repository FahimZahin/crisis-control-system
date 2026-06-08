package com.crisiscontrol.service;

import com.crisiscontrol.dto.ChatContactResponse;
import com.crisiscontrol.dto.ChatMessageResponse;
import com.crisiscontrol.dto.ChatSendRequest;
import com.crisiscontrol.entity.ChatMessage;
import com.crisiscontrol.entity.ChatMessageStatus;
import com.crisiscontrol.entity.Role;
import com.crisiscontrol.entity.User;
import com.crisiscontrol.repository.ChatMessageRepository;
import com.crisiscontrol.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;

    public List<ChatContactResponse> getAvailableContacts(Long userId) {
        User currentUser = getUser(userId);

        return userRepository.findAll()
                .stream()
                .filter(user -> !user.getId().equals(currentUser.getId()))
                .filter(user -> user.getStatus() == null || !"BLOCKED".equalsIgnoreCase(String.valueOf(user.getStatus())))
                .filter(user -> user.getStatus() == null || !"INACTIVE".equalsIgnoreCase(String.valueOf(user.getStatus())))
                .filter(user -> isAllowedContact(currentUser, user))
                .map(user -> mapContact(currentUser.getId(), user))
                .sorted(Comparator.comparing(ChatContactResponse::getFullName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    public List<ChatContactResponse> getConversations(Long userId) {
        User currentUser = getUser(userId);

        List<ChatMessage> messages = chatMessageRepository.findBySenderIdOrReceiverIdOrderByCreatedAtDesc(
                currentUser.getId(),
                currentUser.getId()
        );

        Map<Long, ChatMessage> latestMessageByOtherUser = new LinkedHashMap<>();

        for (ChatMessage message : messages) {
            Long otherUserId = message.getSender().getId().equals(currentUser.getId())
                    ? message.getReceiver().getId()
                    : message.getSender().getId();

            latestMessageByOtherUser.putIfAbsent(otherUserId, message);
        }

        return latestMessageByOtherUser.entrySet()
                .stream()
                .map(entry -> {
                    User otherUser = getUser(entry.getKey());
                    ChatMessage latestMessage = entry.getValue();

                    ChatContactResponse response = mapContact(currentUser.getId(), otherUser);
                    response.setLastMessage(latestMessage.getMessage());
                    response.setLastMessageTime(
                            latestMessage.getCreatedAt() == null
                                    ? "-"
                                    : latestMessage.getCreatedAt().toString()
                    );

                    return response;
                })
                .toList();
    }

    public List<ChatMessageResponse> getThread(Long userId, Long otherUserId) {
        User currentUser = getUser(userId);
        User otherUser = getUser(otherUserId);

        if (!isAllowedContact(currentUser, otherUser)) {
            throw new RuntimeException("You are not allowed to chat with this user");
        }

        return chatMessageRepository
                .findBySenderIdAndReceiverIdOrReceiverIdAndSenderIdOrderByCreatedAtAsc(
                        currentUser.getId(),
                        otherUser.getId(),
                        currentUser.getId(),
                        otherUser.getId()
                )
                .stream()
                .map(this::mapMessage)
                .toList();
    }

    @Transactional
    public ChatMessageResponse sendMessage(ChatSendRequest request) {
        validateSendRequest(request);

        User sender = getUser(request.getSenderId());
        User receiver = getUser(request.getReceiverId());

        if (!isAllowedContact(sender, receiver)) {
            throw new RuntimeException("You are not allowed to send message to this user");
        }

        ChatMessage message = ChatMessage.builder()
                .sender(sender)
                .receiver(receiver)
                .message(request.getMessage().trim())
                .status(ChatMessageStatus.SENT)
                .build();

        ChatMessage savedMessage = chatMessageRepository.save(message);

        return mapMessage(savedMessage);
    }

    public long getTotalUnreadCount(Long userId) {
        User currentUser = getUser(userId);

        return chatMessageRepository.countByReceiverIdAndStatus(
                currentUser.getId(),
                ChatMessageStatus.SENT
        );
    }

    @Transactional
    public void markThreadAsRead(Long userId, Long otherUserId) {
        User currentUser = getUser(userId);
        User otherUser = getUser(otherUserId);

        List<ChatMessage> unreadMessages =
                chatMessageRepository.findByReceiverIdAndSenderIdAndStatusOrderByCreatedAtAsc(
                        currentUser.getId(),
                        otherUser.getId(),
                        ChatMessageStatus.SENT
                );

        for (ChatMessage message : unreadMessages) {
            message.setStatus(ChatMessageStatus.READ);
            message.setReadAt(LocalDateTime.now());
        }

        chatMessageRepository.saveAll(unreadMessages);
    }

    private boolean isAllowedContact(User currentUser, User targetUser) {
        Role currentRole = currentUser.getRole();
        Role targetRole = targetUser.getRole();

        if (currentRole == null || targetRole == null) {
            return false;
        }

        if (currentRole == Role.ADMIN) {
            return true;
        }

        if (targetRole == Role.ADMIN) {
            return true;
        }

        if (currentRole == Role.GOVERNMENT_AUTHORITY) {
            return targetRole == Role.LOCAL_AUTHORITY
                    || targetRole == Role.UTILITY_AUTHORITY
                    || targetRole == Role.HOSPITAL_AUTHORITY
                    || targetRole == Role.BUILDING_MANAGER
                    || targetRole == Role.PUMP_AUTHORITY
                    || targetRole == Role.EMERGENCY_VEHICLE_AUTHORITY;
        }

        if (currentRole == Role.LOCAL_AUTHORITY) {
            return targetRole == Role.GOVERNMENT_AUTHORITY
                    || targetRole == Role.PUMP_AUTHORITY
                    || targetRole == Role.VEHICLE_OWNER
                    || targetRole == Role.HOSPITAL_AUTHORITY
                    || targetRole == Role.BUILDING_MANAGER
                    || targetRole == Role.UTILITY_AUTHORITY;
        }

        if (currentRole == Role.VEHICLE_OWNER) {
            return targetRole == Role.PUMP_AUTHORITY
                    || targetRole == Role.LOCAL_AUTHORITY
                    || targetRole == Role.GOVERNMENT_AUTHORITY;
        }

        if (currentRole == Role.PUMP_AUTHORITY) {
            return targetRole == Role.VEHICLE_OWNER
                    || targetRole == Role.LOCAL_AUTHORITY
                    || targetRole == Role.GOVERNMENT_AUTHORITY;
        }

        if (currentRole == Role.HOSPITAL_AUTHORITY) {
            return targetRole == Role.UTILITY_AUTHORITY
                    || targetRole == Role.LOCAL_AUTHORITY
                    || targetRole == Role.GOVERNMENT_AUTHORITY;
        }

        if (currentRole == Role.BUILDING_MANAGER) {
            return targetRole == Role.UTILITY_AUTHORITY
                    || targetRole == Role.LOCAL_AUTHORITY
                    || targetRole == Role.GOVERNMENT_AUTHORITY;
        }

        if (currentRole == Role.UTILITY_AUTHORITY) {
            return targetRole == Role.HOSPITAL_AUTHORITY
                    || targetRole == Role.BUILDING_MANAGER
                    || targetRole == Role.LOCAL_AUTHORITY
                    || targetRole == Role.GOVERNMENT_AUTHORITY;
        }

        if (currentRole == Role.EMERGENCY_VEHICLE_AUTHORITY) {
            return targetRole == Role.PUMP_AUTHORITY
                    || targetRole == Role.LOCAL_AUTHORITY
                    || targetRole == Role.GOVERNMENT_AUTHORITY;
        }

        return false;
    }

    private ChatContactResponse mapContact(Long currentUserId, User contact) {
        long unreadCount = chatMessageRepository.countByReceiverIdAndSenderIdAndStatus(
                currentUserId,
                contact.getId(),
                ChatMessageStatus.SENT
        );

        return ChatContactResponse.builder()
                .userId(contact.getId())
                .fullName(contact.getFullName())
                .phoneNumber(contact.getPhoneNumber())
                .role(contact.getRole())
                .address(contact.getAddress())
                .thanaOrUpazila(contact.getThanaOrUpazila())
                .unreadCount(unreadCount)
                .lastMessage("-")
                .lastMessageTime("-")
                .build();
    }

    private ChatMessageResponse mapMessage(ChatMessage message) {
        User sender = message.getSender();
        User receiver = message.getReceiver();

        return ChatMessageResponse.builder()
                .id(message.getId())
                .senderId(sender.getId())
                .senderName(sender.getFullName())
                .senderRole(sender.getRole())
                .receiverId(receiver.getId())
                .receiverName(receiver.getFullName())
                .receiverRole(receiver.getRole())
                .message(message.getMessage())
                .status(message.getStatus())
                .createdAt(message.getCreatedAt())
                .readAt(message.getReadAt())
                .build();
    }

    private User getUser(Long userId) {
        if (userId == null) {
            throw new RuntimeException("User ID is required");
        }

        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private void validateSendRequest(ChatSendRequest request) {
        if (request == null) {
            throw new RuntimeException("Message request is required");
        }

        if (request.getSenderId() == null) {
            throw new RuntimeException("Sender is required");
        }

        if (request.getReceiverId() == null) {
            throw new RuntimeException("Receiver is required");
        }

        if (request.getSenderId().equals(request.getReceiverId())) {
            throw new RuntimeException("You cannot send message to yourself");
        }

        if (request.getMessage() == null || request.getMessage().trim().isEmpty()) {
            throw new RuntimeException("Message cannot be empty");
        }

        if (request.getMessage().trim().length() > 1000) {
            throw new RuntimeException("Message cannot exceed 1000 characters");
        }
    }
}