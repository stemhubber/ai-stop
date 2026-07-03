const PAGE_TEMPLATES = {
  home: ["hero", "features", "about", "testimonials", "contact"],
  about: ["pageHero", "story", "values", "contact"],
  services: ["pageHero", "services", "process", "contact"],
  portfolio: ["pageHero", "gallery", "testimonials", "contact"],
  contact: ["pageHero", "contact"],
};

const SECTION_LABELS = {
  hero: "Hero",
  pageHero: "Page intro",
  features: "Highlights",
  about: "About",
  story: "Our story",
  values: "Values",
  services: "Services",
  process: "Process",
  gallery: "Portfolio",
  testimonials: "Testimonials",
  contact: "Contact",
};

const id = (prefix) =>
  `${prefix}_${window.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "my-website";

const titleCase = (value) =>
  value.replace(/(^\w|-\w)/g, (match) => match.replace("-", " ").toUpperCase());

function sectionContent(type, brief) {
  const business = brief.businessName || "Your business";
  const audience = brief.audience || "your customers";
  const goal = brief.goal || "grow your business";

  const content = {
    hero: {
      eyebrow: brief.businessType || "Welcome",
      heading: `${business}, built around what matters`,
      body: `${brief.description || `${business} helps ${audience} ${goal}.`} Clear, thoughtful, and ready when you are.`,
      primaryAction: "Get started",
      secondaryAction: "Learn more",
    },
    pageHero: {
      eyebrow: business,
      heading: `A better way to ${goal}`,
      body: `Everything you need to feel confident choosing ${business}.`,
    },
    features: {
      heading: "Why people choose us",
      body: "A focused experience shaped around quality, simplicity, and personal service.",
      items: [
        { title: "Thoughtful service", body: "A clear process and support at every step." },
        { title: "Built for you", body: `Solutions designed around ${audience}.` },
        { title: "Dependable quality", body: "Careful work with no unnecessary complexity." },
      ],
    },
    about: {
      eyebrow: "About us",
      heading: `Good work starts with understanding`,
      body: `${business} exists to make it easier for ${audience} to ${goal}. We combine practical experience with a genuinely personal approach.`,
    },
    story: {
      eyebrow: "Our story",
      heading: `Why we started ${business}`,
      body: `We saw a simpler, more human way to help ${audience}. Today, that same idea guides every decision we make.`,
    },
    values: {
      heading: "What guides our work",
      items: [
        { title: "Be clear", body: "Make every step easy to understand." },
        { title: "Stay useful", body: "Focus on outcomes that matter." },
        { title: "Care deeply", body: "Treat every customer like a partner." },
      ],
    },
    services: {
      heading: "How we can help",
      body: `Practical services to help you ${goal}.`,
      items: [
        { title: "Starter", body: "The essentials for getting moving." },
        { title: "Signature", body: "Our complete, most popular experience." },
        { title: "Custom", body: "A flexible option shaped around your needs." },
      ],
    },
    process: {
      heading: "A simple process",
      items: [
        { title: "01 · Tell us what you need", body: "Share your goals and priorities." },
        { title: "02 · We shape the plan", body: "Get a clear, practical recommendation." },
        { title: "03 · Move forward", body: "Launch with support and confidence." },
      ],
    },
    gallery: {
      heading: "Selected work",
      body: "A few examples of the care and craft we bring to every project.",
      items: [{ title: "Project one" }, { title: "Project two" }, { title: "Project three" }],
    },
    testimonials: {
      eyebrow: "Customer stories",
      heading: "Trusted by people who value good work",
      quote: `“${business} made the whole experience feel straightforward. We knew what was happening and loved the result.”`,
      attribution: "A happy customer",
    },
    contact: {
      eyebrow: "Next step",
      heading: "Let’s start a conversation",
      body: `Tell us what you are working on. We will get back to you with a clear next step.`,
      primaryAction: "Contact us",
      email: "hello@example.com",
    },
  };

  return content[type] || content.about;
}

export function buildWebsitePlan(brief) {
  const selectedPages = brief.pages?.length ? brief.pages : ["home"];
  const pages = selectedPages.map((pageSlug) => ({
    title: titleCase(pageSlug),
    slug: pageSlug,
    sections: PAGE_TEMPLATES[pageSlug] || ["pageHero", "about", "contact"],
  }));

  return {
    name: brief.businessName || "Untitled website",
    summary: `${brief.tone || "Warm and professional"} website focused on ${brief.goal || "building trust"}.`,
    pages,
    palette: brief.palette || "#6d5dfc",
  };
}

export function createWebsiteFromBrief(brief, blueprint = null) {
  const plan = buildWebsitePlan(brief);
  const createdAt = new Date().toISOString();
  if (blueprint?.pages?.length) {
    const pages = blueprint.pages.slice(0, 6).map((page, pageIndex) => ({
      id: id("page"),
      title: page.title || titleCase(page.slug || `Page ${pageIndex + 1}`),
      slug: pageIndex === 0 ? "/" : `/${slugify(page.slug || page.title)}`,
      sections: (page.sections || []).slice(0, 9).map((section, order) => ({
        id: id("section"),
        type: SECTION_LIBRARY.includes(section.type) || section.type === "pageHero"
          ? section.type
          : pageIndex === 0 && order === 0 ? "hero" : "about",
        order,
        content: section.content || sectionContent(section.type, brief),
        styles: {
          align: section.type === "hero" || section.type === "pageHero"
            ? "left"
            : "center",
        },
        visibility: true,
      })),
      seo: {
        title: page.seo?.title || `${page.title} · ${brief.businessName}`,
        description: page.seo?.description || brief.description,
      },
    }));
    const theme = blueprint.theme || {};
    return {
      id: id("site"),
      ownerId: brief.ownerId || null,
      name: brief.businessName || blueprint.name || "Untitled website",
      slug: slugify(brief.businessName || blueprint.name || "my-website"),
      status: "draft",
      createdAt,
      updatedAt: createdAt,
      publishedAt: null,
      theme: {
        primary: validHex(theme.primary) || brief.palette || "#6d5dfc",
        background: validHex(theme.background) || "#fbfaf7",
        surface: validHex(theme.surface) || "#ffffff",
        text: validHex(theme.text) || "#1d1d1f",
        muted: validHex(theme.muted) || "#66666f",
        font: ["modern", "editorial", "friendly"].includes(theme.font)
          ? theme.font
          : brief.font || "modern",
        radius: ["sharp", "soft", "rounded"].includes(theme.radius)
          ? theme.radius
          : "soft",
        template: ["organic", "bold", "editorial", "storefront", "professional"].includes(theme.template)
          ? theme.template
          : brief.template || templateForBusiness(brief.businessType),
      },
      pages,
      assets: [],
      seo: {
        title: blueprint.seo?.title || brief.businessName,
        description: blueprint.seo?.description || brief.description,
      },
      settings: {
        tone: brief.tone || "Warm and professional",
        goal: brief.goal || "Build trust",
        businessType: brief.businessType || "Small business",
        businessId: brief.businessId || null,
        generatedBy: "openai",
      },
    };
  }
  const pages = plan.pages.map((page, pageIndex) => {
    const pageId = id("page");
    const sections = page.sections.map((type, order) => ({
      id: id("section"),
      type,
      order,
      content: sectionContent(type, brief),
      styles: { align: type === "hero" || type === "pageHero" ? "left" : "center" },
      visibility: true,
    }));

    return {
      id: pageId,
      title: page.title,
      slug: pageIndex === 0 ? "/" : `/${page.slug}`,
      sections,
      seo: {
        title: `${page.title} · ${plan.name}`,
        description: brief.description || `${plan.name} — ${plan.summary}`,
      },
    };
  });

  return {
    id: id("site"),
    ownerId: brief.ownerId || null,
    name: plan.name,
    slug: slugify(plan.name),
    status: "draft",
    createdAt,
    updatedAt: createdAt,
    publishedAt: null,
    theme: {
      primary: plan.palette,
      background: "#fbfaf7",
      surface: "#ffffff",
      text: "#1d1d1f",
      muted: "#66666f",
      font: brief.font || "modern",
      radius: "soft",
      template: brief.template || templateForBusiness(brief.businessType),
    },
    pages,
    assets: [],
    seo: {
      title: plan.name,
      description: brief.description || plan.summary,
    },
    settings: {
      tone: brief.tone || "Warm and professional",
      goal: brief.goal || "Build trust",
      businessType: brief.businessType || "Small business",
      businessId: brief.businessId || null,
    },
  };
}

function validHex(value) {
  return /^#[0-9a-f]{6}$/i.test(value || "") ? value : null;
}

function templateForBusiness(value = "") {
  const type = value.toLowerCase();
  if (/(shop|retail|product|store|commerce|restaurant|food)/.test(type)) return "storefront";
  if (/(creative|portfolio|fashion|design|photograph)/.test(type)) return "editorial";
  if (/(fitness|event|music|sport|entertain)/.test(type)) return "bold";
  if (/(consult|legal|finance|account|agency|professional)/.test(type)) return "professional";
  return "organic";
}

export function createSection(type, project) {
  return {
    id: id("section"),
    type,
    order: 0,
    content: sectionContent(type, {
      businessName: project.name,
      ...project.settings,
    }),
    styles: { align: "center" },
    visibility: true,
  };
}

export function getSectionLabel(type) {
  return SECTION_LABELS[type] || titleCase(type);
}

export const SECTION_LIBRARY = [
  "hero",
  "features",
  "about",
  "services",
  "process",
  "gallery",
  "testimonials",
  "contact",
];
