import axios from "axios";
import { API_BASE_URL } from "../config";
import type { Auth } from "../types/UserTypes";

async function getToken(): Promise<Auth | null> {

    const token = localStorage.getItem("FastToken");

    if (!token) return null;

    try {
        const response = await axios.post(`${API_BASE_URL}/auth`, {token});
        return response.data as Auth;
    } catch (error) {
        console.log("Error during token authentication:", error);
        return null;
    }

}

export default getToken;