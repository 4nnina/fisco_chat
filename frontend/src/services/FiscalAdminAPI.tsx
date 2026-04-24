import axios from "axios";
import { API_BASE_URL } from "../config";
import type { Commercialista, CommercialistaCreateInput, UserApiResponse, UserProfile, UserRevenue } from "../types/FiscalTypes";

export async function getUsers(): Promise<UserProfile[]> {
  const res = await axios.get<UserProfile[]>(`${API_BASE_URL}/admin/users`);
  return res.data;
}

export async function createUser(payload: UserProfile): Promise<UserApiResponse> {
  try {
    const res = await axios.post(`${API_BASE_URL}/admin/users`, payload);
    return res.data as UserApiResponse;
  } catch (error: any) {
    return {
      error: error.response?.data?.error || error.message || "Unknown error",
    };
  }
}

export async function updateUser(payload: UserProfile): Promise<UserApiResponse> {
  try {
    const res = await axios.put(`${API_BASE_URL}/admin/users/${encodeURIComponent(payload.username)}`, payload);
    return res.data as UserApiResponse;
  } catch (error: any) {
    return {
      error: error.response?.data?.error || error.message || "Unknown error",
    };
  }
}

export async function getUserRevenue(): Promise<UserRevenue[]> {
  const res = await axios.get<UserRevenue[]>(`${API_BASE_URL}/admin/users/revenue`);
  return res.data;
}

export async function upsertUserRevenue(payload: UserRevenue): Promise<UserApiResponse> {
  try {
    const res = await axios.post(`${API_BASE_URL}/admin/users/revenue`, payload);
    return res.data as UserApiResponse;
  } catch (error: any) {
    return {
      error: error.response?.data?.error || error.message || "Unknown error",
    };
  }
}

export async function getCommercialisti(): Promise<Commercialista[]> {
  const res = await axios.get<Commercialista[]>(`${API_BASE_URL}/admin/commercialisti`);
  return res.data;
}

export async function createCommercialista(payload: CommercialistaCreateInput): Promise<UserApiResponse> {
  try {
    const res = await axios.post(`${API_BASE_URL}/admin/commercialisti`, payload);
    return res.data as UserApiResponse;
  } catch (error: any) {
    return {
      error: error.response?.data?.error || error.message || "Unknown error",
    };
  }
}

// Backward-compatible exports for existing imports.
export const getFiscalUsers = getUsers;
export const createFiscalUser = createUser;
export const updateFiscalUser = updateUser;
export const getFiscalRevenue = getUserRevenue;
export const upsertFiscalRevenue = upsertUserRevenue;
