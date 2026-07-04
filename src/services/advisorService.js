import axios from "axios";
import { auth } from "./firebase.config";
import { apiBaseUrl } from "./apiConfig";

async function authHeaders() {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Sign in before using Ask Webilo.");
  return { Authorization: `Bearer ${token}` };
}

export function parseAdvisorEvents(buffer, onEvent) {
  const normalized = buffer.replace(/\r\n/g, "\n");
  const blocks = normalized.split("\n\n");
  const remainder = blocks.pop() || "";
  blocks.forEach((block) => {
    let event = "message";
    const data = [];
    block.split("\n").forEach((line) => {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      if (line.startsWith("data:")) data.push(line.slice(5).trim());
    });
    if (!data.length) return;
    onEvent(event, JSON.parse(data.join("")));
  });
  return remainder;
}

export async function streamAdvisor({ businessId, message, history = [], onDelta, onDone }) {
  const response = await fetch(`${apiBaseUrl}/ai/advisor`, {
    method: "POST",
    headers: {
      ...(await authHeaders()),
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ businessId, message, history }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = new Error(payload.error || "Ask Webilo is unavailable right now.");
    error.code = payload.code;
    throw error;
  }
  if (!response.body) throw new Error("This browser cannot stream advisor responses.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    buffer = parseAdvisorEvents(buffer, (event, data) => {
      if (event === "delta") onDelta?.(data.text || "");
      if (event === "done") onDone?.(data);
      if (event === "error") {
        const error = new Error(data.error || "Ask Webilo could not finish that response.");
        error.code = data.code;
        throw error;
      }
    });
    if (done) break;
  }
}

export async function listAdvisorActivity(businessId) {
  const response = await axios.get(`${apiBaseUrl}/advisor/activity`, {
    params: { businessId },
    headers: await authHeaders(),
  });
  return response.data?.activity || [];
}

export async function recordAdvisorAsset(businessId, action) {
  await axios.post(
    `${apiBaseUrl}/advisor/activity`,
    { businessId, action },
    { headers: await authHeaders() }
  );
}
