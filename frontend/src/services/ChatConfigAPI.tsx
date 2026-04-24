import axios from "axios";
import { API_BASE_URL } from "../config";
import type { ChatConfig, ChatConfigResponse, ChatToneSourceResponse } from "../types/ChatConfigTypes";

export async function getChatConfig(): Promise<ChatConfigResponse> {
  try {
    const res = await axios.get<ChatConfigResponse>(`${API_BASE_URL}/chat-config`);
    return res.data;
  } catch (error: any) {
    return {
      model: "gpt-4o-mini",
      temperature: 0.5,
      max_history: 12,
      system_prompt_template: "",
      tone_of_voice: "",
      error: error.response?.data?.error || error.message || "Unknown error",
    };
  }
}

export async function updateChatConfig(config: ChatConfig): Promise<ChatConfigResponse> {
  try {
    const res = await axios.put<ChatConfigResponse>(`${API_BASE_URL}/chat-config`, config);
    return res.data;
  } catch (error: any) {
    return {
      ...config,
      error: error.response?.data?.error || error.message || "Unknown error",
    };
  }
}

export async function getChatToneSource(): Promise<ChatToneSourceResponse> {
  try {
    const res = await axios.get<ChatToneSourceResponse>(`${API_BASE_URL}/chat-config/tone-source`);
    return res.data;
  } catch (error: any) {
    return {
      tone_of_voice: "",
      error: error.response?.data?.error || error.message || "Unknown error",
    };
  }
}
