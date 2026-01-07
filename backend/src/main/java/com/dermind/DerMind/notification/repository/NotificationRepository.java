package com.dermind.DerMind.notification.repository;

import com.dermind.DerMind.common.enums.NotificationType;
import com.dermind.DerMind.notification.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // ⭐ DÜZELTİLDİ: userId yerine user.id kullanıldı
    @Query("SELECT n FROM Notification n WHERE n.user.id = :userId ORDER BY n.createdAt DESC")
    List<Notification> findByUserIdOrderByCreatedAtDesc(@Param("userId") String userId);

    // ⭐ DÜZELTİLDİ: userId yerine user.id kullanıldı
    @Query("SELECT COUNT(n) FROM Notification n WHERE n.user.id = :userId AND n.isRead = false")
    long countByUserIdAndIsReadFalse(@Param("userId") String userId);

    // ⭐ YENİ EKLENDİ: NotificationService'te kullanılan metod (aynı işi yapıyor)
    @Query("SELECT COUNT(n) FROM Notification n WHERE n.user.id = :userId AND n.isRead = false")
    Long countUnreadByUserId(@Param("userId") String userId);

    // Ek metodlar (opsiyonel - ileride kullanışlı olabilir)

    @Query("SELECT n FROM Notification n WHERE n.user.id = :userId AND n.isRead = false ORDER BY n.createdAt DESC")
    List<Notification> findByUserIdAndIsReadFalse(@Param("userId") String userId);

    @Query("SELECT n FROM Notification n WHERE n.type = :type ORDER BY n.createdAt DESC")
    List<Notification> findByNotificationType(@Param("type") NotificationType type);

    @Query("SELECT n FROM Notification n WHERE n.user.id = :userId AND n.createdAt > :since ORDER BY n.createdAt DESC")
    List<Notification> findRecentNotificationsByUser(@Param("userId") String userId, @Param("since") LocalDateTime since);
}