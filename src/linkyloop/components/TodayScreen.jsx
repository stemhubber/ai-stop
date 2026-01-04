import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import "./styles/TodayScreen.css";
import { useAuth } from "../../context/AuthContext";
import { FollowUpController } from "../controllers/FollowUpController";
import ContactCard from "./contact/ContactCard";

export default function TodayScreen({ onAddModal }) {
  const { user } = useAuth();
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTodayFollowups() {
      setLoading(true);
      try {
        const data = await FollowUpController.getToday(user?.uid);
        setFollowups(data);
      } catch (err) {
        console.error("Failed to fetch today follow-ups:", err);
      } finally {
        setLoading(false);
      }
    }

    if (user?.uid) {
      fetchTodayFollowups();
    }
  }, [user]);

  return (
    <motion.div
      className="today-screen"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="today-title">Today</h2>
      <p className="today-subtitle">We’ll remind your customers for you</p>

      {loading && <p className="today-loading">Loading...</p>}

      {!loading && followups.length === 0 && (
        <p className="today-empty">No follow-ups scheduled for today</p>
      )}

      {!loading && followups.length > 0 && (
        <div className="today-table-wrapper">
          <table className="today-table">
            <thead>
              <tr>
                <th>Contact</th>
                <th>Reason</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {followups.map(f => (
                <tr key={f.id}>
                  <td><ContactCard contactId={f.contact?.id}/></td>
                  <td>{f.reason}</td>
                  <td>
                    {f.scheduledAt
                      ? new Date(f.scheduledAt.seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </td>
                  <td>{f.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button className="today-primary-btn" onClick={() => onAddModal(true)}>
        <i className="fa fa-plus"></i> Add Follow-Up
      </button>
    </motion.div>
  );
}
