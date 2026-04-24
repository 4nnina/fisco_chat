export interface UserChatEntry {
  conversation_id?: string;
  timestamp: string;
  model: string;
  prompt: string;
  response: string;
  history: Array<{ role: string; content: string }>;
}

export interface UserChatSummary {
  username: string;
  has_chat: boolean;
  chat_count: number;
  updated_at: string | null;
}

export interface UserChatHistory {
  username: string;
  created_at: string | null;
  updated_at: string | null;
  chats: UserChatEntry[];
  error?: string;
}
