import { useState } from "react";
import { motion } from "framer-motion";
import "./styles/AddFollowUpScreen.css";
import { useAuth } from "../../context/AuthContext";
import { FollowUpController } from "../controllers/FollowUpController";
import { ContactController } from "../controllers/ContactController";

export default function AddFollowUpScreen({ onSuccess }) {
  const { user } = useAuth();

  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("Appointment reminder");
  const [message, setMessage] = useState("");
  const [datetime, setDatetime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Validate South African phone numbers
  const isValidSAPhone = (num) => {
    const cleaned = num.replace(/\s+/g, "");
    return /^(?:\+27|0)[6-8][0-9]{8}$/.test(cleaned);
  };

  const handleSubmit = async () => {
    setError(""); // reset errors

    if (!contactName || !phone || !datetime) {
      return setError("Please fill all required fields");
    }

    if (!isValidSAPhone(phone)) {
      return setError("Please enter a valid South African phone number");
    }

    setLoading(true);

    try {
      // Ensure contact exists
      const contact = await ContactController.getOrCreateContact(
        user.uid,
        contactName,
        phone
      );

      // Create follow-up
      await FollowUpController.createFollowUp(
        user.uid,
        contact.id,
        reason,
        message,
        datetime
      );

      // Success callback
      onSuccess?.();
    } catch (err) {
      console.error(err);
      setError("Failed to schedule follow-up. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="add-followup-screen"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 15 }}
    >
      <h2 className="add-followup-title">Add Follow-Up</h2>

      {error && <div className="add-followup-error">{error}</div>}

      <motion.input
        className="add-input"
        placeholder="Customer name"
        value={contactName}
        onChange={e => setContactName(e.target.value)}
        whileFocus={{ scale: 1.02 }}
      />

      <motion.input
        className="add-input"
        placeholder="Phone number"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        whileFocus={{ scale: 1.02 }}
      />

      <motion.select
        className="add-input"
        value={reason}
        onChange={e => setReason(e.target.value)}
        whileFocus={{ scale: 1.02 }}
      >
        <option>Appointment reminder</option>
        <option>Payment reminder</option>
        <option>Quote follow-up</option>
        <option>Other</option>
      </motion.select>

      <motion.textarea
        className="add-input"
        rows={3}
        placeholder="Your message..."
        value={message}
        onChange={e => setMessage(e.target.value)}
        whileFocus={{ scale: 1.02 }}
      />

      <motion.input
        type="datetime-local"
        className="add-input"
        value={datetime}
        onChange={e => setDatetime(e.target.value)}
        whileFocus={{ scale: 1.02 }}
      />

      <motion.button
        className="add-primary-btn"
        onClick={handleSubmit}
        disabled={loading}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        <i className={`fa ${loading ? "fa-spinner fa-spin" : "fa-check"}`}></i>{" "}
        {loading ? "Scheduling..." : "Schedule Follow-Up"}
      </motion.button>
    </motion.div>
  );
}
