const mongoose = require("mongoose");

const campaignSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sessionIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Session",
      },
    ],
    messageTemplate: {
      type: String,
      default: '',
    },
    totalContacts: {
      type: Number,
      default: 0,
    },
    mediaPath: {
      type: String,
      default: null,
    },
    mediaType: {
      type: String, // image, video, document, audio
      default: null,
    },
    mimetype: {
      type: String,
      default: null,
    },
    fileName: {
      type: String,
      default: null,
    },
    sent: {
      type: Number,
      default: 0,
    },
    failed: {
      type: Number,
      default: 0,
    },
    pending: {
      type: Number,
      default: 0,
    },
    // Packet-level counters (number of packets, not individual recipients)
    packetTotal: {
      type: Number,
      default: 0,
    },
    packetSent: {
      type: Number,
      default: 0,
    },
    packetFailed: {
      type: Number,
      default: 0,
    },
    packetPending: {
      type: Number,
      default: 0,
    },
    ipPool: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["PENDING", "RUNNING", "PAUSED", "COMPLETED", "CANCELLED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Campaign", campaignSchema);
