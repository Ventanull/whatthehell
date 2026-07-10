const { Queue, Worker } = require("bullmq");
const Campaign = require("../models/Campaign");
const whatsappService = require("../services/whatsappService");
const fs = require('fs');
const getRedisClient = require("../utils/redis");

const connection = getRedisClient();

const campaignQueue = new Queue("campaigns", { connection });

// Helper to emit progress updates via Socket.IO
const emitProgress = async (campaignId) => {
  if (whatsappService.io) {
    const campaign = await Campaign.findById(campaignId).lean();
    if (campaign) {
      whatsappService.io.to(campaign.userId.toString()).emit('campaign_progress', {
        campaignId,
        sent: campaign.sent,
        failed: campaign.failed,
        total: campaign.totalContacts || 0,
        packetSent: campaign.packetSent,
        packetFailed: campaign.packetFailed,
        packetTotal: campaign.packetTotal,
      });
    }
  }
};


// Worker to process campaigns
const worker = new Worker(
  "campaigns",
  async (job) => {
    const { campaignId, packetPlan = [], message = "" } = job.data;
    const campaign = await Campaign.findById(campaignId).populate("sessionIds");
    if (!campaign || campaign.status !== "RUNNING") return;

    const activeSessions = campaign.sessionIds.filter(s => s.status === "CONNECTED");
    if (activeSessions.length === 0) {
      campaign.status = "FAILED";
      await campaign.save();
      throw new Error("No active sessions to send messages");
    }

    for (const packet of packetPlan) {
      // Always check campaign status before processing a new packet
      const currentCampaign = await Campaign.findById(campaignId);
      if (currentCampaign.status !== "RUNNING") return; // Stop if campaign was paused or cancelled

      const session = activeSessions[packet.sessionIndex % activeSessions.length];

      try {
        for (const recipient of packet.recipients) {
          try {
            const messageText = message.replace(/{name}/g, recipient.name || "");
            // Pass the assigned IP for this packet so it can be logged or used by the sender
            if (campaign.mediaPath && fs.existsSync(campaign.mediaPath)) {
              await whatsappService.sendMedia(
                session.folderName,
                recipient.phone,
                campaign.mediaPath,
                campaign.mediaType,
                { caption: messageText, mimetype: campaign.mimetype, fileName: campaign.fileName },
                { ip: packet.ip, proxyUrl: packet.proxyUrl }
              );
            } else {
              await whatsappService.sendTextMessage(session.folderName, recipient.phone, messageText, { ip: packet.ip, proxyUrl: packet.proxyUrl });
            }
            await Campaign.findByIdAndUpdate(campaignId, { $inc: { sent: 1, pending: -1 } });
            await new Promise((resolve) => setTimeout(resolve, 1500));
          } catch (error) {
            console.error(`Failed to send to ${recipient.phone} via ip ${packet.ip}:`, error.message);
            await Campaign.findByIdAndUpdate(campaignId, { $inc: { failed: 1, pending: -1 } });
          }
        }
        // After processing the packet, mark it as sent
        await Campaign.findByIdAndUpdate(campaignId, { $inc: { packetSent: 1, packetPending: -1 } });
      } catch (error) {
        console.error(`Packet dispatch failed for session ${session.folderName}:`, error.message);
        await Campaign.findByIdAndUpdate(campaignId, {
          $inc: {
            failed: packet.recipients.length,
            pending: -packet.recipients.length,
            packetFailed: 1,
            packetPending: -1,
          },
        });
      }
      
      // Emit progress and then wait for the specified delay
      await emitProgress(campaignId);
      // The delay is in seconds, so multiply by 1000 for setTimeout
      await new Promise(resolve => setTimeout(resolve, packet.delay * 1000));
    }

    console.log(`Campaign ${campaignId} finished processing all packets.`);
    const finalCampaign = await Campaign.findById(campaignId);
    // If campaign wasn't explicitly cancelled or already completed, mark it completed
    if (finalCampaign && finalCampaign.status !== "COMPLETED" && finalCampaign.status !== "CANCELLED") {
      await Campaign.findByIdAndUpdate(campaignId, { status: "COMPLETED" });

      // Emit final progress update and completion event to the user room
      if (whatsappService.io) {
        const refreshed = await Campaign.findById(campaignId).lean();
        console.log(`Emitting campaign_progress to user ${refreshed.userId} for campaign ${campaignId}`);
        whatsappService.io.to(refreshed.userId.toString()).emit('campaign_progress', {
          campaignId,
          sent: refreshed.sent,
          failed: refreshed.failed,
          total: refreshed.totalContacts || 0,
          packetSent: refreshed.packetSent,
          packetFailed: refreshed.packetFailed,
          packetTotal: refreshed.packetTotal,
        });

        console.log(`Emitting campaign_completed to user ${refreshed.userId} for campaign ${campaignId}`);
        whatsappService.io.to(refreshed.userId.toString()).emit("campaign_completed", {
          campaignId,
          status: "COMPLETED"
        });
      }
    }
  },
  { connection, concurrency: 5 }
);

worker.on("completed", (job) => {
  console.log(`Campaign ${job.data.campaignId} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`Campaign ${job.data.campaignId} failed with error ${err.message}`);
  Campaign.findByIdAndUpdate(job.data.campaignId, { status: "FAILED" }).catch(e => console.error("Failed to mark campaign as FAILED", e));
});

module.exports = { campaignQueue };