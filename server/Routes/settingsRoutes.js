const { Router } = require("express");
const sc = require("../controller/settingsController");
const { authenticate } = require("../middleware/auth");
const { authorize } = require("../middleware/roleGuard");

const router = Router();

// Public route to get settings
router.get("/", sc.getSettings);

// Admin-only route to update settings
router.use(authenticate);
router.use(authorize("admin"));
router.put("/", sc.updateSettings);

module.exports = router;
