import axios from "axios";
import { auth } from "../services/firebase.config";
import { apiBaseUrl } from "../services/apiConfig";

async function requestSite(payload) {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Sign in before using AI generation.");
    const response = await axios.post(`${apiBaseUrl}/ai/site`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error("AI generation failed:", error.response?.data?.error || error.message);
    return null;
  }
}

export function generateSite({ promptText, siteType, themeColor }) {
  return requestSite({ promptText, siteType, themeColor });
}

export function revampSite({ promptText, site }) {
  return requestSite({ promptText, existingSite: site });
}
