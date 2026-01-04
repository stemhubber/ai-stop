import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import "./styles/SettingsScreen.css";
import { useAuth } from "../../context/AuthContext";
import { UserController } from "../controllers/UserController";

export default function SettingsScreen() {
  const { user, updateUser } = useAuth();
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      setBusinessName(user.businessName || "");
    }
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await UserController.updateSettings(user.uid, { businessName });
      updateUser({ ...user, businessName });
      alert("Settings updated!");
    } catch (err) {
      console.error(err);
      alert("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="settings-screen"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2>Settings</h2>

      <input
        className="settings-input"
        placeholder="Business Name"
        value={businessName}
        onChange={e => setBusinessName(e.target.value)}
      />

      <button className="settings-save-btn" onClick={handleSave} disabled={loading}>
        {loading ? "Saving..." : "Save Settings"}
      </button>
    </motion.div>
  );
}
