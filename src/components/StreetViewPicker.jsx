import { useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import "./styles/StreetViewPicker.css";

export default function StreetViewPicker({ onGenerated }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [previewHTML, setPreviewHTML] = useState("");

  // 🔍 Search without API key (Nominatim)
  const searchAddress = async () => {
    if (!query.trim()) return;

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query
    )}&format=json`;

    const res = await axios.get(url);

    setResults(res.data);
  };

  const selectLocation = (loc) => {
    const lat = loc.lat;
    const lon = loc.lon;

    setSelected({ lat, lon });

    const html = `
      <div class="extra-streetview">
        <iframe 
          width="100%" 
          height="350"
          style="border:0;border-radius:12px;"
          src="https://www.google.com/maps?q=&layer=c&cbll=${lat},${lon}&cbp=12,0,0,0,0&output=svembed"
          loading="lazy">
        </iframe>
      </div>
    `;

    setPreviewHTML(html);
  };

  const save = () => {
    if (!selected) return;
    onGenerated(previewHTML);
  };

  return (
    <motion.div
      className="street-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <h2 className="street-title-main">Street View Picker</h2>

      {/* Search Box */}
      <div className="street-section">
        <input
          className="street-input"
          placeholder="Type an address (e.g., Khayelitsha Mall)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="street-btn" onClick={searchAddress}>
          <i className="fa fa-search"></i> Search
        </button>
      </div>

      {/* Search Results */}
      {results.length > 0 && (
        <div className="street-result-list">
          {results.map((loc) => (
            <div
              key={loc.place_id}
              className="street-result-item"
              onClick={() => selectLocation(loc)}
            >
              <i className="fa fa-map-marker"></i>
              {loc.display_name}
            </div>
          ))}
        </div>
      )}

      {/* Selected Coordinates */}
      {selected && (
        <div className="street-coords">
          <label>Latitude</label>
          <input
            className="street-input"
            value={selected.lat}
            onChange={(e) =>
              setSelected({ ...selected, lat: e.target.value })
            }
          />
          <label>Longitude</label>
          <input
            className="street-input"
            value={selected.lon}
            onChange={(e) =>
              setSelected({ ...selected, lon: e.target.value })
            }
          />

          <button className="street-btn save" onClick={save}>
            <i className="fa fa-save"></i> Save Street View
          </button>
        </div>
      )}

      {/* Live Preview */}
      {previewHTML && (
        <div
          className="street-preview"
          dangerouslySetInnerHTML={{ __html: previewHTML }}
        />
      )}
    </motion.div>
  );
}
