import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import ResourceManager from "./ResourceManager";
import { createRecord, listRecords, updateRecord } from "../../services/businessRepository";
import { sendMessage } from "../../services/messagingService";

jest.mock("../../services/businessRepository", () => ({
  createRecord: jest.fn(),
  deleteRecord: jest.fn(),
  listRecords: jest.fn(),
  updateRecord: jest.fn(),
}));

jest.mock("../../services/messagingService", () => ({
  sendMessage: jest.fn(),
}));

jest.mock("../../services/websiteAssetService", () => ({
  uploadBusinessImage: jest.fn(),
}));

jest.mock("../../features/websites/components/WebiloUI", () => ({
  Icon: () => <span aria-hidden="true" />,
}));

jest.mock("./AIVisualImporter", () => () => null);

beforeEach(() => {
  jest.clearAllMocks();
  listRecords.mockResolvedValue([]);
});

test("clears form and feedback state when switching resources", async () => {
  const { rerender } = render(
    <ResourceManager businessId="business-1" resource="campaigns" />
  );

  await waitFor(() => expect(screen.getByText("No campaigns yet")).toBeInTheDocument());
  expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Add campaign", expanded: false }));
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Winter offer" } });
  fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Save this week" } });

  rerender(<ResourceManager businessId="business-1" resource="messages" />);

  await waitFor(() => expect(screen.getByText("No messages yet")).toBeInTheDocument());
  expect(screen.queryByLabelText("Customer Name")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Add message", expanded: false }));
  expect(screen.getByLabelText("Customer Name")).toHaveValue("");
  expect(screen.getByLabelText("To")).toHaveValue("");
  expect(screen.getByLabelText("Body")).toHaveValue("");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("reloads records for each business", async () => {
  const { rerender } = render(
    <ResourceManager businessId="business-1" resource="customers" />
  );

  await waitFor(() => expect(listRecords).toHaveBeenCalledWith("business-1", "customers"));
  rerender(<ResourceManager businessId="business-2" resource="customers" />);
  await waitFor(() => expect(listRecords).toHaveBeenCalledWith("business-2", "customers"));
});

test("keeps forms collapsed until adding or editing", async () => {
  listRecords.mockResolvedValue([{
    id: "customer-1",
    name: "Naledi",
    email: "naledi@example.com",
    status: "lead",
  }]);

  render(<ResourceManager businessId="business-1" resource="customers" />);

  expect(await screen.findByText("Naledi")).toBeInTheDocument();
  expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  expect(screen.getByLabelText("Name")).toHaveValue("Naledi");

  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
});

test("uses a saved customer's email for email messages", async () => {
  listRecords.mockImplementation((businessId, resource) => Promise.resolve(
    resource === "customers"
      ? [{ id: "customer-1", name: "Naledi", phone: "0712345678", email: "naledi@example.com" }]
      : []
  ));
  sendMessage.mockResolvedValue({ success: true });

  render(<ResourceManager businessId="business-1" resource="messages" />);

  await screen.findByText("No messages yet");
  fireEvent.click(screen.getByRole("button", { name: "Add message", expanded: false }));
  fireEvent.change(screen.getByLabelText("Channel"), { target: { value: "email" } });
  fireEvent.change(await screen.findByLabelText("Use saved customer"), { target: { value: "customer-1" } });

  expect(screen.getByLabelText("To")).toHaveValue("naledi@example.com");
  expect(screen.getByLabelText("To")).toHaveAttribute("type", "email");
  expect(screen.getByText("EMAIL")).toBeInTheDocument();
});

test("lets the owner advance a website order through the kitchen pipeline", async () => {
  listRecords.mockImplementation((businessId, resource) => Promise.resolve(
    resource === "orders"
      ? [{
        id: "order-1",
        customerName: "Naledi",
        status: "pending",
        total: 15000,
        items: [{ name: "Lunch box", quantity: 2 }],
      }]
      : []
  ));
  updateRecord.mockResolvedValue();

  render(<ResourceManager businessId="business-1" resource="orders" />);

  fireEvent.click(await screen.findByRole("button", { name: "Accept order" }));
  await waitFor(() => expect(updateRecord).toHaveBeenCalledWith(
    "business-1",
    "orders",
    "order-1",
    { status: "confirmed" }
  ));

  fireEvent.click(await screen.findByRole("button", { name: "Start preparing" }));
  await waitFor(() => expect(updateRecord).toHaveBeenLastCalledWith(
    "business-1",
    "orders",
    "order-1",
    { status: "processing" }
  ));

  fireEvent.click(await screen.findByRole("button", { name: "Mark ready" }));
  await waitFor(() => expect(updateRecord).toHaveBeenLastCalledWith(
    "business-1",
    "orders",
    "order-1",
    { status: "ready" }
  ));

  expect(await screen.findByRole("button", { name: "Mark collected" })).toBeInTheDocument();
});

test("creates a canonical offer with pricing and fulfilment settings", async () => {
  createRecord.mockResolvedValue("offer-1");

  render(<ResourceManager businessId="business-1" resource="offers" />);

  await screen.findByText("No offers yet");
  fireEvent.click(screen.getByRole("button", { name: "Add offer", expanded: false }));
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Starter package" } });
  fireEvent.change(screen.getByLabelText("Offer Type"), { target: { value: "package" } });
  fireEvent.change(screen.getByLabelText("Pricing Mode"), { target: { value: "fixed" } });
  fireEvent.change(screen.getByLabelText("Price"), { target: { value: "499.99" } });
  fireEvent.change(screen.getByLabelText("Fulfilment Method"), { target: { value: "delivery" } });
  fireEvent.click(within(screen.getByLabelText("Name").closest("form")).getByRole("button", { name: "Add offer" }));

  await waitFor(() => expect(createRecord).toHaveBeenCalledWith(
    "business-1",
    "offers",
    expect.objectContaining({
      name: "Starter package",
      offerType: "package",
      pricingMode: "fixed",
      price: 49999,
      fulfilmentMethods: ["delivery"],
    })
  ));
});

test("creates a public announcement with an expiry converted to an ISO timestamp", async () => {
  createRecord.mockResolvedValue("announcement-1");

  render(<ResourceManager businessId="business-1" resource="announcements" />);

  await screen.findByText("No announcements yet");
  fireEvent.click(screen.getByRole("button", { name: "Add announcement", expanded: false }));
  fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Kitchen closed today" } });
  fireEvent.change(screen.getByLabelText("Level"), { target: { value: "warning" } });
  fireEvent.change(screen.getByLabelText("Expires At"), { target: { value: "2026-12-31T10:00" } });
  fireEvent.click(within(screen.getByLabelText("Message").closest("form")).getByRole("button", { name: "Add announcement" }));

  const expectedIso = new Date("2026-12-31T10:00").toISOString();
  await waitFor(() => expect(createRecord).toHaveBeenCalledWith(
    "business-1",
    "announcements",
    expect.objectContaining({
      message: "Kitchen closed today",
      level: "warning",
      expiresAt: expectedIso,
    })
  ));
});

test("hides food catalogue fields for a non-food business", async () => {
  render(<ResourceManager businessId="business-1" resource="offers" foodAware={false} />);
  await screen.findByText("No offers yet");
  fireEvent.click(screen.getByRole("button", { name: "Add offer", expanded: false }));

  expect(screen.queryByLabelText("Category")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Prep time (minutes)")).not.toBeInTheDocument();
  expect(screen.queryByText("Size / variant options")).not.toBeInTheDocument();
  expect(screen.getByLabelText("In stock / available")).toBeInTheDocument();
});

test("saves a food offer's category, prep time, and a priced variant in minor units", async () => {
  createRecord.mockResolvedValue("offer-1");
  render(<ResourceManager businessId="business-1" resource="offers" foodAware />);
  await screen.findByText("No offers yet");
  fireEvent.click(screen.getByRole("button", { name: "Add offer", expanded: false }));

  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Burger" } });
  fireEvent.change(screen.getByLabelText("Price"), { target: { value: "80" } });
  fireEvent.change(screen.getByLabelText("Category"), { target: { value: "Mains" } });
  fireEvent.change(screen.getByLabelText("Prep time (minutes)"), { target: { value: "12" } });

  fireEvent.click(screen.getByRole("button", { name: "Add variant" }));
  fireEvent.change(screen.getByPlaceholderText("Label, e.g. Large"), { target: { value: "Large" } });
  fireEvent.change(screen.getByPlaceholderText("+ price (R)"), { target: { value: "20" } });

  fireEvent.click(within(screen.getByLabelText("Name").closest("form")).getByRole("button", { name: "Add offer" }));

  await waitFor(() => expect(createRecord).toHaveBeenCalledWith(
    "business-1",
    "offers",
    expect.objectContaining({
      category: "Mains",
      prepMinutes: 12,
      available: true,
      variants: [{ label: "Large", priceDeltaCents: 2000 }],
    })
  ));
});

test("surfaces menu photo import only for food-aware businesses with AI enabled", async () => {
  const { rerender } = render(<ResourceManager businessId="business-1" resource="offers" foodAware aiEnabled={false} />);
  await screen.findByText("No offers yet");
  expect(screen.queryByRole("button", { name: "Import menu photo" })).not.toBeInTheDocument();

  rerender(<ResourceManager businessId="business-1" resource="offers" foodAware aiEnabled />);
  expect(await screen.findByRole("button", { name: "Import menu photo" })).toBeInTheDocument();

  rerender(<ResourceManager businessId="business-1" resource="offers" foodAware={false} aiEnabled />);
  expect(screen.queryByRole("button", { name: "Import menu photo" })).not.toBeInTheDocument();
});

test("toggles an offer's availability from the table row", async () => {
  listRecords.mockResolvedValue([
    { id: "offer-1", name: "Burger", price: 8000, available: true },
  ]);
  updateRecord.mockResolvedValue();
  render(<ResourceManager businessId="business-1" resource="offers" foodAware />);

  const toggle = await screen.findByRole("button", { name: "Mark sold out" });
  fireEvent.click(toggle);

  await waitFor(() => expect(updateRecord).toHaveBeenCalledWith(
    "business-1",
    "offers",
    "offer-1",
    { available: false }
  ));
  expect(await screen.findByRole("button", { name: "Mark available" })).toBeInTheDocument();
});
