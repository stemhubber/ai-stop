import React, { useState } from "react";
import { usePayment } from "./PaymentController";

export default function PaymentButton({ userEmail }) {
  const [amount, setAmount] = useState(50);
  const { initiatePayment, loading, error } = usePayment();

  const handlePay = async () => {
    const reference = await initiatePayment({ email: userEmail, amount });
    console.log("Payment initiated, reference:", reference);
    // After redirect back from Paystack, you can call verifyPayment(reference)
  };

  return (
    <div>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        min={1}
      />
      <button onClick={handlePay} disabled={loading}>
        {loading ? "Processing..." : "Pay Now"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
