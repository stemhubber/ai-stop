import { db } from "../services/firebase.config";
import {
  doc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  getDoc, updateDoc
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export async function getUserSites(uid) {
  const q = query(
    collection(db, "publishedSites"),
    where("owner", "==", uid)
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}

export async function deleteUserSite(siteName) {
  await deleteDoc(doc(db, "publishedSites", siteName));
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export async function updateUserProfile(uid, data) {
  return updateDoc(doc(db, "users", uid), data);
}
