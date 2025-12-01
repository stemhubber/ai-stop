import { useState } from "react";
import { motion } from "framer-motion";
import "./styles/GoogleFormInput.css";

export default function GoogleFormInput({ onGenerated }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  const validateUrl = (link) => {
    return link.includes("docs.google.com/forms");
  };

  const save = () => {
    if (!validateUrl(url)) {
      setError("Please enter a valid Google Form URL.");
      return;
    }

    setError("");

    const html = `
      <div class="extra-gform-block">
        <h3 class="extra-gform-title">${title || "Form"}</h3>

        <iframe
          src="${url}"
          width="100%"
          height="600"
          frameborder="0"
          class="extra-gform-frame"
        ></iframe>
      </div>
    `;

    onGenerated(html);
    alert("Google Form inserted!");
  };

  return (
    <motion.div
      className="gf-container"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <h2 className="gf-title">Embed Google Form</h2>

      {/* Title */}
      <input
        className="gf-input"
        placeholder="Form title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      {/* URL */}
      <input
        className="gf-input"
        placeholder="Enter Google Form link"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />

      {error && <p className="gf-error">{error}</p>}

      <button className="gf-save-btn" onClick={save}>
        <i className="fa fa-check-circle"></i> Insert Form
      </button>
    </motion.div>
  );
}
