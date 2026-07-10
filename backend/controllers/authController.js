const User = require("../models/User");
const { sendOTPEmail } = require("../services/emailService");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const getRedisClient = require("../utils/redis");

// Initialize Redis client for OTP caching
const redis = getRedisClient();

// Helper to generate 6-digit OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

exports.checkEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const user = await User.findOne({ email });
    res.json({ exists: !!user });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    // Check cooldown
    const cooldownKey = `otp_cooldown:${email}`;
    const inCooldown = await redis.get(cooldownKey);
    if (inCooldown) {
      return res.status(429).json({ error: "Please wait before requesting another OTP." });
    }

    const otp = generateOTP();
    const otpKey = `otp:${email}`;

    // Store OTP in Redis for 5 minutes (300 seconds)
    await redis.set(otpKey, otp, "EX", 300);
    // Set 30-sec cooldown
    await redis.set(cooldownKey, "1", "EX", 30);

    // Send Email
    const emailSent = await sendOTPEmail(email, otp);
    if (!emailSent) {
      return res.status(500).json({ error: "Failed to send OTP email." });
    }

    res.json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("sendOTP Error:", error);
    res.status(500).json({ error: "Server error during OTP generation" });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp, name, whatsappNumber, companyName } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });

    const otpKey = `otp:${email}`;
    const storedOTP = await redis.get(otpKey);

    if (!storedOTP || storedOTP !== otp) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    // OTP is valid, remove it
    await redis.del(otpKey);

    // Find or create user
    let user = await User.findOne({ email });
    if (!user) {
      if (!name) return res.status(400).json({ error: "Name is required for registration" });
      user = await User.create({ email, name, whatsappNumber, companyName });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "Account is banned or inactive" });
    }

    // Generate JWT
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret', {
      expiresIn: process.env.JWT_EXPIRES_IN || '30d',
    });

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        plan: user.plan,
        credits: user.credits,
        name: user.name,
        whatsappNumber: user.whatsappNumber,
        companyName: user.companyName,
      },
    });
  } catch (error) {
    console.error("verifyOTP Error:", error);
    res.status(500).json({ error: "Server error during OTP verification" });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-__v");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ 
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        plan: user.plan,
        credits: user.credits,
        name: user.name,
        whatsappNumber: user.whatsappNumber,
        companyName: user.companyName,
      } 
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, whatsappNumber, companyName } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, whatsappNumber, companyName },
      { new: true }
    );
    res.json({ 
      message: "Profile updated", 
      user: { 
        id: user._id,
        email: user.email,
        name: user.name,
        whatsappNumber: user.whatsappNumber,
        companyName: user.companyName,
        role: user.role,
        plan: user.plan,
        credits: user.credits
      } 
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.requestEmailChange = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const email = user.email;
    
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpKey = `email_change_old:${email}`;
    await redis.set(otpKey, otp, "EX", 600);
    const sent = await sendOTPEmail(email, otp, 'email_change');
    if (!sent) return res.status(500).json({ error: "Failed to send OTP to current email" });
    res.json({ message: "OTP sent to your current email" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.verifyOldEmailOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    const email = user.email;

    const otpKey = `email_change_old:${email}`;
    const storedOTP = await redis.get(otpKey);
    if (!storedOTP || storedOTP !== otp) return res.status(400).json({ error: "Invalid OTP" });
    await redis.del(otpKey);
    const verifyKey = `email_change_verified:${req.user.id}`;
    await redis.set(verifyKey, "1", "EX", 600);
    res.json({ message: "Old email verified" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.requestNewEmailOTP = async (req, res) => {
  try {
    const { newEmail } = req.body;
    const verifyKey = `email_change_verified:${req.user.id}`;
    const verified = await redis.get(verifyKey);
    if (!verified) return res.status(403).json({ error: "Please verify your old email first" });
    
    const existing = await User.findOne({ email: newEmail });
    if (existing) return res.status(400).json({ error: "Email already in use" });

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpKey = `email_change_new:${newEmail}`;
    await redis.set(otpKey, otp, "EX", 600);
    const sent = await sendOTPEmail(newEmail, otp);
    if (!sent) return res.status(500).json({ error: "Failed to send OTP to new email" });
    res.json({ message: "OTP sent to your new email" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.verifyNewEmailOTP = async (req, res) => {
  try {
    const { otp, newEmail } = req.body;
    const verifyKey = `email_change_verified:${req.user.id}`;
    const verified = await redis.get(verifyKey);
    if (!verified) return res.status(403).json({ error: "Please verify your old email first" });

    const otpKey = `email_change_new:${newEmail}`;
    const storedOTP = await redis.get(otpKey);
    if (!storedOTP || storedOTP !== otp) return res.status(400).json({ error: "Invalid OTP" });

    await redis.del(otpKey);
    await redis.del(verifyKey);

    const existing = await User.findOne({ email: newEmail });
    if (existing) return res.status(400).json({ error: "Email already in use" });

    const user = await User.findByIdAndUpdate(req.user.id, { email: newEmail }, { new: true });
    res.json({ 
      message: "Email updated successfully", 
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        whatsappNumber: user.whatsappNumber,
        companyName: user.companyName,
        role: user.role,
        plan: user.plan,
        credits: user.credits
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};
