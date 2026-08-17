const test = require("node:test");
const assert = require("node:assert/strict");
const { hashApiKey, generateApiKey } = require("./apiKeys");

test("hashApiKey is deterministic and does not leak the raw key", () => {
  const hash = hashApiKey("wa_live_abc123");
  assert.equal(hash, hashApiKey("wa_live_abc123"));
  assert.equal(hash.length, 64); // hex-encoded SHA-256
  assert.doesNotMatch(hash, /abc123/);
});

test("hashApiKey produces different hashes for different keys", () => {
  assert.notEqual(hashApiKey("wa_live_a"), hashApiKey("wa_live_b"));
});

test("generateApiKey returns a raw key, its hash, and a matching prefix", () => {
  const { rawKey, keyHash, keyPrefix } = generateApiKey("live");
  assert.match(rawKey, /^wa_live_[0-9a-f]{48}$/);
  assert.equal(keyHash, hashApiKey(rawKey));
  assert.equal(rawKey.startsWith(keyPrefix), true);
});

test("generateApiKey supports test-environment keys", () => {
  const { rawKey } = generateApiKey("test");
  assert.match(rawKey, /^wa_test_[0-9a-f]{48}$/);
});

test("generateApiKey rejects unknown environments", () => {
  assert.throws(() => generateApiKey("staging"));
});

test("generateApiKey produces unique keys across calls", () => {
  const first = generateApiKey("live");
  const second = generateApiKey("live");
  assert.notEqual(first.rawKey, second.rawKey);
});
