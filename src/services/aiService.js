import axios from "axios";
import { auth } from "./firebase.config";
import { apiBaseUrl } from "./apiConfig";

async function authenticatedPost(path, payload) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Sign in before using AI.");
  try {
    const response = await axios.post(`${apiBaseUrl}${path}`, payload, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 100000,
    });
    return response.data;
  } catch (error) {
    if (!error.response) {
      throw new Error(
        "The AI service is unavailable. Start the Firebase Functions emulator or deploy the API function."
      );
    }
    throw error;
  }
}

export function generateWebsiteDraft(brief) {
  return authenticatedPost("/ai/website-draft", { brief });
}

export function generateBusinessProfile(description) {
  return authenticatedPost("/ai/business-profile", { description });
}

export async function extractBusinessImage(file, resource) {
  if (!file?.type?.match(/^image\/(png|jpeg|webp)$/)) {
    throw new Error("Upload a PNG, JPEG, or WebP image.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Keep the image under 5 MB.");
  }
  const imageDataUrl = await readAsDataUrl(file);
  return authenticatedPost("/ai/extract-business-image", {
    imageDataUrl,
    resource,
  });
}

export async function transcribeAudio(blob) {
  if (!blob || blob.size > 5 * 1024 * 1024) {
    throw new Error("Keep voice recordings under 5 MB.");
  }
  const dataUrl = await readAsDataUrl(blob);
  return authenticatedPost("/ai/transcribe", {
    audioBase64: dataUrl.split(",")[1],
    mimeType: blob.type || "audio/webm",
  });
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("The image could not be read."));
    reader.readAsDataURL(file);
  });
}
