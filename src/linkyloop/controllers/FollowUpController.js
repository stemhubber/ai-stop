// controllers/FollowUpController.js
import { addDocument, getDocuments } from "../../services/firestore";
import { where, Timestamp } from "firebase/firestore";

const COLLECTION = "followups";

export const FollowUpController = {
  async createFollowUp(userId, contactId, reason, message, scheduledAt) {
    try {
      return await addDocument(COLLECTION, {
        userId,
        contact: { id: contactId },
        reason,
        message,
        scheduledAt: Timestamp.fromDate(new Date(scheduledAt)),
        status: "pending",
        createdAt: Timestamp.now(),
      });
    } catch (err) {
      console.error("Failed to create follow-up:", err);
      throw err;
    }
  },

  async getToday(userId) {
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      return await getDocuments(COLLECTION, [
        where("userId", "==", userId),
        where("scheduledAt", ">=", Timestamp.fromDate(start)),
        where("scheduledAt", "<=", Timestamp.fromDate(end)),
      ]);
    } catch (err) {
      console.error("Failed to fetch today follow-ups:", err);
      return [];
    }
  },

  async getUpcoming(userId) {
    try {
      const now = new Date();
      return await getDocuments(COLLECTION, [
        where("userId", "==", userId),
        where("scheduledAt", ">", Timestamp.fromDate(now)),
      ]);
    } catch (err) {
      console.error("Failed to fetch upcoming follow-ups:", err);
      return [];
    }
  },

  async getSent(userId) {
    try {
      return await getDocuments(COLLECTION, [
        where("userId", "==", userId),
        where("status", "==", "sent"),
      ]);
    } catch (err) {
      console.error("Failed to fetch sent follow-ups:", err);
      return [];
    }
  },

  async getAll(userId) {
    try {
      return await getDocuments(COLLECTION, [where("userId", "==", userId)]);
    } catch (err) {
      console.error("Failed to fetch all follow-ups:", err);
      return [];
    }
  },
};
