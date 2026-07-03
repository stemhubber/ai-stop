import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPublishedWebsite } from "../../services/websiteRepository";
import WebsitePreview from "./components/WebsitePreview";
import { EmptyState, Icon } from "./components/WebiloUI";
import { createRecord } from "../../services/businessRepository";

export default function PublicWebsite() {
  const { slug } = useParams();
  const [project, setProject] = useState(null);
  const [pageId, setPageId] = useState(null);
  const [status, setStatus] = useState("loading");
  const [contact, setContact] = useState({ name: "", email: "", phone: "", message: "" });
  const [contactState, setContactState] = useState("idle");
  const [contactMessage, setContactMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    getPublishedWebsite(slug)
      .then((website) => {
        if (cancelled) return;
        if (!website) {
          setStatus("missing");
          return;
        }
        setProject(website);
        setPageId(website.pages[0]?.id);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (status === "loading") {
    return <div className="wl-public-loading"><span>W</span><p>Opening website…</p></div>;
  }

  if (status !== "ready" || !project) {
    return (
      <main className="wl-public-error">
        <EmptyState
          icon="site"
          title={status === "missing" ? "This website is not published" : "The website could not be loaded"}
          body={status === "missing" ? "Check the address or ask the website owner for an updated link." : "Check your connection and try again."}
          action={<a href="/"><Icon name="arrow" /> Visit Webilo</a>}
        />
      </main>
    );
  }

  const page = project.pages.find((item) => item.id === pageId) || project.pages[0];
  const businessId = project.settings?.businessId;
  const submitContact = async (event) => {
    event.preventDefault();
    if (!contact.name.trim() || !contact.phone.trim()) {
      return setContactMessage("Enter your name and phone number.");
    }
    setContactState("saving");
    setContactMessage("");
    try {
      await createRecord(businessId, "customers", {
        name: contact.name.trim(),
        email: contact.email.trim(),
        phone: contact.phone.trim(),
        notes: contact.message.trim(),
        source: "website",
        status: "lead",
        lastRequestType: "contact",
      });
      setContact({ name: "", email: "", phone: "", message: "" });
      setContactMessage("Thanks. Your details were sent.");
      setContactState("done");
    } catch {
      setContactMessage("Your details could not be sent. Please try again.");
      setContactState("error");
    }
  };
  const contactForm = businessId ? (
    <form className="wl-site-contact-form" onSubmit={submitContact}>
      <label><span>Name</span><input value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} /></label>
      <label><span>Email</span><input type="email" value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} /></label>
      <label><span>Phone</span><input value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} /></label>
      <label><span>Message</span><textarea rows="3" value={contact.message} onChange={(event) => setContact({ ...contact, message: event.target.value })} /></label>
      <button style={{ background: project.theme.primary }} disabled={contactState === "saving"}>{contactState === "saving" ? "Sending…" : "Send details"}</button>
      {contactMessage && <p role="status">{contactMessage}</p>}
    </form>
  ) : null;
  return (
    <main className="wl-public-site">
      <WebsitePreview
        project={project}
        page={page}
        onPageChange={setPageId}
        contactForm={contactForm}
        interactive={false}
      />
    </main>
  );
}
