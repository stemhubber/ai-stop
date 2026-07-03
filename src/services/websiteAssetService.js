import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "./firebase.config";

export async function uploadWebsiteImage({ file, userId, websiteId }) {
  if (!file?.type?.match(/^image\/(png|jpeg|webp)$/)) {
    throw new Error("Upload a PNG, JPEG, or WebP image.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Keep website images under 5 MB.");
  }
  const extension = file.type.split("/")[1].replace("jpeg", "jpg");
  const assetId = window.crypto?.randomUUID?.() || `${Date.now()}`;
  const path = `users/${userId}/websites/${websiteId}/${assetId}.${extension}`;
  const snapshot = await uploadBytes(ref(storage, path), file, {
    contentType: file.type,
    customMetadata: { websiteId },
  });
  return getDownloadURL(snapshot.ref);
}

export async function uploadBusinessImage({ file, businessId }) {
  if (!file?.type?.match(/^image\/(png|jpeg|webp)$/)) {
    throw new Error("Upload a PNG, JPEG, or WebP image.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Keep product and service images under 5 MB.");
  }
  const extension = file.type.split("/")[1].replace("jpeg", "jpg");
  const assetId = window.crypto?.randomUUID?.() || `${Date.now()}`;
  const path = `businesses/${businessId}/catalog/${assetId}.${extension}`;
  const snapshot = await uploadBytes(ref(storage, path), file, {
    contentType: file.type,
    customMetadata: { businessId },
  });
  return getDownloadURL(snapshot.ref);
}
