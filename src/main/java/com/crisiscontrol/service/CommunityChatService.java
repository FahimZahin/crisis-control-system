package com.crisiscontrol.service;

import com.crisiscontrol.dto.CommunityMessageRequest;
import com.crisiscontrol.dto.CommunityMessageResponse;
import com.crisiscontrol.dto.LocalCommunityGroupResponse;
import com.crisiscontrol.dto.LocalCommunityMessageRequest;
import com.crisiscontrol.entity.ChatGroup;
import com.crisiscontrol.entity.ChatGroupMessage;
import com.crisiscontrol.entity.ChatGroupType;
import com.crisiscontrol.entity.Role;
import com.crisiscontrol.entity.User;
import com.crisiscontrol.repository.ChatGroupMessageRepository;
import com.crisiscontrol.repository.ChatGroupRepository;
import com.crisiscontrol.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.time.LocalDateTime;
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
        validateCommonRequest(request);

        User sender = getUser(request.getSenderId());
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

    public long getCommonUnreadCount(Long userId, LocalDateTime lastSeenAt) {
        User user = getUser(userId);

        if (lastSeenAt == null) {
            return 0;
        }

        ChatGroup group = getOrCreateCommonGroup();

        return chatGroupMessageRepository.countByGroupIdAndDeletedFalseAndSenderIdNotAndCreatedAtAfter(
                group.getId(),
                user.getId(),
                lastSeenAt
        );
    }

    public long getLocalUnreadCount(Long userId, LocalDateTime lastSeenAt) {
        User user = getUser(userId);

        if (lastSeenAt == null) {
            return 0;
        }

        ensureLocalGroupsFromExistingUsers();

        if (isAdminOrGovernment(user)) {
            return chatGroupRepository.findByGroupTypeOrderByThanaNameAsc(ChatGroupType.LOCAL)
                    .stream()
                    .mapToLong(group -> chatGroupMessageRepository.countByGroupIdAndDeletedFalseAndSenderIdNotAndCreatedAtAfter(
                            group.getId(),
                            user.getId(),
                            lastSeenAt
                    ))
                    .sum();
        }

        String thana = resolveUserThana(user);

        if (isBlank(thana)) {
            return 0;
        }

        ChatGroup group = getOrCreateLocalGroup(thana);

        return chatGroupMessageRepository.countByGroupIdAndDeletedFalseAndSenderIdNotAndCreatedAtAfter(
                group.getId(),
                user.getId(),
                lastSeenAt
        );
    }

    public List<LocalCommunityGroupResponse> getLocalGroupsForUser(Long userId) {
        User user = getUser(userId);

        ensureLocalGroupsFromExistingUsers();

        if (isAdminOrGovernment(user)) {
            return chatGroupRepository.findByGroupTypeOrderByThanaNameAsc(ChatGroupType.LOCAL)
                    .stream()
                    .map(group -> LocalCommunityGroupResponse.builder()
                            .groupId(group.getId())
                            .groupName(group.getGroupName())
                            .thanaName(group.getThanaName())
                            .build())
                    .toList();
        }

        String thana = resolveUserThana(user);

        if (isBlank(thana)) {
            throw new RuntimeException("Your thana/area is not set. Please update your profile or registration information.");
        }

        ChatGroup group = getOrCreateLocalGroup(thana);

        return List.of(
                LocalCommunityGroupResponse.builder()
                        .groupId(group.getId())
                        .groupName(group.getGroupName())
                        .thanaName(group.getThanaName())
                        .build()
        );
    }

    public List<CommunityMessageResponse> getLocalMessages(Long userId, String requestedThana) {
        User user = getUser(userId);

        String thana = resolveAllowedLocalThana(user, requestedThana);
        ChatGroup group = getOrCreateLocalGroup(thana);

        return chatGroupMessageRepository.findTop50ByGroupIdAndDeletedFalseOrderByCreatedAtDesc(group.getId())
                .stream()
                .sorted(Comparator.comparing(ChatGroupMessage::getCreatedAt))
                .map(this::mapMessage)
                .toList();
    }

    @Transactional
    public CommunityMessageResponse sendLocalMessage(LocalCommunityMessageRequest request) {
        validateLocalRequest(request);

        User sender = getUser(request.getSenderId());

        String thana = resolveAllowedLocalThana(sender, request.getThanaName());
        ChatGroup group = getOrCreateLocalGroup(thana);

        ChatGroupMessage message = ChatGroupMessage.builder()
                .group(group)
                .sender(sender)
                .message(request.getMessage().trim())
                .pinned(false)
                .deleted(false)
                .build();

        return mapMessage(chatGroupMessageRepository.save(message));
    }

    private void ensureLocalGroupsFromExistingUsers() {
        List<User> users = userRepository.findAll();

        for (User user : users) {
            String thana = resolveUserThana(user);

            if (!isBlank(thana)) {
                getOrCreateLocalGroup(thana);
            }
        }
    }

    private ChatGroup getOrCreateLocalGroup(String thanaName) {
        String cleanedThana = cleanThana(thanaName);

        if (isBlank(cleanedThana)) {
            throw new RuntimeException("Local thana/area is required");
        }

        return chatGroupRepository.findByGroupTypeAndThanaNameIgnoreCase(
                        ChatGroupType.LOCAL,
                        cleanedThana
                )
                .orElseGet(() -> chatGroupRepository.save(
                        ChatGroup.builder()
                                .groupName(cleanedThana + " Local Community")
                                .groupType(ChatGroupType.LOCAL)
                                .thanaName(cleanedThana)
                                .build()
                ));
    }

    private String resolveAllowedLocalThana(User user, String requestedThana) {
        if (isAdminOrGovernment(user)) {
            if (!isBlank(requestedThana)) {
                return cleanThana(requestedThana);
            }

            String ownThana = resolveUserThana(user);

            if (!isBlank(ownThana)) {
                return ownThana;
            }

            throw new RuntimeException("Please select a local community.");
        }

        String userThana = resolveUserThana(user);

        if (isBlank(userThana)) {
            throw new RuntimeException("Your thana/area is not set. Please update your profile or registration information.");
        }

        if (!isBlank(requestedThana) && !normalizeArea(userThana).equals(normalizeArea(requestedThana))) {
            throw new RuntimeException("You can only access your own local thana community.");
        }

        return userThana;
    }

    private String resolveUserThana(User user) {
        if (user == null) {
            return "";
        }

        if (!isBlank(user.getThanaOrUpazila())) {
            return cleanThana(user.getThanaOrUpazila());
        }

        if (!isBlank(user.getBuildingUnderThana())) {
            return cleanThana(user.getBuildingUnderThana());
        }

        if (!isBlank(user.getHospitalUnderThana())) {
            return cleanThana(user.getHospitalUnderThana());
        }

        if (!isBlank(user.getServiceArea())) {
            return cleanThana(user.getServiceArea());
        }

        if (!isBlank(user.getAssignedArea())) {
            return cleanThana(user.getAssignedArea());
        }

        return "";
    }

    private boolean isAdminOrGovernment(User user) {
        return user != null &&
                (
                        user.getRole() == Role.ADMIN ||
                                user.getRole() == Role.GOVERNMENT_AUTHORITY
                );
    }

    private void validateCommonRequest(CommunityMessageRequest request) {
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

    private void validateLocalRequest(LocalCommunityMessageRequest request) {
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

    private User getUser(Long userId) {
        if (userId == null) {
            throw new RuntimeException("User ID is required");
        }

        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private String cleanThana(String value) {
        if (value == null) {
            return "";
        }

        String trimmed = value.trim();

        String normalized = normalizeArea(trimmed);

        if (normalized.equals("gulsan")) {
            return "Gulshan";
        }

        if (normalized.equals("gulshan")) {
            return "Gulshan";
        }

        if (normalized.equals("sabujbag")
                || normalized.equals("sabujbagh")
                || normalized.equals("basabo")
                || normalized.equals("southbasabo")
                || normalized.equals("northbasabo")
                || normalized.equals("mugdapara")
                || normalized.equals("madartek")) {
            return "Sabujbagh";
        }

        if (normalized.equals("sherebanglanagar")
                || normalized.equals("sherebangla")
                || normalized.equals("sherabanglanagar")) {
            return "Sher-e-Bangla Nagar";
        }

        if (normalized.equals("tejgaon")) {
            return "Tejgaon";
        }

        if (normalized.equals("mirpur")) {
            return "Mirpur";
        }

        if (normalized.equals("ramna")) {
            return "Ramna";
        }

        return trimmed;
    }

    private String normalizeArea(String value) {
        if (value == null) {
            return "";
        }

        return value.trim()
                .replace("-", "")
                .replace("_", "")
                .replaceAll("\\s+", "")
                .toLowerCase();
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}