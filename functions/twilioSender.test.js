const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveTwilioCredentials } = require("./twilioSender");

const accountSid = `AC${"a".repeat(32)}`;
const apiKey = `SK${"b".repeat(32)}`;

test("uses API-key authentication when an API key and secret are configured", () => {
  const result = resolveTwilioCredentials({
    accountSid,
    authToken: "unused",
    apiKey,
    apiSecret: "secret",
  });
  assert.equal(result.mode, "apiKey");
  assert.equal(result.username, apiKey);
  assert.equal(result.accountSid, accountSid);
});

test("falls back to Account SID and Auth Token authentication", () => {
  const result = resolveTwilioCredentials({
    accountSid,
    authToken: "token",
    apiKey: "",
    apiSecret: "",
  });
  assert.equal(result.mode, "authToken");
  assert.equal(result.username, accountSid);
});
