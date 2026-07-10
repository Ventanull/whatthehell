const whatsappService = require("../services/whatsappService");

module.exports = (io) => {
  // Inject io to whatsappService
  whatsappService.setIo(io);

  io.on("connection", (socket) => {
    console.log("A user connected via socket:", socket.id);

    // Clients must emit "join" with their userId to receive private events like QR codes
    socket.on("join", async (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined room`);
      
      try {
        const Session = require("../models/Session");
        const sessions = await Session.find({ userId, status: { $in: ["INITIATED", "RECONNECTING"] } });
        for (const session of sessions) {
          const qr = whatsappService.getLatestQR(session.folderName);
          if (qr) {
            socket.emit("qr", { folderName: session.folderName, qr });
          }
        }
      } catch (error) {
        console.error("Error fetching sessions on join:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
};
