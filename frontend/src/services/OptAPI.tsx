import axios from "axios";
import { API_BASE_URL } from "../config";

export async function runOptimization() {
  try {
    const res = await axios.post(`${API_BASE_URL}/runOptimization`);
    return res.data;
  } catch (error: any) {
    console.error("Error while starting the optimization:", error);
    return {
      status: "error",
      message: error.response?.data?.message || error.message,
    };
  }
}

export async function stopOptimization() {
  try {
    const res = await axios.post(`${API_BASE_URL}/stopOptimization`);
    return res.data;
  } catch (error: any) {
    console.error("Error while starting the optimization:", error);
    return {
      status: "error",
      message: error.response?.data?.message || error.message,
    };
  }
}

export async function getJsonFiles() {
  try {
    const res = await axios.get(`${API_BASE_URL}/getJsonFiles`);
    return res.data;
  } catch (error: any) {
    console.error("Error while fetching JSON files:", error);
    return [];
  }
}

export async function exportCSV() {
  try {

    const res = await axios.get(`${API_BASE_URL}/getCSV`, {
      responseType: "blob"
    })

    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a")
    link.href = url
    link.download = "file.csv"
    link.click()

    window.URL.revokeObjectURL(url);
    alert("Download completed!");

  } catch (err) {

    alert("Error while downloading CSV.")

  }
}