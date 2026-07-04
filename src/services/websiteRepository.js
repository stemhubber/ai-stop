import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase.config";

const websiteDocument = (websiteId) => doc(db, "websites", websiteId);
const publishedWebsiteDocument = (slug) =>
  doc(db, "publishedWebsites", slug);
const activityCollection = (userId) =>
  collection(db, "users", userId, "websiteActivity");

function toTimestamp(value) {
  if (!value) return null;
  if (value instanceof Timestamp) return value;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : Timestamp.fromDate(date);
}

function toIsoString(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
}

function normalizeWebsite(snapshot) {
  const data = snapshot.data();
  const theme = data.theme?.primary?.toLowerCase() === "#6d5dfc"
    ? { ...data.theme, primary: "#176b5d" }
    : data.theme;
  return {
    ...data,
    theme,
    id: snapshot.id,
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
    publishedAt: toIsoString(data.publishedAt),
  };
}

function normalizeActivity(snapshot) {
  const data = snapshot.data();
  return {
    ...data,
    id: snapshot.id,
    at: toIsoString(data.at),
  };
}

export async function listWebsites(userId) {
  const snapshot = await getDocs(
    query(collection(db, "websites"), where("ownerId", "==", userId))
  );

  return snapshot.docs
    .map(normalizeWebsite)
    .sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));
}

export async function saveWebsite(userId, project) {
  const payload = {
    ...project,
    id: project.id,
    ownerId: userId,
    createdAt: toTimestamp(project.createdAt) || serverTimestamp(),
    updatedAt: serverTimestamp(),
    publishedAt: toTimestamp(project.publishedAt),
  };

  await setDoc(websiteDocument(project.id), payload);
}

export async function publishWebsite(userId, project) {
  const publishedSlug =
    project.publishedSlug || `${project.slug}-${project.id.slice(-6)}`;
  await setDoc(publishedWebsiteDocument(publishedSlug), {
    ...project,
    publishedSlug,
    ownerId: userId,
    status: "published",
    createdAt: toTimestamp(project.createdAt) || serverTimestamp(),
    updatedAt: serverTimestamp(),
    publishedAt: serverTimestamp(),
  });
  return publishedSlug;
}

export async function getPublishedWebsite(slug) {
  const snapshot = await getDoc(publishedWebsiteDocument(slug));
  return snapshot.exists() ? normalizeWebsite(snapshot) : null;
}

export function unpublishWebsite(slug) {
  if (!slug) return Promise.resolve();
  return deleteDoc(publishedWebsiteDocument(slug));
}

export function removeWebsite(websiteId) {
  return deleteDoc(websiteDocument(websiteId));
}

export async function listWebsiteActivity(userId) {
  const snapshot = await getDocs(
    query(activityCollection(userId), orderBy("at", "desc"), limit(20))
  );
  return snapshot.docs.map(normalizeActivity);
}

export function saveWebsiteActivity(userId, activity) {
  return setDoc(doc(activityCollection(userId), activity.id), {
    ...activity,
    ownerId: userId,
    at: toTimestamp(activity.at) || serverTimestamp(),
  });
}

export async function removeWebsiteActivity(userId, projectId) {
  const snapshot = await getDocs(
    query(activityCollection(userId), where("projectId", "==", projectId))
  );
  if (snapshot.empty) return;

  const batch = writeBatch(db);
  snapshot.docs.forEach((activity) => batch.delete(activity.ref));
  await batch.commit();
}
