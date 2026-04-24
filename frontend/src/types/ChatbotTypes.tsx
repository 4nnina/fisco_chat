export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatbotResponse {
  message: string;
  response: string;
  model: string;
  conversation_id?: string;
  error?: string;
}
