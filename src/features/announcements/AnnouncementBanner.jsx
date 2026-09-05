import { useEffect, useState } from "react";
import { listRecords } from "../../services/businessRepository";
import "./announcements.css";

function isActive(announcement) {
  if (!announcement.expiresAt) return true;
  const expires = announcement.expiresAt?.toDate?.() || new Date(announcement.expiresAt);
  return Number.isNaN(expires.getTime()) || expires.getTime() > Date.now();
}

function readDismissed(businessId) {
  try {
    return JSON.parse(window.localStorage.getItem(`webilo.announcements.dismissed.${businessId}`) || "[]");
  } catch {
    return [];
  }
}

function storeDismissed(businessId, ids) {
  try {
    window.localStorage.setItem(`webilo.announcements.dismissed.${businessId}`, JSON.stringify(ids));
  } catch {
    // Private browsing can block storage; the banner just reappears next visit.
  }
}

// A short public notice strip for a business's storefront — "kitchen closed
// today", "load-shedding delays". Reads businesses/{id}/announcements, which
// is publicly readable (no auth). Dismissal is remembered per browser.
export default function AnnouncementBanner({ businessId }) {
  const [announcements, setAnnouncements] = useState([]);
  const [dismissed, setDismissed] = useState(() => readDismissed(businessId));

  useEffect(() => {
    let cancelled = false;
    if (!businessId) return undefined;
    listRecords(businessId, "announcements")
      .then((items) => !cancelled && setAnnouncements(items.filter(isActive)))
      .catch(() => !cancelled && setAnnouncements([]));
    return () => { cancelled = true; };
  }, [businessId]);

  const dismiss = (id) => {
    const next = [...dismissed, id];
    setDismissed(next);
    storeDismissed(businessId, next);
  };

  const visible = announcements.filter((item) => !dismissed.includes(item.id));
  if (visible.length === 0) return null;

  return (
    <div className="announcement-strip">
      {visible.map((item) => (
        <div className={`announcement-strip-item announcement-strip-item--${item.level === "warning" ? "warning" : "info"}`} key={item.id}>
          <span>{item.message}</span>
          <button type="button" onClick={() => dismiss(item.id)} aria-label="Dismiss this notice">&times;</button>
        </div>
      ))}
    </div>
  );
}
