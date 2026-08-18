// One-off admin utility to revoke a developer API key — there is no self-serve
// revocation endpoint yet (see provisionDeveloperProject.js's header for the same
// caveat on issuance). A revoked key fails auth exactly like an unknown one
// (functions/developerApi/auth.js checks status === "active"), so an in-flight
// request using it gets a clean, auditable "Invalid API key" rather than the key
// silently vanishing.
//
// Usage (run from functions/, against the emulator or a real project):
//   node scripts/revokeApiKey.js --key <rawApiKey>
//
// Point it at the Firestore emulator with FIRESTORE_EMULATOR_HOST=localhost:8080
// and GOOGLE_CLOUD_PROJECT=smart-shop-bb140 (see CLAUDE.md — develop against
// emulators, not production). Omit those env vars to run against production
// Firestore with Application Default Credentials.
const admin = require("firebase-admin");
const { hashApiKey } = require("../developerApi/apiKeys");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : true;
      args[key] = value;
      if (value !== true) i += 1;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rawKey = args.key;

  if (!rawKey) {
    console.error("Usage: node scripts/revokeApiKey.js --key <rawApiKey>");
    process.exitCode = 1;
    return;
  }

  admin.initializeApp();
  const db = admin.firestore();
  const { FieldValue } = admin.firestore;

  const keyRef = db.collection("apiKeys").doc(hashApiKey(rawKey));
  const snapshot = await keyRef.get();
  if (!snapshot.exists) {
    console.error("No API key found matching that value.");
    process.exitCode = 1;
    return;
  }
  const keyData = snapshot.data();
  if (keyData.status === "revoked") {
    console.log(`Key ${keyData.keyPrefix}... is already revoked.`);
    return;
  }

  await keyRef.set({ status: "revoked", revokedAt: FieldValue.serverTimestamp() }, { merge: true });
  console.log(`Revoked key ${keyData.keyPrefix}... (project ${keyData.projectId}).`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Revocation failed:", error);
    process.exit(1);
  });
