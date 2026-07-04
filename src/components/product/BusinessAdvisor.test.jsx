import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import BusinessAdvisor from "./BusinessAdvisor";
import { listAdvisorActivity, streamAdvisor } from "../../services/advisorService";

jest.mock("qrcode", () => ({ toDataURL: jest.fn().mockResolvedValue("data:image/png;base64,qr") }));
jest.mock("../../context/PlanContext", () => ({
  usePlan: () => ({
    usage: { aiRequests: 3 },
    limit: () => 30,
    remaining: () => 27,
  }),
}));
jest.mock("../../features/websites/components/WebiloUI", () => ({
  Icon: () => <span aria-hidden="true" />,
}));
jest.mock("../../services/advisorService", () => ({
  listAdvisorActivity: jest.fn(),
  recordAdvisorAsset: jest.fn(),
  streamAdvisor: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  listAdvisorActivity.mockResolvedValue([]);
  streamAdvisor.mockImplementation(async ({ onDelta }) => {
    onDelta("Start with your first offer.");
  });
});

test("streams a contextual advisor answer from a quick prompt", async () => {
  render(
    <BusinessAdvisor
      business={{ id: "business-1", name: "Bakery", slug: "bakery" }}
      records={{ products: [], services: [] }}
      projects={[]}
    />
  );

  fireEvent.click(screen.getByRole("button", {
    name: "What is the most important thing I should do next?",
  }));

  await waitFor(() => expect(streamAdvisor).toHaveBeenCalledWith(
    expect.objectContaining({
      businessId: "business-1",
      message: "What is the most important thing I should do next?",
    })
  ));
  expect(await screen.findByText("Start with your first offer.")).toBeInTheDocument();
  expect(screen.getByText("27 left")).toBeInTheDocument();
});
