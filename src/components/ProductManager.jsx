import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { storage, db } from "../services/firebase.config";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  getDocs,
} from "firebase/firestore";
import { v4 as uuid } from "uuid";
import { useAuth } from "../context/AuthContext";
import "./styles/ProductManager.css";

export default function ProductManager({ onGenerated, siteId }) {
  const [products, setProducts] = useState([]);
  const [originalProducts, setOriginalProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !siteId) return;
    loadProducts();
  }, [user, siteId]);

  const loadProducts = async () => {
    const refCol = collection(db, "users", user.uid, "sites", siteId, "products");
    const snap = await getDocs(refCol);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    setProducts(list);
    setOriginalProducts(list);
  };

  const addProduct = () => {
    setProducts([
      ...products,
      { id: null, name: "", price: "", img: "", progress: 0 }
    ]);
  };

  const updateField = (index, field, value) => {
    const updated = [...products];
    updated[index][field] = value;
    setProducts(updated);
  };

  const uploadImage = async (file, index) => {
    const fileId = uuid();
    const fileRef = ref(storage, `products/${fileId}`);
    const uploadTask = uploadBytesResumable(fileRef, file);

    setLoading(true);

    uploadTask.on(
      "state_changed",
      (snap) => {
        const progress = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        updateField(index, "progress", progress);
      },
      (error) => console.error(error),
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        updateField(index, "img", url);
        updateField(index, "progress", 100);
        setLoading(false);
      }
    );
  };

  const handleDeleteLocal = (index) => {
    const updated = products.filter((_, i) => i !== index);
    setProducts(updated);
  };

  const handleSave = async () => {
    if (!user || !siteId) return;

    const refCol = collection(db, "users", user.uid, "sites", siteId, "products");

    // DELETE removed products
    for (let original of originalProducts) {
      if (!products.find((p) => p.id === original.id)) {
        await deleteDoc(doc(db, "users", user.uid, "sites", siteId, "products", original.id));
      }
    }

    // SAVE new & updated
    for (let product of products) {
      if (!product.name || !product.price || !product.img) continue;

      if (product.id) {
        await updateDoc(
          doc(db, "users", user.uid, "sites", siteId, "products", product.id),
          { name: product.name, price: product.price, img: product.img }
        );
      } else {
        const newRef = await addDoc(refCol, {
          name: product.name,
          price: product.price,
          img: product.img,
        });
        product.id = newRef.id;
      }
    }

    // Regenerate HTML
    regenerateHTML(products);

    alert("Products saved!");
  };

  const regenerateHTML = (items) => {
    const valid = items.filter((p) => p.name && p.price && p.img);

    const html = `
      <h3 style="font-size:22px; margin-bottom:12px;">Products</h3>
      <div class="extra-product-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:18px;">
        ${valid
          .map(
            (p) => `
            <div class="product-card" style="padding:12px;background:white;border-radius:14px;box-shadow:0 4px 15px rgba(0,0,0,0.08);">
              <img src="${p.img}" style="width:100%;height:120px;object-fit:cover;border-radius:12px;margin-bottom:8px;" />
              <h3 style="font-size:16px;font-weight:600;margin-bottom:4px;">${p.name}</h3>
              <p style="color:#555;font-size:14px;">R${p.price}</p>
            </div>`
          )
          .join("")}
      </div>
    `;

    onGenerated(html);
  };

  return (
    <div className="pm-container">
      {loading && (
        <div className="pm-loading-overlay">
          <div className="pm-spinner"></div>
        </div>
      )}

      <motion.h2 className="pm-title">Manage Products</motion.h2>

      <div className="pm-top-actions">
        <button className="pm-add-btn" onClick={addProduct}>
          <i className="fa fa-plus"></i> Add Product
        </button>

        {products.length > 0 && (
          <button className="pm-save-btn" onClick={handleSave}>
            <i className="fa fa-save"></i> Save Changes
          </button>
        )}
      </div>

      <h3 className="pm-section-title">Products</h3>

      <div className="pm-grid">
        {products.map((p, index) => (
          <motion.div key={index} className="pm-card">
            <label className="pm-img-wrapper">
              {p.img ? (
                <img src={p.img} className="pm-img" />
              ) : (
                <div className="pm-img-placeholder">
                  <i className="fa fa-image"></i>
                </div>
              )}

              {p.progress > 0 && p.progress < 100 && (
                <div className="pm-progress" style={{ width: `${p.progress}%` }}></div>
              )}

              <input type="file" hidden onChange={(e) => uploadImage(e.target.files[0], index)} />
            </label>

            <input
              className="pm-input"
              placeholder="Product name"
              value={p.name}
              onChange={(e) => updateField(index, "name", e.target.value)}
            />

            <input
              className="pm-input"
              placeholder="Price"
              type="number"
              value={p.price}
              onChange={(e) => updateField(index, "price", e.target.value)}
            />

            <button className="pm-delete" onClick={() => handleDeleteLocal(index)}>
              <i className="fa fa-trash"></i>
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
