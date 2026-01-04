import React, { useEffect, useState } from "react";
import "./styles/ContactCard.css";
import { ContactController } from "../../controllers/ContactController";

export default function ContactCard({ contactId, pre_contact = null }) {
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContact() {
      try {
        const results = await ContactController.getAll(); // fetch all for simplicity
        const c = results.find(c => c.id === contactId);
        setContact(c || null);
      } catch (err) {
        console.error("Failed to fetch contact", err);
      } finally {
        setLoading(false);
      }
    }
    if(pre_contact && pre_contact.id) {
        setContact(pre_contact);
        return;
    }
    else if (contactId) fetchContact();
  }, [contactId, pre_contact]);

  if (loading) return <div className="contact-card">Loading...</div>;
  if (!contact) return <div className="contact-card">Contact not found</div>;

  return (
    <div className="contact-card">
      <div className="contact-info">
        <strong>{contact.name}</strong>
        <span>{contact.phone}</span>
      </div>
    </div>
  );
}
