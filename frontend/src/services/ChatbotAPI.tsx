import axios from "axios";
import { API_BASE_URL } from "../config";
import type { ChatMessage, ChatbotResponse } from "../types/ChatbotTypes";

export async function askChatbot(
  message: string,
  history: ChatMessage[],
  model?: string,
  conversationId?: string,
  newConversation?: boolean
): Promise<ChatbotResponse> {
  try {
    const token = localStorage.getItem("FastToken") || undefined;

    const payload: {
      message: string;
      history: ChatMessage[];
      model?: string;
      token?: string;
      conversation_id?: string;
      new_conversation?: boolean;
    } = {
      message,
      history,
      token,
    };

    if (model) {
      payload.model = model;
    }

    if (conversationId) {
      payload.conversation_id = conversationId;
    }

    if (newConversation) {
      payload.new_conversation = true;
    }

    const res = await axios.post<ChatbotResponse>(`${API_BASE_URL}/chatbot`, payload);
    return res.data;
  } catch (error: any) {
    return {
      message,
      response: "",
      model: model || "configured-by-admin",
      conversation_id: conversationId,
      error: error.response?.data?.error || error.message || "Unknown error",
    };
  }
}
