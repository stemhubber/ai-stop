import { getSectionLabel } from "../websiteModel";

function EditableText({ value, onChange, as: Tag = "p", placeholder }) {
  if (!onChange) return <Tag>{value}</Tag>;
  return (
    <Tag
      contentEditable
      suppressContentEditableWarning
      onBlur={(event) => onChange(event.currentTarget.textContent)}
      data-placeholder={placeholder}
    >
      {value}
    </Tag>
  );
}

function Items({ items = [], onChange }) {
  return (
    <div className="wl-site-cards">
      {items.map((item, index) => (
        <article key={`${item.title}_${index}`}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <EditableText as="h3" value={item.title} onChange={onChange && ((title) => onChange(index, { ...item, title }))} />
          {item.body && <EditableText value={item.body} onChange={onChange && ((body) => onChange(index, { ...item, body }))} />}
        </article>
      ))}
    </div>
  );
}

export default function WebsitePreview({ project, page, selectedSectionId, onSelectSection, onContentChange, onPageChange, contactForm, interactive = true }) {
  if (!project || !page) return null;
  const style = {
    "--site-primary": project.theme.primary,
    "--site-bg": project.theme.background,
    "--site-surface": project.theme.surface,
    "--site-text": project.theme.text,
    "--site-muted": project.theme.muted,
    "--site-radius": project.theme.radius === "rounded" ? "28px" : project.theme.radius === "sharp" ? "4px" : "14px",
    "--site-font": project.theme.font === "editorial" ? "Georgia, serif" : project.theme.font === "friendly" ? "'Trebuchet MS', sans-serif" : "Inter, system-ui, sans-serif",
  };

  const changeField = (section, field) => (value) => onContentChange?.(section.id, { ...section.content, [field]: value });
  const changeItem = (section) => (index, value) => {
    const items = [...(section.content.items || [])];
    items[index] = value;
    onContentChange?.(section.id, { ...section.content, items });
  };

  return (
    <div className={`wl-site wl-site--${project.theme.template || "organic"}`} style={style}>
      <header className="wl-site-nav">
        <strong>{project.name}</strong>
        <nav>{project.pages.map((item) => <button className={item.id === page.id ? "active" : ""} onClick={() => onPageChange?.(item.id)} key={item.id}>{item.title}</button>)}</nav>
        <button style={{ background: project.theme.primary }}>Get in touch</button>
      </header>
      {page.sections.filter((section) => section.visibility).map((section) => {
        const { content } = section;
        const common = {
          className: `wl-site-section wl-site-section--${section.type} ${selectedSectionId === section.id ? "selected" : ""}`,
          onClick: interactive ? (event) => { event.stopPropagation(); onSelectSection?.(section.id); } : undefined,
          "data-section-label": getSectionLabel(section.type),
        };

        if (section.type === "hero" || section.type === "pageHero") {
          return (
            <section {...common} key={section.id}>
              <div className="wl-site-hero-copy">
                <EditableText as="span" value={content.eyebrow} onChange={interactive && changeField(section, "eyebrow")} />
                <EditableText as="h1" value={content.heading} onChange={interactive && changeField(section, "heading")} />
                <EditableText value={content.body} onChange={interactive && changeField(section, "body")} />
                {section.type === "hero" && <div className="wl-site-actions"><button style={{ background: project.theme.primary }}>{content.primaryAction}</button><button className="secondary">{content.secondaryAction}</button></div>}
              </div>
              <div className="wl-site-hero-art">{content.imageUrl ? <img src={content.imageUrl} alt={content.imageAlt || content.heading || ""} /> : <><span /><span /><span /></>}</div>
            </section>
          );
        }

        if (["features", "values", "services", "process", "gallery"].includes(section.type)) {
          return (
            <section {...common} key={section.id}>
              <div className="wl-site-section-heading">
                {content.eyebrow && <EditableText as="span" value={content.eyebrow} onChange={interactive && changeField(section, "eyebrow")} />}
                <EditableText as="h2" value={content.heading} onChange={interactive && changeField(section, "heading")} />
                {content.body && <EditableText value={content.body} onChange={interactive && changeField(section, "body")} />}
              </div>
              <Items items={content.items} onChange={interactive && changeItem(section)} />
            </section>
          );
        }

        if (section.type === "testimonials") {
          return (
            <section {...common} key={section.id}>
              <div className="wl-site-section-heading">
                <EditableText as="span" value={content.eyebrow} onChange={interactive && changeField(section, "eyebrow")} />
                <EditableText as="h2" value={content.heading} onChange={interactive && changeField(section, "heading")} />
              </div>
              <blockquote><EditableText value={content.quote} onChange={interactive && changeField(section, "quote")} /><EditableText as="cite" value={content.attribution} onChange={interactive && changeField(section, "attribution")} /></blockquote>
            </section>
          );
        }

        if (section.type === "contact") {
          return (
            <section {...common} key={section.id}>
              <div>
                <EditableText as="span" value={content.eyebrow} onChange={interactive && changeField(section, "eyebrow")} />
                <EditableText as="h2" value={content.heading} onChange={interactive && changeField(section, "heading")} />
                <EditableText value={content.body} onChange={interactive && changeField(section, "body")} />
              </div>
              {contactForm || <button style={{ background: project.theme.primary }}>{content.primaryAction}</button>}
            </section>
          );
        }

        return (
          <section {...common} key={section.id}>
            <div className="wl-site-split-art">{content.imageUrl && <img src={content.imageUrl} alt={content.imageAlt || content.heading || ""} />}</div>
            <div>
              <EditableText as="span" value={content.eyebrow} onChange={interactive && changeField(section, "eyebrow")} />
              <EditableText as="h2" value={content.heading} onChange={interactive && changeField(section, "heading")} />
              <EditableText value={content.body} onChange={interactive && changeField(section, "body")} />
            </div>
          </section>
        );
      })}
      <footer className="wl-site-footer"><strong>{project.name}</strong><span>Built with Webilo</span></footer>
    </div>
  );
}
