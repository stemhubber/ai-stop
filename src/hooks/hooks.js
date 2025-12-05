import { useState } from "react";
import ConfirmModal from "../components/ConfirmModal";

export default function useConfirm() {
  const [options, setOptions] = useState(null);

  const confirmx = (message, confirmText = "Confirm", cancelText = "Cancel") => {
    return new Promise((resolve) => {
      setOptions({
        message,
        confirmText,
        cancelText,
        onClose: (result) => {
          setOptions(null);
          resolve(result); // return "confirm" or "cancel"
        },
      });
    });
  };

  const ConfirmUI = options ? <ConfirmModal {...options} /> : null;

  return { confirmx, ConfirmUI };
}
