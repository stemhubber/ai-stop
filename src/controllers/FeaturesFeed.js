export const Features = {
  CONTACT: "contact",
  ORDERS: "orders",
  BOOKINGS: "bookings",
  UPLOAD: "upload",
};

export class FeaturesFeed {
  constructor(enabled = []) {
    this.enabled = new Set(enabled);
  }

  enable(feature) {
    this.enabled.add(feature);
  }

  disable(feature) {
    this.enabled.delete(feature);
  }

  check(feature) {
    return this.enabled.has(feature);
  }

  list() {
    return Array.from(this.enabled);
  }

  /**
   * EXACT endpoint map based on Flask service functions.
   * The AI cannot invent anything outside this dictionary.
   */
  static get API_MAP() {
    return {
      contact: {
        sendContact: {
          description: "Send contact form message.",
          endpoint: "/api/contact/send",
          method: "POST",
          payload: "{ siteId, name, email, message }",
        },
      },

      orders: {
        createOrder: {
          description: "Create a new order.",
          endpoint: "/api/orders/create",
          method: "POST",
          payload: "{ siteId, user, product }",
        },

        listOrders: {
          description: "List all orders for a site.",
          endpoint: "/api/orders/list/{siteId}",
          method: "GET",
          payload: "{ }",
        },
      },

      bookings: {
        createBooking: {
          description: "Create a new booking.",
          endpoint: "/api/bookings/create",
          method: "POST",
          payload: "{ siteId, name, service, date }",
        },
      },

      upload: {
        uploadImage: {
          description: "Upload image to Firebase Storage.",
          endpoint: "/api/uploads/image",
          method: "POST",
          payload: "multipart/form-data (file)",
        },
      },
    };
  }

  /** Return only the APIs that match enabled features */
  getAllowedAPIs() {
    const output = {};

    for (const feature of this.enabled) {
      if (FeaturesFeed.API_MAP[feature]) {
        output[feature] = FeaturesFeed.API_MAP[feature];
      }
    }
    return output;
  }

  /** Render a version safe to inject into GPT */
  toPromptString() {
    let text = "Allowed Backend APIs:\n\n";

    for (const feature of this.list()) {
      text += `FEATURE: ${feature.toUpperCase()}\n`;

      const methods = FeaturesFeed.API_MAP[feature];

      for (const key in methods) {
        const m = methods[key];
        text += `
Method Name: ${key}
Description: ${m.description}
Endpoint: ${m.endpoint}
HTTP Method: ${m.method}
Payload: ${m.payload}
---------------------------------------------
`;
      }
    }

    return text.trim();
  }
}
