const express = require("express");
const { requireApiKey } = require("./auth");

// Mounted at /v1 on the existing `exports.api` Express app (see functions/index.js).
// Every /v1 route is API-key authenticated; endpoints (/v1/email, /v1/sms, ...)
// land in later phases.
const router = express.Router();
router.use(requireApiKey);

module.exports = router;
