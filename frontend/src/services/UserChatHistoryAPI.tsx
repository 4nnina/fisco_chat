import axios from "axios";
import { API_BASE_URL } from "../config";
import type { UserChatHistory } from "../types/UserChatTypes";

export async function getCurrentUserChatHistory(): Promise<UserChatHistory> {
  const token = localStorage.getItem("FastToken") || "";

  if (!token) {
    return {
      username: "",
      created_at: null,
      updated_at: null,
      chats: [],
      error: "Sessione non valida. Effettua nuovamente il login.",
    };
  }

  try {
    const res = await axios.get<UserChatHistory>(`${API_BASE_URL}/user/chats`, {
      params: { token },
    });
    return res.data;
  } catch (error: any) {
    return {
      username: "",
      created_at: null,
      updated_at: null,
      chats: [],
      error: error.response?.data?.error || error.message || "Unknown error",
    };
  }
}
