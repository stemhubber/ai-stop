import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "./styles/MessagingMain.css"; // theme-aware CSS

// Screens
import TodayScreen from "./TodayScreen";
import UpcomingScreen from "./UpcomingScreen";
import SentScreen from "./SentScreen";
import AddFollowUpScreen from "./AddFollowUpScreen";
import StudioBackground from "../../components/StudioBackground";
import AllScreen from "./AllScreen";

export default function MessagingMain() {
  const [activeTab, setActiveTab] = useState("today");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const [theme, setTheme] = useState(localStorage.getItem("data-theme") || "light");

  // Apply theme on mount + change
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === "dark" ? "light" : "dark"));

  const menuItems = [
    { label: "Billing", action: () => alert("Billing clicked") },
    { label: "Support", action: () => alert("Support clicked") },
    { label: "About", action: () => alert("About clicked") },
    { label: "Help", action: () => alert("Help clicked") },
  ];

  return (
    <motion.div
      className="dashboard-screen"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <StudioBackground />

      {/* Floating Theme Toggle */}
      <button
        className="studio2030-theme-toggle-floating"
        onClick={toggleTheme}
      >
        {theme === "dark" ? <i className="fa fa-moon-o"></i> : <i className="fa fa-sun-o"></i>}
      </button>

      {/* Header */}
      <header className="dashboard-header">
        <h2 className="dashboard-title">Dashboard</h2>
        <div className="dashboard-header-actions">
          <button className="dashboard-icon-btn" onClick={() => setShowAddModal(true)}>
            <i className="fa fa-plus"></i>
          </button>
          <button className="dashboard-icon-btn" onClick={() => setShowMenu(!showMenu)}>
            <i className="fa fa-ellipsis-v"></i>
          </button>
        </div>
      </header>

      {/* Menu */}
      {showMenu && (
        <motion.div
          className="dashboard-menu"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              className="dashboard-menu-item"
              onClick={() => { item.action(); setShowMenu(false); }}
            >
              {item.label}
            </button>
          ))}
        </motion.div>
      )}

      <p className="dashboard-subtitle">Your follow-ups at a glance</p>

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button className={`dashboard-tab-btn ${activeTab === "today" ? "active" : ""}`} onClick={() => setActiveTab("today")}>
          <i className="fa fa-calendar-day"></i> Today
        </button>
        <button className={`dashboard-tab-btn ${activeTab === "upcoming" ? "active" : ""}`} onClick={() => setActiveTab("upcoming")}>
          <i className="fa fa-calendar-alt"></i> Upcoming
        </button>
        <button className={`dashboard-tab-btn ${activeTab === "sent" ? "active" : ""}`} onClick={() => setActiveTab("sent")}>
          <i className="fa fa-check-circle"></i> Sent
        </button>
        <button className={`dashboard-tab-btn ${activeTab === "all" ? "active" : ""}`} onClick={() => setActiveTab("all")}>
          <i className="fa fa-history"></i> All
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === "today" && <TodayScreen onAddModal={setShowAddModal}/>}
        {activeTab === "upcoming" && <UpcomingScreen />}
        {activeTab === "sent" && <SentScreen />}
        {activeTab === "all" && <AllScreen />}
      </div>

      {/* Add Follow-Up Modal */}
      {showAddModal && (
        <motion.div className="dashboard-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)}>
          <motion.div className="dashboard-modal-content" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} onClick={e => e.stopPropagation()}>
            <AddFollowUpScreen onSuccess={() => setShowAddModal(false)} />
            <button className="dashboard-modal-close" onClick={() => setShowAddModal(false)}>
              <i className="fa fa-times"></i>
            </button>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
