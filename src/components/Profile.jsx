import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getUserProfile,
  updateUserProfile,
} from "../controllers/UserController";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import "./styles/Profile.css";

export default function Profile() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const storage = getStorage();

  useEffect(() => {
    async function load() {
      const data = await getUserProfile(user.uid);
      setProfile(data);
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      await updateUserProfile(user.uid, {
        displayName: profile.displayName || "",
        plan: profile.plan || "free",
      });

      alert("Profile updated successfully!");
    } catch (err) {
      setError("Failed to update profile.");
    }
    setSaving(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSaving(true);

    try {
      const imgRef = ref(storage, `profileImages/${user.uid}`);
      await uploadBytes(imgRef, file);

      const url = await getDownloadURL(imgRef);

      await updateUserProfile(user.uid, { photoURL: url });
      setProfile({ ...profile, photoURL: url });
    } catch (err) {
      setError("Failed to upload image.");
    }
    setSaving(false);
  };

  if (loading) return <div className="pLight-loading">Loading...</div>;

  return (
    <div className="pLight-container">

      {/* HEADER */}
      <div className="pLight-header">
        <h1>Account Settings</h1>
        <p>Manage your personal info and preferences.</p>
      </div>

      {error && <p className="pLight-error">{error}</p>}

      {/* PROFILE CARD */}
      <div className="pLight-profile-card">
        <img
          src={
            profile.photoURL ||
            "https://ui-avatars.com/api/?background=ececec&color=4f46e5&size=200&name=User"
          }
          alt="Profile"
          className="pLight-avatar"
        />

        <label className="pLight-upload-btn">
          Change Photo
          <input type="file" onChange={handleImageUpload} hidden />
        </label>

        <p className="pLight-username">
          {profile.displayName || "Unnamed User"}
        </p>
        <p className="pLight-email">{profile.email}</p>
      </div>

      {/* FORM FIELDS */}
      <div className="pLight-form">

        <div className="pLight-field">
          <label>Display Name</label>
          <input
            className="pLight-input"
            value={profile.displayName || ""}
            onChange={(e) =>
              setProfile({ ...profile, displayName: e.target.value })
            }
          />
        </div>

        <div className="pLight-field">
          <label>Email</label>
          <input
            className="pLight-input pLight-disabled"
            disabled
            value={profile.email}
          />
        </div>

        <div className="pLight-field">
          <label>Subscription Plan</label>
          <select
            className="pLight-input"
            value={profile.plan}
            onChange={(e) =>
              setProfile({ ...profile, plan: e.target.value })
            }
          >
            <option value="free">Free</option>
            <option value="pro">Pro</option>
          </select>
        </div>

        <button
          className="pLight-save-btn"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>

        <button className="pLight-logout-btn" onClick={logout}>
          Logout
        </button>
      </div>
    </div>
  );
}
