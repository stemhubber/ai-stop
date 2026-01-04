import { useEffect, useState, useMemo } from "react"; 
import { motion, AnimatePresence } from "framer-motion";
import "./styles/AllScreen.css";
import { useAuth } from "../../context/AuthContext";
import { FollowUpController } from "../controllers/FollowUpController";
import ContactCard from "./contact/ContactCard";

export default function AllScreen() {
  const { user } = useAuth();
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters/Search/Sorting
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    async function fetchAll() {
      setLoading(true);
      try {
        const data = await FollowUpController.getAll(user.uid);
        setFollowups(data);
      } catch (err) {
        console.error("Failed to fetch all follow-ups:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, [user]);

  // Filter & Sort
  const data = useMemo(() => {
    let filtered = followups.filter(f => {
      const contactName = f.contact?.name?.toLowerCase() || "";
      const message = f.message?.toLowerCase() || "";
      return contactName.includes(search.toLowerCase()) || message.includes(search.toLowerCase());
    });

    if (statusFilter) filtered = filtered.filter(f => f.status === statusFilter);

    return filtered.sort((a, b) => {
      const tA = (a.scheduledAt?.seconds || 0) + (a.sentAt?.seconds || 0);
      const tB = (b.scheduledAt?.seconds || 0) + (b.sentAt?.seconds || 0);
      return sortAsc ? tA - tB : tB - tA;
    });
  }, [followups, search, statusFilter, sortAsc]);

  const handleSortToggle = () => setSortAsc(prev => !prev);

  return (
    <motion.div className="all-screen" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="all-title">All Follow-Ups</h2>

      {/* Filters / Search */}
      <div className="all-filters">
        <input
          type="text"
          placeholder="Search by contact or message..."
          className="all-search"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="all-select"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
        </select>
        <button className="all-sort-btn" onClick={handleSortToggle}>
          <i className={`fa fa-sort-${sortAsc ? "up" : "down"}`}></i> Sort
        </button>
      </div>

      {loading && <p className="all-loading">Loading...</p>}
      {!loading && data.length === 0 && <p className="all-empty">No follow-ups found</p>}

      <div className="all-table-wrapper">
        <table className="all-table">
          <thead>
            <tr>
              <th>Contact</th>
              <th>Message</th>
              <th>Reason</th>
              <th>Scheduled At</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {data.map(f => (
                <motion.tr
                  key={f.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <td><ContactCard contactId={f.contact?.id}/></td>
                  <td>{f.message || "—"}</td>
                  <td>{f.reason || "—"}</td>
                  <td>{f.scheduledAt ? new Date(f.scheduledAt.seconds * 1000).toLocaleString() : "—"}</td>
                  <td>{f.status || "—"}</td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
