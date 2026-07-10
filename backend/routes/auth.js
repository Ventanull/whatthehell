const express = require("express");
const router = express.Router();
const { sendOTP, verifyOTP, getMe, checkEmail, updateProfile, requestEmailChange, verifyOldEmailOTP, requestNewEmailOTP, verifyNewEmailOTP } = require("../controllers/authController");
const { protect } = require("../middlewares/auth");

router.post("/check-email", checkEmail);
router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);
router.get("/me", protect, getMe);

router.put("/profile", protect, updateProfile);
router.post("/request-email-change", protect, requestEmailChange);
router.post("/verify-old-email", protect, verifyOldEmailOTP);
router.post("/request-new-email", protect, requestNewEmailOTP);
router.post("/verify-new-email", protect, verifyNewEmailOTP);

module.exports = router;
