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

const money = (cents) => new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
}).format(Number(cents || 0) / 100);
const offerPrice = (offer) => offer.pricingMode === "quote"
  ? "Price on request"
  : offer.pricingMode === "free"
    ? "Free"
    : `${offer.pricingMode === "starting_from" ? "From " : ""}${money(offer.price)}`;

export default function WebsitePreview({
  project,
  page,
  selectedSectionId,
  onSelectSection,
  onContentChange,
  onPageChange,
  onNavigate,
  onChooseProduct,
  onChooseService,
  products = [],
  services = [],
  contactForm,
  interactive = true,
}) {
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
  const businessType = String(project.settings?.businessType || "").toLowerCase();
  const menuBusiness = /(restaurant|food|cafe|bakery|catering)/.test(businessType);
  const primaryAction = products.length
    ? { label: menuBusiness ? "View menu" : "View products", target: "products" }
    : services.length
      ? { label: "View services", target: "services" }
      : { label: "Get in touch", target: "contact" };

  return (
    <div className={`wl-site wl-site--${project.theme.template || "organic"}`} style={style}>
      <header className="wl-site-nav">
        <strong>{project.name}</strong>
        <nav>{project.pages.map((item) => <button type="button" className={item.id === page.id ? "active" : ""} onClick={() => onPageChange?.(item.id)} key={item.id}>{item.title}</button>)}</nav>
        <button type="button" style={{ background: project.theme.primary }} onClick={() => onNavigate?.("contact")}>Get in touch</button>
      </header>
      {page.sections.filter((section) => section.visibility).map((section) => {
        const { content } = section;
        const common = {
          className: `wl-site-section wl-site-section--${section.type} ${selectedSectionId === section.id ? "selected" : ""}`,
          id: `site-section-${section.id}`,
          onClick: interactive ? (event) => { event.stopPropagation(); onSelectSection?.(section.id); } : undefined,
          "data-section-label": getSectionLabel(section.type),
          "data-section-type": section.type,
        };

        if (section.type === "hero" || section.type === "pageHero") {
          return (
            <section {...common} key={section.id}>
              <div className="wl-site-hero-copy">
                <EditableText as="span" value={content.eyebrow} onChange={interactive && changeField(section, "eyebrow")} />
                <EditableText as="h1" value={content.heading} onChange={interactive && changeField(section, "heading")} />
                <EditableText value={content.body} onChange={interactive && changeField(section, "body")} />
                {section.type === "hero" && (
                  <div className="wl-site-actions">
                    <button type="button" style={{ background: project.theme.primary }} onClick={() => onNavigate?.(primaryAction.target)}>{primaryAction.label}</button>
                    <button type="button" className="secondary" onClick={() => onNavigate?.("contact")}>Contact us</button>
                  </div>
                )}
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
              {contactForm || <button type="button" style={{ background: project.theme.primary }} onClick={() => onNavigate?.("contact")}>{content.primaryAction}</button>}
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
      {products.length > 0 && (
        <section className="wl-site-section wl-site-catalogue" id="site-products" data-section-type="products">
          <div className="wl-site-section-heading">
            <span>{menuBusiness ? "Menu" : "Products"}</span>
            <h2>{menuBusiness ? "Choose from our menu" : "Available to order"}</h2>
          </div>
          <div className="wl-site-catalogue-grid">
            {products.map((product) => (
              <article key={product.key || product.id}>
                {product.imageUrl && <img src={product.imageUrl} alt={product.name || ""} />}
                <div>
                  <h3>{product.name}</h3>
                  {product.description && <p>{product.description}</p>}
                  <footer>
                    <strong>{offerPrice(product)}</strong>
                    <button type="button" style={{ background: project.theme.primary }} onClick={() => onChooseProduct?.(product)}>{product.pricingMode === "quote" ? "Request quote" : "Place order"}</button>
                  </footer>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      {services.length > 0 && (
        <section className="wl-site-section wl-site-catalogue" id="site-services" data-section-type="services">
          <div className="wl-site-section-heading">
            <span>Services</span>
            <h2>Choose a service</h2>
          </div>
          <div className="wl-site-catalogue-grid">
            {services.map((service) => (
              <article key={service.key || service.id}>
                {service.imageUrl && <img src={service.imageUrl} alt={service.name || ""} />}
                <div>
                  <h3>{service.name}</h3>
                  {service.description && <p>{service.description}</p>}
                  <footer>
                    <strong>{offerPrice(service)}</strong>
                    <button type="button" style={{ background: project.theme.primary }} onClick={() => onChooseService?.(service)}>{service.pricingMode === "quote" ? "Request quote" : "Book service"}</button>
                  </footer>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      <footer className="wl-site-footer"><strong>{project.name}</strong><span>Built with Webilo</span></footer>
    </div>
  );
}
