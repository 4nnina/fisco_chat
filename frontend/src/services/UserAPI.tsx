import axios from "axios";
import { API_BASE_URL } from "../config";
import type { BaseResponse, Info, User } from "../types/UserTypes";

export async function getInfo(user: string) {

    if (user=="nothing") { return null; }

    try {
        const response = await axios.get(`${API_BASE_URL}/info`, {
            params: {user}
        });
        return response.data as Info;
    } catch (error) {
        console.log("Error while fetching user info:", error);
        return null;
    }

}

export async function updateInfo(user: string, info: any) {

    if (!user || user=="nothing") { return; }

    try {
        await axios.put(`${API_BASE_URL}/update`, {
            user: user,
            timeslots: info.timeslots
        });
        alert("All your preferences were saved succesfully!")
    } catch (error) {
        console.log("Error while updating user info:", error);
    }

}

export async function getUsers() {

    try {
        const response = await axios.get(`${API_BASE_URL}/users`);
        return response.data as User[];
    } catch (error) {
        console.log("Error while fetching all user info:", error);
        return [] as User[];
    }

}

export async function registerUser(name: string, password: string, mxUnd: number, mxImp: number) {

    try {
        const response = await axios.post(`${API_BASE_URL}/register`, {
            user: name,
            passw: password,
            maxUnd: mxUnd,
            maxImp: mxImp
        });
        return response.data as BaseResponse;
    } catch (error) {
        console.log("Error while fetching all user info:", error);
        return {
            ok: false
        } as BaseResponse;
    }

}

export async function deleteUser(userId: number) {

    try {
        const response = await axios.delete(`${API_BASE_URL}/remove`, {
            data: {id: userId}
        });
        return response.data as BaseResponse;
    } catch (error) {
        console.log("Error while deleting user info:", error);
        return {
            ok: false
        } as BaseResponse;
    }

}

export async function editUser(userId: number, name: string, password: string, mxUnd: number, mxImp: number) {

    try {
        const response = await axios.put(`${API_BASE_URL}/edit`, {
            id: userId,
            user: name,
            passw: password,
            maxUnd: mxUnd,
            maxImp: mxImp
        });
        return response.data as BaseResponse;
    } catch (error) {
        console.log("Error while deleting user info:", error);
        return {
            ok: false
        } as BaseResponse;
    }

}

