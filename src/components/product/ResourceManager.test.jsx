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

test("lets the owner accept, process, and complete a website order", async () => {
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

  const accept = await screen.findByRole("button", { name: "Accept order" });
  fireEvent.click(accept);

  await waitFor(() => expect(updateRecord).toHaveBeenCalledWith(
    "business-1",
    "orders",
    "order-1",
    { status: "confirmed" }
  ));
  const process = await screen.findByRole("button", { name: "Start processing" });
  fireEvent.click(process);
  await waitFor(() => expect(updateRecord).toHaveBeenLastCalledWith(
    "business-1",
    "orders",
    "order-1",
    { status: "processing" }
  ));
  expect(await screen.findByRole("button", { name: "Complete" })).toBeInTheDocument();
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
