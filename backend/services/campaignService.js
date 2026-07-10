const Session = require('../models/Session');
const Contact = require('../models/Contact');

function validateCampaignConfig(config = {}) {
  const { minPacketSize, maxPacketSize, minDelay, maxDelay } = config;

  if (
    typeof minPacketSize !== 'number' ||
    typeof maxPacketSize !== 'number' ||
    minPacketSize < 5 ||
    maxPacketSize < 5 ||
    maxPacketSize - minPacketSize < 5
  ) {
    throw new Error('Invalid packet size. Min/Max must be >= 5 and the range between them must be >= 5.');
  }

  if (
    typeof minDelay !== 'number' ||
    typeof maxDelay !== 'number' ||
    minDelay <= 0 ||
    maxDelay <= 0 ||
    maxDelay - minDelay < 5
  ) {
    throw new Error('Invalid delay configuration. Min/Max delay must be positive and the range must be >= 5.');
  }

  return true;
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function parseProviderProxyMap() {
  const envValue = process.env.PROVIDER_PROXY_MAP || process.env.PROXY_MAP || '';
  const entries = envValue.split(',').map((entry) => entry.trim()).filter(Boolean);
  const proxyMap = new Map();

  for (const entry of entries) {
    const separatorIndex = entry.indexOf('=');
    if (separatorIndex === -1) continue;
    const identifier = entry.slice(0, separatorIndex).trim();
    const proxyUrl = entry.slice(separatorIndex + 1).trim();
    if (identifier && proxyUrl) {
      proxyMap.set(identifier, proxyUrl);
    }
  }

  return proxyMap;
}

function getProxyUrlForIp(ip, ipIndex, proxyMap) {
  if (ip && proxyMap.has(ip)) {
    return proxyMap.get(ip);
  }

  const fallbackUrls = (process.env.PROVIDER_PROXY_URLS || process.env.PROXY_URLS || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (fallbackUrls.length) {
    return fallbackUrls[ipIndex % fallbackUrls.length];
  }

  return process.env.PROVIDER_DEFAULT_PROXY || process.env.DEFAULT_PROXY_URL || null;
}

function buildPacketPlan(recipients = [], config = {}) {
  const {
    minPacketSize,
    maxPacketSize,
    minDelay,
    maxDelay,
    roundRobinSessions = 1,
  } = config;

  // Determine effective IP pool: provider-controlled via env var; ignore any user-supplied values
  const envVal = process.env.PROVIDER_IP_POOL || process.env.IP_POOL || '';
  let ipPool = [];
  if (envVal && typeof envVal === 'string') {
    ipPool = envVal.split(',').map((s) => s.trim()).filter(Boolean);
  }
  if (!ipPool.length) ipPool = ['default-ip'];

  const packets = [];
  const proxyMap = parseProviderProxyMap();
  let index = 0;

  while (index < recipients.length) {
    const packetSize = getRandomInt(minPacketSize, maxPacketSize);
    const chunk = recipients.slice(index, index + packetSize);
    if (chunk.length === 0) break;

    const ipIndex = packets.length % Math.max(ipPool.length, 1);
    const ip = ipPool[ipIndex];
    packets.push({
      recipients: chunk,
      size: chunk.length,
      delay: getRandomInt(minDelay, maxDelay),
      sessionIndex: packets.length % Math.max(roundRobinSessions, 1),
      ipIndex,
      ip,
      proxyUrl: getProxyUrlForIp(ip, ipIndex, proxyMap),
    });

    index += chunk.length;
  }

  return packets;
}

async function startCampaign(userId, { sessionIds, recipients, message, config }) {
  validateCampaignConfig(config);

  let recipientList = Array.isArray(recipients) ? recipients : [];
  if (!recipientList.length) {
    const contacts = await Contact.find({ userId }).select('name phone');
    recipientList = contacts.map((contact) => ({
      name: contact.name,
      phone: contact.phone,
    }));
  }

  if (!recipientList.length) {
    throw new Error('No recipients available to send the campaign.');
  }

  const sessionFilter = { userId, status: 'CONNECTED' };
  if (Array.isArray(sessionIds) && sessionIds.length) {
    sessionFilter._id = { $in: sessionIds };
  }

  const sessions = await Session.find(sessionFilter).sort({ createdAt: 1 });
  if (!sessions.length) {
    throw new Error('No active WhatsApp sessions available for the selected session IDs.');
  }

  const packetPlan = buildPacketPlan(recipientList, {
    ...config,
    roundRobinSessions: sessions.length,
  });

  return {
    sessionIds: sessions.map((s) => s._id),
    totalRecipients: recipientList.length,
    packetCount: packetPlan.length,
    packetPlan,
    ipPool: (process.env.PROVIDER_IP_POOL || process.env.IP_POOL || '').split(',').map((s) => s.trim()).filter(Boolean),
  };
}

module.exports = {
  validateCampaignConfig,
  buildPacketPlan,
  startCampaign,
};
