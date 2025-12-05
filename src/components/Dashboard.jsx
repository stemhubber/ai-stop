import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getUserSites, getUserProfile } from "../controllers/UserController";
import "./styles/Dashboard.css";
import StudioBackground from "./StudioBackground";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [sites, setSites] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState("dark");
  const [menuOpen, setMenuOpen] = useState(false);

  /* ---------------------------------------
     LOAD THEME FROM LOCAL STORAGE
  ----------------------------------------*/
  useEffect(() => {
    const saved = localStorage.getItem("data-theme") || "light";
    document.documentElement.setAttribute("data-theme", saved);
    setTheme(saved);
  }, []);

  const toggleTheme = () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("data-theme", next);
  };

  /* ---------------------------------------
     LOAD USER AND SITES
  ----------------------------------------*/
  useEffect(() => {
    async function load() {
      const siteData = await getUserSites(user.uid);
      const profileData = await getUserProfile(user.uid);
      setSites(siteData);
      setProfile(profileData);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="dash2030-loading">Loading…</div>;

  return (
    <div className="dash2030-container">

      {/* ------------------ DARK MODE BACKGROUND ------------------ */}
      { <StudioBackground /> }

      {/* ------------------ TOP NAV BAR ------------------ */}
      <nav className="dash2030-topnav">
        <div className="topnav-left">
          <h2 className="topnav-logo">Webilo Studio</h2>
        </div>

        <div className="topnav-right">
          {/* Desktop links */}
          <div className="topnav-links">
            <a href="/studio" className="topnav-link active">Dashboard</a>
            <a href="/profile" className="topnav-link">Profile</a>
            <a className="topnav-link">Billing</a>
            <a className="topnav-link">Messages</a>
            <a className="topnav-link">Settings</a>
          </div>

          {/* Theme toggle */}
          <button className="theme-toggle-btn" onClick={toggleTheme}>
            {theme === "dark" ? (
                  <i className="fa fa-moon-o"></i>
                ) : (
                  <i className="fa fa-sun-o"></i>
                )}
          </button>

          {/* Avatar dropdown */}
          <div className="topnav-avatar" onClick={() => setMenuOpen(!menuOpen)}>
            <img
              src={
                profile?.photoURL ||
                "https://ui-avatars.com/api/?bold=true&size=200&name=User"
              }
              alt="avatar"
            />
          </div>

          {/* Mobile dropdown */}
          {menuOpen && (
            <div className="topnav-mobile-menu">
              <a href="/studio">Dashboard</a>
              <a href="/profile">Profile</a>
              <a>Billing</a>
              <a>Messages</a>
              <a>Settings</a>
              <button onClick={logout} className="mobile-logout-btn">
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* ------------------ MAIN CONTENT ------------------ */}
      <main className="dash2030-main">

        <header className="dash2030-header">
          <h1>Your Studio</h1>

          <button
            className="dash2030-create-btn"
            onClick={() => (window.location.href = "/studio/new")}
          >
            + New Site
          </button>
        </header>

        {/* --------- STATS --------- */}
        <div className="dash2030-stat-grid">
          <div className="dash2030-stat-card">
            <h3>Total Sites</h3>
            <p className="stat-value">{sites.length}</p>
          </div>

          <div className="dash2030-stat-card">
            <h3>Visitors</h3>
            <p className="stat-soon">Coming Soon</p>
          </div>

          <div className="dash2030-stat-card">
            <h3>Messages</h3>
            <p className="stat-soon">Coming Soon</p>
          </div>
        </div>

        {/* --------- SITES LIST --------- */}
        <section className="dash2030-section">
          <h2>Your Websites</h2>

          {sites.length === 0 ? (
            <div className="dash2030-empty">
              <p>No sites yet.</p>
            </div>
          ) : (
            <div className="dash2030-sites-grid">
              {sites.map((site) => (
                <div key={site.id} className="dash2030-site-card">
                  <h3>{site.id}</h3>

                  <div className="dash2030-card-actions">
                    <button
                      className="dash2030-btn-secondary"
                      onClick={() => window.open(`/site/${site.id}`, "_blank")}
                    >
                      View
                    </button>

                    <button
                      className="dash2030-btn-secondary"
                      onClick={() =>
                        (window.location.href = `/studio/edit/${site.id}`)
                      }
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
