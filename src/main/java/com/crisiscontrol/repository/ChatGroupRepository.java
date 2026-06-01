package com.crisiscontrol.repository;

import com.crisiscontrol.entity.ChatGroup;
import com.crisiscontrol.entity.ChatGroupType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ChatGroupRepository extends JpaRepository<ChatGroup, Long> {

    Optional<ChatGroup> findByGroupType(ChatGroupType groupType);

    Optional<ChatGroup> findByGroupTypeAndThanaNameIgnoreCase(
            ChatGroupType groupType,
            String thanaName
    );

    List<ChatGroup> findByGroupTypeOrderByThanaNameAsc(ChatGroupType groupType);
}