const Session = require("../models/Session");
const User = require("../models/User");
const whatsappService = require("../services/whatsappService");
const crypto = require("crypto");

exports.createSession = async (req, res) => {
  try {
    const { sessionName } = req.body;
    if (!sessionName) {
      return res.status(400).json({ error: "Session name is required" });
    }

    const userId = req.user.id;
    const user = await User.findById(userId);

    // Limit check logic based on plans could go here
    const currentSessions = await Session.countDocuments({ userId });
    let maxSessions = 5; // Allow 1-5 devices for round-robin session selection
    if (user.plan === "starter") maxSessions = 5;
    if (user.plan === "pro") maxSessions = 10;
    if (user.plan === "enterprise") maxSessions = 999;

    if (currentSessions >= maxSessions) {
      return res.status(403).json({ error: "Session limit reached for your plan." });
    }

    const folderName = `session_${userId}_${crypto.randomUUID()}`;

    const session = await Session.create({
      userId,
      sessionName,
      folderName,
      status: "INITIATED",
    });

    // Initialize Baileys socket asynchronously
    whatsappService.initSession(userId, folderName);

    res.status(201).json({ message: "Session created", session });
  } catch (error) {
    console.error("Create Session Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getSessions = async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.deleteSession = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await Session.findOne({ _id: id, userId: req.user.id });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    await whatsappService.deleteSessionData(session.folderName);
    await session.deleteOne();

    res.json({ message: "Session deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { sessionName } = req.body;
    
    const session = await Session.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { sessionName },
      { new: true }
    );

    if (!session) return res.status(404).json({ error: "Session not found" });

    res.json({ message: "Session updated", session });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

