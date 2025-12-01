import { useState } from "react";
import { motion } from "framer-motion";
import { searchPexels } from "../controllers/PexelsController";
import "./styles/ImagePicker.css";

export default function ImagePicker({ onSelect, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    const photos = await searchPexels(query);
    setResults(photos);
    setLoading(false);
  };

  return (
    <motion.div
      className="pexels-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="pexels-modal-content"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
      >
        <h2 className="pexels-title">Search Images</h2>

        <div className="pexels-search-row">
          <input
            type="text"
            className="pexels-search-input"
            placeholder="Search nature, cars, tech..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            className="pexels-search-btn"
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? "..." : "Search"}
          </button>
          <button className="pexels-close-btn" onClick={onClose}>✕</button>
        </div>

        {loading && <p className="pexels-loading">Loading images...</p>}

        <div className="pexels-grid">
          {results.map((img) => (
            <motion.img
              key={img.id}
              src={img.src.medium}
              className="pexels-img"
              whileHover={{ scale: 1.05 }}
              onClick={() => onSelect(img.src.large)}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
