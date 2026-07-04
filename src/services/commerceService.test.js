import { submitPublicBusinessRequest } from "./commerceService";

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
});
