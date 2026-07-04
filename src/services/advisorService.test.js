import { parseAdvisorEvents } from "./advisorService";

jest.mock("axios", () => ({
  get: jest.fn(),
  post: jest.fn(),
}));
jest.mock("./firebase.config", () => ({ auth: { currentUser: null } }));
jest.mock("./apiConfig", () => ({ apiBaseUrl: "https://example.test" }));

test("parses complete advisor events and retains partial data", () => {
  const events = [];
  const remainder = parseAdvisorEvents(
    'event: delta\ndata: {"text":"Hello"}\n\nevent: done\ndata: {"usage":{"inputTokens":12}}\n\nevent: del',
    (event, data) => events.push({ event, data })
  );

  expect(events).toEqual([
    { event: "delta", data: { text: "Hello" } },
    { event: "done", data: { usage: { inputTokens: 12 } } },
  ]);
  expect(remainder).toBe("event: del");
});
