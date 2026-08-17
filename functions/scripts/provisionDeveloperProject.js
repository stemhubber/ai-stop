// One-off admin utility for Phase 9 manual provisioning — there is no
// self-serve /v1/projects or /v1/apiKeys endpoint yet (Phase 13, developer
// portal, is what eventually replaces this script).
//
// Usage (run from functions/, against the emulator or a real project):
//   node scripts/provisionDeveloperProject.js --name "Study Acumen" --owner <firebaseUid> [--business <businessId>] [--env live|test]
//
// Point it at the Firestore emulator with FIRESTORE_EMULATOR_HOST=localhost:8080
// and GOOGLE_CLOUD_PROJECT=smart-shop-bb140 (see CLAUDE.md — develop against
// emulators, not production). Omit those env vars to run against production
// Firestore with Application Default Credentials.
const admin = require("firebase-admin");
const { generateApiKey } = require("../developerApi/apiKeys");

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
  const name = args.name;
  const ownerUid = args.owner;
  const businessId = args.business || null;
  const environment = args.env || "live";

  if (!name || !ownerUid) {
    console.error("Usage: node scripts/provisionDeveloperProject.js --name <name> --owner <firebaseUid> [--business <businessId>] [--env live|test]");
    process.exitCode = 1;
    return;
  }

  admin.initializeApp();
  const db = admin.firestore();
  const { FieldValue } = admin.firestore;

  const projectRef = db.collection("projects").doc();
  await projectRef.set({
    ownerUid,
    businessId,
    name,
    status: "active",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const { rawKey, keyHash, keyPrefix } = generateApiKey(environment);
  await db.collection("apiKeys").doc(keyHash).set({
    projectId: projectRef.id,
    keyPrefix,
    name: `${name} (${environment})`,
    environment,
    status: "active",
    createdAt: FieldValue.serverTimestamp(),
    lastUsedAt: null,
  });

  console.log(`Project created: ${projectRef.id}`);
  console.log(`API key (shown once — store it now): ${rawKey}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Provisioning failed:", error);
    process.exit(1);
  });
