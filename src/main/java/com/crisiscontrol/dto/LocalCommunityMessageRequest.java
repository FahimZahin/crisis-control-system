package com.crisiscontrol.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LocalCommunityMessageRequest {

    private Long senderId;

    /*
     * Optional for normal users.
     * Required only when ADMIN/GOVERNMENT_AUTHORITY selects a local community manually.
     */
    private String thanaName;

    private String message;
}