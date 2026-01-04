// controllers/ContactController.js
import { addDocument, getDocuments } from "../../services/firestore";
import { where } from "firebase/firestore";

const COLLECTION = "contacts";

export const ContactController = {
  async getAll(userId) {
    try {
      return await getDocuments(COLLECTION, [where("userId", "==", userId)]);
    } catch (err) {
      console.error("Failed to fetch contacts:", err);
      return [];
    }
  },

  async getAll() {
    try {
      return await getDocuments(COLLECTION);
    } catch (err) {
      console.error("Failed to fetch contacts:", err);
      return [];
    }
  },

  async add({ userId, name, phone, email }) {
    try {
      return await addDocument(COLLECTION, {
        userId,
        name,
        phone,
        email: email || "",
        createdAt: new Date(),
      });
    } catch (err) {
      console.error("Failed to add contact:", err);
      throw err;
    }
  },

  /**
   * Get existing contact by phone or create a new one
   */
  async getOrCreateContact(userId, name, phone, email = "") {
    try {
      const existing = await getDocuments(COLLECTION, [
        where("userId", "==", userId),
        where("phone", "==", phone),
      ]);

      if (existing.length > 0) return existing[0];

      return await this.add({ userId, name, phone, email });
    } catch (err) {
      console.error("Failed to get or create contact:", err);
      throw err;
    }
  },
};
