import { useState } from "react";

const functionsUrl = "https://api-koacwaodbq-uc.a.run.app"; // replace with your deployed Firebase URL

export function usePayment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Initiates a Paystack payment and redirects to checkout
   * @param {string} email - user email
   * @param {number} amount - amount in Rands
   * @param {object} metadata - optional extra data
   */
  const initiatePayment = async ({ email, amount, userId, metadata = {} }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${functionsUrl}/paystack/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, amount, userId, metadata }),
      });

      const data = await response.json();

      if (!data.authorization_url) {
        throw new Error("Payment initialization failed: "+data);
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
  };

  /**
   * Verifies a Paystack payment after completion
   * @param {string} reference - payment reference
   */
  const verifyPayment = async (reference) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${functionsUrl}/paystack/verify/${reference}`);
      const data = await response.json();

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
  };

  return {
    initiatePayment,
    verifyPayment,
    loading,
    error,
  };
}
