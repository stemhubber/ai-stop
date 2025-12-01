import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getUserSites } from "../controllers/UserController";
import { getUserProfile } from "../controllers/UserController";
import "./styles/Dashboard.css";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [sites, setSites] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="dash2030-loading">Loading...</div>;

  return (
    <div className="dash2030-container">

      {/* -------------- LEFT GLASS SIDEBAR -------------- */}
      <aside className="dash2030-sidebar">
        <div className="dash2030-profile-card">
          <img
            src={profile?.photoURL || "https://ui-avatars.com/api/?bold=true&size=200&name=User"}
            alt="avatar"
            className="dash2030-avatar"
          />

          <h3 className="dash2030-username">{profile?.displayName || "User"}</h3>
          <p className="dash2030-email">{profile?.email}</p>
        </div>

        <nav className="dash2030-nav">
          <a className="nav-item active" href="/studio">Dashboard</a>
          <a className="nav-item" href="/profile">Profile</a>
          <a className="nav-item">Billing (soon)</a>
          <a className="nav-item">Messages (soon)</a>
          <a className="nav-item">Settings (soon)</a>
        </nav>

        <button className="dash2030-logout" onClick={logout}>
          Logout
        </button>
      </aside>

      {/* -------------- MAIN CONTENT -------------- */}
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

        {/* ---------- FUTURISTIC STATS WIDGETS ---------- */}
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

        {/* ---------- YOUR SITES ---------- */}
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
