package com.social.backend.dto;

import com.social.backend.entity.Admin;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminResponse {

    private Long id;
    private String username;
    private String displayName;
    private String role;
    private String accountStatus;
    private OffsetDateTime lastLoginAt;

    public static AdminResponse fromEntity(Admin admin) {
        if (admin == null) {
            return null;
        }
        return AdminResponse.builder()
                .id(admin.getId())
                .username(admin.getUsername())
                .displayName(admin.getDisplayName())
                .role(admin.getRole())
                .accountStatus(admin.getAccountStatus())
                .lastLoginAt(admin.getLastLoginAt())
                .build();
    }
}

