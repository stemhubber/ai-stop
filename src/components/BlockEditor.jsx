import { useEffect, useRef, useState } from "react";
import "./styles/BlockEditor.css";

export default function BlockEditor({ html, onChange }) {
  const [localHtml, setLocalHtml] = useState(html);
  const [editing, setEditing] = useState(false);

  // Modal state
  const [showImageModal, setShowImageModal] = useState(false);
  const [activeImageEl, setActiveImageEl] = useState(null);
  const [imageUrlInput, setImageUrlInput] = useState("");

  const containerRef = useRef(null);

  useEffect(() => {
    setLocalHtml(html);
    if (containerRef.current) {
      containerRef.current.innerHTML = html;
    }
  }, [html]);

  const enableEditing = () => {
    setEditing(true);
    const container = containerRef.current;
    container.innerHTML = localHtml;

    // Make text editable
    const textNodes = [...container.querySelectorAll("*")]
      .flatMap(el => [...el.childNodes])
      .filter(
        node =>
          node.nodeType === Node.TEXT_NODE &&
          node.textContent.trim() !== ""
      );

    textNodes.forEach(node => {
      const span = document.createElement("span");
      span.contentEditable = "true";
      span.className = "blockeditor-textnode";
      span.innerText = node.textContent;
      node.parentNode.replaceChild(span, node);
    });

    // Wrap images
    const imgs = container.querySelectorAll("img");
    imgs.forEach(img => wrapImage(img));
  };

  const wrapImage = (img) => {
    if (img.parentNode.classList.contains("blockeditor-image-wrapper")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "blockeditor-image-wrapper";

    img.parentNode.insertBefore(wrapper, img);
    wrapper.appendChild(img);

    const btn = document.createElement("button");
    btn.className = "blockeditor-replace-btn";
    btn.innerText = "Replace";
    btn.onclick = () => openReplaceModal(img);

    wrapper.appendChild(btn);
  };

  const openReplaceModal = (img) => {
    setActiveImageEl(img);
    setImageUrlInput(img.src);
    setShowImageModal(true);
  };

  const handleApplyImage = () => {
    if (activeImageEl && imageUrlInput.trim()) {
      activeImageEl.src = imageUrlInput.trim();
    }
    setShowImageModal(false);
  };

  const handleSave = () => {
    const updatedHtml = containerRef.current.innerHTML;
    setLocalHtml(updatedHtml);
    setEditing(false);
    onChange(updatedHtml);
  };

  const handleCancel = () => {
    setEditing(false);
    setLocalHtml(html);
    containerRef.current.innerHTML = html;
  };

  return (
    <div className="blockeditor-container">

      {/* Image Replace Modal */}
      {showImageModal && (
        <div className="blockeditor-modal-backdrop">
          <div className="blockeditor-modal">
            <h3>Replace Image</h3>
            <input
              type="text"
              className="blockeditor-modal-input"
              placeholder="Paste image URL"
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
            />

            <div className="blockeditor-modal-actions">
              <button
                className="blockeditor-save-btn"
                onClick={handleApplyImage}
              >
                Apply
              </button>
              <button
                className="blockeditor-cancel-btn"
                onClick={() => setShowImageModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {!editing && (
        <button className="blockeditor-edit-btn" onClick={enableEditing}>
          ✏️ Edit Website
        </button>
      )}

      {editing && (
        <div className="blockeditor-controls">
          <button className="blockeditor-save-btn" onClick={handleSave}>
            💾 Save
          </button>
          <button className="blockeditor-cancel-btn" onClick={handleCancel}>
            ✖ Cancel
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        className={`blockeditor-content ${editing ? "editing" : ""}`}
        dangerouslySetInnerHTML={{ __html: localHtml }}
      />
    </div>
  );
}
