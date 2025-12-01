import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { generateSite } from "../controllers/AiController";
import "./styles/SiteStudio.css";
import BlockEditor from "./BlockEditor";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getPublishedSite } from "../controllers/SiteController";

export default function SiteStudio() {
  const [prompt, setPrompt] = useState("");
  const [themeColor, setThemeColor] = useState("");
  const [siteType, setSiteType] = useState("portfolio");
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const { siteName } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
        async function checkAccess() {
            if (!siteName) return; // create-new mode

            // Fetch the site from Firestore
            const siteDoc = await getPublishedSite(siteName);

            // If site not found → redirect to public viewer
            if (!siteDoc) {
            window.location.href = `/site/${siteName}`;
            return;
            }

            // If the logged in user is NOT the owner → redirect
            if (siteDoc.owner !== user.uid) {
            window.location.href = `/site/${siteName}`;
            return;
            }

            // If owner → load site data into editor
            setSite({
            html: siteDoc.html,
            // any other fields...
            });
        }

        if (user) checkAccess();
        }, [siteName, user]);



  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    setSite(null);

    try {
      const result = await generateSite({
        promptText: prompt,
        siteType,
        themeColor
      });

      if (!result) {
        setError("AI returned invalid JSON. Try refining your prompt.");
        return;
      }
      setCollapsed(true)
      setSite(result); // result.html contains the full website HTML
    } catch (err) {
      setError("Something went wrong while generating the website.");
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="sitestudio-container">
      
      {/* LEFT PANEL — Controls */}
<motion.div
  className={`sitestudio-panel ${collapsed ? "collapsed" : ""}`}
  initial={{ opacity: 0, x: -10 }}
  animate={{ opacity: 1, x: 0 }}
>
  <button
    className="sitestudio-collapse-btn"
    onClick={() => setCollapsed(!collapsed)}
  >
    {collapsed ? "➡️" : "⬅️"}
  </button>

  {!collapsed && (
    <>
      <h1 className="sitestudio-title">AI Website Studio</h1>

      <p className="sitestudio-label">Site Type</p>
      <select
        className="sitestudio-input"
        value={siteType}
        onChange={(e) => setSiteType(e.target.value)}
      >
        <option value="portfolio">Portfolio</option>
        <option value="landing-page">Landing Page</option>
        <option value="ecommerce">E-Commerce</option>
        <option value="blog">Blog</option>
        <option value="agency">Agency</option>
        <option value="restaurant">Restaurant</option>
      </select>

      <p className="sitestudio-label">Theme Color</p>
      <input
        type="color"
        className="sitestudio-color"
        value={themeColor}
        onChange={(e) => setThemeColor(e.target.value)}
      />

      <p className="sitestudio-label">Prompt</p>
      <textarea
        className="sitestudio-textarea"
        placeholder="Describe the website you want..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      {loading && (
        <motion.p className="sitestudio-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          Building your website...
        </motion.p>
      )}

      {error && (
        <motion.p className="sitestudio-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {error}
        </motion.p>
      )}

      <button
        className="sitestudio-generate-btn"
        onClick={handleGenerate}
        disabled={loading}
      >
        {loading ? "Generating..." : "Generate Website"}
      </button>
    </>
  )}
</motion.div>


      {/* RIGHT — Editor */}
      <motion.div
        className="sitestudio-preview"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {!site && (
          <div className="sitestudio-empty-placeholder">
            <p>Your website preview will appear here.</p>
          </div>
        )}

        {site && (
          <BlockEditor
            html={site.html}
            onChange={(newHtml) =>
              setSite({ ...site, html: newHtml }) // 🔥 Correct update
            }
          />
        )}

        {site && <button
  className="sitestudio-publish-float"
  onClick={() => navigate("/publish", { state: { siteHtml: site.html } })}
>
  🚀 Publish
</button>}

      </motion.div>
    </div>
  );
}
