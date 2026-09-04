import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AnnouncementBanner from "./AnnouncementBanner";
import { listRecords } from "../../services/businessRepository";

jest.mock("../../services/businessRepository", () => ({
  listRecords: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
});

test("shows active announcements and hides expired ones", async () => {
  listRecords.mockResolvedValue([
    { id: "a1", message: "Kitchen closed today", level: "warning", expiresAt: null },
    { id: "a2", message: "Yesterday's notice", level: "info", expiresAt: new Date(Date.now() - 60000).toISOString() },
  ]);

  render(<AnnouncementBanner businessId="business-1" />);

  expect(await screen.findByText("Kitchen closed today")).toBeInTheDocument();
  expect(screen.queryByText("Yesterday's notice")).not.toBeInTheDocument();
  expect(listRecords).toHaveBeenCalledWith("business-1", "announcements");
});

test("renders nothing when there are no active announcements", async () => {
  listRecords.mockResolvedValue([]);
  const { container } = render(<AnnouncementBanner businessId="business-1" />);
  await waitFor(() => expect(listRecords).toHaveBeenCalled());
  expect(container).toBeEmptyDOMElement();
});

test("dismissing a notice remembers it for this browser on remount", async () => {
  listRecords.mockResolvedValue([
    { id: "a1", message: "Load-shedding delays", level: "info", expiresAt: null },
  ]);

  const { unmount } = render(<AnnouncementBanner businessId="business-1" />);
  await screen.findByText("Load-shedding delays");
  fireEvent.click(screen.getByRole("button", { name: "Dismiss this notice" }));
  await waitFor(() => expect(screen.queryByText("Load-shedding delays")).not.toBeInTheDocument());
  unmount();

  render(<AnnouncementBanner businessId="business-1" />);
  await waitFor(() => expect(listRecords).toHaveBeenCalledTimes(2));
  expect(screen.queryByText("Load-shedding delays")).not.toBeInTheDocument();
});
