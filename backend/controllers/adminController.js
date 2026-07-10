const User = require("../models/User");
const Session = require("../models/Session");
const Campaign = require("../models/Campaign");

exports.getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const totalSessions = await Session.countDocuments();
    const totalCampaigns = await Campaign.countDocuments();

    // Sum all sent messages across all campaigns
    const campaigns = await Campaign.find();
    const totalMessagesSent = campaigns.reduce((acc, curr) => acc + curr.sent, 0);

    res.json({
      totalUsers,
      activeUsers,
      totalSessions,
      totalCampaigns,
      totalMessagesSent,
      revenuePlaceholder: "$0.00"
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-__v").sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.updateUserPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { plan, isActive } = req.body;
    
    const user = await User.findByIdAndUpdate(id, { plan, isActive }, { new: true }).select("-__v");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ message: "User updated successfully", user });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};
