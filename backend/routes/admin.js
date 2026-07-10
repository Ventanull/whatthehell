const express = require("express");
const router = express.Router();
const { getAdminStats, getUsers, updateUserPlan } = require("../controllers/adminController");
const { protect, admin } = require("../middlewares/auth");

router.use(protect, admin);

router.get("/stats", getAdminStats);
router.get("/users", getUsers);
router.put("/users/:id", updateUserPlan);

module.exports = router;
