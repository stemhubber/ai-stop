import { render, screen } from "@testing-library/react";
import PublicOrderStatus from "./PublicOrderStatus";
import { getPublicOrderStatus } from "../../services/commerceService";

jest.mock("react-router-dom", () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  useParams: () => ({ slug: "kasi-kitchen", publicReference: "WEB-ABCD1234" }),
  useSearchParams: () => [new URLSearchParams("t=secret-token")],
}), { virtual: true });

jest.mock("../../services/commerceService", () => ({
  getPublicOrderStatus: jest.fn(),
}));

jest.mock("../../components/WebiloAnimatedLogo", () => () => <div />);

afterEach(() => jest.clearAllMocks());

test("renders a delivery stepper with the current stage highlighted", async () => {
  getPublicOrderStatus.mockResolvedValue({
    publicReference: "WEB-ABCD1234",
    status: "processing",
    fulfilmentMethod: "delivery",
    items: [{ name: "Bunny chow", quantity: 2 }],
    etaMinutes: 20,
    businessName: "Kasi Kitchen",
    currency: "ZAR",
    total: 9000,
  });

  render(<PublicOrderStatus />);

  expect(await screen.findByText("Order WEB-ABCD1234")).toBeInTheDocument();
  expect(screen.getByText("On the way")).toBeInTheDocument();
  expect(screen.getByText("~20 min")).toBeInTheDocument();
  const preparing = screen.getByText("Preparing").closest("li");
  expect(preparing).toHaveClass("is-current");
});

test("shows a cancelled order without a progress stepper", async () => {
  getPublicOrderStatus.mockResolvedValue({
    publicReference: "WEB-ABCD1234",
    status: "cancelled",
    fulfilmentMethod: "pickup",
    items: [],
    businessName: "Kasi Kitchen",
  });

  render(<PublicOrderStatus />);

  expect(await screen.findByText("Cancelled")).toBeInTheDocument();
  expect(screen.queryByText("Preparing")).not.toBeInTheDocument();
});
