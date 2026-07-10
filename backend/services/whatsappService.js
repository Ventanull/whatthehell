// Removed sync require of baileys
const fs = require("fs");
const path = require("path");
const pino = require("pino");
const os = require("os");
const Session = require("../models/Session");

class WhatsappService {
  constructor() {
    this.sessions = new Map();
    this.qrs = new Map(); // Store latest QRs
    this.connectionStates = new Map();
    this.connectionOpenAt = new Map();
    this.sessionOwners = new Map();
    this.io = null; // Will be injected
  }

  setIo(io) {
    this.io = io;
  }

  // Load all sessions from DB on startup
  async loadAllSessions() {
    const sessions = await Session.find({ status: { $in: ["CONNECTED", "RECONNECTING"] } });
    for (const session of sessions) {
      this.initSession(session.userId.toString(), session.folderName);
    }
  }

  getSessionKey(folderName, proxyUrl = null) {
    if (!proxyUrl) return folderName;
    return `${folderName}::${proxyUrl}`;
  }

  async buildProxyAgent(proxyUrl) {
    if (!proxyUrl) return null;
    const { ProxyAgent } = await import('proxy-agent');
    return new ProxyAgent(proxyUrl);
  }

  async initSession(userId, folderName, proxyUrl = null) {
    try {
      const baileys = await import("@whiskeysockets/baileys");
    const makeWASocket = baileys.default || baileys.makeWASocket;
    const { useMultiFileAuthState, DisconnectReason, Browsers, fetchLatestBaileysVersion } = baileys;

    const authPath = path.join(__dirname, "..", "sessions", folderName);
    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    const sessionKey = this.getSessionKey(folderName, proxyUrl);

    // If session exists in memory, don't re-init
    if (this.sessions.has(sessionKey)) {
      return this.sessions.get(sessionKey);
    }
    // Fetch latest WhatsApp Web version to prevent "Connection errored" on noise-handler
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Using WA v${version.join(".")}, isLatest: ${isLatest}`);

    // Dynamically set browser based on OS
    const getBrowser = (platform) => {
      switch (platform) {
        case "win32":
          return Browsers.windows("Chrome");
        case "darwin":
          return Browsers.macOS("Safari");
        default:
          return Browsers.ubuntu("Chrome");
      }
    };

    const proxyAgent = await this.buildProxyAgent(proxyUrl);
    const sock = makeWASocket({
      auth: state,
      version,
      logger: pino({ level: "info" }),
      browser: getBrowser(os.platform()),
      syncFullHistory: false,
      markOnlineOnConnect: true,
      ...(proxyAgent ? { agent: proxyAgent, fetchAgent: proxyAgent } : {}),
    });

    this.sessions.set(sessionKey, sock);
    this.connectionStates.set(sessionKey, "connecting");
    this.sessionOwners.set(sessionKey, userId);

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;
      this.connectionStates.set(sessionKey, connection || "connecting");
      if (connection === "open") {
        this.connectionOpenAt.set(sessionKey, Date.now());
        console.log(`[WA] Session ${folderName}${proxyUrl ? ` via proxy ${proxyUrl}` : ''} entered open state`);
      }

      if (qr) {
        this.qrs.set(sessionKey, qr);
        // Emit QR code to the specific user via Socket.io
        if (this.io) {
          this.io.to(userId).emit("qr", { folderName, qr });
        }
      }

      if (connection === "close") {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        if (shouldReconnect) {
          console.warn(`[WA] Session ${folderName}${proxyUrl ? ` via proxy ${proxyUrl}` : ''} closed unexpectedly; reconnecting...`);
          await Session.findOneAndUpdate({ folderName }, { status: "RECONNECTING" });
          if (this.io) {
             this.io.to(userId).emit("session_status", { folderName, status: "RECONNECTING" });
          }
          this.sessions.delete(sessionKey);
          this.connectionStates.delete(sessionKey);
          this.connectionOpenAt.delete(sessionKey);
          this.qrs.delete(sessionKey);
          setTimeout(() => this.initSession(userId, folderName, proxyUrl), 5000);
        } else {
          // Logged out
          await Session.findOneAndUpdate({ folderName }, { status: "DISCONNECTED" });
          this.sessions.delete(sessionKey);
          this.connectionStates.delete(sessionKey);
          this.qrs.delete(sessionKey);
          // Optional: clear auth files
          fs.rmSync(authPath, { recursive: true, force: true });
          if (this.io) {
             this.io.to(userId).emit("session_status", { folderName, status: "DISCONNECTED" });
          }
        }
      } else if (connection === "open") {
        await Session.findOneAndUpdate({ folderName }, { status: "CONNECTED" });
        this.qrs.delete(sessionKey);
        if (this.io) {
           this.io.to(userId).emit("session_status", { folderName, status: "CONNECTED" });
        }
      } else if (connection === "connecting") {
        await Session.findOneAndUpdate({ folderName }, { status: "RECONNECTING" });
      }
    });

    return sock;
    } catch (error) {
      console.error("Error in initSession:", error);
    }
  }

  getSocket(folderName, proxyUrl = null) {
    return this.sessions.get(this.getSessionKey(folderName, proxyUrl));
  }

  extractCountryCode(sock) {
    const candidates = [sock?.user?.id, sock?.user?.phone, sock?.user?.phoneNumber];

    for (const candidate of candidates) {
      if (!candidate) continue;

      const jidPart = String(candidate).split(/[:@]/)[0];
      const digits = jidPart.replace(/\D/g, "");

      if (digits && digits.length > 10) {
        return digits.slice(0, digits.length - 10);
      }
    }

    return null;
  }

  normalizeJid(phone, sock) {
    if (!phone) return null;

    const value = String(phone).trim();
    if (!value) return null;
    if (value.includes('@')) return value;

    const digits = value.replace(/\D/g, '');
    if (!digits) return null;

    const countryCode = this.extractCountryCode(sock);
    if (countryCode && digits.length === 10) {
      return `${countryCode}${digits}@s.whatsapp.net`;
    }

    if (countryCode && digits.length === 11 && digits.startsWith('0')) {
      return `${countryCode}${digits.slice(1)}@s.whatsapp.net`;
    }

    return `${digits}@s.whatsapp.net`;
  }

  async waitForSocket(folderName, timeoutMs = 30000, proxyUrl = null) {
    const startedAt = Date.now();
    let sock = this.sessions.get(this.getSessionKey(folderName, proxyUrl));

    while (!sock && Date.now() - startedAt < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      sock = this.sessions.get(this.getSessionKey(folderName, proxyUrl));
    }

    return sock;
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async sendTextMessage(folderName, phone, messageText, options = {}) {
    const ownerId = this.sessionOwners.get(this.getSessionKey(folderName, options.proxyUrl));
    let lastError = null;
    const usedIp = options.ip || null;
    const usedProxyUrl = options.proxyUrl || null;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const sock = await this.waitForSocket(folderName, 15000, usedProxyUrl);
      if (!sock) {
        if (ownerId) {
          await this.initSession(ownerId, folderName, usedProxyUrl);
        }
        await this.sleep(3000);
        continue;
      }

      const jid = this.normalizeJid(phone, sock);
      if (!jid) {
        throw new Error(`Invalid recipient phone number: ${phone}`);
      }

      try {
        console.log(`[WA] Sending to ${jid} using session ${folderName}${usedIp ? ` via ip ${usedIp}` : ''}${usedProxyUrl ? ` via proxy ${usedProxyUrl}` : ''} (attempt ${attempt})`);
        await sock.sendPresenceUpdate('available');
        const result = await sock.sendMessage(jid, { text: messageText }, { waitForAck: true });
        console.log(`[WA] Sent successfully to ${jid}${usedIp ? ` via ip ${usedIp}` : ''}${usedProxyUrl ? ` via proxy ${usedProxyUrl}` : ''}`);
        return result;
      } catch (error) {
        lastError = error;
        console.warn(`[WA] Send attempt ${attempt} failed for ${jid}${usedIp ? ` via ip ${usedIp}` : ''}${usedProxyUrl ? ` via proxy ${usedProxyUrl}` : ''}:`, error.message);
        await this.sleep(4000);
      }
    }

    throw new Error(lastError?.message || `WhatsApp session ${folderName} is not ready yet`);
  }

  async sendMedia(folderName, phone, mediaPath, mediaType, metadata = {}, options = {}) {
    const ownerId = this.sessionOwners.get(this.getSessionKey(folderName, options.proxyUrl));
    let lastError = null;
    const usedProxyUrl = options.proxyUrl || null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const sock = await this.waitForSocket(folderName, 15000, usedProxyUrl);
      if (!sock) {
        if (ownerId) {
          await this.initSession(ownerId, folderName, usedProxyUrl);
        }
        await this.sleep(3000);
        continue;
      }

      const jid = this.normalizeJid(phone, sock);
      if (!jid) {
        throw new Error(`Invalid recipient phone number: ${phone}`);
      }

      try {
        console.log(`[WA] Sending media to ${jid} using session ${folderName}${usedProxyUrl ? ` via proxy ${usedProxyUrl}` : ''} (attempt ${attempt})`);
        await sock.sendPresenceUpdate('available');

        const mediaBuffer = fs.existsSync(mediaPath) ? fs.readFileSync(mediaPath) : null;
        if (!mediaBuffer) {
          throw new Error(`Media file not found: ${mediaPath}`);
        }

        let messagePayload = { text: '' };

        if (mediaType === 'image') {
          messagePayload = { image: mediaBuffer, caption: metadata.caption || '' };
        } else if (mediaType === 'video') {
          messagePayload = { video: mediaBuffer, caption: metadata.caption || '' };
        } else if (mediaType === 'audio') {
          messagePayload = { audio: mediaBuffer, ptt: false };
        } else {
          messagePayload = { document: mediaBuffer, mimetype: metadata.mimetype || undefined, fileName: metadata.fileName || undefined, caption: metadata.caption || '' };
        }

        const result = await sock.sendMessage(jid, messagePayload, { waitForAck: true });
        console.log(`[WA] Media sent successfully to ${jid}`);
        return result;
      } catch (error) {
        lastError = error;
        console.warn(`[WA] Media send attempt ${attempt} failed for ${jid}${usedProxyUrl ? ` via proxy ${usedProxyUrl}` : ''}:`, error.message);
        await this.sleep(4000);
      }
    }

    throw new Error(lastError?.message || `WhatsApp session ${folderName} is not ready yet`);
  }

  getLatestQR(folderName) {
    return this.qrs.get(folderName);
  }

  async logout(folderName, proxyUrl = null) {
    const sock = this.sessions.get(this.getSessionKey(folderName, proxyUrl));
    if (sock) {
      try {
        await sock.logout();
      } catch (err) {
        console.error(`Error during logout for ${folderName}:`, err.message);
      }
      this.sessions.delete(this.getSessionKey(folderName, proxyUrl));
    }
  }

  async deleteSessionData(folderName, proxyUrl = null) {
    await this.logout(folderName, proxyUrl);
    const authPath = path.join(__dirname, "..", "sessions", folderName);
    if (fs.existsSync(authPath)) {
      try {
        fs.rmSync(authPath, { recursive: true, force: true });
        console.log(`Deleted session folder: ${folderName}`);
      } catch (err) {
        console.error(`Error deleting session folder ${folderName}:`, err.message);
      }
    }
    this.qrs.delete(this.getSessionKey(folderName, proxyUrl));
  }
}

module.exports = new WhatsappService();
