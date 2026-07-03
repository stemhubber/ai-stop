import { auth } from "./firebase.config";
import { apiBaseUrl } from "./apiConfig";

export async function sendMessage({ channel, to, subject, body }) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Sign in before sending a message.");
  const response = await fetch(`${apiBaseUrl}/messages/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ channel, to, subject, body }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Could not send the message.");
  return data;
}
