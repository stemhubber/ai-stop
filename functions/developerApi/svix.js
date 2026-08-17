const crypto = require("crypto");

const TOLERANCE_SECONDS = 5 * 60;

// Verifies a Svix-signed webhook (used by Resend) without pulling in the svix package —
// the scheme is a documented, stable HMAC construction: base64(HMAC-SHA256(secret,
// "{id}.{timestamp}.{rawBody}")), compared against one or more "v1,<sig>" values in
// svix-signature. secret is the whsec_... value from the Resend dashboard.
function verifySvixSignature({ secret, svixId, svixTimestamp, svixSignature, rawBody }) {
  if (!secret || !svixId || !svixTimestamp || !svixSignature || !rawBody) return false;

  const timestamp = Number(svixTimestamp);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > TOLERANCE_SECONDS) {
    return false; // stale/future timestamp — reject rather than allow a replayed payload
  }

  const secretBytes = Buffer.from(String(secret).replace(/^whsec_/, ""), "base64");
  const signedContent = `${svixId}.${svixTimestamp}.${rawBody.toString("utf8")}`;
  const expected = crypto.createHmac("sha256", secretBytes).update(signedContent).digest("base64");
  const expectedBuffer = Buffer.from(expected);

  return String(svixSignature)
    .split(" ")
    .some((entry) => {
      const [version, signature] = entry.split(",");
      if (version !== "v1" || !signature) return false;
      const providedBuffer = Buffer.from(signature);
      return expectedBuffer.length === providedBuffer.length && crypto.timingSafeEqual(expectedBuffer, providedBuffer);
    });
}

module.exports = { verifySvixSignature };
