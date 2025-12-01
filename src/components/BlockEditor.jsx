import { useEffect, useRef, useState } from "react";
import { storage } from "../services/firebase.config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuid } from "uuid";

import "./styles/BlockEditor.css";

export default function BlockEditor({ html, onChange }) {
  const [localHtml, setLocalHtml] = useState(html);
  const [editing, setEditing] = useState(false);

  const [showImageModal, setShowImageModal] = useState(false);
  const [activeImageEl, setActiveImageEl] = useState(null);

  const [imageUrlInput, setImageUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);

  const containerRef = useRef(null);

  useEffect(() => {
    setLocalHtml(html);
    if (containerRef.current) {
      containerRef.current.innerHTML = html;
    }
  }, [html]);

  // ============= ENABLE EDITING ============
  const enableEditing = () => {
    setEditing(true);

    const container = containerRef.current;
    container.innerHTML = localHtml;

    disableLinks(container);
    makeTextEditable(container);
    wrapAllImages(container);
  };

  // ============= DISABLE ALL LINKS ============
  const disableLinks = (container) => {
    const links = container.querySelectorAll("a");

    links.forEach((a) => {
      a.dataset.href = a.getAttribute("href"); // store original
      a.setAttribute("href", "javascript:void(0)");
      a.style.pointerEvents = "none"; // disable click
      a.style.opacity = "0.6";
      a.style.cursor = "not-allowed";
    });
  };

  // ============= RESTORE LINKS ON SAVE ============
  const restoreLinks = (container) => {
    const links = container.querySelectorAll("a");

    links.forEach((a) => {
      if (a.dataset.href) {
        a.setAttribute("href", a.dataset.href);
        a.style.pointerEvents = "auto";
        a.style.opacity = "1";
        a.style.cursor = "pointer";
      }
    });
  };

  // ============= TEXT EDITABLE ============
  const makeTextEditable = (container) => {
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) =>
          node.textContent.trim() !== ""
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT,
      }
    );

    let node;
    const nodes = [];
    while ((node = walker.nextNode())) nodes.push(node);

    nodes.forEach((textNode) => {
      const span = document.createElement("span");
      span.contentEditable = "true";
      span.className = "blockeditor-textnode";
      span.innerText = textNode.textContent;
      textNode.parentNode.replaceChild(span, textNode);
    });
  };

  // ============= IMAGE WRAPPING ============
  const wrapAllImages = (container) => {
    container.querySelectorAll("img").forEach((img) => wrapImage(img));
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

  // ============= OPEN MODAL ============
  const openReplaceModal = (img) => {
    setActiveImageEl(img);
    setImageUrlInput(img.src);
    setShowImageModal(true);
  };

  // ============= UPLOAD FILE TO FIREBASE ============
  const uploadNewImage = async (file) => {
    setUploading(true);
    const fileRef = ref(storage, `editorImages/${uuid()}`);

    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);

    setImageUrlInput(url);
    setUploading(false);
  };

  // ============= APPLY NEW IMAGE ============
  const handleApplyImage = () => {
    if (activeImageEl && imageUrlInput.trim()) {
      activeImageEl.src = imageUrlInput.trim();
      wrapImage(activeImageEl); // restore button
    }
    setShowImageModal(false);
  };

  // ============= SAVE ============
  const handleSave = () => {
    restoreLinks(containerRef.current);

    const updatedHtml = containerRef.current.innerHTML;
    setLocalHtml(updatedHtml);

    setEditing(false);
    onChange(updatedHtml);
  };

  // ============= CANCEL ============
  const handleCancel = () => {
    setEditing(false);
    containerRef.current.innerHTML = localHtml;
  };

  return (
    <div className="blockeditor-container">
      {/* ======================= MODAL ======================== */}
      {showImageModal && (
        <div className="blockeditor-modal-backdrop">
          <div className="blockeditor-modal">
            <h3>Replace Image</h3>

            <input
              type="text"
              placeholder="Paste image URL"
              className="blockeditor-modal-input"
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
            />

            <p style={{ margin: "10px 0 4px" }}>Or Upload Image</p>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => uploadNewImage(e.target.files[0])}
            />

            {uploading && <p>Uploading...</p>}

            <div className="blockeditor-modal-actions">
              <button className="blockeditor-save-btn" onClick={handleApplyImage}>
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

      {/* ======================= EDIT / SAVE ======================== */}
      {!editing ? (
        <button className="blockeditor-edit-btn" onClick={enableEditing}>
          ✏️ Edit Website
        </button>
      ) : (
        <div className="blockeditor-controls">
          <button className="blockeditor-save-btn" onClick={handleSave}>
            💾 Save
          </button>
          <button className="blockeditor-cancel-btn" onClick={handleCancel}>
            ✖ Cancel
          </button>
        </div>
      )}

      {/* ======================= CONTENT ======================== */}
      <div
        ref={containerRef}
        className={`blockeditor-content ${editing ? "editing" : ""}`}
      />
    </div>
  );
}
