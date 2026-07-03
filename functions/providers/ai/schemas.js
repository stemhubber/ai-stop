const copyContent = {
  type: "object",
  additionalProperties: false,
  properties: {
    eyebrow: { type: "string" },
    heading: { type: "string" },
    body: { type: "string" },
    primaryAction: { type: "string" },
    secondaryAction: { type: "string" },
    quote: { type: "string" },
    attribution: { type: "string" },
    email: { type: "string" },
    items: {
      type: "array",
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          body: { type: "string" },
        },
        required: ["title", "body"],
      },
    },
  },
  required: [
    "eyebrow",
    "heading",
    "body",
    "primaryAction",
    "secondaryAction",
    "quote",
    "attribution",
    "email",
    "items",
  ],
};

const WEBSITE_DRAFT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    seo: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        description: { type: "string" },
      },
      required: ["title", "description"],
    },
    theme: {
      type: "object",
      additionalProperties: false,
      properties: {
        primary: { type: "string" },
        background: { type: "string" },
        surface: { type: "string" },
        text: { type: "string" },
        muted: { type: "string" },
        font: { type: "string", enum: ["modern", "editorial", "friendly"] },
        radius: { type: "string", enum: ["sharp", "soft", "rounded"] },
        template: {
          type: "string",
          enum: ["organic", "bold", "editorial", "storefront", "professional"],
        },
      },
      required: [
        "primary",
        "background",
        "surface",
        "text",
        "muted",
        "font",
        "radius",
        "template",
      ],
    },
    pages: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          slug: { type: "string" },
          seo: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              description: { type: "string" },
            },
            required: ["title", "description"],
          },
          sections: {
            type: "array",
            minItems: 1,
            maxItems: 9,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                type: {
                  type: "string",
                  enum: [
                    "hero",
                    "pageHero",
                    "features",
                    "about",
                    "story",
                    "values",
                    "services",
                    "process",
                    "gallery",
                    "testimonials",
                    "contact",
                  ],
                },
                content: copyContent,
              },
              required: ["type", "content"],
            },
          },
        },
        required: ["title", "slug", "seo", "sections"],
      },
    },
  },
  required: ["name", "seo", "theme", "pages"],
};

const BUSINESS_IMAGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    documentType: {
      type: "string",
      enum: ["menu", "poster", "price_list", "catalogue", "unknown"],
    },
    title: { type: "string" },
    summary: { type: "string" },
    items: {
      type: "array",
      maxItems: 50,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          price: { type: "number" },
          durationMinutes: { type: "number" },
          category: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
        required: [
          "name",
          "description",
          "price",
          "durationMinutes",
          "category",
          "confidence",
        ],
      },
    },
  },
  required: ["documentType", "title", "summary", "items"],
};

const BUSINESS_PROFILE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    category: {
      type: "string",
      enum: ["retail", "restaurant", "salon", "services", "education", "other"],
    },
    description: { type: "string" },
    audience: { type: "string" },
    goal: { type: "string" },
    tone: {
      type: "string",
      enum: ["Warm and professional", "Bold and energetic", "Minimal and refined", "Friendly and playful"],
    },
    font: { type: "string", enum: ["modern", "editorial", "friendly"] },
    template: {
      type: "string",
      enum: ["organic", "bold", "editorial", "storefront", "professional"],
    },
    palette: { type: "string" },
    modules: {
      type: "array",
      items: {
        type: "string",
        enum: ["commerce", "bookings", "orders", "messages", "marketing", "analytics", "payments"],
      },
    },
  },
  required: [
    "name",
    "category",
    "description",
    "audience",
    "goal",
    "tone",
    "font",
    "template",
    "palette",
    "modules",
  ],
};

module.exports = {
  BUSINESS_IMAGE_SCHEMA,
  BUSINESS_PROFILE_SCHEMA,
  WEBSITE_DRAFT_SCHEMA,
};
