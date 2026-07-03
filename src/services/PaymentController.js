import { useCallback, useState } from "react";
import { auth } from "./firebase.config";
import { apiBaseUrl as functionsUrl } from "./apiConfig";

export function usePayment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Initiates a Paystack payment and redirects to checkout
   * @param {string} email - user email
   * @param {number} amount - amount in Rands
   * @param {object} metadata - optional extra data
   */
  const initiatePayment = useCallback(async ({ email, amount, userId, metadata = {} }) => {
    setLoading(true);
    setError(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Sign in before starting a payment.");
      const response = await fetch(`${functionsUrl}/payments/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          email,
          amount,
          userId,
          metadata,
          callbackUrl: `${window.location.origin}/payment-complete`,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.authorization_url) {
        throw new Error(data.error || "Payment initialization failed");
      }

      // Redirect user to Paystack checkout page
      window.location.href = data.authorization_url;

      return data.reference; // you can store this in local state if needed
    } catch (err) {
      console.error("Payment initiation error:", err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Verifies a Paystack payment after completion
   * @param {string} reference - payment reference
   */
  const verifyPayment = useCallback(async (reference) => {
    setLoading(true);
    setError(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Sign in before verifying a payment.");
      const response = await fetch(`${functionsUrl}/payments/verify/${reference}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Payment verification failed");
      }

      if (data.status === "success") {
        return { success: true, data };
      } else {
        return { success: false, data };
      }
    } catch (err) {
      console.error("Payment verification error:", err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    initiatePayment,
    verifyPayment,
    loading,
    error,
  };
}
