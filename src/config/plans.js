export const PLAN_IDS = {
  CORE: "core",
  PRO: "pro",
};

export const PLAN_CATALOG = {
  core: {
    id: "core",
    name: "Core",
    description: "Everything needed to launch and run the business basics.",
    price: 0,
    limits: {
      aiRequests: 30,
      aiTokens: 150000,
      transcriptions: 20,
      messages: 25,
    },
    entitlements: {
      businessWorkspace: true,
      website: true,
      products: true,
      services: true,
      orders: true,
      bookings: true,
      customers: true,
      basicAnalytics: true,
      aiAssist: true,
      advancedAnalytics: false,
      automations: false,
      crmSegments: false,
      customDomain: false,
      removeBranding: false,
      teamMembers: false,
      paidCheckout: false,
      advancedBookings: false,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "Higher limits, deeper insights, and online customer checkout.",
    price: 299,
    periodDays: 30,
    limits: {
      aiRequests: 500,
      aiTokens: 2000000,
      transcriptions: 300,
      messages: 1000,
    },
    entitlements: {
      businessWorkspace: true,
      website: true,
      products: true,
      services: true,
      orders: true,
      bookings: true,
      customers: true,
      basicAnalytics: true,
      aiAssist: true,
      advancedAnalytics: true,
      automations: false,
      crmSegments: false,
      customDomain: false,
      removeBranding: false,
      teamMembers: false,
      paidCheckout: true,
      advancedBookings: false,
    },
  },
};

export const USAGE_METRICS = [
  {
    id: "aiRequests",
    label: "AI actions",
    description: "Advisor questions, business profiles, websites, and image imports",
  },
  {
    id: "aiTokens",
    label: "AI tokens",
    description: "Combined model input and output tokens",
  },
  {
    id: "transcriptions",
    label: "Voice transcriptions",
    description: "Whisper recordings processed",
  },
  {
    id: "messages",
    label: "Messages",
    description: "SMS, email, and WhatsApp delivery attempts",
  },
];

export function normalizePlanId(value) {
  return value === "pro" ? "pro" : "core";
}

export function currentUsagePeriod(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
