//
// 2030 NEXT-GEN SITE STUDIO
// -----------------------------------------------------
// Uses FA icons, glassmorphism, premium UI, mobile-first
//

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { generateSite } from "../controllers/AiController";
import BlockEditor from "./BlockEditor";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getPublishedSite } from "../controllers/SiteController";
import "./styles/SiteStudio.css";
import ExtraElementsModal from "./ExtraElementsModal";
import VoiceInput from "./VoiceInput";

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

  // Check permissions for editing
  useEffect(() => {
    async function checkAccess() {
      if (!siteName) return;
      const siteDoc = await getPublishedSite(siteName);

      if (!siteDoc) {
        window.location.href = `/site/${siteName}`;
        return;
      }
      if (siteDoc.owner !== user.uid) {
        window.location.href = `/site/${siteName}`;
        return;
      }
      setSite({ html: siteDoc.html });
    }

    if (user) checkAccess();
  }, [siteName, user]);

  // Generate website
  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    setSite(null);

    try {
      const result = await generateSite({
        promptText: `${prompt}`,
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

  const rebuild = async ()=>{
    setLoading(true);
    setError("");
    setSite(null);
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
      setError("Unexpected error building your website.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="studio2030-container">

      {/* SIDEBAR PANEL --------------------------------------------------- */}
      <motion.div
        className={`studio2030-panel ${collapsed ? "collapsed" : ""}`}
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
      >
        {/* Collapse Icon Button */}
        <button
          className="studio2030-collapse"
          onClick={() => setCollapsed(!collapsed)}
        >
          <i className={`fa ${collapsed ? "fa-chevron-right" : "fa-chevron-left"}`}></i>
        </button>

        {/* Panel Content */}
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

              {/* Site Type */}
              <p className="studio2030-label">Site Type</p>
              <select
                className="studio2030-input"
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

              {/* Theme */}
              <p className="studio2030-label">Theme Color</p>
              <input
                type="color"
                className="studio2030-color"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
              />

              {/* Prompt */}
              <p className="studio2030-label">Describe Your Website</p>
              <div className="studio2030-text-prompt">
                <textarea
                  className="studio2030-textarea"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your vision..."
                />

                <VoiceInput 
                  onTranscribed={(text) => setPrompt(prev => prev + " " + text)} 
                  className="studio2030-voice-btn"
                />
              </div>


              {loading && (
                <motion.p
                  className="studio2030-loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
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
                onClick={needEnhancement? rebuild :handleGenerate}
                disabled={loading}
              >
                <i className="fa fa-robot"></i>
                {needEnhancement && !loading ? "AI retouch": loading ? " Generating..." : " Generate Website"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* MAIN EDITOR AREA ------------------------------------------------ */}
      <motion.div
        className="studio2030-preview"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
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

            {/* Floating Publish Button */}
            <motion.button
              className="studio2030-publish"
              onClick={() =>
                navigate("/publish", { state: { siteHtml: site.html } })
              }
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.92 }}
            >
              <i className="fa fa-rocket"></i> Publish
            </motion.button>
            <button
                className="studio2030-extra-btn"
                onClick={() => setExtraModal(true)}
              >
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
