import React, { useEffect, useState } from "react";
import "./styles/ContactList.css";
import { ContactController } from "../controllers/ContactController";
import ContactCard from "./ContactCard";

export default function ContactList({ userId, onSelect, type = "list" }) {
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContacts() {
      try {
        const data = await ContactController.getAll(userId);
        setContacts(data);
      } catch (err) {
        console.error("Failed to fetch contacts", err);
      } finally {
        setLoading(false);
      }
    }

    if (userId) fetchContacts();
  }, [userId]);

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  return (
    <div className="contact-list">
      <input
        type="text"
        placeholder="Search contacts..."
        className="contact-search-input"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading && <p className="contact-empty">Loading...</p>}
      {!loading && filtered.length === 0 && <p className="contact-empty">No contacts found</p>}

      {filtered.map(c => (
        <div
          key={c.id}
          className={`contact-list-item ${type === "combobox" ? "clickable" : ""}`}
          onClick={() => type === "combobox" && onSelect?.(c)}
        >
          <ContactCard contactId={c.id} pre_contact={c}/>
        </div>
      ))}
    </div>
  );
}
