import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { useState } from "react";
import L from "leaflet";
import { motion } from "framer-motion";
import "./styles/MapPicker.css";

// Fix default Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

export default function MapPicker({ onGenerated }) {
  const defaultCenter = [-33.9249, 18.4241];
  const [position, setPosition] = useState(defaultCenter);
  const [previewHTML, setPreviewHTML] = useState("");

  const buildHtml = (lat, lng) => `
    <div class="extra-map">
      <iframe
        width="100%"
        height="350"
        style="border:0;border-radius:12px;"
        src="https://www.google.com/maps?q=${lat},${lng}&output=embed"
        loading="lazy">
      </iframe>
    </div>
  `;

  function LocationMarker() {
    useMapEvents({
      click(e) {
        const coords = [e.latlng.lat, e.latlng.lng];
        setPosition(coords);
        setPreviewHTML(buildHtml(coords[0], coords[1]));
      }
    });
    return (
      <Marker
        position={position}
        draggable={true}
        eventHandlers={{
          dragend: (e) => {
            const lat = e.target.getLatLng().lat;
            const lng = e.target.getLatLng().lng;
            const coords = [lat, lng];
            setPosition(coords);
            setPreviewHTML(buildHtml(lat, lng));
          }
        }}
      />
    );
  }

  const save = () => {
    if (!position) return alert("Place the marker first.");
    onGenerated(previewHTML);
  };

  return (
    <motion.div
      className="map-picker-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <h2 className="map-title">📍 Map Picker (No API Key)</h2>
      <p className="map-sub">Click anywhere or drag the pin to choose a location.</p>

      <div className="map-box">
        <MapContainer
          center={defaultCenter}
          zoom={13}
          style={{ height: "100%", width: "100%", borderRadius: "14px" }}
        >
          {/* Free OpenStreetMap Tiles */}
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          <LocationMarker />
        </MapContainer>
      </div>

      {/* Coordinates Panel */}
      <div className="map-coords-panel">
        <label>Latitude</label>
        <input
          className="map-input"
          value={position[0]}
          onChange={(e) => {
            const lat = parseFloat(e.target.value);
            const coords = [lat, position[1]];
            setPosition(coords);
            setPreviewHTML(buildHtml(coords[0], coords[1]));
          }}
        />

        <label>Longitude</label>
        <input
          className="map-input"
          value={position[1]}
          onChange={(e) => {
            const lng = parseFloat(e.target.value);
            const coords = [position[0], lng];
            setPosition(coords);
            setPreviewHTML(buildHtml(coords[0], coords[1]));
          }}
        />

        <button className="map-save-btn" onClick={save}>
          <i className="fa fa-save"></i> Save Map
        </button>
      </div>

      {/* Preview */}
      {previewHTML && (
        <div
          className="map-preview"
          dangerouslySetInnerHTML={{ __html: previewHTML }}
        />
      )}
    </motion.div>
  );
}
