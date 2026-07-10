const Session = require("../models/Session");
const Campaign = require("../models/Campaign");
const Contact = require("../models/Contact");

exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const activeSessionsCount = await Session.countDocuments({ userId, status: "CONNECTED" });
    const totalCampaignsCount = await Campaign.countDocuments({ userId });
    const totalContactsCount = await Contact.countDocuments({ userId });
    
    // Aggregation for total messages sent
    const campaigns = await Campaign.find({ userId });
    const totalMessagesSent = campaigns.reduce((acc, curr) => acc + curr.sent, 0);

    res.json({
      activeSessions: activeSessionsCount,
      totalCampaigns: totalCampaignsCount,
      totalMessagesSent,
      totalContacts: totalContactsCount,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};
