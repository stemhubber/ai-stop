import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getPublishedSite } from "../controllers/SiteController";
import { motion } from "framer-motion";
import "./styles/PublicSite.css";

export default function PublicSite() {
  const { siteName } = useParams();
  const [html, setHtml] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await getPublishedSite(siteName);
        if (!data) {
          setError("This site does not exist.");
          setLoading(false);
          return;
        }
        setHtml(data.html);
      } catch (err) {
        setError("Failed to load site.");
      }
      setLoading(false);
    }
    load();
  }, [siteName]);

  if (loading)
    return (
      <div className="publicsite-loading">
        <div className="publicsite-spinner" />
        <p>Loading site...</p>
      </div>
    );

  if (error)
    return <div className="publicsite-error">{error}</div>;

  return (
    <div className="publicsite-frame">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="publicsite-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
