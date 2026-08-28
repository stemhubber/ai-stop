import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase.config";
import { slugify } from "../utils/product";

const MODULES = [
  "website", "commerce", "bookings", "customers", "orders",
  "messages", "marketing", "analytics", "ai", "payments",
];

export async function createBusiness(userId, input) {
  const ref = doc(collection(db, "businesses"));
  const baseSlug = slugify(input.name) || `business-${ref.id.slice(0, 6)}`;
  let slug = baseSlug;
  await runTransaction(db, async (transaction) => {
    let counter = 1;
    let slugRef = doc(db, "businessSlugs", slug);
    while ((await transaction.get(slugRef)).exists()) {
      counter += 1;
      slug = `${baseSlug}-${counter}`;
      slugRef = doc(db, "businessSlugs", slug);
    }
    transaction.set(ref, {
    id: ref.id,
    ownerId: userId,
    name: input.name.trim(),
    slug,
    category: input.category,
    description: input.description?.trim() || "",
    audience: input.audience?.trim() || "",
    goal: input.goal?.trim() || "",
    phone: input.phone?.trim() || "",
    email: input.email?.trim() || "",
    address: { city: input.city?.trim() || "", country: "South Africa" },
    status: "active",
    plan: "starter",
    websitePreferences: input.websitePreferences || {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    });
    transaction.set(slugRef, { businessId: ref.id, ownerId: userId, createdAt: serverTimestamp() });
  });
  await setDoc(doc(db, "businesses", ref.id, "members", userId), {
    userId, role: "owner", permissions: ["*"], joinedAt: serverTimestamp(),
  });
  await Promise.all(MODULES.map((moduleId) =>
    setDoc(doc(db, "businesses", ref.id, "modules", moduleId), {
      moduleId,
      enabled: ["website", "customers", "ai"].includes(moduleId) ||
        input.modules?.includes(moduleId),
      config: {},
      updatedAt: serverTimestamp(),
    })
  ));
  return { id: ref.id, ...input, slug };
}

export async function listBusinesses(userId) {
  const snap = await getDocs(query(collection(db, "businesses"), where("ownerId", "==", userId)));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function getBusiness(id) {
  const snap = await getDoc(doc(db, "businesses", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getBusinessBySlug(slug) {
  const slugSnap = await getDoc(doc(db, "businessSlugs", slug));
  return slugSnap.exists() ? getBusiness(slugSnap.data().businessId) : null;
}

export function updateBusiness(id, data) {
  return updateDoc(doc(db, "businesses", id), { ...data, updatedAt: serverTimestamp() });
}

export async function listModules(businessId) {
  const snap = await getDocs(collection(db, "businesses", businessId, "modules"));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export function setModuleEnabled(businessId, moduleId, enabled) {
  return setDoc(doc(db, "businesses", businessId, "modules", moduleId), {
    moduleId, enabled, updatedAt: serverTimestamp(),
  }, { merge: true });
}

function subcollection(businessId, resource) {
  return collection(db, "businesses", businessId, resource);
}

export async function listRecords(businessId, resource) {
  const snap = await getDocs(query(subcollection(businessId, resource), orderBy("createdAt", "desc"), limit(100)));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
}

// Live subscription to a business subcollection. `constraints` is an array of
// Firestore query constraints (where/orderBy/limit). `onChange` receives
// (records, docChanges) so callers can react to individual additions (e.g. a
// kitchen sound on a newly created order). Returns the unsubscribe function.
export function subscribeRecords(businessId, resource, constraints, onChange, onError) {
  return onSnapshot(
    query(subcollection(businessId, resource), ...constraints),
    (snap) => onChange(
      snap.docs.map((item) => ({ id: item.id, ...item.data() })),
      snap.docChanges()
    ),
    onError
  );
}

export async function listActiveRecords(businessId, resource) {
  const snap = await getDocs(query(
    subcollection(businessId, resource),
    where("status", "==", "active"),
    limit(100)
  ));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
}

function legacyOffer(resource, record) {
  const offerType = resource === "services" ? "service" : "product";
  return {
    ...record,
    key: `${resource}:${record.id}`,
    sourceResource: resource,
    sourceId: record.id,
    offerType,
    pricingMode: record.pricingMode || "fixed",
    fulfilmentMethods: Array.isArray(record.fulfilmentMethods) && record.fulfilmentMethods.length
      ? record.fulfilmentMethods
      : [offerType === "service" ? "booking" : "pickup"],
  };
}

export async function listPublicOffers(businessId) {
  const [offers, products, services] = await Promise.all([
    listActiveRecords(businessId, "offers").catch(() => []),
    listRecords(businessId, "products").catch(() => []),
    listRecords(businessId, "services").catch(() => []),
  ]);
  const canonicalLegacyRefs = new Set(
    offers
      .map((offer) => offer.legacyRef)
      .filter((reference) => reference?.resource && reference?.id)
      .map((reference) => `${reference.resource}:${reference.id}`)
  );
  const canonical = offers.map((offer) => ({
    ...offer,
    key: `offers:${offer.id}`,
    sourceResource: "offers",
    sourceId: offer.id,
    offerType: offer.offerType || "product",
    pricingMode: offer.pricingMode || "fixed",
    fulfilmentMethods: Array.isArray(offer.fulfilmentMethods) && offer.fulfilmentMethods.length
      ? offer.fulfilmentMethods
      : [offer.offerType === "service" ? "booking" : "pickup"],
  }));
  const legacy = [
    ...products.filter((item) => item.status !== "inactive").map((item) => legacyOffer("products", item)),
    ...services.filter((item) => item.status !== "inactive").map((item) => legacyOffer("services", item)),
  ].filter((offer) => !canonicalLegacyRefs.has(offer.key));
  return [...canonical, ...legacy];
}

export async function createRecord(businessId, resource, data) {
  const ref = await addDoc(subcollection(businessId, resource), {
    ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export function updateRecord(businessId, resource, id, data) {
  return updateDoc(doc(db, "businesses", businessId, resource, id), {
    ...data, updatedAt: serverTimestamp(),
  });
}

export function deleteRecord(businessId, resource, id) {
  return deleteDoc(doc(db, "businesses", businessId, resource, id));
}

// Re-exported so callers can build `subscribeRecords` constraints without a
// direct firebase/firestore import.
export { limit, orderBy, where };

export { MODULES, slugify };
