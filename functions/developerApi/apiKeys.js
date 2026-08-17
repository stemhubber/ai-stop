const crypto = require("crypto");

const KEY_PREFIX_LENGTH = 12;

function hashApiKey(rawKey) {
  return crypto.createHash("sha256").update(String(rawKey || "")).digest("hex");
}

function generateApiKey(environment = "live") {
  if (!["live", "test"].includes(environment)) {
    throw new Error(`Unsupported API key environment: ${environment}`);
  }
  const secret = crypto.randomBytes(24).toString("hex");
  const rawKey = `wa_${environment}_${secret}`;
  return {
    rawKey,
    keyHash: hashApiKey(rawKey),
    keyPrefix: rawKey.slice(0, KEY_PREFIX_LENGTH),
  };
}

module.exports = { hashApiKey, generateApiKey };
