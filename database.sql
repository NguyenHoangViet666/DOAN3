CREATE DATABASE IF NOT EXISTS `01` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `01`;

-- 1. Users Table
CREATE TABLE `users` (
  `id` VARCHAR(36) PRIMARY KEY,
  `username` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255),
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `avatar` VARCHAR(500), -- Cloudinary URL
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Roles Table
CREATE TABLE `roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE
);

-- Insert predefined roles based on types.ts
INSERT INTO `roles` (`name`) VALUES 
('SSR'), 
('Admin'), 
('Mod'), 
('User'), 
('Auth'), 
('Trans');

-- 3. User Roles (Many-to-Many)
CREATE TABLE `user_roles` (
  `user_id` VARCHAR(36) NOT NULL,
  `role_id` INT NOT NULL,
  PRIMARY KEY (`user_id`, `role_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE
);

-- 4. Novels Table
CREATE TABLE `novels` (
  `id` VARCHAR(36) PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `author` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `cover_url` VARCHAR(500), -- Cloudinary URL
  `type` ENUM('Truyện Dịch', 'Truyện Sáng Tác') NOT NULL,
  `status` ENUM('Đang tiến hành', 'Đã hoàn thành', 'Tạm ngưng') NOT NULL,
  `length` ENUM('Series', 'Oneshot') NOT NULL,
  `is_pending` BOOLEAN DEFAULT TRUE,
  `is_featured` BOOLEAN DEFAULT FALSE,
  `uploader_id` VARCHAR(36) NOT NULL,
  `rating_count` INT DEFAULT 0,
  `rating_sum` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`uploader_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- 5. Novel Genres (Many-to-Many equivalent)
CREATE TABLE `novel_genres` (
  `novel_id` VARCHAR(36) NOT NULL,
  `genre` ENUM('Hành động', 'Giả tưởng', 'Lãng mạn', 'Đời thường', 'Hài hước', 'Kịch tính', 'Kinh dị', 'Dị giới') NOT NULL,
  PRIMARY KEY (`novel_id`, `genre`),
  FOREIGN KEY (`novel_id`) REFERENCES `novels`(`id`) ON DELETE CASCADE
);

-- 6. User Liked Novels
CREATE TABLE `user_liked_novels` (
  `user_id` VARCHAR(36) NOT NULL,
  `novel_id` VARCHAR(36) NOT NULL,
  PRIMARY KEY (`user_id`, `novel_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`novel_id`) REFERENCES `novels`(`id`) ON DELETE CASCADE
);

-- 7. Friends
CREATE TABLE `friends` (
  `user_id` VARCHAR(36) NOT NULL,
  `friend_id` VARCHAR(36) NOT NULL,
  PRIMARY KEY (`user_id`, `friend_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`friend_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- 8. Friend Requests
CREATE TABLE `friend_requests` (
  `id` VARCHAR(36) PRIMARY KEY,
  `sender_id` VARCHAR(36) NOT NULL,
  `receiver_id` VARCHAR(36) NOT NULL,
  `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED') DEFAULT 'PENDING',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`receiver_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_request` (`sender_id`, `receiver_id`)
);

-- 9. Ratings
CREATE TABLE `ratings` (
  `id` VARCHAR(36) PRIMARY KEY,
  `novel_id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `score` INT NOT NULL CHECK (`score` >= 1 AND `score` <= 5),
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`novel_id`) REFERENCES `novels`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_user_rating` (`novel_id`, `user_id`)
);

-- 10. Chapters
CREATE TABLE `chapters` (
  `id` VARCHAR(36) PRIMARY KEY,
  `novel_id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `content` LONGTEXT NOT NULL,
  `word_count` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`novel_id`) REFERENCES `novels`(`id`) ON DELETE CASCADE
);

-- 11. Forum Posts
CREATE TABLE `posts` (
  `id` VARCHAR(36) PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `topic` ENUM('Thảo luận chung', 'Hỏi đáp', 'Review truyện', 'Spoiler', 'Thông báo') NOT NULL,
  `author_id` VARCHAR(36) NOT NULL,
  `view_count` INT DEFAULT 0,
  `like_count` INT DEFAULT 0,
  `is_pinned` BOOLEAN DEFAULT FALSE,
  `pinned_until` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- 12. Comments
CREATE TABLE `comments` (
  `id` VARCHAR(36) PRIMARY KEY,
  `novel_id` VARCHAR(36) NULL,
  `post_id` VARCHAR(36) NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `content` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`novel_id`) REFERENCES `novels`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CHECK (`novel_id` IS NOT NULL OR `post_id` IS NOT NULL)
);

-- 13. Comment Likes
CREATE TABLE `comment_likes` (
  `comment_id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  PRIMARY KEY (`comment_id`, `user_id`),
  FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- 14. Replies
CREATE TABLE `replies` (
  `id` VARCHAR(36) PRIMARY KEY,
  `comment_id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `content` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- 15. Notifications
CREATE TABLE `notifications` (
  `id` VARCHAR(36) PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `type` ENUM('NEW_CHAPTER', 'REPLY_COMMENT', 'LIKE_COMMENT', 'NEW_POST_COMMENT', 'ROLE_UPDATE', 'FRIEND_REQUEST', 'FRIEND_ACCEPT', 'NEW_MESSAGE') NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `link` VARCHAR(500) NOT NULL,
  `is_read` BOOLEAN DEFAULT FALSE,
  `actor_avatar` VARCHAR(500),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- 16. Role Requests
CREATE TABLE `role_requests` (
  `id` VARCHAR(36) PRIMARY KEY,
  `user_id` VARCHAR(36) NOT NULL,
  `requested_role` ENUM('Auth', 'Trans') NOT NULL,
  `reason` TEXT NOT NULL,
  `status` ENUM('Chờ duyệt', 'Đã duyệt', 'Từ chối') DEFAULT 'Chờ duyệt',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- 17. Conversations
CREATE TABLE `conversations` (
  `id` VARCHAR(36) PRIMARY KEY,
  `last_message` TEXT,
  `last_message_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 18. Conversation Participants
CREATE TABLE `conversation_participants` (
  `conversation_id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `unread_count` INT DEFAULT 0,
  PRIMARY KEY (`conversation_id`, `user_id`),
  FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- 19. Messages
CREATE TABLE `messages` (
  `id` VARCHAR(36) PRIMARY KEY,
  `conversation_id` VARCHAR(36) NOT NULL,
  `sender_id` VARCHAR(36) NOT NULL,
  `content` TEXT NOT NULL,
  `is_read` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
