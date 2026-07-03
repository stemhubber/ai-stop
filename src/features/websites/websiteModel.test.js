import { buildWebsitePlan, createSection, createWebsiteFromBrief } from "./websiteModel";

const brief = {
  businessName: "Moya Studio",
  businessType: "Wellness studio",
  description: "Small group movement classes for busy professionals.",
  audience: "busy professionals",
  goal: "Get more enquiries",
  tone: "Warm and professional",
  palette: "#176b54",
  pages: ["home", "services", "contact"],
};

test("builds a reviewable plan from the website brief", () => {
  const plan = buildWebsitePlan(brief);

  expect(plan.name).toBe("Moya Studio");
  expect(plan.pages.map((page) => page.slug)).toEqual(["home", "services", "contact"]);
  expect(plan.pages[0].sections).toContain("hero");
});

test("creates the canonical editable website model", () => {
  const website = createWebsiteFromBrief(brief);

  expect(website.status).toBe("draft");
  expect(website.slug).toBe("moya-studio");
  expect(website.theme.primary).toBe("#176b54");
  expect(website.pages[0].slug).toBe("/");
  expect(website.pages[0].sections.every((section, index) => section.order === index)).toBe(true);
  expect(website.pages[0].sections[0].content.heading).toContain("Moya Studio");
});

test("creates new sections using the same project data", () => {
  const website = createWebsiteFromBrief(brief);
  const section = createSection("testimonials", website);

  expect(section.type).toBe("testimonials");
  expect(section.content.quote).toContain("Moya Studio");
  expect(section.visibility).toBe(true);
});

test("turns an AI blueprint into the canonical editable model", () => {
  const blueprint = {
    name: "Moya AI draft",
    seo: { title: "Moya Wellness", description: "Movement for busy people." },
    theme: {
      primary: "#176b54",
      background: "#faf8f2",
      surface: "#ffffff",
      text: "#202520",
      muted: "#667066",
      font: "editorial",
      radius: "rounded",
    },
    pages: [{
      title: "Home",
      slug: "home",
      seo: { title: "Moya Wellness", description: "Move and feel better." },
      sections: [{
        type: "hero",
        content: {
          eyebrow: "Moya Wellness",
          heading: "Move well. Feel like yourself.",
          body: "Small group movement for busy professionals.",
          primaryAction: "Book a class",
          secondaryAction: "Explore classes",
          quote: "",
          attribution: "",
          email: "",
          items: [],
        },
      }],
    }],
  };

  const website = createWebsiteFromBrief(brief, blueprint);

  expect(website.settings.generatedBy).toBe("openai");
  expect(website.theme.font).toBe("editorial");
  expect(website.pages[0].sections[0].content.heading).toBe("Move well. Feel like yourself.");
  expect(website.pages[0].sections[0].id).toMatch(/^section_/);
});
