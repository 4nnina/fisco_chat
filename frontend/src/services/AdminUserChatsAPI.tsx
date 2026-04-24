import axios from "axios";
import { API_BASE_URL } from "../config";
import type { UserChatHistory, UserChatSummary } from "../types/UserChatTypes";

export async function getUsersChatSummary(): Promise<UserChatSummary[]> {
  try {
    const res = await axios.get<UserChatSummary[]>(`${API_BASE_URL}/admin/users/chats/users`);
    return res.data;
  } catch {
    return [];
  }
}

export async function getUserChatHistory(username: string): Promise<UserChatHistory> {
  try {
    const res = await axios.get<UserChatHistory>(`${API_BASE_URL}/admin/users/chats/${encodeURIComponent(username)}`);
    return res.data;
  } catch (error: any) {
    return {
      username,
      created_at: null,
      updated_at: null,
      chats: [],
      error: error.response?.data?.error || error.message || "Unknown error",
    };
  }
}
