import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase.config";
import { apiBaseUrl } from "./apiConfig";

export async function getPaymentConnection(businessId) {
  const snapshot = await getDoc(
    doc(db, "businesses", businessId, "paymentConnections", "paystack")
  );
  return snapshot.exists() ? snapshot.data() : null;
}

export async function connectPaystackSubaccount(businessId, subaccountCode) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Sign in before connecting Paystack.");
  const response = await fetch(
    `${apiBaseUrl}/businesses/${encodeURIComponent(businessId)}/payments/paystack/connect`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ subaccountCode }),
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Could not connect Paystack.");
  return data;
}
