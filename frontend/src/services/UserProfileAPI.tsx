import axios from "axios";
import { API_BASE_URL } from "../config";
import type { UserProfile } from "../types/FiscalTypes";

interface UserProfileResponse {
  ok?: boolean;
  profile?: UserProfile;
  error?: string;
}

export async function getUserProfile(username: string): Promise<UserProfileResponse> {
  try {
    const res = await axios.get<UserProfile>(`${API_BASE_URL}/user/profile`, {
      params: { username },
    });
    return { ok: true, profile: res.data };
  } catch (error: any) {
    return {
      error: error.response?.data?.error || error.message || "Unknown error",
    };
  }
}

export async function updateUserProfile(profile: UserProfile): Promise<UserProfileResponse> {
  try {
    const res = await axios.put<UserProfileResponse>(`${API_BASE_URL}/user/profile`, profile);
    return res.data;
  } catch (error: any) {
    return {
      error: error.response?.data?.error || error.message || "Unknown error",
    };
  }
}
