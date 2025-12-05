import React, { useEffect } from "react";
import "./styles/ConfirmModal.css";

export default function ConfirmModal({
  message = "Are you sure?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onClose,
}) {
  // Close modal on ESC
  useEffect(() => {
    const listener = (e) => e.key === "Escape" && onClose("cancel");
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [onClose]);

  return (
    <div className="confirm-backdrop">
      <div className="confirm-card">
        <p className="confirm-message">{message}</p>

        <div className="confirm-actions">
          <button
            className="confirm-btn cancel"
            onClick={() => onClose("cancel")}
          >
            {cancelText}
          </button>
          <button
            className="confirm-btn ok"
            onClick={() => onClose("confirm")}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
