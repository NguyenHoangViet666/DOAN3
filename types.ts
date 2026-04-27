
export enum Role {
  SSR = 'SSR',            // Role đặc biệt: Super Special Rare :))
  ADMIN = 'Admin',
  MOD = 'Mod',
  USER = 'User',
  AUTHOR = 'Auth',        // Tác giả
  TRANSLATOR = 'Trans' // Dịch giả
}

export enum NovelType {
  TRANSLATED = 'Truyện Dịch',
  ORIGINAL = 'Truyện Sáng Tác'
}

export enum NovelStatus {
  ONGOING = 'Đang tiến hành',
  COMPLETED = 'Đã hoàn thành',
  PAUSED = 'Tạm ngưng'
}

export enum NovelLength {
  SERIES = 'Series',
  ONESHOT = 'Oneshot'
}

export enum NovelGenre {
  ACTION = 'Hành động',
  FANTASY = 'Giả tưởng',
  ROMANCE = 'Lãng mạn',
  SLICE_OF_LIFE = 'Đời thường',
  COMEDY = 'Hài hước',
  DRAMA = 'Kịch tính',
  HORROR = 'Kinh dị',
  ISEKAI = 'Dị giới'
}

export interface User {
  id: string;
  username: string;
  password?: string;
  roles: Role[]; // Changed from 'role' to 'roles'
  email: string;
  avatar?: string;
  likedNovelIds: string[];
  // Social Features
  friends?: string[];
  friendRequests?: string[]; // Incoming requests
  sentFriendRequests?: string[]; // Outgoing requests
}

export interface Novel {
  id: string;
  title: string;
  author: string;
  description: string;
  coverUrl: string;
  type: NovelType;
  status: NovelStatus;
  length: NovelLength;
  genres: NovelGenre[]; 
  isPending: boolean;   
  isFeatured?: boolean; 
  uploaderId: string;
  createdAt: string;
  // Rating aggregation
  ratingCount?: number;
  ratingSum?: number;
}

export interface Rating {
  id: string;
  novelId: string;
  userId: string;
  score: number; // 1-5
  updatedAt: string;
}

export interface Chapter {
  id: string;
  novelId: string;
  title: string;
  content: string;
  wordCount?: number; // New field for word count
  createdAt: string;
}

export interface Reply {
  id: string;
  userId: string;
  username: string;
  roles?: Role[]; // Changed from role
  userAvatar: string;
  content: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  novelId?: string; 
  postId?: string;  
  userId: string;
  username: string;
  roles?: Role[]; // Changed from role
  userAvatar: string;
  content: string;
  createdAt: string;
  likedBy?: string[]; 
  replies?: Reply[];  
}

export enum NotificationType {
  NEW_CHAPTER = 'NEW_CHAPTER',
  REPLY_COMMENT = 'REPLY_COMMENT',
  LIKE_COMMENT = 'LIKE_COMMENT',
  NEW_POST_COMMENT = 'NEW_POST_COMMENT',
  ROLE_UPDATE = 'ROLE_UPDATE',
  FRIEND_REQUEST = 'FRIEND_REQUEST',
  FRIEND_ACCEPT = 'FRIEND_ACCEPT',
  NEW_MESSAGE = 'NEW_MESSAGE'
}

export interface Notification {
  id: string;
  userId: string; 
  type: NotificationType;
  title: string;
  message: string;
  link: string; 
  isRead: boolean;
  createdAt: string;
  actorAvatar?: string; 
}

// --- FORUM TYPES ---

export enum ForumTopic {
  GENERAL = 'Thảo luận chung',
  QA = 'Hỏi đáp',
  REVIEW = 'Review truyện',
  SPOILER = 'Spoiler',
  ANNOUNCEMENT = 'Thông báo'
}

export interface Post {
  id: string;
  title: string;
  content: string;
  topic: ForumTopic;
  authorId: string;
  authorName: string;
  authorRoles: Role[]; // Changed from authorRole
  authorAvatar: string;
  viewCount: number;
  likeCount: number; 
  createdAt: string;
  isPinned?: boolean;     // New: Status ghim
  pinnedUntil?: string;   // New: Thời hạn ghim (ISO string) hoặc null (vĩnh viễn)
}

// --- ROLE REQUEST TYPES ---

export enum RoleRequestStatus {
  PENDING = 'Chờ duyệt',
  APPROVED = 'Đã duyệt',
  REJECTED = 'Từ chối'
}

export interface RoleRequest {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  currentRoles: Role[]; // Changed from currentRole
  requestedRole: Role.AUTHOR | Role.TRANSLATOR;
  reason: string; 
  status: RoleRequestStatus;
  createdAt: string;
}

// --- CHAT TYPES ---
export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    createdAt: string;
    isRead: boolean;
}

export interface Conversation {
    id: string;
    participants: string[]; // [userId1, userId2]
    participantInfo?: { // Hydrated data for UI
        id: string;
        username: string;
        avatar: string;
    }[];
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: Record<string, number>; // { userId: count }
}

export interface ReadingHistoryItem {
    novelId: string;
    chapterId: string;
    novelCoverUrl: string;
    novelTitle: string;
    chapterTitle: string;
    timestamp?: number;
}
