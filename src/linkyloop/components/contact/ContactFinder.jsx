import React, { useEffect, useState } from "react";
import "./styles/ContactFinder.css";
import { ContactController } from "../controllers/ContactController";
import ContactCard from "./ContactCard";

export default function ContactFinder({ onSelect }) {
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContacts() {
      try {
        const data = await ContactController.getAll(); // all contacts
        setContacts(data);
      } catch (err) {
        console.error("Failed to fetch contacts", err);
      } finally {
        setLoading(false);
      }
    }

    fetchContacts();
  }, []);

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  return (
    <div className="contact-finder">
      <input
        type="text"
        placeholder="Search all contacts..."
        className="contact-finder-input"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {loading && <p className="contact-finder-loading">Loading...</p>}
      {!loading && filtered.length === 0 && <p className="contact-finder-empty">No contacts found</p>}

      {filtered.map(c => (
        <div
          key={c.id}
          className="contact-finder-item clickable"
          onClick={() => onSelect?.(c)}
        >
          <ContactCard contactId={c.id} />
        </div>
      ))}
    </div>
  );
}
