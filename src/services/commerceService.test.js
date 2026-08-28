import {
  getCommerceCheckoutStatus,
  getPublicOrderStatus,
  startCommerceCheckout,
  submitPublicBusinessRequest,
} from "./commerceService";

describe("submitPublicBusinessRequest", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("sends offer identity and quantity without accepting a client total", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ reference: "WEB-12345678" }),
    });

    await submitPublicBusinessRequest({
      slug: "demo-business",
      requestType: "offer",
      customer: { name: "Client", phone: "0712345678" },
      selection: { resource: "offers", id: "offer-1", quantity: 2 },
      fulfilmentMethod: "pickup",
      notes: "",
    });

    const [, options] = global.fetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.selection).toEqual({ resource: "offers", id: "offer-1", quantity: 2 });
    expect(body).not.toHaveProperty("total");
    expect(body).not.toHaveProperty("price");
  });

  it("starts checkout without sending client prices or totals", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ authorizationUrl: "https://checkout.paystack.com/demo" }),
    });
    await startCommerceCheckout({
      slug: "demo",
      customer: { name: "Customer", email: "customer@example.com", phone: "0712345678" },
      selections: [{ resource: "offers", id: "offer-1", quantity: 2 }],
      fulfilmentMethod: "pickup",
      idempotencyKey: "checkout_123456789",
      clientSecret: "secret_123456789012345678901234",
      returnOrigin: "https://example.com",
    });
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.selections[0]).toEqual({ resource: "offers", id: "offer-1", quantity: 2 });
    expect(body).not.toHaveProperty("total");
    expect(body).not.toHaveProperty("amount");
  });

  it("reads webhook-confirmed checkout status", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "paid" }),
    });
    await expect(getCommerceCheckoutStatus({ slug: "demo", sessionId: "session", token: "token" }))
      .resolves.toEqual({ status: "paid" });
  });

  it("reads a token-guarded public order status", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ready", etaMinutes: 0 }),
    });
    await expect(getPublicOrderStatus({ slug: "demo", publicReference: "WEB-ABCD1234", token: "tok" }))
      .resolves.toEqual({ status: "ready", etaMinutes: 0 });
    const [url] = global.fetch.mock.calls[0];
    expect(url).toContain("/public/businesses/demo/orders/WEB-ABCD1234?token=tok");
  });

  it("surfaces a not-found order as an error", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Order not found." }),
    });
    await expect(getPublicOrderStatus({ slug: "demo", publicReference: "WEB-X", token: "bad" }))
      .rejects.toThrow("Order not found.");
  });
});
