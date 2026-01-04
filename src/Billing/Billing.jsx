import React, { useState } from "react";
import { motion } from "framer-motion";
import { usePayment } from "../services/PaymentController";
import "./styles/Billing.css"; // isolated styles

export default function Billing({ item, amount, user, userId }) {
  const { initiatePayment, loading, error } = usePayment();
  const [message, setMessage] = useState("");

  const handlePayment = async () => {
    setMessage("");
    try {
      const reference = await initiatePayment({
        email: user.email,
        amount,
        userId,
        metadata: { item, userName: user.name },
      });

      if (reference) {
        setMessage(`Redirecting to payment for "${item}"...`);
      } else {
        setMessage("Payment initiation failed");
      }
    } catch (err) {
      setMessage("Error initiating payment: " + err.message);
    }
  };

  return (
    <motion.div
      className="billing-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="billing-title">
        <i className="fa fa-receipt"></i> Billing
      </h2>

      <div className="billing-details">
        <p>
          <i className="fa fa-box"></i> <strong>Item:</strong> {item}
        </p>
        <p>
          <i className="fa fa-money-bill-wave"></i>{" "}
          <strong>Amount:</strong> R{amount.toFixed(2)}
        </p>
        <p>
          <i className="fa fa-user"></i>{" "}
          <strong>User:</strong> {user.name} ({user.email})
        </p>
      </div>

      <motion.button
        className="billing-button"
        onClick={handlePayment}
        disabled={loading}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {loading ? (
          <i className="fa fa-spinner fa-spin"></i>
        ) : (
          `Pay R${amount.toFixed(2)}`
        )}
      </motion.button>

      {message && <p className="billing-message">{message}</p>}
      {error && <p className="billing-error">{error}</p>}
    </motion.div>
  );
}
