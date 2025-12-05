import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { generateSite } from "../controllers/AiController";
import BlockEditor from "./BlockEditor";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getPublishedSite } from "../controllers/SiteController";
import StudioBackground from "./StudioBackground";
import ExtraElementsModal from "./ExtraElementsModal";
import VoiceInput from "./VoiceInput";

import "./styles/SiteStudio.css";

export default function SiteStudio() {
  const [prompt, setPrompt] = useState("");
  const [themeColor, setThemeColor] = useState("#6366f1");
  const [siteType, setSiteType] = useState("portfolio");
  const [site, setSite] = useState(null);
  const [extraModal, setExtraModal] = useState(false);
  const [needEnhancement, setNeedEnhancement] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  const { siteName } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [theme, setTheme] = useState(
    localStorage.getItem("data-theme") || "light"
  );

  // Apply theme on mount + change
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Check edit permissions
  useEffect(() => {
    async function checkAccess() {
      if (!siteName || !user) return;

      const siteDoc = await getPublishedSite(siteName);
      if (!siteDoc || siteDoc.owner !== user.uid) {
        window.location.href = `/site/${siteName}`;
        return;
      }
      setSite({ html: siteDoc.html });
    }
    checkAccess();
  }, [siteName, user]);

  // Generate site
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
        setError("AI returned invalid structure. Try refining your prompt.");
        return;
      }

      setCollapsed(true);
      setSite(result);
    } catch (err) {
      setError("Unexpected error building your website.");
    } finally {
      setLoading(false);
    }
  };

  const rebuild = async () => {
    setLoading(true);
    setError("");
    setNeedEnhancement(false);

    try {
      const result = await generateSite({
        promptText: `Rebuild this website using prompt - ${prompt}. Site to rebuild: ${site}`,
        siteType,
        themeColor
      });

      if (!result) {
        setError("AI returned invalid structure. Try refining your prompt.");
        return;
      }

      setCollapsed(true);
      setSite(result);
    } catch (err) {
      setError("Unexpected error rebuilding the site.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`studio2030-container theme-${theme}`}>

      {/* Dark-mode 3D Background */}
      {<StudioBackground />}
      {/* FLOATING THEME TOGGLE BUTTON */}
              <button
                className="studio2030-theme-toggle-floating"
                onClick={toggleTheme}
              >
                {theme === "dark" ? (
                  <i className="fa fa-moon-o"></i>
                ) : (
                  <i className="fa fa-sun-o"></i>
                )}
              </button>

      {/* SIDEBAR -------------------------------------------------------- */}
      <motion.div
        className={`studio2030-panel ${collapsed ? "collapsed" : ""}`}
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
      >
        <button
          className="studio2030-collapse"
          onClick={() => setCollapsed(!collapsed)}
        >
          <i className={`fa ${collapsed ? "fa-chevron-right" : "fa-chevron-left"}`}></i>
        </button>

        <AnimatePresence>
          {!collapsed && (
            <motion.div
              className="studio2030-panel-inner"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <h1 className="studio2030-title">
                <i className="fa fa-wand-magic-sparkles"></i> AI Website Studio
              </h1>

              


              <p className="studio2030-label">Site Type</p>
              <select
                className="studio2030-input"
                value={siteType}
                onChange={(e) => setSiteType(e.target.value)}
              >
                <option value="portfolio">Portfolio</option>
                <option value="landing-page">Landing</option>
                <option value="ecommerce">E-Commerce</option>
                <option value="blog">Blog</option>
                <option value="agency">Agency</option>
                <option value="restaurant">Restaurant</option>
              </select>

              <p className="studio2030-label">Theme Color</p>
              <input
                type="color"
                className="studio2030-color"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
              />

              <p className="studio2030-label">Describe Your Website</p>

              <div className="studio2030-text-prompt">
                <textarea
                  className="studio2030-textarea"
                  placeholder="Describe your vision..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
                <VoiceInput onTranscribed={(text) => setPrompt((p) => p + " " + text)} />
              </div>

              {loading && (
                <motion.p className="studio2030-loading" animate={{ opacity: 1 }}>
                  <i className="fa fa-spinner fa-spin"></i> Building your site...
                </motion.p>
              )}

              {error && (
                <p className="studio2030-error">
                  <i className="fa fa-circle-exclamation"></i> {error}
                </p>
              )}

              <button
                className="studio2030-generate"
                onClick={needEnhancement ? rebuild : handleGenerate}
                disabled={loading}
              >
                <i className="fa fa-robot"></i>
                {needEnhancement ? "AI Retouch" : loading ? "Generating..." : "Generate Website"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* MAIN PREVIEW ---------------------------------------------------- */}
      <motion.div className="studio2030-preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {!site && (
          <div className="studio2030-empty">
            <i className="fa fa-window-maximize"></i>
            <p>Your website preview will appear here.</p>
          </div>
        )}

        {site && (
          <>
            <BlockEditor
              html={site.html}
              onChange={(newHtml) => setSite({ ...site, html: newHtml })}
            />

            <motion.button
              className="studio2030-publish"
              onClick={() => navigate("/publish", { state: { siteHtml: site.html } })}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.92 }}
            >
              <i className="fa fa-rocket"></i> Publish
            </motion.button>

            <button className="studio2030-extra-btn" onClick={() => setExtraModal(true)}>
              <i className="fa fa-puzzle-piece"></i>
              Extras
            </button>
          </>
        )}

        {extraModal && (
          <ExtraElementsModal
            onClose={() => setExtraModal(false)}
            onInsert={(html) => {
              setNeedEnhancement(true);
              setSite({ ...site, html: site.html + html });
            }}
            siteId={siteName}
          />
        )}
      </motion.div>
    </div>
  );
}
