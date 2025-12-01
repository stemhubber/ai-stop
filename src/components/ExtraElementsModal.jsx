import { motion } from "framer-motion";
import { useState } from "react";
import ExtraElementBuilder from "./ExtraElementBuilder";
import "./styles/ExtraElementsModal.css";

export default function ExtraElementsModal({ onClose, onInsert, siteId }) {
  const [selectedType, setSelectedType] = useState(null);

  const ELEMENTS = [
    { id: "map", label: "Google Map", icon: "fa-map" },
    { id: "street", label: "Street View", icon: "fa-street-view" },
    { id: "gallery", label: "Image Gallery", icon: "fa-picture-o" },
    { id: "products", label: "Products", icon: "fa-archive" },
    { id: "video", label: "Video Upload", icon: "fa-film" },
    { id: "gform", label: "Google Form", icon: "fa-clipboard" }
  ];

  return (
    <div className="extra-modal-backdrop">
      <motion.div
        className="extra-modal"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        {/* CLOSE BUTTON */}
        <button className="extra-close-btn" onClick={onClose}>
          <i className="fa fa-times"></i>
        </button>

        {/* STEP 1 — ELEMENT MENU */}
        {!selectedType && (
          <>
            <h2 className="extra-title">Choose an Element</h2>

            <div className="extra-grid">
              {ELEMENTS.map((item) => (
                <div
                  key={item.id}
                  className="extra-item"
                  onClick={() => setSelectedType(item.id)}
                >
                  <i className={`fa ${item.icon}`}></i>
                  <p>{item.label}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* STEP 2 — ELEMENT CONFIGURATION */}
        {selectedType && (
          <ExtraElementBuilder
            type={selectedType}
            onInsert={(html) => {
              onInsert(html);
              onClose();
            }}
            onClose={() => setSelectedType(null)}
            siteId={siteId}
          />
        )}
      </motion.div>
    </div>
  );
}
