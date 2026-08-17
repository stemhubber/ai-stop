const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const { verifySvixSignature } = require("./svix");

const SECRET = `whsec_${Buffer.from("test-secret-bytes").toString("base64")}`;

function sign({ secret = SECRET, svixId = "msg_1", svixTimestamp = String(Math.floor(Date.now() / 1000)), rawBody = Buffer.from('{"type":"email.sent"}') }) {
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signedContent = `${svixId}.${svixTimestamp}.${rawBody.toString("utf8")}`;
  const signature = crypto.createHmac("sha256", secretBytes).update(signedContent).digest("base64");
  return { svixId, svixTimestamp, svixSignature: `v1,${signature}`, rawBody };
}

test("accepts a correctly signed payload", () => {
  const { svixId, svixTimestamp, svixSignature, rawBody } = sign({});
  assert.equal(verifySvixSignature({ secret: SECRET, svixId, svixTimestamp, svixSignature, rawBody }), true);
});

test("accepts when one of several space-separated signatures matches", () => {
  const { svixId, svixTimestamp, svixSignature, rawBody } = sign({});
  const combined = `v1,not-the-right-signature ${svixSignature}`;
  assert.equal(verifySvixSignature({ secret: SECRET, svixId, svixTimestamp, svixSignature: combined, rawBody }), true);
});

test("rejects a tampered body", () => {
  const { svixId, svixTimestamp, svixSignature } = sign({});
  const tamperedBody = Buffer.from('{"type":"email.bounced"}');
  assert.equal(verifySvixSignature({ secret: SECRET, svixId, svixTimestamp, svixSignature, rawBody: tamperedBody }), false);
});

test("rejects the wrong secret", () => {
  const { svixId, svixTimestamp, svixSignature, rawBody } = sign({});
  assert.equal(verifySvixSignature({ secret: "whsec_d3JvbmdzZWNyZXQ=", svixId, svixTimestamp, svixSignature, rawBody }), false);
});

test("rejects a stale timestamp", () => {
  const staleTimestamp = String(Math.floor(Date.now() / 1000) - 3600);
  const { svixId, svixSignature, rawBody } = sign({ svixTimestamp: staleTimestamp });
  assert.equal(
    verifySvixSignature({ secret: SECRET, svixId, svixTimestamp: staleTimestamp, svixSignature, rawBody }),
    false
  );
});

test("rejects when required fields are missing", () => {
  assert.equal(verifySvixSignature({}), false);
  assert.equal(verifySvixSignature({ secret: SECRET, svixId: "id", svixTimestamp: "1", svixSignature: null, rawBody: Buffer.from("x") }), false);
});
