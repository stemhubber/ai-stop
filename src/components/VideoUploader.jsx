import { useState } from "react";
import { motion } from "framer-motion";
import { storage } from "../services/firebase.config";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { v4 as uuid } from "uuid";
import "./styles/VideoUploader.css";

export default function VideoUploader({ onGenerated }) {
  const [videoUrl, setVideoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [progress, setProgress] = useState(0);
  const [uploaded, setUploaded] = useState(false);

  const uploadVideo = async (file) => {
    setUploaded(false);
    setProgress(0);

    const fileRef = ref(storage, `videos/${uuid()}`);
    const uploadTask = uploadBytesResumable(fileRef, file);

    uploadTask.on(
      "state_changed",
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        setProgress(pct);
      },
      console.error,
      async () => {
        const download = await getDownloadURL(uploadTask.snapshot.ref);
        setVideoUrl(download);
        setUploaded(true);
      }
    );
  };

  const handleSave = () => {
    if (!videoUrl) return alert("Upload a video first.");

    const html = `
      <div class="extra-video-block">
        <h3 class="extra-video-title">${title || "Video"}</h3>

        <video controls width="100%" class="extra-video-player">
          <source src="${videoUrl}" type="video/mp4">
        </video>
      </div>
    `;

    onGenerated(html);
    alert("Video inserted into page!");
  };

  return (
    <div className="vu-container">
      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="vu-title"
      >
        Upload Video
      </motion.h2>

      {/* Title Input */}
      <input
        className="vu-input"
        placeholder="Video title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      {/* File Upload */}
      <label className="vu-upload-btn">
        <i className="fa fa-upload"></i> Choose Video
        <input
          type="file"
          hidden
          accept="video/mp4,video/webm"
          onChange={(e) => uploadVideo(e.target.files[0])}
        />
      </label>

      {/* Progress bar */}
      {progress > 0 && (
        <div className="vu-progress-bar">
          <div
            className="vu-progress-fill"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}

      {/* Preview */}
      {videoUrl && (
        <motion.video
          key={videoUrl}
          src={videoUrl}
          controls
          className="vu-preview"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />
      )}

      {/* Save */}
      {uploaded && (
        <button className="vu-save-btn" onClick={handleSave}>
          <i className="fa fa-save"></i> Insert Video
        </button>
      )}
    </div>
  );
}
