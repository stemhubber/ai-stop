import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AIVisualImporter from "./AIVisualImporter";
import { createRecord } from "../../services/businessRepository";
import { extractBusinessImage } from "../../services/aiService";

jest.mock("../../services/businessRepository", () => ({
  createRecord: jest.fn(),
}));

jest.mock("../../services/aiService", () => ({
  extractBusinessImage: jest.fn(),
}));

jest.mock("../../features/websites/components/WebiloUI", () => ({
  Icon: () => <span aria-hidden="true" />,
}));

beforeEach(() => {
  jest.clearAllMocks();
  window.URL.createObjectURL = jest.fn(() => "blob:preview");
  window.URL.revokeObjectURL = jest.fn();
});

const file = new File(["fake"], "menu.png", { type: "image/png" });

test("imports an extracted menu item as a canonical offer with pricing defaults", async () => {
  extractBusinessImage.mockResolvedValue({
    documentType: "menu",
    title: "Kasi Kitchen menu",
    summary: "1 item found.",
    items: [{
      name: "Bunny Chow",
      description: "Half loaf, mutton curry",
      price: 85,
      durationMinutes: 15,
      category: "Mains",
      confidence: 0.92,
    }],
  });
  createRecord.mockResolvedValue("offer-1");
  const onImported = jest.fn();

  render(<AIVisualImporter businessId="business-1" resource="offers" onImported={onImported} onClose={jest.fn()} />);

  expect(screen.getByText("Turn a menu photo into catalogue items")).toBeInTheDocument();

  const input = document.querySelector('input[type="file"]');
  fireEvent.change(input, { target: { files: [file] } });
  fireEvent.click(screen.getByRole("button", { name: "Analyze with AI" }));

  await screen.findByDisplayValue("Bunny Chow");
  fireEvent.click(screen.getByRole("button", { name: "Import 1 offers" }));

  await waitFor(() => expect(createRecord).toHaveBeenCalledWith("business-1", "offers", {
    name: "Bunny Chow",
    description: "Half loaf, mutton curry",
    price: 8500,
    category: "Mains",
    currency: "ZAR",
    status: "active",
    source: "ai-image-import",
    offerType: "product",
    pricingMode: "fixed",
    fulfilmentMethods: ["pickup"],
    available: true,
    prepMinutes: 15,
  }));
  await waitFor(() => expect(onImported).toHaveBeenCalled());
});
