import { render, screen } from "@testing-library/react";
import ProPage from "./ProPage";
import { usePlan } from "../../context/PlanContext";

jest.mock("react-router-dom", () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
}), { virtual: true });

jest.mock("../../context/PlanContext", () => ({
  usePlan: jest.fn(),
}));

jest.mock("../websites/components/WebiloUI", () => ({
  AppLayout: ({ children }) => <div>{children}</div>,
  Icon: ({ name }) => <span aria-label={name} />,
  LoadingScreen: ({ label }) => <div>{label}</div>,
}));

jest.mock("./PlanUI", () => ({
  PlanBadge: () => <span>Core</span>,
}));

test("promotes Pro with a real billing destination for Core users", () => {
  usePlan.mockReturnValue({
    isPro: false,
    loadingPlan: false,
    plan: { name: "Core", description: "Core plan" },
    account: {},
  });

  render(<ProPage />);

  expect(screen.getByRole("heading", { name: "Run more of the business on autopilot." })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Get Pro for R299 / 30 days" })).toHaveAttribute("href", "/billing?plan=pro");
  expect(screen.getByText("Automations")).toBeInTheDocument();
  expect(screen.getByText("Advanced insights")).toBeInTheDocument();
});
