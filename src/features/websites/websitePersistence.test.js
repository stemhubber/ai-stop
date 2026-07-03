import { mergeByMostRecent, reconcileRecords } from "./websitePersistence";

test("keeps the newest local or remote version of each project", () => {
  const remote = [
    { id: "one", updatedAt: "2026-01-01T10:00:00.000Z", source: "remote" },
    { id: "two", updatedAt: "2026-01-03T10:00:00.000Z", source: "remote" },
  ];
  const cached = [
    { id: "one", updatedAt: "2026-01-02T10:00:00.000Z", source: "cached" },
  ];

  const merged = mergeByMostRecent(remote, cached, "updatedAt");

  expect(merged.map((item) => item.id)).toEqual(["two", "one"]);
  expect(merged.find((item) => item.id === "one").source).toBe("cached");
});

test("does not restore projects or activity carrying deletion tombstones", () => {
  const projects = reconcileRecords(
    [{ id: "deleted", updatedAt: "2026-01-02T10:00:00.000Z" }],
    [{ id: "active", updatedAt: "2026-01-01T10:00:00.000Z" }],
    "updatedAt",
    ["deleted"]
  );
  const activity = reconcileRecords(
    [{ id: "activity-1", projectId: "deleted", at: "2026-01-02T10:00:00.000Z" }],
    [],
    "at",
    ["deleted"]
  );

  expect(projects.map((project) => project.id)).toEqual(["active"]);
  expect(activity).toEqual([]);
});

