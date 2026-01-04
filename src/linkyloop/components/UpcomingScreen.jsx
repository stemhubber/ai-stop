import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import "./styles/UpcomingScreen.css";
import { useAuth } from "../../context/AuthContext";
import { FollowUpController } from "../controllers/FollowUpController";
import ContactCard from "./contact/ContactCard";

export default function UpcomingScreen() {
  const { user } = useAuth();
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUpcoming() {
      setLoading(true);
      try {
        const data = await FollowUpController.getUpcoming(user?.uid);
        setUpcoming(data);
      } catch (err) {
        console.error("Failed to fetch upcoming follow-ups:", err);
      } finally {
        setLoading(false);
      }
    }

    if (user?.uid) fetchUpcoming();
  }, [user]);

  // Format Firestore timestamp
  const formatDate = (ts) => {
    if (!ts?.seconds) return "";
    const date = new Date(ts.seconds * 1000);
    return date.toLocaleString();
  };

  return (
    <motion.div
      className="upcoming-screen"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="upcoming-title">Upcoming</h2>

      {loading && <p className="upcoming-loading">Loading...</p>}
      {!loading && upcoming.length === 0 && (
        <p className="upcoming-empty">No upcoming follow-ups</p>
      )}

      {!loading && upcoming.length > 0 && (
        <div className="upcoming-table-container">
          <table className="upcoming-table">
            <thead>
              <tr>
                <th>Contact ID</th>
                <th>Reason</th>
                <th>Message</th>
                <th>Scheduled At</th>
                
                <th>Status</th>
                <th>Creation</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((item) => (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <td><ContactCard contactId={item.contact?.id}/></td>
                  <td>{item.reason}</td>
                  <td>{item.message}</td>
                  <td>{formatDate(item.scheduledAt)}</td>
                  <td>{item.status}</td>
                  <td>{formatDate(item.createdAt)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
