require("./queues/campaignQueue");
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./utils/db");
const setupSockets = require("./sockets");
// Import routes here later
const authRoutes = require("./routes/auth");
const sessionRoutes = require("./routes/sessions");
const contactRoutes = require("./routes/contacts");
const campaignRoutes = require("./routes/campaigns");
const dashboardRoutes = require("./routes/dashboard");
const adminRoutes = require("./routes/admin");
const whatsappService = require("./services/whatsappService");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"]
  }
});

// Middlewares
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());

// Database connection
connectDB();

// Initialize WebSockets
setupSockets(io);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.json({ message: "WhatsApp SaaS API is running" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  // Load existing WhatsApp sessions into memory after server starts
  try {
    await whatsappService.loadAllSessions();
    console.log("Loaded all active sessions from database.");
  } catch (error) {
    console.error("Failed to load sessions on startup:", error);
  }
});
