export interface ChatUser {
  id: string;
  user_id: number;
  username: string;
  fullName?: string;
  email: string;
  avatar?: string;
  isOnline: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
  playerLastSeenAt?: string; // Timestamp of when player was last seen online
  balance?: string;
  winningBalance?: string;
  gamesPlayed?: number;
  winRate?: number;
  phone?: string;
  unreadCount?: number;
  notes?: string;
}

export interface ChatMessageSender {
  id: number;
  username: string;
  fullName?: string | null;
  role?: string;
  profilePic?: string | null;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'player' | 'admin';
  timestamp: string;
  date: string;
  time?: string;
  isRead?: boolean;
  userId?: number;
  type?: string; // e.g., 'balanceUpdated', 'message', etc.
  isComment?: boolean; // Whether this is a comment vs a transaction
  isFile?: boolean; // Whether this message contains a file
  fileExtension?: string; // File extension if isFile is true (WebSocket)
  fileUrl?: string; // File URL from REST API endpoint
  userBalance?: string; // User credit balance at the time of message
  winningBalance?: string; // User winning balance at the time of message
  isPinned?: boolean;
  operationType?: 'increase' | 'decrease' | null; // Operation type for manual balance operations (workaround for backend bug)
  bonusAmount?: string | null;
  paymentMethod?: string | null;
  senderId?: number; // The sender's user ID
  sentBy?: ChatMessageSender; // Full sender info for group chat display
}

export interface ChatListResponse {
  status: string;
  users?: ChatUser[];
  total?: number;
  message?: string; // Optional message (e.g., when backend not ready)
}

export interface WebSocketMessage {
  type: 'message' | 'typing' | 'read' | 'connected' | 'error';
  data?: {
    id?: string;
    message?: string;
    sender?: 'player' | 'admin';
    timestamp?: string;
    userId?: number;
  };
  error?: string;
}

