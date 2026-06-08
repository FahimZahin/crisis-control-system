package com.crisiscontrol.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class LocalCommunityGroupResponse {

    private Long groupId;
    private String groupName;
    private String thanaName;
    private Long unreadCount;
}