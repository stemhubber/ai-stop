import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, storage } from "../services/firebase.config";
import { useState } from "react";

export default function ImageUploader({ onUploaded }) {
  const [file, setFile] = useState(null);

  const uploadFile = async () => {
    if (!auth.currentUser || !file) return;
    const filename = Date.now() + "-" + file.name;
    const storageRef = ref(storage, `users/${auth.currentUser.uid}/site_media/${filename}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    onUploaded(url);
  };

  return (
    <div>
      <input type="file" onChange={(e)=>setFile(e.target.files[0])} />
      <button onClick={uploadFile}>Upload</button>
    </div>
  );
}
