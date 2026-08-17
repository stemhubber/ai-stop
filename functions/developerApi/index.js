const express = require("express");

// Mounted at /v1 on the existing `exports.api` Express app (see functions/index.js).
// Auth, projects, and the first endpoints land in later phases — this router is
// intentionally empty for now so the mount point exists without any new surface area.
const router = express.Router();

module.exports = router;
