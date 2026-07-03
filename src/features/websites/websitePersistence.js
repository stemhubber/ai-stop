function dateValue(value) {
  const timestamp = new Date(value || 0).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function mergeByMostRecent(primary, secondary, dateField) {
  const merged = new Map();
  [...primary, ...secondary].forEach((item) => {
    const existing = merged.get(item.id);
    if (
      !existing ||
      dateValue(item[dateField]) > dateValue(existing[dateField])
    ) {
      merged.set(item.id, item);
    }
  });
  return [...merged.values()].sort(
    (left, right) =>
      dateValue(right[dateField]) - dateValue(left[dateField])
  );
}

export function reconcileRecords(
  remote,
  cached,
  dateField,
  excludedProjectIds = []
) {
  return mergeByMostRecent(remote, cached, dateField).filter(
    (item) => !excludedProjectIds.includes(item.projectId || item.id)
  );
}

