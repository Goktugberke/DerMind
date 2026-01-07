package com.dermind.DerMind.notification.repository;

import com.dermind.DerMind.common.enums.NotificationType;
import com.dermind.DerMind.notification.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    long countByUserIdAndIsReadFalse(String userId);

    @Query("SELECT n FROM Notification n WHERE n.userId = :userId ORDER BY n.createdAt DESC")
    List<Notification> findByUserIdOrderByCreatedAtDesc(String userId);

    @Query("SELECT COUNT(n) FROM Notification n WHERE n.userId = :userId AND n.isRead = false")
    Long countUnreadByUserId(String userId);

    List<Notification> findByUserIdAndIsReadFalse(String userId);

    List<Notification> findByNotificationType(NotificationType type);

    @Query("SELECT n FROM Notification n WHERE n.userId = :userId AND n.createdAt > :since")
    List<Notification> findRecentByUser(String userId, LocalDateTime since);
}