package com.crisiscontrol.dto;

import com.crisiscontrol.entity.ChatGroupType;
import com.crisiscontrol.entity.Role;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class CommunityMessageResponse {

    private Long id;

    private Long groupId;
    private String groupName;
    private ChatGroupType groupType;
    private String thanaName;

    private Long senderId;
    private String senderName;
    private Role senderRole;

    private String message;
    private Boolean pinned;
    private Boolean deleted;

    private LocalDateTime createdAt;
}