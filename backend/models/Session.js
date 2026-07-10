const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sessionName: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["INITIATED", "CONNECTED", "DISCONNECTED", "RECONNECTING"],
      default: "INITIATED",
    },
    folderName: {
      type: String,
      required: true,
      unique: true,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Session", sessionSchema);
