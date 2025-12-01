import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../services/firebase.config";

export async function checkSiteNameExists(name) {
  const ref = doc(db, "publishedSites", name);
  const snap = await getDoc(ref);
  return snap.exists();
}

export async function publishSite(name, html, plan, user) {
  return await setDoc(doc(db, "publishedSites", name), {
    html,
    plan,
    owner: user?.uid,
    createdAt: Date.now(),
  });
}

export async function getPublishedSite(name) {
  const ref = doc(db, "publishedSites", name);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

