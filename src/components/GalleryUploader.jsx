import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { storage, db } from "../services/firebase.config";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL
} from "firebase/storage";
import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  getDocs
} from "firebase/firestore";
import { v4 as uuid } from "uuid";
import "./styles/GalleryUploader.css";
import { useAuth } from "../context/AuthContext";

export default function GalleryUploader({ onGenerated, siteId }) {
  const [images, setImages] = useState([]);
  const [originalImages, setOriginalImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  // ─────────────────────────────────────
  // Load gallery on mount
  // ─────────────────────────────────────
  useEffect(() => {
    if (!user || !siteId) return;
    loadGallery();
  }, [user, siteId]);

  const loadGallery = async () => {
    const refCol = collection(db, "users", user.uid, "sites", siteId, "gallery");
    const snap = await getDocs(refCol);

    const list = snap.docs.map((d) => ({
      id: d.id,
      url: d.data().url
    }));

    setImages(list);
    setOriginalImages(list);
  };

  // ─────────────────────────────────────
  // Upload image but DO NOT save to Firestore
  // ─────────────────────────────────────
  const uploadFiles = async (files) => {
    if (!files.length) return;
    setUploading(true);

    let newList = [...images];

    for (let file of files) {
      const id = uuid();
      const fileRef = ref(storage, `gallery/${id}`);
      const uploadTask = uploadBytesResumable(fileRef, file);

      const temp = {
        id,
        url: null,
        progress: 0,
        _local: true
      };

      newList.push(temp);
      setImages([...newList]);

      uploadTask.on(
        "state_changed",
        (snap) => {
          temp.progress = Math.round(
            (snap.bytesTransferred / snap.totalBytes) * 100
          );
          setImages([...newList]);
        },
        console.error,
        async () => {
          temp.url = await getDownloadURL(uploadTask.snapshot.ref);
          temp.progress = 100;
          setUploading(false);
          setImages([...newList]);
        }
      );
    }
  };

  // ─────────────────────────────────────
  // Delete local OR firestore image
  // ─────────────────────────────────────
  const deleteImage = async (img) => {
    // If exists in DB → delete
    if (img.id && !_isLocal(img.id)) {
      await deleteDoc(
        doc(db, "users", user.uid, "sites", siteId, "gallery", img.id)
      );
    }

    setImages(images.filter((x) => x.id !== img.id));
  };

  const _isLocal = (id) => !originalImages.find((x) => x.id === id);

  // ─────────────────────────────────────
  // SAVE button clicked → write to firestore
  // ─────────────────────────────────────
  const handleSave = async () => {
    const refCol = collection(db, "users", user.uid, "sites", siteId, "gallery");

    // DELETE removed ones
    for (let orig of originalImages) {
      const stillThere = images.find((x) => x.id === orig.id);
      if (!stillThere) {
        await deleteDoc(doc(db, "users", user.uid, "sites", siteId, "gallery", orig.id));
      }
    }

    // ADD/UPDATE current images
    for (let img of images) {
      if (!img.url) continue;

      if (_isLocal(img.id)) {
        // create new
        await addDoc(refCol, {
          url: img.url,
          createdAt: Date.now()
        });
      }
    }

    await loadGallery(); // Refresh
    regenerateHTML(images);

    alert("Gallery saved!");
  };

  // ─────────────────────────────────────
  // Generate HTML after save
  // ─────────────────────────────────────
  const regenerateHTML = (items) => {
    const valid = items.filter((img) => img.url);

    const html = `
      <h3 style="font-size:22px;margin-bottom:12px;">Gallery</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;">
        ${valid
          .map(
            (img) => `
              <img src="${img.url}" 
              style="width:100%;height:130px;object-fit:cover;border-radius:12px;box-shadow:0 4px 10px rgba(0,0,0,0.06);" />
            `
          )
          .join("")}
      </div>
    `;

    onGenerated(html);
  };

  // ─────────────────────────────────────
  // UI
  // ─────────────────────────────────────
  return (
    <div className="gallery-container">
      <h2 className="gallery-title">Gallery</h2>

      <div className="gallery-top-actions">
        <label className="gallery-upload-btn">
          <i className="fa fa-upload"></i> Upload Images
          <input
            type="file"
            multiple
            hidden
            accept="image/*"
            onChange={(e) => uploadFiles(e.target.files)}
          />
        </label>

        {images.length > 0 && (
          <button className="gallery-save-btn" onClick={handleSave}>
            <i className="fa fa-save"></i> Save
          </button>
        )}
      </div>

      <div className="gallery-grid">
        {images.map((img) => (
          <motion.div
            key={img.id}
            className="gallery-card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {!img.url ? (
              <div className="gallery-placeholder">
                <p>{img.progress}%</p>
              </div>
            ) : (
              <>
                <img src={img.url} className="gallery-thumb" />
                <button
                  className="gallery-delete"
                  onClick={() => deleteImage(img)}
                >
                  <i className="fa fa-trash"></i>
                </button>
              </>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
