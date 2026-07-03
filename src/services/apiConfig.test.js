import { resolveApiBaseUrl } from "./apiConfig";

test("uses the deployed Firebase Function unless emulator mode is explicit", () => {
  expect(resolveApiBaseUrl({
    configured: "",
    useEmulators: false,
    projectId: "smart-shop-bb140",
  })).toBe("https://us-central1-smart-shop-bb140.cloudfunctions.net/api");
});

test("uses localhost only when Firebase emulators are enabled", () => {
  expect(resolveApiBaseUrl({
    configured: "",
    useEmulators: true,
    projectId: "smart-shop-bb140",
  })).toBe("http://127.0.0.1:5001/smart-shop-bb140/us-central1/api");
});

test("respects an explicit API override without duplicate trailing slashes", () => {
  expect(resolveApiBaseUrl({
    configured: "https://api.example.com/functions///",
    useEmulators: false,
    projectId: "ignored",
  })).toBe("https://api.example.com/functions");
});
