import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useWebsites } from "../../context/WebsiteContext";
import { createSection, getSectionLabel, SECTION_LIBRARY } from "./websiteModel";
import WebsitePreview from "./components/WebsitePreview";
import { Button, DeviceToggle, EmptyState, Icon, Modal, Toast } from "./components/WebiloUI";
import { useAuth } from "../../context/AuthContext";
import { uploadWebsiteImage } from "../../services/websiteAssetService";
import WebiloAnimatedLogo from "../../components/WebiloAnimatedLogo";

const clone = (value) => JSON.parse(JSON.stringify(value));
const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);

function exportHtml(project) {
  const page = project.pages[0];
  const sections = page.sections.filter((section) => section.visibility).map((section) => {
    const content = section.content;
    const items = content.items?.map((item) => `<article><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.body)}</p></article>`).join("") || "";
    return `<section><small>${escapeHtml(content.eyebrow)}</small><h2>${escapeHtml(content.heading)}</h2><p>${escapeHtml(content.body || content.quote)}</p>${items}</section>`;
  }).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(project.seo.title)}</title><meta name="description" content="${escapeHtml(project.seo.description)}"><style>body{margin:0;font:16px system-ui;color:${project.theme.text};background:${project.theme.background}}header,section,footer{max-width:1100px;margin:auto;padding:32px}header{display:flex;justify-content:space-between}section{padding-block:80px}h1,h2{font-size:clamp(2rem,5vw,4rem);line-height:1.05}article{display:inline-block;vertical-align:top;width:28%;margin:1%;padding:24px;background:${project.theme.surface};border-radius:16px}button{background:${project.theme.primary};color:white;border:0;border-radius:99px;padding:12px 20px}@media(max-width:700px){article{display:block;width:auto;margin:12px 0}section{padding-block:48px}}</style></head><body><header><strong>${escapeHtml(project.name)}</strong><button>Get in touch</button></header><main>${sections}</main><footer>© ${new Date().getFullYear()} ${escapeHtml(project.name)}</footer></body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${project.slug}.html`;
  link.click();
  URL.revokeObjectURL(url);
}

function SectionPanel({ project, page, selectedId, onSelect, onMove, onToggle, onDelete, onAdd }) {
  const [showLibrary, setShowLibrary] = useState(false);
  return (
    <>
      <div className="wl-inspector-heading"><div><p>Page structure</p><h2>{page.title}</h2></div><button onClick={() => setShowLibrary(!showLibrary)} aria-label="Add section"><Icon name="plus" /></button></div>
      {showLibrary && <div className="wl-section-library"><p>Add a section</p>{SECTION_LIBRARY.map((type) => <button onClick={() => { onAdd(type); setShowLibrary(false); }} key={type}><Icon name={type === "gallery" ? "image" : "layers"} />{getSectionLabel(type)}<Icon name="plus" size={15} /></button>)}</div>}
      <div className="wl-section-list">
        {page.sections.map((section, index) => (
          <button className={section.id === selectedId ? "selected" : ""} onClick={() => onSelect(section.id)} key={section.id}>
            <span className="wl-drag-handle">⠿</span>
            <span><strong>{getSectionLabel(section.type)}</strong><small>{section.visibility ? "Visible" : "Hidden"}</small></span>
            <i onClick={(event) => { event.stopPropagation(); onMove(index, -1); }} aria-label="Move up">↑</i>
            <i onClick={(event) => { event.stopPropagation(); onMove(index, 1); }} aria-label="Move down">↓</i>
          </button>
        ))}
      </div>
      {selectedId && <div className="wl-inspector-actions"><Button size="sm" onClick={() => onToggle(selectedId)}>{page.sections.find((item) => item.id === selectedId)?.visibility ? "Hide section" : "Show section"}</Button><Button size="sm" variant="danger" icon="trash" onClick={() => onDelete(selectedId)}>Remove</Button></div>}
    </>
  );
}

function ContentPanel({ section, onChange, onImageUpload, imageState, imageError }) {
  if (!section) return <EmptyState icon="layers" title="Select a section" body="Choose a section in the preview or structure panel to edit its content." />;
  const fields = Object.entries(section.content).filter(([field, value]) => typeof value === "string" && !["imageUrl", "imageAlt"].includes(field));
  return (
    <>
      <div className="wl-inspector-heading"><div><p>Content</p><h2>{getSectionLabel(section.type)}</h2></div></div>
      <div className="wl-inspector-form">
        <div className="wl-image-field">
          <span>Section image</span>
          {section.content.imageUrl ? <img src={section.content.imageUrl} alt="" /> : <div><Icon name="image" /></div>}
          <label><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => event.target.files?.[0] && onImageUpload(event.target.files[0])} disabled={imageState === "uploading"} /><Icon name="image" size={15} /> {imageState === "uploading" ? "Uploading…" : section.content.imageUrl ? "Replace image" : "Upload image"}</label>
          {section.content.imageUrl && <button type="button" onClick={() => onChange({ ...section.content, imageUrl: "", imageAlt: "" })}>Remove</button>}
          {imageError && <small>{imageError}</small>}
        </div>
        {fields.map(([field, value]) => (
          <label className="wl-field" key={field}>
            <span>{field.replace(/([A-Z])/g, " $1").replace(/^./, (match) => match.toUpperCase())}</span>
            {value.length > 55 ? <textarea rows="4" value={value} onChange={(event) => onChange({ ...section.content, [field]: event.target.value })} /> : <input value={value} onChange={(event) => onChange({ ...section.content, [field]: event.target.value })} />}
          </label>
        ))}
        {section.content.items?.map((item, index) => (
          <fieldset className="wl-item-fields" key={`${item.title}_${index}`}>
            <legend>Item {index + 1}</legend>
            <label className="wl-field"><span>Title</span><input value={item.title || ""} onChange={(event) => { const items = [...section.content.items]; items[index] = { ...item, title: event.target.value }; onChange({ ...section.content, items }); }} /></label>
            {item.body !== undefined && <label className="wl-field"><span>Description</span><textarea rows="3" value={item.body || ""} onChange={(event) => { const items = [...section.content.items]; items[index] = { ...item, body: event.target.value }; onChange({ ...section.content, items }); }} /></label>}
          </fieldset>
        ))}
      </div>
    </>
  );
}

function ThemePanel({ theme, onChange }) {
  const colors = [["primary", "Brand colour"], ["background", "Page background"], ["text", "Main text"], ["surface", "Card background"]];
  return (
    <>
      <div className="wl-inspector-heading"><div><p>Site styles</p><h2>Theme</h2></div></div>
      <div className="wl-inspector-form">
        <fieldset className="wl-theme-options wl-theme-options--templates"><legend>Layout character</legend>{[["organic", "Organic"], ["bold", "Bold"], ["editorial", "Editorial"], ["storefront", "Storefront"], ["professional", "Professional"]].map(([value, label]) => <button className={(theme.template || "organic") === value ? "selected" : ""} onClick={() => onChange({ ...theme, template: value })} key={value}><Icon name={value === "storefront" ? "grid" : value === "editorial" ? "site" : "layers"} /><span>{label}</span></button>)}</fieldset>
        <fieldset className="wl-theme-options"><legend>Typography</legend>{[["modern", "Modern"], ["editorial", "Editorial"], ["friendly", "Friendly"]].map(([value, label]) => <button className={theme.font === value ? "selected" : ""} onClick={() => onChange({ ...theme, font: value })} key={value}><strong style={{ fontFamily: value === "editorial" ? "Georgia, serif" : value === "friendly" ? "Trebuchet MS, sans-serif" : "system-ui" }}>Aa</strong><span>{label}</span></button>)}</fieldset>
        <fieldset className="wl-theme-options"><legend>Corner style</legend>{[["sharp", "Sharp"], ["soft", "Soft"], ["rounded", "Rounded"]].map(([value, label]) => <button className={theme.radius === value ? "selected" : ""} onClick={() => onChange({ ...theme, radius: value })} key={value}><i style={{ borderRadius: value === "sharp" ? 2 : value === "rounded" ? 14 : 7 }} /><span>{label}</span></button>)}</fieldset>
        <div className="wl-theme-colors">{colors.map(([field, label]) => <label key={field}><span><i style={{ background: theme[field] }} />{label}</span><input type="color" value={theme[field]} onChange={(event) => onChange({ ...theme, [field]: event.target.value })} /></label>)}</div>
      </div>
    </>
  );
}

export default function WebsiteEditor() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const { getProject, saveProject, publishProject, hydrated, syncStatus } = useWebsites();
  const storedProject = getProject(projectId);
  const [draft, setDraft] = useState(null);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const [pageId, setPageId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [panel, setPanel] = useState("sections");
  const [device, setDevice] = useState("desktop");
  const [fullPreview, setFullPreview] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [imageState, setImageState] = useState("idle");
  const [imageError, setImageError] = useState("");
  const [toast, setToast] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!storedProject || draft) return;
    const next = clone(storedProject);
    setDraft(next);
    setSavedSnapshot(JSON.stringify(next));
    setPageId(next.pages[0]?.id);
    setSelectedId(next.pages[0]?.sections[0]?.id);
    if (location.state?.justCreated) setToast("Your draft is ready. Select any text or section to edit it.");
  }, [storedProject, draft, location.state]);

  const updateDraft = useCallback((updater) => {
    setDraft((current) => {
      if (!current) return current;
      const next = typeof updater === "function" ? updater(clone(current)) : updater;
      setPast((items) => [...items.slice(-39), current]);
      setFuture([]);
      return next;
    });
  }, []);

  const page = draft?.pages.find((item) => item.id === pageId) || draft?.pages[0];
  const selected = page?.sections.find((section) => section.id === selectedId);
  const unsaved = draft ? JSON.stringify(draft) !== savedSnapshot : false;
  const publicSlug = draft
    ? draft.publishedSlug || `${draft.slug}-${draft.id.slice(-6)}`
    : "";
  const siteUrl = `${window.location.origin}/w/${publicSlug}`;

  useEffect(() => {
    const warn = (event) => {
      if (!unsaved) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  const updatePage = (change) => updateDraft((next) => {
    next.pages = next.pages.map((item) => item.id === page.id ? change(item) : item);
    return next;
  });
  const updateSectionContent = (sectionId, content) => updatePage((current) => ({ ...current, sections: current.sections.map((section) => section.id === sectionId ? { ...section, content } : section) }));
  const save = (options) => {
    const saved = saveProject(draft, options);
    setDraft(saved);
    setSavedSnapshot(JSON.stringify(saved));
    setToast(options?.activityType === "published" ? "Your website is published." : "Changes saved.");
  };
  const undo = () => {
    if (!past.length) return;
    const previous = past[past.length - 1];
    setFuture((items) => [draft, ...items]);
    setPast((items) => items.slice(0, -1));
    setDraft(previous);
  };
  const redo = () => {
    if (!future.length) return;
    const next = future[0];
    setPast((items) => [...items, draft]);
    setFuture((items) => items.slice(1));
    setDraft(next);
  };
  const moveSection = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= page.sections.length) return;
    updatePage((current) => {
      const sections = [...current.sections];
      [sections[index], sections[target]] = [sections[target], sections[index]];
      return { ...current, sections: sections.map((section, order) => ({ ...section, order })) };
    });
  };
  const deleteSection = (sectionId) => {
    updatePage((current) => ({ ...current, sections: current.sections.filter((section) => section.id !== sectionId).map((section, order) => ({ ...section, order })) }));
    setSelectedId(null);
  };
  const uploadSectionImage = async (file) => {
    if (!selected || !user) return;
    setImageState("uploading");
    setImageError("");
    try {
      const imageUrl = await uploadWebsiteImage({
        file,
        userId: user.uid,
        websiteId: draft.id,
      });
      updateSectionContent(selected.id, {
        ...selected.content,
        imageUrl,
        imageAlt: selected.content.imageAlt || selected.content.heading || draft.name,
      });
      setImageState("done");
    } catch (error) {
      setImageError(error.message || "The image could not be uploaded.");
      setImageState("idle");
    }
  };
  const publish = async () => {
    setPublishing(true);
    setPublishError("");
    try {
      const saved = await publishProject({ ...draft, publishedSlug: publicSlug });
      setDraft(saved);
      setSavedSnapshot(JSON.stringify(saved));
      setPublishOpen(false);
      setPublishSuccess(true);
    } catch {
      setPublishError("Firebase could not publish the website. Check your connection and try again.");
    } finally {
      setPublishing(false);
    }
  };
  const copySiteLink = async () => {
    try {
      await navigator.clipboard.writeText(siteUrl);
      setToast("Site link copied.");
    } catch {
      setToast("Could not copy the link. Select it manually.");
    }
  };

  if (!hydrated || !draft) {
    if (hydrated && !storedProject) return <div className="wl-editor-missing"><EmptyState title="Website not found" body="This project may have been removed or belongs to another workspace." action={<Button onClick={() => navigate("/websites")}>Back to website module</Button>} /></div>;
    return <div className="wl-editor-loading"><WebiloAnimatedLogo size={72} showWordmark wordmarkSize={28} /><p>Opening your business website</p></div>;
  }

  return (
    <div className="wl-editor">
      <header className="wl-editor-topbar">
        <button className="wl-editor-brand" onClick={() => navigate("/websites")} aria-label="Back to website module"><WebiloAnimatedLogo size={32} animated={false} /><Icon name="chevron" size={16} /></button>
        <div className="wl-editor-project"><strong>{draft.name}</strong><span className={`wl-status wl-status--${draft.status}`}>{draft.status}</span><small>{unsaved ? "Unsaved changes" : syncStatus === "offline" ? "Saved on this device" : syncStatus === "loading" ? "Syncing…" : "Saved to Firebase"}</small></div>
        <div className="wl-editor-history">
          <button onClick={undo} disabled={!past.length} aria-label="Undo"><Icon name="undo" /></button>
          <button onClick={redo} disabled={!future.length} aria-label="Redo"><Icon name="redo" /></button>
        </div>
        <DeviceToggle value={device} onChange={setDevice} />
        <div className="wl-editor-actions">
          <Button size="sm" icon="eye" onClick={() => setFullPreview(true)}>Preview</Button>
          <Button size="sm" icon="save" onClick={() => save()}>{unsaved ? "Save changes" : "Saved"}</Button>
          <Button size="sm" variant="primary" icon="rocket" onClick={() => setPublishOpen(true)}>{draft.status === "published" ? "Publish update" : "Publish"}</Button>
        </div>
      </header>
      <div className="wl-editor-workspace">
        <nav className="wl-editor-tools" aria-label="Editor tools">
          {[["sections", "layers", "Sections"], ["content", "site", "Content"], ["theme", "palette", "Theme"]].map(([value, icon, label]) => <button className={panel === value ? "active" : ""} onClick={() => setPanel(value)} key={value}><Icon name={icon} /><span>{label}</span></button>)}
        </nav>
        <aside className="wl-inspector">
          <label className="wl-page-select"><span>Editing page</span><select value={page.id} onChange={(event) => { setPageId(event.target.value); const nextPage = draft.pages.find((item) => item.id === event.target.value); setSelectedId(nextPage?.sections[0]?.id); }}><option value="" disabled>Select a page</option>{draft.pages.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label>
          {panel === "sections" && <SectionPanel project={draft} page={page} selectedId={selectedId} onSelect={(id) => { setSelectedId(id); }} onMove={moveSection} onToggle={(id) => updatePage((current) => ({ ...current, sections: current.sections.map((section) => section.id === id ? { ...section, visibility: !section.visibility } : section) }))} onDelete={deleteSection} onAdd={(type) => { const section = createSection(type, draft); updatePage((current) => ({ ...current, sections: [...current.sections, { ...section, order: current.sections.length }] })); setSelectedId(section.id); setPanel("content"); }} />}
          {panel === "content" && <ContentPanel section={selected} onChange={(content) => updateSectionContent(selected.id, content)} onImageUpload={uploadSectionImage} imageState={imageState} imageError={imageError} />}
          {panel === "theme" && <ThemePanel theme={draft.theme} onChange={(theme) => updateDraft((next) => ({ ...next, theme }))} />}
        </aside>
        <main className="wl-editor-canvas" onClick={() => setSelectedId(null)}>
          <div className={`wl-preview-frame wl-preview-frame--${device}`}>
            <WebsitePreview project={draft} page={page} selectedSectionId={selectedId} onSelectSection={(id) => { setSelectedId(id); setPanel("content"); }} onContentChange={updateSectionContent} />
          </div>
        </main>
      </div>
      <div className="wl-editor-mobile-actions"><button onClick={() => setPanel("sections")}><Icon name="layers" />Sections</button><button onClick={() => setPanel("theme")}><Icon name="palette" />Theme</button><button onClick={() => setFullPreview(true)}><Icon name="eye" />Preview</button><button onClick={() => save()}><Icon name="save" />Save</button></div>
      {fullPreview && <div className="wl-full-preview"><header><button onClick={() => setFullPreview(false)}><Icon name="close" /> Exit preview</button><DeviceToggle value={device} onChange={setDevice} /><span>{page.title}</span></header><main><div className={`wl-preview-frame wl-preview-frame--${device}`}><WebsitePreview project={draft} page={page} interactive={false} /></div></main></div>}
      <Modal
        open={publishOpen}
        title={draft.status === "published" ? "Publish your latest changes?" : "Ready to publish?"}
        description="Your saved design will be available at the address below. You can keep editing and publish updates at any time."
        onClose={() => !publishing && setPublishOpen(false)}
        actions={<><Button onClick={() => setPublishOpen(false)} disabled={publishing}>Not yet</Button><Button variant="primary" icon="rocket" onClick={publish} disabled={publishing}>{publishing ? "Publishing…" : draft.status === "published" ? "Publish update" : "Publish website"}</Button></>}
      >
        <div className="wl-publish-card"><span className="wl-publish-card__icon"><Icon name="site" /></span><div><strong>{draft.name}</strong><p>{siteUrl}</p></div><span className="wl-status">Ready</span></div>
        {publishError && <p className="wl-publish-error" role="alert">{publishError}</p>}
        <button className="wl-export-link" onClick={() => exportHtml(draft)}><Icon name="external" /><span><strong>Export as HTML</strong><small>Download a portable version of your homepage.</small></span><Icon name="chevron" /></button>
      </Modal>
      <Modal
        open={publishSuccess}
        title="Your website is live"
        description="Share this link with customers. Future edits stay private until you publish another update."
        onClose={() => setPublishSuccess(false)}
        actions={<><Button icon="save" onClick={copySiteLink}>Copy link</Button><Button variant="primary" icon="external" onClick={() => window.open(siteUrl, "_blank", "noopener,noreferrer")}>View website</Button></>}
      >
        <div className="wl-live-link"><span><Icon name="check" /></span><div><strong>{draft.name}</strong><a href={siteUrl} target="_blank" rel="noreferrer">{siteUrl}</a></div></div>
      </Modal>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
