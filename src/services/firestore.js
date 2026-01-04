// firebase/firestore.js
import {
  collection,
  addDoc,
  getDocs,
  query,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase.config";

export const addDocument = (col, data) =>
  addDoc(collection(db, col), {
    ...data,
    createdAt: Timestamp.now(),
  });

export const getDocuments = async (col, conditions = []) => {
  const q = conditions.length
    ? query(collection(db, col), ...conditions)
    : collection(db, col);

  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const updateDocument = (col, id, data) =>
  updateDoc(doc(db, col, id), data);
