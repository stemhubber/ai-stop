import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import "./styles/SentScreen.css";
import { useAuth } from "../../context/AuthContext";
import { FollowUpController } from "../controllers/FollowUpController";
import ContactCard from "./contact/ContactCard";

export default function SentScreen() {
  const { user } = useAuth();
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSent() {
      setLoading(true);
      try {
        const data = await FollowUpController.getSent(user?.uid);
        setSent(data);
      } catch (err) {
        console.error("Failed to fetch sent follow-ups:", err);
      } finally {
        setLoading(false);
      }
    }

    if (user?.uid) fetchSent();
  }, [user]);

  return (
    <motion.div
      className="sent-screen"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="sent-title">Sent Follow-Ups</h2>

      {loading && <p className="sent-loading">Loading...</p>}
      {!loading && sent.length === 0 && (
        <p className="sent-empty">No sent follow-ups yet</p>
      )}

      {!loading && sent.length > 0 && (
        <div className="sent-table-wrapper">
          <table className="sent-table">
            <thead>
              <tr>
                <th>Contact</th>
                <th>Message</th>
                <th>Scheduled At</th>
                <th>Sent At</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sent.map(item => (
                <tr key={item.id}>
                  <td><ContactCard contactId={item.contact?.id}/></td>
                  <td>{item.message}</td>
                  <td>
                    {item.scheduledAt
                      ? new Date(item.scheduledAt.seconds * 1000).toLocaleString()
                      : "—"}
                  </td>
                  <td>
                    {item.sentAt
                      ? new Date(item.sentAt.seconds * 1000).toLocaleString()
                      : "—"}
                  </td>
                  <td>{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
